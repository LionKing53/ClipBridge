# Fixed, narrow helper. Never executes network names, paths or commands from the request.
param([Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9-]{36}$')][string]$RequestId, [Parameter(Mandatory=$true)][string]$DataRoot)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'source-guard.ps1')
. (Join-Path $PSScriptRoot 'runtime-context.ps1')
$binding = Get-ClipBridgeProductionBinding -DataRoot $DataRoot
$appRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$installRoot = [IO.Path]::GetFullPath((Join-Path $appRoot '..'))
if ((Split-Path $installRoot -Leaf) -ne 'ClipBridge' -or (Split-Path $appRoot -Leaf) -ne 'app') { throw 'Unexpected installation.' }
$stateRoot = Join-Path $binding.Context.dataRoot 'lan'
$requestPath = Join-Path $stateRoot ('network-request-' + $RequestId + '.json')
$resultPath = Join-Path $stateRoot ('network-result-' + $RequestId + '.json')
$createdRules = @()
$originalCategory = $null
$approvedProfile = $null
try {
    if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Administrator approval required.' }
    $request = Get-Content -LiteralPath $requestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $entry = $request.entry
    $nowMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    if ($request.key -notmatch '^[a-f0-9]{32}$' -or $request.expiresAt -lt $nowMs -or $request.expiresAt -gt ($nowMs + 180000)) { throw 'Expired or invalid operation.' }
    if ($entry.id -notmatch '^\{[a-fA-F0-9-]{36}\}$' -or !$entry.name -or [string]$entry.interfaceAlias -match '[\x00-\x1f*?\[\]]') { throw 'Invalid network selection.' }
    $profiles = @(Get-NetConnectionProfile | Where-Object { [string]$_.InstanceID -eq [string]$entry.id -and [string]$_.Name -ceq [string]$entry.name -and [string]$_.InterfaceAlias -ceq [string]$entry.interfaceAlias })
    if ($profiles.Count -ne 1) { throw 'Selected network is no longer connected.' }
    $approvedProfile = $profiles[0]
    $adapter = Get-NetAdapter -InterfaceIndex $approvedProfile.InterfaceIndex
    if ([string]$adapter.InterfaceDescription -cne [string]$entry.interfaceDescription) { throw 'Adapter mismatch.' }
    $originalCategory = [string]$approvedProfile.NetworkCategory
    if ($originalCategory -notin @('Public','Private')) { throw 'Managed network cannot be changed.' }
    $runtime = $binding.Runtime
    if (!(Test-Path -LiteralPath $runtime)) { throw 'Bundled runtime missing.' }
    # One rule pair per exact network record; disconnected USB adapters are not required.
    foreach ($spec in @(@{ Suffix='HTTPS'; Protocol='TCP'; Port=$binding.Context.ports.local }, @{ Suffix='mDNS'; Protocol='UDP'; Port=5353 })) {
        $ruleName = 'ClipBridge-Network-' + $request.key + '-' + $spec.Suffix
        $existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
        if ($existing) {
            $programs = @($existing | Get-NetFirewallApplicationFilter)
            if ($existing.Group -ne 'ClipBridge' -or $programs.Count -ne 1 -or $programs[0].Program -ine $runtime) { throw 'Existing rule ownership mismatch.' }
            Set-NetFirewallRule -Name $ruleName -Enabled True -Direction Inbound -Action Allow -Profile Private -Protocol $spec.Protocol -LocalPort $spec.Port -RemoteAddress LocalSubnet -InterfaceAlias $entry.interfaceAlias -Program $runtime -EdgeTraversalPolicy Block | Out-Null
        } else {
            New-NetFirewallRule -Name $ruleName -DisplayName ('ClipBridge - trusted network ' + $spec.Suffix) -Group ClipBridge -Enabled True -Direction Inbound -Action Allow -Profile Private -Protocol $spec.Protocol -LocalPort $spec.Port -RemoteAddress LocalSubnet -InterfaceAlias $entry.interfaceAlias -Program $runtime -EdgeTraversalPolicy Block | Out-Null
            $createdRules += $ruleName
        }
    }
    $check = Get-NetConnectionProfile -InterfaceIndex $approvedProfile.InterfaceIndex
    if ([string]$check.InstanceID -ne [string]$entry.id -or [string]$check.Name -cne [string]$entry.name -or !(Test-Path -LiteralPath $requestPath) -or $request.expiresAt -lt [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()) { throw 'Network changed or operation expired.' }
    Set-NetConnectionProfile -InterfaceIndex $approvedProfile.InterfaceIndex -NetworkCategory Private
    [IO.File]::WriteAllText($resultPath, '{"ok":true}', (New-Object Text.UTF8Encoding($false)))
} catch {
    foreach ($ruleName in $createdRules) { Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue }
    # No broad profile reset: another network may already be using the same adapter.
    [IO.File]::WriteAllText($resultPath, '{"ok":false}', (New-Object Text.UTF8Encoding($false)))
    exit 1
}
