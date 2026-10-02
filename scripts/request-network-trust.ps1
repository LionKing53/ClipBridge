param([Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9-]{36}$')][string]$RequestId)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'source-guard.ps1')
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$helper = Join-Path $PSScriptRoot 'grant-network-trust.ps1'
$resultPath = Join-Path $PSScriptRoot ('..\.clipboard-bridge\lan\network-result-' + $RequestId + '.json')
try {
    $process = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $helper + '"'), '-RequestId', $RequestId) -Verb RunAs -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) { Write-Output '{"ok":false}'; exit 0 }
    Get-Content -LiteralPath $resultPath -Raw -Encoding UTF8 | Write-Output
} catch {
    Write-Output '{"ok":false,"cancelled":true}'
}
