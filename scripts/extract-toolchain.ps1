param([Parameter(Mandatory=$true)][string]$OutputDirectory)
# Build-only extraction of exact pinned entries. No installer or runtime launch.
$ErrorActionPreference = 'Stop'
# PowerShell 7 parents can pass a module path incompatible with Windows PS 5.1.
# Load the trusted modules beside this engine, not inherited user/module paths.
foreach ($buildModule in @('Microsoft.PowerShell.Management', 'Microsoft.PowerShell.Utility', 'Microsoft.PowerShell.Security')) {
    Import-Module -Name ([IO.Path]::Combine($PSHOME, 'Modules', $buildModule, $buildModule + '.psd1')) -ErrorAction Stop
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$build = Join-Path $project 'build'
$output = [IO.Path]::GetFullPath($OutputDirectory)
if (!$output.StartsWith($build + '\', [StringComparison]::OrdinalIgnoreCase) -or (Test-Path -LiteralPath $output)) { throw 'New build-only output required.' }
for ($part = $output; $part; $part = [IO.Path]::GetDirectoryName($part)) {
    if ((Test-Path -LiteralPath $part) -and ((Get-Item -LiteralPath $part -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Linked build path.' }
}
$lock = Get-Content -LiteralPath (Join-Path $project 'toolchain-lock.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($lock.format -ne 1 -or $lock.target -ne 'win-x64') { throw 'Unsupported toolchain.' }
$selected = @{
    'node' = @{
        'node-v24.15.0-win-x64/node.exe' = 'runtime/node.exe'
        'node-v24.15.0-win-x64/LICENSE' = 'licenses/node-LICENSE.txt'
    }
    'webview2-sdk' = @{
        'lib/net462/Microsoft.Web.WebView2.Core.dll' = 'sdk/Microsoft.Web.WebView2.Core.dll'
        'lib/net462/Microsoft.Web.WebView2.WinForms.dll' = 'sdk/Microsoft.Web.WebView2.WinForms.dll'
        'runtimes/win-x64/native/WebView2Loader.dll' = 'sdk/WebView2Loader.dll'
        'LICENSE.txt' = 'licenses/webview2-LICENSE.txt'
        'NOTICE.txt' = 'licenses/webview2-NOTICE.txt'
    }
}
if (@($lock.artifacts).Count -ne 2) { throw 'Unexpected artifact count.' }
$records = @()
foreach ($artifact in $lock.artifacts) {
    if (!$selected.ContainsKey($artifact.id) -or $artifact.file -notmatch '^[a-zA-Z0-9_.-]+$') { throw 'Unexpected artifact.' }
    $archivePath = Join-Path (Join-Path $build 'toolchain-downloads') $artifact.file
    for ($part = $archivePath; $part; $part = [IO.Path]::GetDirectoryName($part)) {
        if ((Get-Item -LiteralPath $part -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked archive path.' }
    }
    $expected = $artifact.integrity
    if ($artifact.encoding -eq 'base64') { $expected = [BitConverter]::ToString([Convert]::FromBase64String($expected)).Replace('-','') }
    if ((Get-FileHash -LiteralPath $archivePath -Algorithm $artifact.algorithm.ToUpperInvariant()).Hash -ine $expected) { throw 'Artifact digest mismatch.' }
    $zip = [IO.Compression.ZipFile]::OpenRead($archivePath)
    try {
        foreach ($name in $selected[$artifact.id].Keys) {
            $entries = @($zip.Entries | Where-Object { $_.FullName -ceq $name })
            if ($entries.Count -ne 1) { throw 'Required archive entry is missing or duplicated.' }
            $entry = $entries[0]
            if ($entry.Length -le 0 -or $entry.Length -gt 104857600 -or (($entry.ExternalAttributes -shr 16) -band 61440) -eq 40960) { throw 'Unsafe selected entry.' }
            $relative = $selected[$artifact.id][$name]
            $target = Join-Path $output $relative
            [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
            $inputStream = $entry.Open()
            try {
                $outputStream = [IO.File]::Open($target, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
                try { $inputStream.CopyTo($outputStream) } finally { $outputStream.Dispose() }
            } finally { $inputStream.Dispose() }
            if ((Get-Item -LiteralPath $target).Length -ne $entry.Length) { throw 'Extracted length mismatch.' }
            $records += [pscustomobject]@{ path = $relative; bytes = $entry.Length; sha256 = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() }
        }
    } finally { $zip.Dispose() }
}
$nodeSignature = Get-AuthenticodeSignature -LiteralPath (Join-Path $output 'runtime\node.exe')
if ($nodeSignature.Status -ne 'Valid' -or $nodeSignature.SignerCertificate.Subject -notmatch '(^|, )O=OpenJS Foundation(,|$)') { throw 'Node Authenticode publisher validation failed.' }
[pscustomobject]@{ format = 1; nodeAuthenticode = 'Valid'; nodePublisher = 'OpenJS Foundation'; files = $records } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $output 'toolchain-evidence.json') -Encoding UTF8
Write-Output 'Pinned toolchain entries extracted; Node publisher verified.'
