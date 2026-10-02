using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

// Keep this contract aligned with src/runtime-context.js; cross-language tests compare it.
internal sealed class RuntimeContext
{
    internal string Mode, DataRoot, InstanceId;
    internal int ApiPort, DesktopPort, LocalPort;
    internal string DesktopOrigin { get { return "http://127.0.0.1:" + DesktopPort; } }
    internal string MutexName(string purpose) { return "Local\\PanoKopru-" + InstanceId + "-" + purpose; }
    private static string Normalize(string value) { return Path.GetFullPath(value).TrimEnd('\\', '/').ToLowerInvariant(); }
    private static bool Within(string root, string value) { return Normalize(value) == Normalize(root) || Normalize(value).StartsWith(Normalize(root) + Path.DirectorySeparatorChar); }
    private static string Env(string name) { return Environment.GetEnvironmentVariable(name); }
    private static int Port(string name, int fallback, bool production)
    {
        string text = Env(name) ?? (production ? fallback.ToString() : ""); int value;
        if (!System.Text.RegularExpressions.Regex.IsMatch(text, "^[0-9]{1,5}$") || !Int32.TryParse(text, out value) || value < 1024 || value > 65535 || (!production && value >= 32145 && value <= 32147)) throw new InvalidOperationException("Invalid or missing isolated port.");
        if (production && value != fallback) throw new InvalidOperationException("Production port changes require an installer migration.");
        return value;
    }
    internal static RuntimeContext Load(string appRoot)
    {
        string mode = Env("PANOKOPRU_MODE");
        if (mode != "production" && mode != "development" && mode != "test") throw new InvalidOperationException("Explicit runtime mode required.");
        bool production = mode == "production";
        if (production && File.Exists(Path.Combine(appRoot, "SOURCE-CHECKOUT"))) throw new InvalidOperationException("Source checkout is not a release.");
        string local = Env("LOCALAPPDATA");
        if (String.IsNullOrEmpty(local) || !Path.IsPathRooted(local)) throw new InvalidOperationException("LOCALAPPDATA required.");
        string personal = Path.Combine(local, "PanoKopru"), install = Path.Combine(local, "Programs", "PanoKopru");
        string data = Env("PANOKOPRU_DATA_ROOT") ?? (production ? personal : null);
        if (String.IsNullOrEmpty(data) || !Path.IsPathRooted(data) || data.StartsWith("\\\\") || System.Text.RegularExpressions.Regex.IsMatch(data, "[\\x00-\\x1f\"<>|]")) throw new InvalidOperationException("Explicit local data path required.");
        data = Path.GetFullPath(data);
        if ((Within(data, personal) || Within(install, data) || Within(data, install) || Within(data, appRoot)) && !(production && Normalize(data) == Normalize(personal))) throw new InvalidOperationException("Protected data root.");
        if ((!production && Within(personal, data)) || (production && Normalize(data) != Normalize(personal))) throw new InvalidOperationException("Personal data boundary.");
        if (Within(appRoot, data) && !Within(Path.Combine(appRoot, ".local"), data)) throw new InvalidOperationException("Source-local data must be ignored.");
        for (string part = data; !String.IsNullOrEmpty(part); part = Path.GetDirectoryName(part))
            if (Directory.Exists(part) && (File.GetAttributes(part) & FileAttributes.ReparsePoint) != 0) throw new InvalidOperationException("Linked data path.");
        var result = new RuntimeContext { Mode = mode, DataRoot = data, ApiPort = Port("PANOKOPRU_API_PORT", 32145, production), DesktopPort = Port("PANOKOPRU_DESKTOP_PORT", 32146, production), LocalPort = Port("PANOKOPRU_LOCAL_PORT", 32147, production) };
        if (result.ApiPort == result.DesktopPort || result.ApiPort == result.LocalPort || result.DesktopPort == result.LocalPort) throw new InvalidOperationException("Ports must differ.");
        using (var sha = SHA256.Create()) result.InstanceId = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(mode + "\n" + Normalize(data)))).Replace("-", "").ToLowerInvariant().Substring(0, 24);
        return result;
    }
}
