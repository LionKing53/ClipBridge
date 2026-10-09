using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Principal;

// Used only by the explicit standalone setup executable. Tests inject a fake
// IFreshInstallSystem instead; never change this machine's ACL/shortcut/startup.
internal sealed class WindowsFreshInstall : IFreshInstallSystem, IRemoveInstallSystem
{
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "CreateDirectoryW")]
    static extern bool MakeDirectory(string path, IntPtr securityAttributes);
    private readonly string nodeVersion;
    private readonly Version runtimeMinimum;
    public string LocalAppData { get { return Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData); } }
    public string OwnerSid { get { return WindowsIdentity.GetCurrent().User.Value; } }
    internal WindowsFreshInstall(string expectedNode, string minimumRuntime) { nodeVersion = expectedNode; runtimeMinimum = new Version(minimumRuntime); }
    public void CheckPrerequisites(string payload, long payloadBytes)
    {
        var host = (Dictionary<string, object>)ClipBridgeInstallProbe.Host();
        if ((bool)host["elevated"]) throw new InvalidOperationException("ERR_INSTALL_RUN_AS_NORMAL_USER");
        if (!InstalledLaunch.Same(LocalAppData, Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "AppData", "Local"))) throw new InvalidOperationException("ERR_INSTALL_PROFILE_REDIRECTED");
        if ((string)host["arch"] != "x64" || Environment.OSVersion.Version.Major < 10 || Environment.OSVersion.Version.Build < 19045) throw new InvalidOperationException("ERR_INSTALL_PLATFORM");
        var node = (Dictionary<string, object>)ClipBridgeInstallProbe.NodeMetadata(Path.Combine(payload, "runtime", "node.exe"));
        if ((string)node["arch"] != "x64" || (string)node["version"] != nodeVersion) throw new InvalidOperationException("ERR_INSTALL_NODE_VERSION");
        var web = (Dictionary<string, object>)ClipBridgeInstallProbe.WebView2(); bool ready = false;
        if (!(bool)web["complete"]) throw new InvalidOperationException("ERR_INSTALL_WEBVIEW_UNKNOWN");
        foreach (string text in (string[])web["versions"])
        {
            Version version;
            if (text != null && System.Text.RegularExpressions.Regex.IsMatch(text, "^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$") && Version.TryParse(text, out version) && version >= runtimeMinimum) ready = true;
        }
        if (!ready) throw new InvalidOperationException("ERR_INSTALL_WEBVIEW_REQUIRED");
        var program = (Dictionary<string, object>)ClipBridgeInstallProbe.Destination(Path.Combine(LocalAppData, "Programs", "ClipBridge"));
        var data = (Dictionary<string, object>)ClipBridgeInstallProbe.Destination(Path.Combine(LocalAppData, "ClipBridge"));
        if (!(bool)program["writable"] || !(bool)data["writable"]) throw new InvalidOperationException("ERR_INSTALL_WRITE_ACCESS");
        ulong programNeed = checked((ulong)payloadBytes * 2 + 256UL * 1024 * 1024), dataNeed = 256UL * 1024 * 1024;
        ulong programFree = Convert.ToUInt64(program["freeBytes"]), dataFree = Convert.ToUInt64(data["freeBytes"]);
        if ((string)program["volumeId"] == (string)data["volumeId"])
        {
            if (Math.Min(programFree, dataFree) < checked(programNeed + dataNeed)) throw new InvalidOperationException("ERR_INSTALL_DISK_SPACE");
        }
        else if (programFree < programNeed || dataFree < dataNeed) throw new InvalidOperationException("ERR_INSTALL_DISK_SPACE");
        foreach (int port in new [] { 32145, 32146, 32147 })
        {
            var listener = new TcpListener(port == 32147 ? IPAddress.Any : IPAddress.Loopback, port);
            listener.ExclusiveAddressUse = true;
            try { listener.Start(); } catch { throw new InvalidOperationException("ERR_INSTALL_PORT_IN_USE"); }
            finally { listener.Stop(); }
        }
    }
    public void CreatePrivateDirectoryExclusive(string directory)
    {
        InstalledLaunch.NoLinks(directory);
        if (!MakeDirectory(directory, IntPtr.Zero)) throw new InvalidOperationException("ERR_INSTALL_EXCLUSIVE_DIRECTORY");
        var acl = new DirectorySecurity(); var user = WindowsIdentity.GetCurrent().User;
        acl.SetOwner(user); acl.SetAccessRuleProtection(true, false);
        foreach (string sid in new [] { user.Value, "S-1-5-18", "S-1-5-32-544" })
            acl.AddAccessRule(new FileSystemAccessRule(new SecurityIdentifier(sid), FileSystemRights.FullControl,
                InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
        new DirectoryInfo(directory).SetAccessControl(acl);
    }
    public string[] RegisterShortcuts(string installRoot, string installId, bool desktop, bool startup)
    {
        var failures = new List<string>();
        var targets = new List<KeyValuePair<string, string>> { new KeyValuePair<string, string>(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "") };
        if (desktop) targets.Add(new KeyValuePair<string, string>(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), ""));
        if (startup) targets.Add(new KeyValuePair<string, string>(Environment.GetFolderPath(Environment.SpecialFolder.Startup), "--background"));
        foreach (var item in targets)
        {
            object shell = null, shortcut = null; string temporary = null;
            try
            {
                if (String.IsNullOrEmpty(item.Key) || !Path.IsPathRooted(item.Key)) throw new InvalidOperationException();
                InstalledLaunch.NoLinks(item.Key);
                string final = Path.Combine(item.Key, "ClipBridge.lnk"); FreshInstall.Absent(final);
                Directory.CreateDirectory(item.Key);
                temporary = Path.Combine(item.Key, "ClipBridge-" + Guid.NewGuid().ToString("N") + ".lnk");
                shell = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
                shortcut = shell.GetType().InvokeMember("CreateShortcut", System.Reflection.BindingFlags.InvokeMethod, null, shell, new object[] { temporary });
                foreach (var property in new Dictionary<string, string> { { "TargetPath", Path.Combine(installRoot, "ClipBridge.exe") },
                    { "Arguments", item.Value }, { "WorkingDirectory", installRoot }, { "Description", "ClipBridge managed " + installId }, { "IconLocation", Path.Combine(installRoot, "ClipBridge.exe") + ",0" } })
                    shortcut.GetType().InvokeMember(property.Key, System.Reflection.BindingFlags.SetProperty, null, shortcut, new object[] { property.Value });
                shortcut.GetType().InvokeMember("Save", System.Reflection.BindingFlags.InvokeMethod, null, shortcut, null);
                File.Move(temporary, final); temporary = null; // No overwrite of another shortcut.
            }
            catch { failures.Add(item.Value == "--background" ? "ERR_INSTALL_STARTUP_SHORTCUT" : "ERR_INSTALL_SHORTCUT"); }
            finally
            {
                if (shortcut != null && Marshal.IsComObject(shortcut)) Marshal.FinalReleaseComObject(shortcut);
                if (shell != null && Marshal.IsComObject(shell)) Marshal.FinalReleaseComObject(shell);
                if (temporary != null) { try { InstalledLaunch.NoLinks(temporary); File.Delete(temporary); } catch { } }
            }
        }
        return failures.ToArray();
    }
    public IDisposable StopAndCleanPermissions(string installRoot)
    {
        if (ClipBridgeInstallProbe.Elevated()) throw new InvalidOperationException("ERR_INSTALL_RUN_AS_NORMAL_USER");
        RunFixed(new System.Diagnostics.ProcessStartInfo { FileName = Path.Combine(installRoot, "ClipBridge.exe"), Arguments = "--stop" }, 40000);
        var stopped = new StoppedLease(Path.Combine(LocalAppData, "ClipBridge"));
        try {
        var cleanup = new System.Diagnostics.ProcessStartInfo { FileName = Path.Combine(installRoot, "runtime", "node.exe"),
            Arguments = "\"" + Path.Combine(installRoot, "app", "src", "uninstall-permissions.js") + "\" --confirmed", WorkingDirectory = Path.Combine(installRoot, "app") };
        foreach (string key in new [] { "NODE_OPTIONS", "NODE_PATH" }) cleanup.EnvironmentVariables.Remove(key);
        cleanup.EnvironmentVariables["LOCALAPPDATA"] = LocalAppData;
        cleanup.EnvironmentVariables["CLIPBRIDGE_MODE"] = "production";
        cleanup.EnvironmentVariables["CLIPBRIDGE_DATA_ROOT"] = Path.Combine(LocalAppData, "ClipBridge");
        cleanup.EnvironmentVariables["CLIPBRIDGE_API_PORT"] = "32145";
        cleanup.EnvironmentVariables["CLIPBRIDGE_DESKTOP_PORT"] = "32146";
        cleanup.EnvironmentVariables["CLIPBRIDGE_LOCAL_PORT"] = "32147";
        RunFixed(cleanup, 210000);
        return stopped;
        } catch { stopped.Dispose(); throw; }
    }
    // Hold the same native instance mutexes through permission cleanup and file
    // removal. A launcher that passed the filesystem guard before it was created
    // still cannot reopen the service/window while this lease is held.
    sealed class StoppedLease : IDisposable
    {
        readonly List<System.Threading.Mutex> held = new List<System.Threading.Mutex>();
        internal StoppedLease(string data)
        {
            string id;
            using (var sha = System.Security.Cryptography.SHA256.Create())
                id = BitConverter.ToString(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes("production\n" + Path.GetFullPath(data).TrimEnd('\\', '/').ToLowerInvariant()))).Replace("-", "").ToLowerInvariant().Substring(0, 24);
            try {
                foreach (string purpose in new [] { "Service", "Desktop" }) {
                    var mutex = new System.Threading.Mutex(false, "Local\\ClipBridge-" + id + "-" + purpose);
                    bool acquired;
                    try { acquired = mutex.WaitOne(0); } catch (System.Threading.AbandonedMutexException) { acquired = true; }
                    if (!acquired) { mutex.Dispose(); throw new InvalidOperationException("ERR_REMOVE_PROCESS_ACTIVE"); }
                    held.Add(mutex);
                }
            } catch { Dispose(); throw; }
        }
        public void Dispose() { for (int i = held.Count - 1; i >= 0; i--) { held[i].ReleaseMutex(); held[i].Dispose(); } held.Clear(); }
    }
    static void RunFixed(System.Diagnostics.ProcessStartInfo start, int timeout)
    {
        start.UseShellExecute = false; start.CreateNoWindow = true; start.WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden;
        using (var process = System.Diagnostics.Process.Start(start))
        {
            // Do not kill a live process or elevated operation on timeout.
            if (!process.WaitForExit(timeout) || process.ExitCode != 0) throw new InvalidOperationException("ERR_REMOVE_STOP_OR_PERMISSION");
        }
    }
    public void RemoveOwnedShortcuts(string installRoot, string installId)
    {
        foreach (var pair in new [] {
            new KeyValuePair<Environment.SpecialFolder, string>(Environment.SpecialFolder.Programs, ""),
            new KeyValuePair<Environment.SpecialFolder, string>(Environment.SpecialFolder.DesktopDirectory, ""),
            new KeyValuePair<Environment.SpecialFolder, string>(Environment.SpecialFolder.Startup, "--background") })
        {
            string directory = Environment.GetFolderPath(pair.Key);
            if (String.IsNullOrEmpty(directory) || !Path.IsPathRooted(directory)) throw new InvalidOperationException("ERR_REMOVE_SHORTCUTS");
            string file = Path.Combine(directory, "ClipBridge.lnk"); InstalledLaunch.NoLinks(file);
            if (!File.Exists(file)) continue;
            object shell = null, link = null;
            try
            {
                shell = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell"));
                link = shell.GetType().InvokeMember("CreateShortcut", System.Reflection.BindingFlags.InvokeMethod, null, shell, new object[] { file });
                Func<string, string> get = name => (string)link.GetType().InvokeMember(name, System.Reflection.BindingFlags.GetProperty, null, link, null);
                if (String.Equals(get("TargetPath"), Path.Combine(installRoot, "ClipBridge.exe"), StringComparison.OrdinalIgnoreCase) &&
                    get("Arguments") == pair.Value && get("Description") == "ClipBridge managed " + installId)
                    File.Delete(file);
            }
            finally { if (link != null && Marshal.IsComObject(link)) Marshal.FinalReleaseComObject(link); if (shell != null && Marshal.IsComObject(shell)) Marshal.FinalReleaseComObject(shell); }
        }
    }
}
