# Fixed, narrow helper. Never executes network names, paths or commands from the request.
param([Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9-]{36}$')][string]$RequestId)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'source-guard.ps1')
$appRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$installRoot = [IO.Path]::GetFullPath((Join-Path $appRoot '..'))
if ((Split-Path $installRoot -Leaf) -ne 'PanoKopru' -or (Split-Path $appRoot -Leaf) -ne 'app') { throw 'Unexpected installation.' }
$stateRoot = Join-Path $appRoot '.clipboard-bridge\lan'
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
    $runtime = Join-Path $installRoot 'runtime\node.exe'
    if (!(Test-Path -LiteralPath $runtime)) { throw 'Bundled runtime missing.' }
    # One rule pair per exact network record; disconnected USB adapters are not required.
    foreach ($spec in @(@{ Suffix='HTTPS'; Protocol='TCP'; Port=32147 }, @{ Suffix='mDNS'; Protocol='UDP'; Port=5353 })) {
        $ruleName = 'PanoKopru-Network-' + $request.key + '-' + $spec.Suffix
        $existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
        if ($existing) {
            Set-NetFirewallRule -Name $ruleName -Enabled True -Direction Inbound -Action Allow -Profile Private -Protocol $spec.Protocol -LocalPort $spec.Port -RemoteAddress LocalSubnet -InterfaceAlias $entry.interfaceAlias -Program $runtime -EdgeTraversalPolicy Block | Out-Null
        } else {
            New-NetFirewallRule -Name $ruleName -DisplayName ('PanoKopru - trusted network ' + $spec.Suffix) -Group PanoKopru -Enabled True -Direction Inbound -Action Allow -Profile Private -Protocol $spec.Protocol -LocalPort $spec.Port -RemoteAddress LocalSubnet -InterfaceAlias $entry.interfaceAlias -Program $runtime -EdgeTraversalPolicy Block | Out-Null
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
