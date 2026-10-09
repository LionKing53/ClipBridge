using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

// First install only. No update, migration, deletion of an installation/data,
// UAC, certificate creation, clipboard access or application launch here.
internal interface IFreshInstallSystem
{
    string LocalAppData { get; }
    string OwnerSid { get; }
    void CheckPrerequisites(string payload, long payloadBytes);
    void CreatePrivateDirectoryExclusive(string directory);
    string[] RegisterShortcuts(string installRoot, string installId, bool desktop, bool startup);
}
internal sealed class FreshInstallResult
{
    internal string InstallRoot;
    internal string[] Warnings;
}
internal static class FreshInstall
{
    internal static void Absent(string value)
    {
        InstalledLaunch.NoLinks(value);
        try { File.GetAttributes(value); }
        catch (FileNotFoundException) { return; }
        catch (DirectoryNotFoundException) { return; }
        throw new InvalidOperationException("ERR_INSTALL_EXISTING_TARGET");
    }
    private static void WriteNew(string file, string content)
    {
        InstalledLaunch.NoLinks(file);
        using (var stream = new FileStream(file, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        using (var writer = new StreamWriter(stream, new UTF8Encoding(false))) writer.Write(content);
    }
    private static void NoLegacyInstallation(string local)
    {
        // A brand change is not permission to install a second conflicting bridge.
        Absent(Path.Combine(local, "Programs", "PanoKopru"));
        Absent(Path.Combine(local, "PanoKopru"));
        Absent(Path.Combine(local, "Programs", ".PanoKopru-install-lock"));
    }
    internal static FreshInstallResult Run(IFreshInstallSystem system, string payload, string manifestHash, bool desktop, bool startup, Action<string> progress, CancellationToken cancellation = default(CancellationToken))
    {
        if (system == null || progress == null || String.IsNullOrEmpty(system.LocalAppData) || !Path.IsPathRooted(system.LocalAppData) ||
            system.LocalAppData.StartsWith("\\\\") || !System.Text.RegularExpressions.Regex.IsMatch(system.OwnerSid ?? "", "^S-1-5-(?:[0-9]+-)*[0-9]+$")) throw new InvalidOperationException("ERR_INSTALL_USER_CONTEXT");
        string local = InstalledLaunch.Full(system.LocalAppData);
        string parent = Path.Combine(local, "Programs"), target = Path.Combine(parent, "ClipBridge"), data = Path.Combine(local, "ClipBridge");
        string package = InstalledLaunch.Full(payload);
        if (package.StartsWith(target + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) || InstalledLaunch.Same(package, target) ||
            package.StartsWith(data + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) || InstalledLaunch.Same(package, data) ||
            target.StartsWith(package + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) || data.StartsWith(package + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("ERR_INSTALL_OVERLAP");
        cancellation.ThrowIfCancellationRequested();
        NoLegacyInstallation(local); Absent(target); Absent(data); InstalledLaunch.NoLinks(parent);
        progress("verify");
        var manifest = InstalledLaunch.ValidatePayload(package, manifestHash, false);
        long bytes = 0;
        foreach (Dictionary<string, object> file in (ArrayList)manifest["files"]) bytes = checked(bytes + InstalledLaunch.Number(file, "bytes"));
        progress("prerequisites"); system.CheckPrerequisites(package, bytes);
        cancellation.ThrowIfCancellationRequested();
        // Parent has no app/private data; the adapter performs race-safe exclusive
        // creation for the lock and stage below. It must not adopt an existing dir.
        if (!Directory.Exists(parent)) Directory.CreateDirectory(parent);
        InstalledLaunch.NoLinks(parent);
        string guard = Path.Combine(parent, ".ClipBridge-install-lock"), id = Guid.NewGuid().ToString("D");
        system.CreatePrivateDirectoryExclusive(guard);
        string guardRecord = Path.Combine(guard, "owner"); WriteNew(guardRecord, id);
        try
        {
            NoLegacyInstallation(local); Absent(target); Absent(data);
            string stage = Path.Combine(parent, "ClipBridge.stage-" + id);
            system.CreatePrivateDirectoryExclusive(stage);
            var receipt = new Dictionary<string, object> { { "format", 1 }, { "application", "ClipBridge" }, { "state", "staging" },
                { "ownerSid", system.OwnerSid }, { "manifestHash", manifestHash }, { "installId", id }, { "requestedDesktopShortcut", desktop }, { "requestedStartAtLogin", startup } };
            var serializer = new JavaScriptSerializer(); string receiptFile = Path.Combine(stage, "install-receipt.json");
            WriteNew(receiptFile, serializer.Serialize(receipt));
            progress("copy");
            var names = new List<string> { "release.json" };
            foreach (Dictionary<string, object> file in (ArrayList)manifest["files"]) names.Add((string)file["path"]);
            foreach (string name in names)
            {
                cancellation.ThrowIfCancellationRequested();
                string source = InstalledLaunch.SafeFile(package, name), destination = InstalledLaunch.SafeFile(stage, name);
                Directory.CreateDirectory(Path.GetDirectoryName(destination));
                InstalledLaunch.NoLinks(destination);
                File.Copy(source, destination, false);
            }
            // A changing source or an interrupted/short copy can never activate.
            InstalledLaunch.ValidatePayload(stage, manifestHash, true);
            receipt["state"] = "ready";
            string next = Path.Combine(stage, "receipt.next"); WriteNew(next, serializer.Serialize(receipt));
            File.Replace(next, receiptFile, null);
            progress("activate");
            cancellation.ThrowIfCancellationRequested();
            NoLegacyInstallation(local); Absent(target); Absent(data); InstalledLaunch.NoLinks(parent);
            Directory.Move(stage, target); // Same-volume, no overwrite; preserve failed stages for explicit review.
            InstalledLaunch.Validate(target, local, system.OwnerSid);
            progress("shortcuts");
            string[] warnings;
            try { warnings = system.RegisterShortcuts(target, id, desktop, startup); }
            catch { warnings = new [] { "ERR_INSTALL_SHORTCUTS_PARTIAL" }; }
            // The first actual app launch initializes fresh data/keys. Setup never
            // fabricates existing identity, reads a token or launches the bridge.
            return new FreshInstallResult { InstallRoot = target, Warnings = warnings };
        }
        finally
        {
            InstalledLaunch.NoLinks(guard);
            if (File.ReadAllText(guardRecord) != id) throw new InvalidOperationException("ERR_INSTALL_LOCK_CHANGED");
            File.Delete(guardRecord); Directory.Delete(guard, false);
        }
    }
}
