using System;
using System.Diagnostics;
using System.Threading;

// Controls only the Process handle returned by this object's Start call.
// No PID lookup, process enumeration, Kill, taskkill or external shell commands.
internal static class OwnedNode
{
    internal static void Run(ProcessStartInfo info, WaitHandle stop)
    {
        if (info.UseShellExecute || !info.RedirectStandardInput || stop == null)
            throw new InvalidOperationException("Explicit owned child pipe required.");
        if (stop.WaitOne(0)) return;
        using (Process child = Process.Start(info))
        {
            bool requested = false;
            while (!child.WaitForExit(100))
            {
                if (!requested && stop.WaitOne(0))
                {
                    requested = true;
                    try { child.StandardInput.WriteLine("shutdown"); child.StandardInput.Flush(); }
                    catch (System.IO.IOException) { /* Child may already be closing its pipe. */ }
                }
            }
            // Keep ownership while a non-cooperating child is still alive; a
            // --stop timeout must not release the mutex and imply update safety.
        }
    }
}
