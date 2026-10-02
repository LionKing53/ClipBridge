param([Parameter(Mandatory=$true)][string]$DataRoot)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'source-guard.ps1')
. (Join-Path $PSScriptRoot 'runtime-context.ps1')
$context = Get-PanoKopruContext -DataRoot $DataRoot
if ($context.mode -ne 'production' -or [IO.Path]::GetFullPath($context.dataRoot) -ine [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'PanoKopru'))) { throw 'Only current-user application data may be protected.' }
$stateRoot = $context.dataRoot
$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetOwner([Security.Principal.WindowsIdentity]::GetCurrent().User)
$acl.SetAccessRuleProtection($true, $false)
foreach ($sid in @([Security.Principal.WindowsIdentity]::GetCurrent().User.Value, 'S-1-5-18', 'S-1-5-32-544')) {
    $identity = New-Object Security.Principal.SecurityIdentifier($sid)
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $stateRoot -AclObject $acl
Write-Output '{"protected":true}'
