$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$profiles = @(Get-NetConnectionProfile | Where-Object { $_.InterfaceAlias -notmatch 'Tailscale|Loopback' })
$result = @()
foreach ($profile in $profiles) {
    $adapter = Get-NetAdapter -InterfaceIndex $profile.InterfaceIndex -ErrorAction Stop
    $gateway = Get-NetRoute -InterfaceIndex $profile.InterfaceIndex -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Select-Object -First 1
    if (!$gateway) { continue }
    $addresses = @(Get-NetIPAddress -InterfaceIndex $profile.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.AddressState -eq 'Preferred' -and !$_.SkipAsSource })
    foreach ($address in $addresses) {
        $result += [pscustomobject]@{
            id = [string]$profile.InstanceID; name = [string]$profile.Name
            interfaceAlias = [string]$profile.InterfaceAlias; interfaceIndex = [int]$profile.InterfaceIndex
            interfaceDescription = [string]$adapter.InterfaceDescription
            category = [string]$profile.NetworkCategory; address = [string]$address.IPAddress
            prefixLength = [int]$address.PrefixLength; gateway = [string]$gateway.NextHop
        }
    }
}
ConvertTo-Json -InputObject @($result) -Compress
