param([Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9-]{36}$')][string]$RequestId, [Parameter(Mandatory=$true)][string]$DataRoot, [ValidateSet('trust','cleanup')][string]$Operation = 'trust')
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'source-guard.ps1')
. (Join-Path $PSScriptRoot 'runtime-context.ps1')
$binding = Get-PanoKopruProductionBinding -DataRoot $DataRoot
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$helper = if ($Operation -eq 'cleanup') { Join-Path $PSScriptRoot 'cleanup-network-permissions.ps1' } else { Join-Path $PSScriptRoot 'grant-network-trust.ps1' }
$resultPath = Join-Path $binding.Context.dataRoot ('lan\network-result-' + $RequestId + '.json')
try {
    $process = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $helper + '"'), '-RequestId', $RequestId, '-DataRoot', ('"' + $binding.Context.dataRoot + '"')) -Verb RunAs -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) { Write-Output '{"ok":false}'; exit 0 }
    Get-Content -LiteralPath $resultPath -Raw -Encoding UTF8 | Write-Output
} catch {
    Write-Output '{"ok":false,"cancelled":true}'
}
