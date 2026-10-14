using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Threading;
using System.Web.Script.Serialization;

internal static class EmbeddedPayloadProbe
{
    static int Main(string[] args)
    {
        string fixture = args[0], temporary = Path.Combine(fixture, "temp"), scenario = args[2];
        Directory.CreateDirectory(temporary); string digest = args[1];
        EmbeddedPayload extracted = null; var cancellation = new CancellationTokenSource(); bool ok = false, cleaned = false, isolated = false;
        int stale = -1; string error = "";
        try {
            using (var memory = new MemoryStream()) {
                using (var zip = new ZipArchive(memory, ZipArchiveMode.Create, true)) {
                    foreach (string file in Directory.GetFiles(Path.Combine(fixture,"payload"), "*", SearchOption.AllDirectories)) {
                        string name = file.Substring(Path.Combine(fixture,"payload").Length + 1).Replace('\\','/');
                        if (scenario == "missing" && name == "runtime/node.exe") continue;
                        var entry = zip.CreateEntry(name);
                        using (var output = entry.Open()) {
                            byte[] bytes = File.ReadAllBytes(file);
                            if (scenario == "tamper" && name == "app/src/server.js") bytes[0] ^= 1;
                            output.Write(bytes,0,bytes.Length);
                        }
                    }
                    string extra = scenario == "traversal" ? "../escape" : scenario == "ads" ? "file:stream" :
                        scenario == "absolute" ? "C:/escape" : scenario == "duplicate" ? "RELEASE.JSON" : scenario == "link" ? "link" :
                        scenario == "unlisted" ? "foreign" : scenario == "reserved" ? "CON.txt" : scenario == "directory" ? "folder/" : null;
                    if (extra != null) { var entry = zip.CreateEntry(extra); if (scenario == "link") entry.ExternalAttributes = 0xa000 << 16; using (var stream = entry.Open()) stream.WriteByte(1); }
                }
                memory.Position = 0; string archiveHash = EmbeddedPayload.Hash(memory, CancellationToken.None); memory.Position = 0;
                if (scenario == "bad-archive") archiveHash = new string('0',64);
                if (scenario == "bad-manifest") digest = new string('0',64);
                if (scenario == "cancel-before") cancellation.Cancel();
                extracted = EmbeddedPayload.Prepare(memory, archiveHash, digest, temporary, directory => {
                    FreshInstall.Absent(directory); Directory.CreateDirectory(directory);
                }, cancellation.Token, name => {
                    if (scenario == "cancel-during") cancellation.Cancel();
                    if (scenario == "write-failure") throw new IOException("synthetic disk failure");
                });
            }
            isolated = !File.Exists(Path.Combine(fixture,"escape"));
            if (scenario == "install-remove") {
                string local = Path.Combine(fixture,"Local"); Directory.CreateDirectory(local);
                var system = new SyntheticFreshInstall { Root = local, Scenario = "ok" };
                var result = FreshInstall.Run(system, extracted.Payload, digest, false, false, step => { });
                string data = Path.Combine(local,"ClipBridge"); Directory.CreateDirectory(data); File.WriteAllText(Path.Combine(data,"retained"),"synthetic-data");
                RemoveInstall.Run(system, digest);
                if (Directory.Exists(result.InstallRoot) || File.ReadAllText(Path.Combine(data,"retained")) != "synthetic-data") throw new Exception("preservation");
            }
            if (scenario.StartsWith("stale") || scenario == "foreign-remnant") {
                string root = extracted.Root;
                Directory.SetLastWriteTimeUtc(root, DateTime.UtcNow.AddDays(-2));
                if (scenario == "stale-active") stale = EmbeddedPayload.CleanAbandoned(temporary, directory => true, CancellationToken.None);
                else {
                    // Simulate abrupt process termination: close only the lease,
                    // deliberately bypassing Dispose, never kill a process.
                    var field = typeof(EmbeddedPayload).GetField("lease", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                    ((FileStream)field.GetValue(extracted)).Dispose(); field.SetValue(extracted,null);
                    if (scenario == "foreign-remnant") File.WriteAllText(Path.Combine(root,"foreign"),"untouched");
                    if (scenario == "stale-linked") {
                        // A synthetic junction is created by Node before this probe.
                        Directory.Move(Path.Combine(fixture,"linked"),Path.Combine(root,"payload","linked"));
                    }
                    stale = EmbeddedPayload.CleanAbandoned(temporary, directory => scenario != "stale-owner", CancellationToken.None);
                }
            }
            ok = true;
        } catch (OperationCanceledException) { error = "cancelled"; }
        catch { error = "rejected"; }
        finally {
            if (extracted != null) { extracted.Dispose(); cleaned = extracted.CleanupSucceeded; }
            else cleaned = Directory.GetDirectories(temporary).Length == 0;
        }
        Console.WriteLine(new JavaScriptSerializer().Serialize(new { ok, error, cleaned, isolated, stale, remnants = Directory.GetDirectories(temporary).Length }));
        return 0;
    }
}
