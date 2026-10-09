using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("ClipBridge")]
[assembly: AssemblyDescription("Shortcut-triggered iPhone and Windows clipboard bridge")]
[assembly: AssemblyCompany("ClipBridge")]
[assembly: AssemblyProduct("ClipBridge")]
[assembly: AssemblyCopyright("GPL-3.0-or-later; see LICENSE")]
[assembly: AssemblyVersion("1.2.1.0")]
[assembly: AssemblyFileVersion("1.2.1.0")]
[assembly: AssemblyInformationalVersion("1.2.1")]

internal static class Program
{
    internal static EventWaitHandle OpenWindowEvent;
    internal static EventWaitHandle StopWindowEvent;
    internal static RuntimeContext Context;
    private static string InstallRoot
    {
        get { return AppDomain.CurrentDomain.BaseDirectory; }
    }

    private static string AppRoot
    {
        get { return Path.Combine(InstallRoot, "app"); }
    }

    [STAThread]
    private static void Main(string[] args)
    {
        Language.Initialize(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ClipBridge"), File.Exists(Path.Combine(InstallRoot, "install-receipt.json")));
        if (Array.IndexOf(args, "--stop") < 0 && Directory.Exists(Path.Combine(Path.GetDirectoryName(InstallRoot.TrimEnd('\\')), ".ClipBridge-install-lock")))
        { Environment.ExitCode = 8; MessageBox.Show(Language.Text("m_28ea1cba3a90")); return; }
        try { InstalledLaunch.ConfigureEnvironment(InstallRoot); Context = RuntimeContext.Load(AppRoot); }
        catch { Environment.ExitCode = 4; MessageBox.Show(Language.Text("m_eb5f8f5c39e8")); return; }
        Language.Initialize(Context.DataRoot, File.Exists(Path.Combine(Context.DataRoot, "config.json")));
        // Native development startup remains blocked until clean-machine acceptance.
        if (Context.Mode != "production") { MessageBox.Show(Language.Text("m_d609a2f4f913")); return; }
        if (Array.IndexOf(args, "--recover-lock") >= 0)
        {
            if (MutexIsHeld("Service") || MutexIsHeld("Desktop") || ServiceIsRunning()) { Environment.ExitCode = 7; MessageBox.Show(Language.Text("m_00b11404acbb")); return; }
            if (MessageBox.Show(Language.Text("m_9fec844b476f"), "ClipBridge", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            try
            {
                var recovery = NodeStartInfo(Path.Combine("src", "recover-instance.js"));
                recovery.Arguments += " --confirmed";
                using (var process = Process.Start(recovery))
                {
                    process.StandardInput.Close();
                    if (!process.WaitForExit(10000)) { Environment.ExitCode = 7; MessageBox.Show(Language.Text("m_3295bd800112")); return; }
                    Environment.ExitCode = process.ExitCode;
                    MessageBox.Show(process.ExitCode == 0 ? Language.Text("m_f650faeaf03f") : Language.Text("m_6ad7a6080951"));
                }
            }
            catch { Environment.ExitCode = 7; MessageBox.Show(Language.Text("m_4cc2eabfef6f")); }
            return;
        }
        if (Array.IndexOf(args, "--stop") >= 0)
        {
            RequestShutdown();
            // A timeout is an error, never permission to overwrite program files.
            var deadline = Stopwatch.StartNew();
            while (deadline.ElapsedMilliseconds < 30000)
            {
                RequestShutdown(); // Also covers a service still creating its event.
                if (!MutexIsHeld("Service") && !MutexIsHeld("Desktop") && !ServiceIsRunning()) return;
                Thread.Sleep(250);
            }
            Environment.ExitCode = 2; return;
        }
        bool background = Array.IndexOf(args, "--background") >= 0;
        if (background)
        {
            bool serviceOwner;
            using (var serviceMutex = new Mutex(true, Context.MutexName("Service"), out serviceOwner))
            {
                if (serviceOwner) RunBackgroundService();
            }
            return;
        }

        // SDK files are not the Runtime. Missing Runtime is reported before a
        // backend or blank WebView window is started. No automatic UAC/download.
        try
        {
            string browserVersion = Microsoft.Web.WebView2.Core.CoreWebView2Environment.GetAvailableBrowserVersionString();
            // Reject an Edge preview-channel suffix; it is not an installed
            // production WebView2 Runtime prerequisite.
            if (!System.Text.RegularExpressions.Regex.IsMatch(browserVersion ?? "", "^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$")) throw new InvalidOperationException();
        }
        catch
        {
            Environment.ExitCode = 5;
            if (MessageBox.Show(Language.Text("m_e1974a81440d"), "ClipBridge", MessageBoxButtons.YesNo, MessageBoxIcon.Information) == DialogResult.Yes)
            {
                try { Process.Start(new ProcessStartInfo { FileName = "https://developer.microsoft.com/microsoft-edge/webview2/", UseShellExecute = true }); } catch { }
            }
            return;
        }

        bool windowOwner;
        using (var windowMutex = new Mutex(true, Context.MutexName("Desktop"), out windowOwner))
        {
            OpenWindowEvent = new EventWaitHandle(false, EventResetMode.AutoReset, Context.MutexName("OpenWindow"));
            if (!windowOwner) { OpenWindowEvent.Set(); return; }
            StopWindowEvent = OwnedEvent("StopDesktop"); StopWindowEvent.Reset();
            if (!ServiceIsRunning())
            {
                Process.Start(new ProcessStartInfo { FileName = Application.ExecutablePath, Arguments = "--background", UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden });
                for (int i = 0; i < 20 && !ServiceIsRunning(); i++) Thread.Sleep(250);
            }
            if (!ServiceIsRunning())
            {
                Environment.ExitCode = 6;
                MessageBox.Show(Language.Text("m_69e1d2c1d5dc"));
                OpenWindowEvent.Dispose(); StopWindowEvent.Dispose(); return;
            }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new DesktopWindow(AppRoot));
            OpenWindowEvent.Dispose();
            StopWindowEvent.Dispose();
        }
    }

    private static void RunBackgroundService()
    {
        using (var stop = OwnedEvent("StopService"))
        {
            stop.Reset();
            // Do not attach to an unowned already-running backend or endlessly
            // retry a stale lock. Installer recovery must resolve that explicitly.
            if (ServiceIsRunning()) { Environment.ExitCode = 3; return; }
            for (int attempt = 0; attempt < 3 && !stop.WaitOne(0); attempt++)
            {
                try { OwnedNode.Run(NodeStartInfo(Path.Combine("src", "server.js")), stop); }
                catch { Environment.ExitCode = 1; }
                if (stop.WaitOne(2000)) return;
            }
            Environment.ExitCode = 1;
        }
    }

    private static EventWaitHandle OwnedEvent(string purpose)
    {
        var security = new System.Security.AccessControl.EventWaitHandleSecurity();
        security.SetAccessRuleProtection(true, false);
        var sid = System.Security.Principal.WindowsIdentity.GetCurrent().User;
        security.AddAccessRule(new System.Security.AccessControl.EventWaitHandleAccessRule(sid,
            System.Security.AccessControl.EventWaitHandleRights.FullControl, System.Security.AccessControl.AccessControlType.Allow));
        bool created;
        return new EventWaitHandle(false, EventResetMode.ManualReset, Context.MutexName(purpose), out created, security);
    }
    internal static void RequestShutdown()
    {
        foreach (string purpose in new [] { "StopService", "StopDesktop" })
        {
            try { using (var signal = EventWaitHandle.OpenExisting(Context.MutexName(purpose), System.Security.AccessControl.EventWaitHandleRights.Modify)) signal.Set(); }
            catch (WaitHandleCannotBeOpenedException) { }
        }
    }
    private static bool MutexIsHeld(string purpose)
    {
        try
        {
            using (var mutex = Mutex.OpenExisting(Context.MutexName(purpose)))
            {
                bool acquired;
                try { acquired = mutex.WaitOne(0); } catch (AbandonedMutexException) { acquired = true; }
                if (acquired) mutex.ReleaseMutex();
                return !acquired;
            }
        }
        catch (WaitHandleCannotBeOpenedException) { return false; }
    }

    private static bool ServiceIsRunning()
    {
        try
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + Context.ApiPort + "/health");
            request.Timeout = 700;
            request.ReadWriteTimeout = 700;
            request.Method = "GET";
            request.Proxy = null;
            // ReadWriteTimeout is per read; also bound the whole probe against
            // a listener trickling bytes so --stop cannot wait indefinitely.
            using (var deadline = new System.Threading.Timer(state => { try { request.Abort(); } catch { } }, null, 1200, Timeout.Infinite))
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            {
                using (var reader = new StreamReader(response.GetResponseStream()))
                {
                    var serializer = new System.Web.Script.Serialization.JavaScriptSerializer();
                    var buffer = new char[4097]; int size = 0, count;
                    while (size < buffer.Length && (count = reader.Read(buffer, size, buffer.Length - size)) > 0) size += count;
                    if (size > 4096) return false;
                    var value = serializer.Deserialize<System.Collections.Generic.Dictionary<string, object>>(new string(buffer, 0, size));
                    return response.StatusCode == HttpStatusCode.OK && value.ContainsKey("instanceId") && (string)value["instanceId"] == Context.InstanceId;
                }
            }
        }
        catch
        {
            return false;
        }
    }

    private static ProcessStartInfo NodeStartInfo(string relativeScript)
    {
        string runtime = Path.Combine(InstallRoot, "runtime", "node.exe");
        string script = Path.Combine(AppRoot, relativeScript);
        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = runtime,
            Arguments = "\"" + script + "\"",
            WorkingDirectory = AppRoot,
            UseShellExecute = false,
            RedirectStandardInput = true,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden
        };
        startInfo.EnvironmentVariables.Remove("NODE_OPTIONS");
        startInfo.EnvironmentVariables.Remove("NODE_PATH");
        startInfo.EnvironmentVariables.Remove("NODE_TLS_REJECT_UNAUTHORIZED");
        startInfo.EnvironmentVariables["CLIPBRIDGE_SUPERVISED"] = "1";
        startInfo.EnvironmentVariables["CLIPBRIDGE_SYSTEM_LANGUAGE"] = System.Globalization.CultureInfo.CurrentUICulture.Name;
        return startInfo;
    }
}
