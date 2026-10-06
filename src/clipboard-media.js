import { runClipboardProcess as runPowerShell } from './clipboard-process.js';
import { operationError } from './errors.js';

const setImageScript = [
  "$ErrorActionPreference = 'Stop'",
  "Add-Type -AssemblyName System.Windows.Forms",
  "Add-Type -AssemblyName System.Drawing",
  "$encoded = [Console]::In.ReadToEnd()",
  "$bytes = [Convert]::FromBase64String($encoded)",
  "$stream = New-Object IO.MemoryStream(,$bytes)",
  "$source = [Drawing.Image]::FromStream($stream)",
  "$bitmap = New-Object Drawing.Bitmap($source)",
  "[Windows.Forms.Clipboard]::SetDataObject($bitmap, $true)",
  "$bitmap.Dispose()",
  "$source.Dispose()",
  "$stream.Dispose()"
].join("; ");

const setImageAndFileScript = [
  "$ErrorActionPreference = 'Stop'",
  "Add-Type -AssemblyName System.Windows.Forms",
  "Add-Type -AssemblyName System.Drawing",
  "$encoded = [Console]::In.ReadToEnd()",
  "$json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encoded))",
  "$payload = $json | ConvertFrom-Json",
  "$bytes = [Convert]::FromBase64String([string]$payload.data)",
  "$stream = New-Object IO.MemoryStream(,$bytes)",
  "$source = [Drawing.Image]::FromStream($stream)",
  "$bitmap = New-Object Drawing.Bitmap($source)",
  "$files = New-Object Collections.Specialized.StringCollection",
  "[void]$files.Add([IO.Path]::GetFullPath([string]$payload.path))",
  "$dataObject = New-Object Windows.Forms.DataObject",
  "$dataObject.SetImage($bitmap)",
  "$dataObject.SetFileDropList($files)",
  "[Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)",
  "$bitmap.Dispose()",
  "$source.Dispose()",
  "$stream.Dispose()"
].join("; ");

const setFilesScript = [
  "$ErrorActionPreference = 'Stop'",
  "Add-Type -AssemblyName System.Windows.Forms",
  "$encoded = [Console]::In.ReadToEnd()",
  "$json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encoded))",
  "$paths = @($json | ConvertFrom-Json)",
  "$files = New-Object Collections.Specialized.StringCollection",
  "foreach ($path in $paths) { [void]$files.Add([IO.Path]::GetFullPath([string]$path)) }",
  "[Windows.Forms.Clipboard]::SetFileDropList($files)"
].join("; ");

const getItemScript = [
  "$ErrorActionPreference = 'Stop'",
  "Add-Type -AssemblyName System.Windows.Forms",
  "Add-Type -AssemblyName System.Drawing",
  "if ([Windows.Forms.Clipboard]::ContainsFileDropList()) {",
  "  $paths = @([Windows.Forms.Clipboard]::GetFileDropList() | ForEach-Object { [string]$_ })",
  "  $item = [pscustomobject]@{ type = 'files'; paths = $paths }",
  "} elseif ([Windows.Forms.Clipboard]::ContainsImage()) {",
  "  $image = [Windows.Forms.Clipboard]::GetImage()",
  "  $stream = New-Object IO.MemoryStream",
  "  $image.Save($stream, [Drawing.Imaging.ImageFormat]::Png)",
  "  $item = [pscustomobject]@{ type = 'image'; mimeType = 'image/png'; data = [Convert]::ToBase64String($stream.ToArray()) }",
  "  $stream.Dispose()",
  "  $image.Dispose()",
  "} else {",
  "  $text = [Windows.Forms.Clipboard]::GetText()",
  "  $item = [pscustomobject]@{ type = 'text'; content = [string]$text }",
  "}",
  "$json = $item | ConvertTo-Json -Compress -Depth 4",
  "$bytes = [Text.Encoding]::UTF8.GetBytes($json)",
  "[Console]::Out.Write([Convert]::ToBase64String($bytes))"
].join("; ");

export async function setWindowsClipboardImage(data) {
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new Error("Bos gorsel Windows panosuna yazilamaz.");
  }
  await runPowerShell(setImageScript, data.toString("base64"), { sta: true });
}

export async function setWindowsClipboardImageAndFile(data, filePath) {
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new Error("Bos gorsel Windows panosuna yazilamaz.");
  }
  if (!filePath) {
    throw new Error("Gorselin dosya yolu belirtilmedi.");
  }
  const payload = Buffer.from(JSON.stringify({
    data: data.toString("base64"),
    path: filePath
  }), "utf8").toString("base64");
  await runPowerShell(setImageAndFileScript, payload, { sta: true });
}

export async function setWindowsClipboardFiles(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error("Windows panosuna yazilacak dosya yok.");
  }
  const encoded = Buffer.from(JSON.stringify(paths), "utf8").toString("base64");
  await runPowerShell(setFilesScript, encoded, { sta: true });
}

export async function getWindowsClipboardItem() {
  const encoded = (await runPowerShell(getItemScript, "", { sta: true, operation: 'read' })).trim();
  let item;
  try { item = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')); }
  catch { throw operationError('ERR_CLIPBOARD_READ'); }
  if (!item || !['image', 'files', 'text'].includes(item.type)) throw operationError('ERR_CLIPBOARD_READ');
  if (item.type === "image") {
    item.data = Buffer.from(item.data, "base64");
  }
  return item;
}
