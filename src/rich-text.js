import { spawn } from "node:child_process";

// Detect the actual RTF header: Shortcuts may label it text/plain or octet-stream.
export function isRtf(value) {
  const prefix = Buffer.isBuffer(value) ? value.subarray(0, 128).toString("latin1") : value.slice(0, 128);
  return /^\{\\rtf\d+\b/.test(prefix);
}

export function isFlatRtfd(value) {
  return Buffer.isBuffer(value) && value.subarray(0, 4).toString("ascii") === "rtfd";
}

// Apple flat-RTFD v0 directory: names, block sizes, then file blocks.
// Read only TXT.rtf, in memory. Keep packages with attachments as files.
export function extractFlatRtfdText(bytes) {
  if (!isFlatRtfd(bytes)) return null;
  function invalid() {
    const error = new Error("RTFD metin paketi okunamadi.");
    error.statusCode = 422;
    return error;
  }
  let offset = 4;
  function uint32() {
    if (offset + 4 > bytes.length) throw invalid();
    const value = bytes.readUInt32LE(offset);
    offset += 4;
    return value;
  }
  if (uint32() !== 0 || uint32() !== 3) throw invalid();
  const count = uint32();
  if (count < 1 || count > 1024) throw invalid();
  const names = [];
  for (let i = 0; i < count; i++) {
    const length = uint32();
    if (length < 1 || length > 4096 || offset + length > bytes.length) throw invalid();
    names.push(bytes.subarray(offset, offset + length).toString("utf8"));
    offset += length;
  }
  const sizes = names.map(() => uint32());
  let rtf = null;
  for (let i = 0; i < count; i++) {
    const end = offset + sizes[i];
    if (sizes[i] < 8 || end > bytes.length) throw invalid();
    if (names[i] === "TXT.rtf") {
      if (rtf !== null || uint32() !== 1) throw invalid();
      const length = uint32();
      if (length !== end - offset) throw invalid();
      rtf = bytes.subarray(offset, end);
      if (!isRtf(rtf)) throw invalid();
    }
    offset = end;
  }
  if (offset !== bytes.length || !rtf) throw invalid();
  if (names.some(name => name !== "TXT.rtf" && name !== ".")) return null;
  return rtf;
}

const script = [
  "$ErrorActionPreference = 'Stop'",
  "Add-Type -AssemblyName System.Windows.Forms",
  "$bytes = [Convert]::FromBase64String([Console]::In.ReadToEnd())",
  "$stream = New-Object IO.MemoryStream(,$bytes)",
  "$box = New-Object Windows.Forms.RichTextBox",
  "try {",
  "  $box.DetectUrls = $false",
  "  $box.LoadFile($stream, [Windows.Forms.RichTextBoxStreamType]::RichText)",
  "  [Console]::Out.Write([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($box.Text)))",
  "} finally { $box.Dispose(); $stream.Dispose() }"
].join("\n");

export async function rtfToText(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-STA", "-Command", script], {
      windowsHide: true, stdio: ["pipe", "pipe", "pipe"], timeout: 15000
    });
    let output = "";
    child.stdout.setEncoding("ascii");
    child.stdout.on("data", chunk => { output += chunk; });
    // Never include document contents or native parser diagnostics in logs.
    child.stderr.resume();
    child.on("error", reject);
    child.stdin.on("error", () => {});
    child.on("close", code => {
      if (code !== 0) {
        const error = new Error("RTF metni okunamadi.");
        error.statusCode = 422;
        reject(error);
      } else {
        resolve(Buffer.from(output, "base64").toString("utf8"));
      }
    });
    child.stdin.end(bytes.toString("base64"), "ascii");
  });
}

export async function normalizeClipboardItem(item) {
  const value = item.type === "text" ? item.content : item.type === "file" ? item.data : null;
  if (isFlatRtfd(value)) {
    const rtf = extractFlatRtfdText(value);
    if (rtf) return { type: "text", content: await rtfToText(rtf) };
  }
  if (value != null && isRtf(value)) {
    return { type: "text", content: await rtfToText(value) };
  }
  return item;
}
