// Read-only Windows observations. Never install, elevate, enumerate clipboard
// data, execute candidate binaries, write registry keys or create target files.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text;
using Microsoft.Win32;
using Microsoft.Win32.SafeHandles;

public static class ClipBridgeInstallProbe
{
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool IsWow64Process2(IntPtr process, out ushort processMachine, out ushort nativeMachine);
    [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern SafeFileHandle CreateFile(string name, uint access, uint sharing, IntPtr security, uint disposition, uint flags, IntPtr template);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool GetDiskFreeSpaceEx(string directory, out ulong available, out ulong total, out ulong free);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool GetVolumePathName(string file, StringBuilder volumePath, uint length);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool GetVolumeNameForVolumeMountPoint(string mount, StringBuilder volumeName, uint length);

    static Dictionary<string, object> Record(params object[] fields)
    {
        var result = new Dictionary<string, object>();
        for (int i = 0; i < fields.Length; i += 2) result[(string)fields[i]] = fields[i + 1];
        return result;
    }
    static Exception Unknown() { return new InvalidOperationException("Windows observation unavailable."); }

    public static bool Elevated()
    {
        using (var identity = WindowsIdentity.GetCurrent())
            return new WindowsPrincipal(identity).IsInRole(WindowsBuiltInRole.Administrator);
    }
    public static object Host()
    {
        ushort processMachine, nativeMachine;
        if (!IsWow64Process2(GetCurrentProcess(), out processMachine, out nativeMachine)) throw Unknown();
        string arch = nativeMachine == 0x8664 ? "x64" : nativeMachine == 0xAA64 ? "arm64" : nativeMachine == 0x014c ? "ia32" : "unknown";
        return Record("platform", "win32", "arch", arch, "elevated", Elevated());
    }
    public static object WebView2()
    {
        const string keyName = @"Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
        var versions = new string[2];
        bool complete = true;
        for (int i = 0; i < 2; i++)
        {
            try
            {
                using (var hive = RegistryKey.OpenBaseKey(i == 0 ? RegistryHive.CurrentUser : RegistryHive.LocalMachine,
                    i == 0 ? RegistryView.Registry64 : RegistryView.Registry32))
                using (var key = hive.OpenSubKey(keyName, false))
                {
                    if (key == null) continue;
                    object value = key.GetValue("pv", null, RegistryValueOptions.DoNotExpandEnvironmentNames);
                    if (value == null) continue;
                    if (key.GetValueKind("pv") != RegistryValueKind.String) { complete = false; continue; }
                    versions[i] = (string)value;
                }
            }
            catch { complete = false; }
        }
        return Record("complete", complete, "versions", versions);
    }

    // Reject all reparse points, including junctions and mounted folders. Fail
    // closed on access errors; Directory.Exists alone would hide these errors.
    static string CheckPath(string value)
    {
        if (String.IsNullOrEmpty(value) || value.Length > 240 || !Path.IsPathRooted(value) ||
            value.StartsWith(@"\\") || value.IndexOfAny(new char[] { '\0', '"', '<', '>', '|', '*', '?' }) >= 0) throw Unknown();
        string full = Path.GetFullPath(value);
        if (full.Length < 4 || full[1] != ':' || full.Substring(2).Contains(":")) throw Unknown();
        string current = full;
        while (!String.IsNullOrEmpty(current))
        {
            try { if ((File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0) throw Unknown(); }
            catch (FileNotFoundException) { }
            catch (DirectoryNotFoundException) { }
            current = Path.GetDirectoryName(current);
        }
        return full;
    }
    public static object Destination(string value)
    {
        string target = CheckPath(value);
        string ancestor = target;
        bool absent = false;
        while (true)
        {
            try
            {
                var attributes = File.GetAttributes(ancestor);
                if (!absent || (attributes & FileAttributes.Directory) == 0) throw Unknown();
                break;
            }
            catch (FileNotFoundException) { absent = true; }
            catch (DirectoryNotFoundException) { absent = true; }
            ancestor = Path.GetDirectoryName(ancestor);
            if (String.IsNullOrEmpty(ancestor)) throw Unknown();
        }
        // OPEN_EXISTING + BACKUP_SEMANTICS opens a directory handle. Desired
        // access is FILE_ADD_FILE | FILE_ADD_SUBDIRECTORY; nothing is created.
        bool writable;
        using (var handle = CreateFile(ancestor, 0x0006, 7, IntPtr.Zero, 3, 0x02000000, IntPtr.Zero))
        {
            writable = !handle.IsInvalid;
            if (!writable && Marshal.GetLastWin32Error() != 5) throw Unknown();
        }
        var mount = new StringBuilder(1024);
        var volume = new StringBuilder(1024);
        ulong available, total, free;
        if (!GetVolumePathName(ancestor, mount, 1024) || !GetVolumeNameForVolumeMountPoint(mount.ToString(), volume, 1024) ||
            !GetDiskFreeSpaceEx(ancestor, out available, out total, out free) || available > 9007199254740991UL) throw Unknown();
        return Record("writable", writable, "volumeId", volume.ToString().ToLowerInvariant(), "freeBytes", available);
    }
    public static object NodeMetadata(string value)
    {
        string target = CheckPath(value);
        using (var stream = new FileStream(target, FileMode.Open, FileAccess.Read, FileShare.Read))
        using (var reader = new BinaryReader(stream))
        {
            if (stream.Length < 64 || reader.ReadUInt16() != 0x5A4D) throw Unknown();
            stream.Position = 0x3c;
            int peOffset = reader.ReadInt32();
            if (peOffset < 64 || peOffset > stream.Length - 24) throw Unknown();
            stream.Position = peOffset;
            if (reader.ReadUInt32() != 0x00004550) throw Unknown();
            ushort machine = reader.ReadUInt16();
            var info = FileVersionInfo.GetVersionInfo(target);
            if (info.ProductName != "Node.js" || String.IsNullOrEmpty(info.ProductVersion)) throw Unknown();
            return Record("platform", "win32", "arch", machine == 0x8664 ? "x64" : machine == 0xAA64 ? "arm64" : "ia32",
                "version", info.ProductVersion, "inspection", "pe-version-resource");
        }
    }
}
