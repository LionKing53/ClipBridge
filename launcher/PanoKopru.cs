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
[assembly: AssemblyCopyright("Kisisel kullanim")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

internal static class Program
{
    internal static EventWaitHandle OpenWindowEvent;
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
            if (!ServiceIsRunning())
            {
                Process.Start(new ProcessStartInfo { FileName = Application.ExecutablePath, Arguments = "--background", UseShellExecute = false, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden });
                for (int i = 0; i < 20 && !ServiceIsRunning(); i++) Thread.Sleep(250);
            }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new DesktopWindow(AppRoot));
            OpenWindowEvent.Dispose();
        }
    }

    private static void RunBackgroundService()
    {
        while (true)
        {
            if (ServiceIsRunning())
            {
                Thread.Sleep(2000);
                continue;
            }

            try
            {
                using (Process service = StartNodeScript(Path.Combine("src", "server.js")))
                {
                    service.WaitForExit();
                }
            }
            catch
            {
                // Gecici baslatma hatalarinda gorevi kapatmak yerine yeniden dene.
            }

            Thread.Sleep(2000);
        }
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

    private static Process StartNodeScript(string relativeScript)
    {
        string runtime = Path.Combine(InstallRoot, "runtime", "node.exe");
        string script = Path.Combine(AppRoot, relativeScript);
        ProcessStartInfo startInfo = new ProcessStartInfo
        {
            FileName = runtime,
            Arguments = "\"" + script + "\"",
            WorkingDirectory = AppRoot,
            UseShellExecute = false,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden
        };
        return Process.Start(startInfo);
    }
}
