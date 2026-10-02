$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'source-guard.ps1')
$stateRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\.clipboard-bridge\lan'))
$acl = Get-Acl -LiteralPath $stateRoot
$acl.SetAccessRuleProtection($true, $false)
foreach ($sid in @([Security.Principal.WindowsIdentity]::GetCurrent().User.Value, 'S-1-5-18', 'S-1-5-32-544')) {
    $identity = New-Object Security.Principal.SecurityIdentifier($sid)
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $stateRoot -AclObject $acl
Write-Output '{"protected":true}'
