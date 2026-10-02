# Elevated once by Windows UAC. No global firewall disable, public-profile rule or router change.
param([switch]$Remove)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'source-guard.ps1')
$appRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$installRoot = [IO.Path]::GetFullPath((Join-Path $appRoot '..'))
if ((Split-Path $installRoot -Leaf) -ne 'PanoKopru' -or (Split-Path $appRoot -Leaf) -ne 'app') { throw 'Unexpected application location.' }
$stateRoot = Join-Path $appRoot '.clipboard-bridge\lan'
$resultPath = Join-Path $stateRoot 'firewall-result.json'
$ruleNames = @('PanoKopru-Local-HTTPS', 'PanoKopru-Local-mDNS')
try {
    if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Administrator approval required.' }
    if ($Remove) {
        foreach ($ruleName in $ruleNames) { Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule }
        [IO.File]::WriteAllText($resultPath, (@{ ok = $false; removed = $true; at = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
        exit 0
    }
    $settings = Get-Content -LiteralPath (Join-Path $stateRoot 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $approvedEntries = @($settings.home) + @($settings.additionalNetworks | Where-Object { $null -ne $_ })
    $currentProfiles = @(Get-NetConnectionProfile)
    $approvedProfiles = @()
    foreach ($entry in $approvedEntries) {
        if ([string]$entry.id -notmatch '^\{[a-fA-F0-9-]{36}\}$' -or !([string]$entry.interfaceAlias)) { throw 'Invalid approved network configuration.' }
        $matching = @($currentProfiles | Where-Object { [string]$_.InstanceID -eq [string]$entry.id -and [string]$_.Name -eq [string]$entry.name -and [string]$_.InterfaceAlias -eq [string]$entry.interfaceAlias })
        foreach ($candidate in $matching) {
            $adapter = Get-NetAdapter -InterfaceIndex $candidate.InterfaceIndex -ErrorAction Stop
            if ($entry.interfaceDescription -and [string]$adapter.InterfaceDescription -ne [string]$entry.interfaceDescription) { throw 'Approved adapter does not match.' }
            $approvedProfiles += $candidate
        }
    }
    if ($approvedProfiles.Count -eq 0) { throw 'No approved network is connected.' }
    $runtime = Join-Path $installRoot 'runtime\node.exe'
    if (!(Test-Path -LiteralPath $runtime)) { throw 'Bundled Node runtime not found.' }
    $approvedAliases = @($approvedEntries | ForEach-Object { [string]$_.interfaceAlias } | Select-Object -Unique)
    $presentAliases = @(Get-NetAdapter | ForEach-Object { [string]$_.Name })
    foreach ($alias in $approvedAliases) {
        if ($presentAliases -notcontains $alias) { throw ('Reconnect the approved adapter before updating firewall rules: ' + $alias) }
    }
    foreach ($candidate in $approvedProfiles) { Set-NetConnectionProfile -InterfaceIndex $candidate.InterfaceIndex -NetworkCategory Private }
    foreach ($ruleName in $ruleNames) { Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule }
    New-NetFirewallRule -Name $ruleNames[0] -DisplayName 'PanoKopru - trusted network HTTPS' -Group PanoKopru -Direction Inbound -Action Allow -Profile Private -Protocol TCP -LocalPort 32147 -RemoteAddress LocalSubnet -InterfaceAlias $approvedAliases -Program $runtime -EdgeTraversalPolicy Block | Out-Null
    New-NetFirewallRule -Name $ruleNames[1] -DisplayName 'PanoKopru - trusted network discovery' -Group PanoKopru -Direction Inbound -Action Allow -Profile Private -Protocol UDP -LocalPort 5353 -RemoteAddress LocalSubnet -InterfaceAlias $approvedAliases -Program $runtime -EdgeTraversalPolicy Block | Out-Null
    [IO.File]::WriteAllText($resultPath, (@{ ok = $true; approvedNetworks = $approvedEntries; approvedProfileIds = @($approvedEntries | ForEach-Object { [string]$_.id }); at = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json -Depth 5), (New-Object Text.UTF8Encoding($false)))
} catch {
    [IO.File]::WriteAllText($resultPath, (@{ ok = $false; at = [DateTime]::UtcNow.ToString('o'); error = $_.Exception.Message } | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
    exit 1
}
