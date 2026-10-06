using System;
using System.IO;
using System.Threading;
using System.Web.Script.Serialization;
internal sealed class SyntheticFreshInstall : IFreshInstallSystem
{
    internal string Root, Scenario; internal bool Desktop, Startup; internal int Probes;
    public string LocalAppData { get { return Root; } }
    public string OwnerSid { get { return "S-1-5-21-1000-1000-1000-1000"; } }
    public void CheckPrerequisites(string payload, long bytes)
    {
        Probes++; if (bytes < 1 || Scenario == "probe-fail") throw new InvalidOperationException("synthetic preflight rejected");
    }
    public void CreatePrivateDirectoryExclusive(string directory)
    {
        FreshInstall.Absent(directory); Directory.CreateDirectory(directory); // No ACL/Windows mutation in this synthetic adapter.
    }
    public string[] RegisterShortcuts(string root, string id, bool desktop, bool startup)
    {
        Desktop = desktop; Startup = startup;
        if (Scenario == "shortcut-fail") throw new InvalidOperationException("synthetic shortcut failure");
        return new string[0]; // Never COM, registry or real shortcuts.
    }
}
internal static class FreshInstallProbe
{
    static int Main(string[] args)
    {
        var system = new SyntheticFreshInstall { Root = args[0], Scenario = args[3] };
        try
        {
            var cancellation = new CancellationTokenSource();
            var result = FreshInstall.Run(system, args[1], args[2], args[4] == "yes", args[5] == "yes", step => {
                if (step == "copy" && system.Scenario == "source-changed") File.WriteAllText(Path.Combine(args[1], "app", "src", "server.js"), "changed source");
                if (step == "activate" && system.Scenario == "target-race") { string target = Path.Combine(system.Root, "Programs", "PanoKopru"); Directory.CreateDirectory(target); File.WriteAllText(Path.Combine(target, "foreign.txt"), "untouched"); }
                if (step == "activate" && system.Scenario == "cancel") cancellation.Cancel();
            }, cancellation.Token);
            Console.WriteLine(new JavaScriptSerializer().Serialize(new { ok = true, warnings = result.Warnings, desktop = system.Desktop, startup = system.Startup, probes = system.Probes }));
            return 0;
        }
        catch { Console.WriteLine(new JavaScriptSerializer().Serialize(new { ok = false, probes = system.Probes })); return 2; }
    }
}
