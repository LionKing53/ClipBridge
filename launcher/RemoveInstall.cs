using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Web.Script.Serialization;

internal interface IRemoveInstallSystem
{
    string LocalAppData { get; }
    string OwnerSid { get; }
    void CreatePrivateDirectoryExclusive(string path);
    IDisposable StopAndCleanPermissions(string installRoot);
    void RemoveOwnedShortcuts(string installRoot, string installId);
}
// External setup removes only a validated installation of its pinned release.
// Data, Windows profile, CA store and Tailscale are never deleted/reset here.
internal static class RemoveInstall
{
    internal static void Run(IRemoveInstallSystem system, string expectedHash)
    {
        string root = Path.Combine(system.LocalAppData, "Programs", "PanoKopru");
        InstalledLaunch.Validate(root, system.LocalAppData, system.OwnerSid);
        var manifest = InstalledLaunch.ValidatePayload(root, expectedHash, true);
        var receipt = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(File.ReadAllText(Path.Combine(root, "install-receipt.json")));
        string id = receipt.ContainsKey("installId") ? receipt["installId"] as string : null; Guid parsed;
        if (!Guid.TryParseExact(id, "D", out parsed)) throw new InvalidOperationException("ERR_REMOVE_OWNERSHIP");
        string guard = Path.Combine(Path.GetDirectoryName(root), ".PanoKopru-install-lock");
        system.CreatePrivateDirectoryExclusive(guard);
        string marker = Path.Combine(guard, "owner"), operation = Guid.NewGuid().ToString("D");
        File.WriteAllText(marker, operation);
        bool deleting = false;
        IDisposable stopped = null;
        try
        {
            // A cancelled UAC or a live/hung process leaves the program installed.
            stopped = system.StopAndCleanPermissions(root);
            InstalledLaunch.Validate(root, system.LocalAppData, system.OwnerSid);
            InstalledLaunch.ValidatePayload(root, expectedHash, true);
            system.RemoveOwnedShortcuts(root, id);
            deleting = true;
            // Only sealed inventory files, never recursive deletion or data.
            foreach (Dictionary<string, object> item in (ArrayList)manifest["files"])
                File.Delete(InstalledLaunch.SafeFile(root, (string)item["path"]));
            File.Delete(InstalledLaunch.SafeFile(root, "release.json"));
            File.Delete(InstalledLaunch.SafeFile(root, "install-receipt.json"));
            RemoveEmpty(root);
            deleting = false;
        }
        finally
        {
            if (stopped != null) stopped.Dispose();
            // Partial deletion must not allow an automatic restart. Keep the
            // maintenance guard for review rather than guessing what remains.
            if (!deleting) { InstalledLaunch.NoLinks(marker); if (File.ReadAllText(marker) != operation) throw new InvalidOperationException("ERR_REMOVE_LOCK"); File.Delete(marker); Directory.Delete(guard, false); }
        }
    }
    static void RemoveEmpty(string root)
    {
        InstalledLaunch.NoLinks(root);
        foreach (string child in Directory.GetDirectories(root)) RemoveEmpty(child);
        Directory.Delete(root, false); // Unexpected files stop removal, never erased.
    }
}
