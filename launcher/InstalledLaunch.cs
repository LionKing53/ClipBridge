using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;

// Read-only installed-layout contract. An installer must create the receipt
// only after validating/copying the package. This is local integrity, NOT a
// publisher signature or permission to deploy an engineering candidate.
internal static class InstalledLaunch
{
    private static Exception Invalid() { return new InvalidOperationException("Installation receipt or payload is missing, changed or not ready."); }
    internal static string Full(string value) { return Path.GetFullPath(value).TrimEnd('\\', '/'); }
    internal static bool Same(string a, string b) { return String.Equals(Full(a), Full(b), StringComparison.OrdinalIgnoreCase); }
    internal static void NoLinks(string path)
    {
        for (string part = Full(path); !String.IsNullOrEmpty(part); part = Path.GetDirectoryName(part))
        {
            // File.GetAttributes also covers dangling reparse entries; only truly
            // absent ancestors may be ignored. No link traversal is permitted.
            try { if ((File.GetAttributes(part) & FileAttributes.ReparsePoint) != 0) throw Invalid(); }
            catch (FileNotFoundException) { }
            catch (DirectoryNotFoundException) { }
        }
    }
    private static Dictionary<string, object> Json(string file, int limit)
    {
        NoLinks(file); var info = new FileInfo(file);
        if (!info.Exists || info.Length > limit) throw Invalid();
        var serializer = new JavaScriptSerializer { MaxJsonLength = limit, RecursionLimit = 16 };
        return serializer.Deserialize<Dictionary<string, object>>(File.ReadAllText(file));
    }
    private static string Text(Dictionary<string, object> value, string key)
    {
        object item; return value != null && value.TryGetValue(key, out item) ? item as string : null;
    }
    internal static long Number(Dictionary<string, object> value, string key)
    {
        object item;
        if (value == null || !value.TryGetValue(key, out item) || (!(item is int) && !(item is long))) throw Invalid();
        return Convert.ToInt64(item);
    }
    private static string Hash(string file)
    {
        using (var stream = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.Read))
        using (var sha = SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").ToLowerInvariant();
    }
    internal static string SafeFile(string root, string relative)
    {
        if (String.IsNullOrEmpty(relative) || !Regex.IsMatch(relative, "^[a-zA-Z0-9_.@/-]+$") || relative.StartsWith("/")) throw Invalid();
        foreach (string part in relative.Split('/'))
            if (part == "" || part == "." || part == ".." || part.EndsWith(".") || Regex.IsMatch(part, "^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\\.|$)", RegexOptions.IgnoreCase)) throw Invalid();
        string file = Path.Combine(root, relative.Replace('/', Path.DirectorySeparatorChar));
        if (!Full(file).StartsWith(Full(root) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw Invalid();
        NoLinks(file); return file;
    }
    private static void CheckInventory(string root, string directory, HashSet<string> names, bool installed)
    {
        NoLinks(directory);
        foreach (string entry in Directory.GetFileSystemEntries(directory))
        {
            NoLinks(entry);
            if (Directory.Exists(entry)) CheckInventory(root, entry, names, installed);
            else
            {
                string relative = entry.Substring(Full(root).Length + 1).Replace('\\', '/');
                if (!(installed && relative == "install-receipt.json") && relative != "release.json" && !names.Contains(relative)) throw Invalid();
            }
        }
    }
    // Parameters are supplied from the Windows user profile in Program. Synthetic
    // tests pass a temporary profile and never load the real user's installation.
    internal static string Validate(string installRoot, string localAppData, string ownerSid)
    {
        if (String.IsNullOrEmpty(localAppData) || !Path.IsPathRooted(localAppData) || localAppData.StartsWith("\\\\")) throw Invalid();
        string expected = Path.Combine(localAppData, "Programs", "ClipBridge");
        if (!Same(installRoot, expected)) throw Invalid();
        NoLinks(installRoot);
        if (File.Exists(Path.Combine(installRoot, "app", "SOURCE-CHECKOUT")) || File.Exists(Path.Combine(installRoot, "SOURCE-CHECKOUT"))) throw Invalid();
        var receipt = Json(Path.Combine(installRoot, "install-receipt.json"), 8192);
        string digest = Text(receipt, "manifestHash");
        if (Number(receipt, "format") != 1 || Text(receipt, "application") != "ClipBridge" || Text(receipt, "state") != "ready" ||
            Text(receipt, "ownerSid") != ownerSid || String.IsNullOrEmpty(ownerSid) || !Regex.IsMatch(digest ?? "", "^[a-f0-9]{64}$")) throw Invalid();
        ValidatePayload(installRoot, digest, true);
        string data = Path.Combine(localAppData, "ClipBridge"); NoLinks(data); return data;
    }
    internal static Dictionary<string, object> ValidatePayload(string installRoot, string digest, bool installed)
    {
        NoLinks(installRoot);
        if (!Regex.IsMatch(digest ?? "", "^[a-f0-9]{64}$") || File.Exists(Path.Combine(installRoot, "app", "SOURCE-CHECKOUT")) ||
            File.Exists(Path.Combine(installRoot, "SOURCE-CHECKOUT")) || File.Exists(Path.Combine(installRoot, "NOT-INSTALLABLE.txt"))) throw Invalid();
        string manifestFile = Path.Combine(installRoot, "release.json");
        var manifest = Json(manifestFile, 4 * 1024 * 1024);
        if (Hash(manifestFile) != digest || Number(manifest, "format") != 1 || Number(manifest, "schemaMin") > 1 || Number(manifest, "schemaMin") < 1 ||
            Number(manifest, "schemaMax") < 1 || !Regex.IsMatch(Text(manifest, "commit") ?? "", "^[a-f0-9]{40}$") ||
            !Regex.IsMatch(Text(manifest, "version") ?? "", "^\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9.-]+)?$")) throw Invalid();
        object entries;
        if (!manifest.TryGetValue("files", out entries) || !(entries is ArrayList)) throw Invalid();
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (object item in (ArrayList)entries)
        {
            var metadata = item as Dictionary<string, object>; string relative = Text(metadata, "path");
            string file = SafeFile(installRoot, relative);
            if (!names.Add(relative) || relative.Equals("release.json", StringComparison.OrdinalIgnoreCase) || relative.Equals("install-receipt.json", StringComparison.OrdinalIgnoreCase)) throw Invalid();
            long bytes = Number(metadata, "bytes");
            if (bytes < 0 || new FileInfo(file).Length != bytes || Hash(file) != Text(metadata, "sha256")) throw Invalid();
        }
        foreach (string required in new [] { "ClipBridge.exe", "runtime/node.exe", "app/src/server.js", "Microsoft.Web.WebView2.Core.dll", "Microsoft.Web.WebView2.WinForms.dll", "WebView2Loader.dll" })
            if (!names.Contains(required)) throw Invalid();
        CheckInventory(Full(installRoot), Full(installRoot), names, installed);
        return manifest;
    }
    internal static void ConfigureEnvironment(string installRoot)
    {
        // An explicit development/test environment is never silently promoted.
        string mode = Environment.GetEnvironmentVariable("CLIPBRIDGE_MODE");
        if (mode != null && mode != "production") throw Invalid();
        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string data = Validate(installRoot, local, System.Security.Principal.WindowsIdentity.GetCurrent().User.Value);
        foreach (var pair in new Dictionary<string, string> { { "CLIPBRIDGE_MODE", "production" }, { "CLIPBRIDGE_DATA_ROOT", data },
            { "CLIPBRIDGE_API_PORT", "32145" }, { "CLIPBRIDGE_DESKTOP_PORT", "32146" }, { "CLIPBRIDGE_LOCAL_PORT", "32147" }, { "LOCALAPPDATA", local } })
        {
            string old = Environment.GetEnvironmentVariable(pair.Key);
            if (old != null && !String.Equals(old.TrimEnd('\\','/'), pair.Value.TrimEnd('\\','/'), StringComparison.OrdinalIgnoreCase)) throw Invalid();
        }
        Environment.SetEnvironmentVariable("CLIPBRIDGE_MODE", "production");
        Environment.SetEnvironmentVariable("CLIPBRIDGE_DATA_ROOT", data);
        Environment.SetEnvironmentVariable("LOCALAPPDATA", local);
    }
}
