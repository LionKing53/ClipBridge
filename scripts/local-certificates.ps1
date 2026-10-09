param([ValidateSet('Ensure','Load')][string]$Mode = 'Ensure', [Parameter(Mandatory=$true)][string]$Address, [Parameter(Mandatory=$true)][string]$DataRoot)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'source-guard.ps1')
. (Join-Path $PSScriptRoot 'runtime-context.ps1')
$context = Get-ClipBridgeContext -DataRoot $DataRoot
if ($context.mode -ne 'production') { throw 'Certificate operations require production mode.' }
Add-Type -AssemblyName System.Security
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
$appRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$stateRoot = Join-Path $context.dataRoot 'lan'
$settings = Get-Content -LiteralPath (Join-Path $stateRoot 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($settings.hostname -notmatch '^(clipbridge|panokopru)-[a-f0-9]{8}\.local$') { throw 'Invalid local hostname.' }
$parsedAddress = $null
if (![Net.IPAddress]::TryParse($Address, [ref]$parsedAddress) -or $parsedAddress.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) { throw 'Invalid address.' }
$metadataPath = Join-Path $stateRoot 'certificate.json'
$metadata = $null
if (Test-Path -LiteralPath $metadataPath) { $metadata = Get-Content -LiteralPath $metadataPath -Raw -Encoding UTF8 | ConvertFrom-Json }
$root = $null
if ($metadata -and $metadata.rootThumbprint -match '^[A-Fa-f0-9]{40}$') {
    $root = Get-Item -LiteralPath ('Cert:\CurrentUser\My\' + $metadata.rootThumbprint) -ErrorAction SilentlyContinue
}
if ($Mode -eq 'Ensure') {
    if (!$root) {
        if ($metadata) { throw 'Local CA key is unavailable. Do not silently replace a trusted root.' }
        $root = New-SelfSignedCertificate -Type Custom -Subject ('CN=ClipBridge Local CA ' + $settings.hostname.Split('.')[0]) -FriendlyName 'ClipBridge Local CA - NOT a Windows trusted root' -CertStoreLocation 'Cert:\CurrentUser\My' -Provider 'Microsoft Software Key Storage Provider' -KeyAlgorithm RSA -KeyLength 3072 -HashAlgorithm SHA256 -KeyExportPolicy NonExportable -KeyUsage CertSign,CRLSign -TextExtension @('2.5.29.19={critical}{text}ca=1&pathlength=0') -NotAfter (Get-Date).AddYears(10)
        $metadata = [pscustomobject]@{ rootThumbprint = $root.Thumbprint; leafExpires = ''; address = '' }
        [IO.File]::WriteAllText($metadataPath, ($metadata | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
        Export-Certificate -Cert $root -FilePath (Join-Path $stateRoot 'ClipBridge-Local-CA.cer') -Type CERT | Out-Null
    }
    $refresh = $metadata.address -ne $Address -or !(Test-Path -LiteralPath (Join-Path $stateRoot 'server.pfx')) -or !(Test-Path -LiteralPath (Join-Path $stateRoot 'password.dpapi'))
    if (!$refresh) { try { $refresh = [DateTime]::Parse($metadata.leafExpires).ToUniversalTime() -lt [DateTime]::UtcNow.AddDays(30) } catch { $refresh = $true } }
    if ($refresh) {
        $leaf = New-SelfSignedCertificate -Type Custom -Subject ('CN=' + $settings.hostname) -Signer $root -CertStoreLocation 'Cert:\CurrentUser\My' -Provider 'Microsoft Software Key Storage Provider' -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 -KeyExportPolicy Exportable -KeyUsage DigitalSignature,KeyEncipherment -TextExtension @('2.5.29.19={critical}{text}ca=0', '2.5.29.37={text}1.3.6.1.5.5.7.3.1', ('2.5.29.17={text}DNS=' + $settings.hostname + '&IPAddress=' + $Address)) -NotAfter (Get-Date).AddDays(365)
        try {
            $random = New-Object byte[] 32
            $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
            $rng.GetBytes($random); $rng.Dispose()
            $password = [Convert]::ToBase64String($random)
            Export-PfxCertificate -Cert $leaf -FilePath (Join-Path $stateRoot 'server.pfx') -Password (ConvertTo-SecureString $password -AsPlainText -Force) -ChainOption EndEntityCertOnly | Out-Null
            $protected = [Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($password), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
            [IO.File]::WriteAllBytes((Join-Path $stateRoot 'password.dpapi'), $protected)
            $metadata.address = $Address; $metadata.leafExpires = $leaf.NotAfter.ToUniversalTime().ToString('o')
            [IO.File]::WriteAllText($metadataPath, ($metadata | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
        } finally {
            # Remove only the temporary exported leaf from the personal certificate store.
            Remove-Item -LiteralPath ('Cert:\CurrentUser\My\' + $leaf.Thumbprint) -Force
        }
    }
    $metadata | ConvertTo-Json -Compress
} else {
    $protected = [IO.File]::ReadAllBytes((Join-Path $stateRoot 'password.dpapi'))
    $plain = [Security.Cryptography.ProtectedData]::Unprotect($protected, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
    # This output is consumed privately by the server; never print or log it.
    [pscustomobject]@{ passphrase = [Text.Encoding]::UTF8.GetString($plain) } | ConvertTo-Json -Compress
}
