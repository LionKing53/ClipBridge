import { spawn } from "node:child_process";

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

export function setWindowsClipboard(text) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", setClipboardScript],
      { windowsHide: true, stdio: ["pipe", "ignore", "pipe"] }
    );

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `PowerShell ${code} koduyla kapandi.`));
    });

    // PowerShell 5.1 konsol girdisini sistemin OEM kod sayfasiyla okuyabilir.
    // Base64 yalnizca ASCII kullandigi icin siniri kayipsiz gecer; metni
    // PowerShell tarafinda acikca UTF-8 olarak geri donustururuz.
    child.stdin.end(Buffer.from(text, "utf8").toString("base64"), "ascii");
  });
}

export function getWindowsClipboard() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", getClipboardScript],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }
    );

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("ascii");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `PowerShell ${code} koduyla kapandi.`));
        return;
      }

      try {
        resolve(Buffer.from(stdout.trim(), "base64").toString("utf8"));
      } catch (error) {
        reject(error);
      }
    });
  });
}
