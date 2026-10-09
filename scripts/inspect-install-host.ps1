param(
    [Parameter(Mandatory = $true)][ValidateSet('Host', 'WebView2', 'Destination', 'NodeMetadata')][string]$Operation,
    [string]$TargetBase64 = ''
)
# Narrow read-only diagnostic, not a production launcher or permission helper.
# No UAC, registry writes, target writes, clipboard, network configuration or CA.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try {
    Add-Type -Path (Join-Path $PSScriptRoot 'InstallProbe.cs')
    if ($Operation -ne 'Host' -and [ClipBridgeInstallProbe]::Elevated()) { throw 'Original non-elevated user required.' }
    $targetPath = ''
    if ($TargetBase64) { $targetPath = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($TargetBase64)) }
    $observation = switch ($Operation) {
        'Host' { [ClipBridgeInstallProbe]::Host() }
        'WebView2' { [ClipBridgeInstallProbe]::WebView2() }
        'Destination' { [ClipBridgeInstallProbe]::Destination($targetPath) }
        'NodeMetadata' { [ClipBridgeInstallProbe]::NodeMetadata($targetPath) }
    }
    $observation | ConvertTo-Json -Compress -Depth 4
} catch {
    # Never echo the target, caller identity, native exception or registry data.
    [Console]::Error.WriteLine('ERR_INSTALL_WINDOWS_PROBE')
    exit 1
}
