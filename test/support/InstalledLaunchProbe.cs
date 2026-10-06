using System;
internal static class InstalledLaunchProbe
{
    static int Main(string[] args)
    {
        try { Console.WriteLine(InstalledLaunch.Validate(args[0], args[1], "S-1-5-21-1000-1000-1000-1000")); return 0; }
        catch { Console.WriteLine("installation rejected"); return 2; }
    }
}
