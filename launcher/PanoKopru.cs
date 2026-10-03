using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("PanoK\u00f6pr\u00fc")]
[assembly: AssemblyDescription("iPhone ve Windows pano k\u00f6pr\u00fcs\u00fc")]
[assembly: AssemblyCompany("PanoK\u00f6pr\u00fc")]
[assembly: AssemblyProduct("PanoK\u00f6pr\u00fc")]
[assembly: AssemblyCopyright("GPL-3.0-or-later; see LICENSE")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

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
        try { Context = RuntimeContext.Load(AppRoot); }
        catch { MessageBox.Show("PanoKopru runtime configuration is missing or unsafe. See the installation guide."); return; }
        // Native development startup remains blocked until clean-machine acceptance.
        if (Context.Mode != "production") { MessageBox.Show("Use the isolated Node development harness for this source version."); return; }
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
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            {
                using (var reader = new StreamReader(response.GetResponseStream()))
                {
                    var serializer = new System.Web.Script.Serialization.JavaScriptSerializer();
                    var value = serializer.Deserialize<System.Collections.Generic.Dictionary<string, object>>(reader.ReadToEnd());
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
        startInfo.EnvironmentVariables["PANOKOPRU_SUPERVISED"] = "1";
        return startInfo;
    }
}
