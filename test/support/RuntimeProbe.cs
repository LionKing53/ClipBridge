using System;
internal static class RuntimeProbe
{
    private static int Main(string[] args)
    {
        try {
            var context = RuntimeContext.Load(args[0]);
            Console.WriteLine(context.InstanceId + "|" + context.ApiPort + "|" + context.DesktopPort + "|" + context.LocalPort);
            return 0;
        } catch { Console.Error.WriteLine("Invalid runtime context"); return 1; }
    }
}
