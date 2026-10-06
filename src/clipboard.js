import { runClipboardProcess } from './clipboard-process.js';

const setClipboardScript = [
  "$ErrorActionPreference = 'Stop'",
  "$encoded = [Console]::In.ReadToEnd()",
  "$bytes = [Convert]::FromBase64String($encoded)",
  "$text = [Text.Encoding]::UTF8.GetString($bytes)",
  "Set-Clipboard -Value $text"
].join("; ");

const getClipboardScript = [
  "$ErrorActionPreference = 'Stop'",
  "$text = Get-Clipboard -Raw",
  "if ($null -eq $text) { $text = '' }",
  "$bytes = [Text.Encoding]::UTF8.GetBytes([string]$text)",
  "[Console]::Out.Write([Convert]::ToBase64String($bytes))"
].join("; ");

export async function setWindowsClipboard(text) {
  // ASCII Base64 avoids Windows PowerShell's OEM console encoding.
  await runClipboardProcess(setClipboardScript, Buffer.from(text, 'utf8').toString('base64'));
}

export async function getWindowsClipboard() {
  const stdout = await runClipboardProcess(getClipboardScript, '', { operation: 'read' });
  return Buffer.from(stdout.trim(), 'base64').toString('utf8');
}
