using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;

// Only unpack reviewed bytes; never execute a payload. OS operations are injected
// in tests. Same-user malicious code is outside this local-integrity boundary.
internal sealed class EmbeddedPayload : IDisposable
{
    internal string Root, Payload;
    internal bool CleanupSucceeded = true;
    FileStream lease;
    string id, digest;
    Dictionary<string, long> inventory;
    const long MaxTotal = 2L * 1024 * 1024 * 1024;
    static Exception Invalid() { return new InvalidOperationException("ERR_INSTALL_EMBEDDED_PAYLOAD"); }
    internal static string Hash(Stream stream, CancellationToken cancellation)
    {
        using (var sha = SHA256.Create()) {
            byte[] buffer = new byte[65536]; int count;
            while ((count = stream.Read(buffer, 0, buffer.Length)) > 0) { cancellation.ThrowIfCancellationRequested(); sha.TransformBlock(buffer, 0, count, null, 0); }
            cancellation.ThrowIfCancellationRequested(); sha.TransformFinalBlock(new byte[0], 0, 0);
            return BitConverter.ToString(sha.Hash).Replace("-", "").ToLowerInvariant();
        }
    }
    static byte[] ReadBounded(Stream stream, long size, CancellationToken cancellation)
    {
        if (size < 0 || size > 4 * 1024 * 1024) throw Invalid();
        using (var memory = new MemoryStream()) { CopyBounded(stream, memory, size, cancellation); return memory.ToArray(); }
    }
    static void CopyBounded(Stream input, Stream output, long size, CancellationToken cancellation)
    {
        byte[] bytes = new byte[65536]; long total = 0; int count;
        while ((count = input.Read(bytes, 0, bytes.Length)) > 0) {
            cancellation.ThrowIfCancellationRequested(); total = checked(total + count);
            if (total > size) throw Invalid(); output.Write(bytes, 0, count);
        }
        if (total != size) throw Invalid(); cancellation.ThrowIfCancellationRequested();
    }
    static Dictionary<string, long> Inventory(byte[] raw, string expected, string root)
    {
        using (var memory = new MemoryStream(raw)) if (Hash(memory, CancellationToken.None) != expected) throw Invalid();
        var json = new JavaScriptSerializer { MaxJsonLength = 4 * 1024 * 1024, RecursionLimit = 16 };
        var manifest = json.Deserialize<Dictionary<string, object>>(new UTF8Encoding(false, true).GetString(raw));
        object list;
        if (InstalledLaunch.Number(manifest, "format") != 1 || !manifest.TryGetValue("files", out list) || !(list is ArrayList) || ((ArrayList)list).Count > 10000) throw Invalid();
        var result = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase); long total = raw.Length;
        result.Add("release.json", raw.Length);
        foreach (object value in (ArrayList)list) {
            var record = value as Dictionary<string, object>;
            if (record == null || !record.ContainsKey("path") || !record.ContainsKey("sha256")) throw Invalid();
            string name = record["path"] as string, sha = record["sha256"] as string;
            InstalledLaunch.SafeFile(root, name);
            long size = InstalledLaunch.Number(record, "bytes"); total = checked(total + size);
            if (size < 0 || size > 1024L * 1024 * 1024 || total > MaxTotal || !Regex.IsMatch(sha ?? "", "^[a-f0-9]{64}$") ||
                result.ContainsKey(name) || name.Equals("install-receipt.json", StringComparison.OrdinalIgnoreCase)) throw Invalid();
            result.Add(name, size);
        }
        return result;
    }
    internal static EmbeddedPayload Prepare(Stream resource, string archiveHash, string manifestHash, string temporary,
        Action<string> createExclusive, CancellationToken cancellation, Action<string> extracting = null)
    {
        if (resource == null || !resource.CanSeek || resource.Length > MaxTotal || !Regex.IsMatch(archiveHash ?? "", "^[a-f0-9]{64}$") ||
            !Regex.IsMatch(manifestHash ?? "", "^[a-f0-9]{64}$") || createExclusive == null) throw Invalid();
        if (String.IsNullOrEmpty(temporary) || !Path.IsPathRooted(temporary)) throw Invalid();
        temporary = InstalledLaunch.Full(temporary);
        if (!Regex.IsMatch(temporary, "^[a-zA-Z]:\\\\") || !Directory.Exists(temporary)) throw Invalid();
        InstalledLaunch.NoLinks(temporary); cancellation.ThrowIfCancellationRequested();
        resource.Position = 0; if (Hash(resource, cancellation) != archiveHash) throw Invalid(); resource.Position = 0;
        using (var archive = new ZipArchive(resource, ZipArchiveMode.Read, true)) {
            var entries = new Dictionary<string, ZipArchiveEntry>(StringComparer.OrdinalIgnoreCase);
            foreach (var entry in archive.Entries) {
                InstalledLaunch.SafeFile(temporary, entry.FullName);
                int type = (entry.ExternalAttributes >> 16) & 0xf000;
                if (entries.ContainsKey(entry.FullName) || (type != 0 && type != 0x8000) || (entry.ExternalAttributes & (int)FileAttributes.ReparsePoint) != 0) throw Invalid();
                entries.Add(entry.FullName, entry);
                if (entries.Count > 10001) throw Invalid();
            }
            ZipArchiveEntry manifest;
            if (!entries.TryGetValue("release.json", out manifest) || manifest.FullName != "release.json") throw Invalid();
            byte[] raw; using (var stream = manifest.Open()) raw = ReadBounded(stream, manifest.Length, cancellation);
            string id = Guid.NewGuid().ToString("D"), root = Path.Combine(temporary, "ClipBridgeSetup-" + id), payload = Path.Combine(root, "payload");
            var names = Inventory(raw, manifestHash, payload);
            if (entries.Count != names.Count) throw Invalid();
            foreach (var pair in entries) if (!names.ContainsKey(pair.Key) || pair.Value.Length != names[pair.Key]) throw Invalid();
            // Exclusive creation and private ACL must happen before any bytes land.
            createExclusive(root); InstalledLaunch.NoLinks(root);
            var result = new EmbeddedPayload { Root = root, Payload = payload, id = id, digest = manifestHash, inventory = names };
            try {
                result.lease = new FileStream(Path.Combine(root, "lease"), FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None);
                WriteNew(Path.Combine(root, "manifest.json"), raw);
                WriteNew(Path.Combine(root, "owner"), Encoding.ASCII.GetBytes(id + "\n" + manifestHash));
                Directory.CreateDirectory(payload);
                foreach (var pair in entries) {
                    cancellation.ThrowIfCancellationRequested(); string file = InstalledLaunch.SafeFile(payload, pair.Key);
                    Directory.CreateDirectory(Path.GetDirectoryName(file)); InstalledLaunch.NoLinks(file);
                    using (var input = pair.Value.Open())
                    using (var output = new FileStream(file, FileMode.CreateNew, FileAccess.Write, FileShare.None)) CopyBounded(input, output, names[pair.Key], cancellation);
                    if (extracting != null) extracting(pair.Key);
                }
                cancellation.ThrowIfCancellationRequested(); InstalledLaunch.ValidatePayload(payload, manifestHash, false);
                cancellation.ThrowIfCancellationRequested(); return result;
            } catch (Exception error) {
                result.Dispose(); if (!result.CleanupSucceeded) error.Data["setupCleanupIncomplete"] = true; throw;
            }
        }
    }
    static void WriteNew(string file, byte[] bytes) {
        InstalledLaunch.NoLinks(file); using (var stream = new FileStream(file, FileMode.CreateNew, FileAccess.Write, FileShare.None)) stream.Write(bytes, 0, bytes.Length);
    }
    bool Clean()
    {
        try {
            InstalledLaunch.NoLinks(Root);
            if (Path.GetFileName(Root) != "ClipBridgeSetup-" + id) return false;
            var files = new List<string>(); var directories = new List<string>();
            var allowedDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { InstalledLaunch.Full(Payload) };
            foreach (string name in inventory.Keys) {
                string file = InstalledLaunch.SafeFile(Payload, name), parent = Path.GetDirectoryName(file);
                while (!InstalledLaunch.Same(parent, Root)) { allowedDirs.Add(InstalledLaunch.Full(parent)); parent = Path.GetDirectoryName(parent); }
            }
            Collect(Root, files, directories, allowedDirs);
            // Validate everything before deleting anything. Never traverse links
            // or recursively delete an arbitrary temp root or an unknown file.
            foreach (string file in files) { InstalledLaunch.NoLinks(file); File.Delete(file); }
            directories.Reverse(); foreach (string directory in directories) { InstalledLaunch.NoLinks(directory); Directory.Delete(directory, false); }
            Directory.Delete(Root, false); return true;
        } catch { return false; }
    }
    void Collect(string directory, List<string> files, List<string> directories, HashSet<string> allowedDirs)
    {
        InstalledLaunch.NoLinks(directory);
        foreach (string path in Directory.GetFileSystemEntries(directory)) {
            InstalledLaunch.NoLinks(path);
            if (Directory.Exists(path)) {
                if (!allowedDirs.Contains(InstalledLaunch.Full(path))) throw Invalid();
                directories.Add(path); Collect(path, files, directories, allowedDirs);
            } else {
                string relative = path.Substring(Root.Length + 1).Replace('\\', '/');
                if (relative != "lease" && relative != "manifest.json" && relative != "owner" &&
                    (!relative.StartsWith("payload/", StringComparison.Ordinal) || !inventory.ContainsKey(relative.Substring(8)))) throw Invalid();
                files.Add(path);
            }
        }
    }
    public void Dispose() {
        if (lease != null) { lease.Dispose(); lease = null; }
        CleanupSucceeded = !Directory.Exists(Root) || Clean();
    }
    internal static int CleanAbandoned(string temporary, Func<string, bool> ownsDirectory, CancellationToken cancellation)
    {
        InstalledLaunch.NoLinks(temporary); int cleaned = 0, inspected = 0;
        foreach (string root in Directory.EnumerateDirectories(temporary, "ClipBridgeSetup-*")) {
            cancellation.ThrowIfCancellationRequested(); if (++inspected > 32) break;
            FileStream held = null;
            try {
                InstalledLaunch.NoLinks(root); Guid parsed;
                string name = Path.GetFileName(root), id = name.Substring("ClipBridgeSetup-".Length);
                if (!Guid.TryParseExact(id, "D", out parsed) || DateTime.UtcNow - Directory.GetLastWriteTimeUtc(root) < TimeSpan.FromHours(24) || !ownsDirectory(root)) continue;
                string owner = Path.Combine(root, "owner"), raw = Path.Combine(root, "manifest.json");
                InstalledLaunch.NoLinks(owner); InstalledLaunch.NoLinks(raw); InstalledLaunch.NoLinks(Path.Combine(root,"lease"));
                if (new FileInfo(owner).Length > 200 || new FileInfo(raw).Length > 4 * 1024 * 1024) continue;
                string[] record = File.ReadAllText(owner).Split('\n');
                if (record.Length != 2 || record[0] != id || !Regex.IsMatch(record[1], "^[a-f0-9]{64}$")) continue;
                held = new FileStream(Path.Combine(root, "lease"), FileMode.Open, FileAccess.ReadWrite, FileShare.None);
                var item = new EmbeddedPayload { Root = root, Payload = Path.Combine(root,"payload"), id = id, digest = record[1] };
                item.inventory = Inventory(File.ReadAllBytes(raw), record[1], item.Payload);
                held.Dispose(); held = null;
                if (item.Clean()) cleaned++;
            } catch { /* Inactive, owned and valid only; preserve unrecognized remnants. */ }
            finally { if (held != null) held.Dispose(); }
        }
        return cleaned;
    }
    [StructLayout(LayoutKind.Sequential)] struct SecurityAttributes { public int length; public IntPtr descriptor; public int inherit; }
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "CreateDirectoryW")]
    static extern bool MakeDirectory(string path, ref SecurityAttributes attributes);
    internal static void CreatePrivateDirectory(string path)
    {
        InstalledLaunch.NoLinks(path);
        var user = WindowsIdentity.GetCurrent().User; var acl = new DirectorySecurity();
        acl.SetOwner(user); acl.SetAccessRuleProtection(true, false);
        foreach (string sid in new [] { user.Value, "S-1-5-18", "S-1-5-32-544" })
            acl.AddAccessRule(new FileSystemAccessRule(new SecurityIdentifier(sid), FileSystemRights.FullControl,
                InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
        byte[] descriptor = acl.GetSecurityDescriptorBinaryForm(); IntPtr memory = Marshal.AllocHGlobal(descriptor.Length);
        try {
            Marshal.Copy(descriptor, 0, memory, descriptor.Length);
            var attributes = new SecurityAttributes { length = Marshal.SizeOf(typeof(SecurityAttributes)), descriptor = memory, inherit = 0 };
            if (!MakeDirectory(path, ref attributes)) throw new InvalidOperationException("ERR_INSTALL_EXCLUSIVE_DIRECTORY");
        } finally { Marshal.FreeHGlobal(memory); }
    }
    internal static bool IsCurrentOwner(string path) {
        return Directory.GetAccessControl(path).GetOwner(typeof(SecurityIdentifier)).Equals(WindowsIdentity.GetCurrent().User);
    }
}
