param([switch]$Remove, [string]$DataRoot, [string]$RequestId)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'source-guard.ps1')
if (!$Remove -or !$DataRoot -or !$RequestId) { throw 'Legacy permission creation is retired. Use the application network manager. Cleanup requires a confirmed operation ID and explicit data root.' }
& (Join-Path $PSScriptRoot 'cleanup-network-permissions.ps1') -DataRoot $DataRoot -RequestId $RequestId
