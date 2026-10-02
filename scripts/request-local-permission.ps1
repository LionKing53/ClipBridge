$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'source-guard.ps1')
$script = Join-Path $PSScriptRoot 'enable-local-network.ps1'
# Only the fixed installation helper can be elevated; no user-provided command.
Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $script + '"')) -Verb RunAs -WindowStyle Hidden | Out-Null
Write-Output '{"requested":true}'
