using System;
using System.Diagnostics;
using System.Threading;

// Synthetic harness only: no Program/Main, WebView, runtime context or OS adapters.
internal static class OwnedNodeProbe
{
    private static void Main(string[] args)
    {
        if (args.Length != 3) throw new Exception("Expected synthetic child paths.");
        using (var stop = new ManualResetEvent(false))
        using (var timer = new Timer(state => stop.Set(), null, 700, Timeout.Infinite))
        {
            var start = new ProcessStartInfo { FileName = args[0], Arguments = "\"" + args[1] + "\" \"" + args[2] + "\"",
                UseShellExecute = false, RedirectStandardInput = true, CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden };
            start.EnvironmentVariables.Remove("NODE_OPTIONS");
            start.EnvironmentVariables.Remove("NODE_PATH");
            OwnedNode.Run(start, stop);
        }
        Console.WriteLine("owned child stopped");
    }
}
