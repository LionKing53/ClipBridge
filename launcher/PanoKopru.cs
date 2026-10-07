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
[assembly: AssemblyVersion("1.1.0.0")]
[assembly: AssemblyFileVersion("1.1.0.0")]
[assembly: AssemblyInformationalVersion("1.1.0")]

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
        if (Array.IndexOf(args, "--stop") < 0 && Directory.Exists(Path.Combine(Path.GetDirectoryName(InstallRoot.TrimEnd('\\')), ".PanoKopru-install-lock")))
        { Environment.ExitCode = 8; MessageBox.Show("Kurulum/kaldirma islemi suruyor veya yarim kalmis. Once kurucuyu kontrol et."); return; }
        try { InstalledLaunch.ConfigureEnvironment(InstallRoot); Context = RuntimeContext.Load(AppRoot); }
        catch { Environment.ExitCode = 4; MessageBox.Show("PanoKopru kurulumu eksik, degismis veya bu kullaniciya ait degil. Kurulum kilavuzunu kontrol et. Kaynak/aday paket dogrudan acilamaz."); return; }
        // Native development startup remains blocked until clean-machine acceptance.
        if (Context.Mode != "production") { MessageBox.Show("Use the isolated Node development harness for this source version."); return; }
        if (Array.IndexOf(args, "--recover-lock") >= 0)
        {
            if (MutexIsHeld("Service") || MutexIsHeld("Desktop") || ServiceIsRunning()) { Environment.ExitCode = 7; MessageBox.Show("Once PanoKopru'yu tamamen durdur."); return; }
            if (MessageBox.Show("Yalniz kapanmis bir surece ait pano kilidi kontrol edilecek. Veriler silinmez, uygulama otomatik baslatilmaz. Devam edilsin mi?", "PanoKopru", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            try
            {
                var recovery = NodeStartInfo(Path.Combine("src", "recover-instance.js"));
                recovery.Arguments += " --confirmed";
                using (var process = Process.Start(recovery))
                {
                    process.StandardInput.Close();
                    if (!process.WaitForExit(10000)) { Environment.ExitCode = 7; MessageBox.Show("Kilit kontrolu bitmedi. Programi yeniden baslatma; tanilama kilavuzunu kontrol et."); return; }
                    Environment.ExitCode = process.ExitCode;
                    MessageBox.Show(process.ExitCode == 0 ? "Kilit kontrolu tamamlandi. PanoKopru'yu yeniden acabilirsin." : "Kilit guvenle kaldirilamadi. Kilidi elle silme; tanilama kilavuzunu kontrol et.");
                }
            }
            catch { Environment.ExitCode = 7; MessageBox.Show("Kilit kontrolu tamamlanamadi."); }
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
            if (MessageBox.Show("Microsoft Edge WebView2 Runtime bulunamadi. Microsoft'un resmi indirme sayfasi acilsin mi? Kurulumdan sonra PanoKopru'yu yeniden ac.", "PanoKopru", MessageBoxButtons.YesNo, MessageBoxIcon.Information) == DialogResult.Yes)
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
                MessageBox.Show("PanoKopru koprusu baslatilamadi. Port cakismasi veya onceki kapanis kilidi olabilir. Tanilama/kurulum kilavuzunu kontrol et; veri klasorunu silme.");
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
        startInfo.EnvironmentVariables["PANOKOPRU_SUPERVISED"] = "1";
        return startInfo;
    }
}
