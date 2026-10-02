function Get-PanoKopruContext {
    param([Parameter(Mandatory=$true)][string]$DataRoot)
    if (![IO.Path]::IsPathRooted($DataRoot) -or $DataRoot.StartsWith('\\') -or $DataRoot -match '[\x00-\x1f"<>|]') { throw 'Explicit local data root required.' }
    $full = [IO.Path]::GetFullPath($DataRoot).TrimEnd('\','/')
    $part = $full
    while ($part) {
        if ((Test-Path -LiteralPath $part) -and ((Get-Item -LiteralPath $part -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Linked data path.' }
        $part = [IO.Path]::GetDirectoryName($part)
    }
    $context = Get-Content -LiteralPath (Join-Path $full 'runtime-context.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($context.contextVersion -ne 1 -or $context.schemaVersion -ne 1 -or $context.mode -notin @('production','development','test') -or [IO.Path]::GetFullPath($context.dataRoot).TrimEnd('\','/') -ine $full) { throw 'Runtime context mismatch.' }
    $schema = Get-Content -LiteralPath (Join-Path $full 'data-schema.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($schema.version -ne 1) { throw 'Unsupported data schema.' }
    $ports = @($context.ports.api, $context.ports.desktop, $context.ports.local)
    if (@($ports | Select-Object -Unique).Count -ne 3) { throw 'Ports must differ.' }
    foreach ($port in $ports) { if ($port -lt 1024 -or $port -gt 65535 -or ($context.mode -ne 'production' -and $port -in @(32145,32146,32147))) { throw 'Invalid isolated port.' } }
    if ($context.mode -eq 'production' -and ($context.ports.api -ne 32145 -or $context.ports.desktop -ne 32146 -or $context.ports.local -ne 32147)) { throw 'Production port migration required.' }
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $identity = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($context.mode + "`n" + $full.ToLowerInvariant()))).Replace('-','').ToLowerInvariant().Substring(0,24) } finally { $sha.Dispose() }
    if ($identity -cne $context.instanceId) { throw 'Runtime identity mismatch.' }
    return $context
}

function Get-PanoKopruProductionBinding {
    param([Parameter(Mandatory=$true)][string]$DataRoot)
    $context = Get-PanoKopruContext -DataRoot $DataRoot
    if ($context.mode -ne 'production') { throw 'Production Windows operation required.' }
    # Resolve the original data owner, not the administrator's LOCALAPPDATA after UAC.
    $ownerSid = (Get-Acl -LiteralPath $context.dataRoot).GetOwner([Security.Principal.SecurityIdentifier]).Value
    if ($ownerSid -notmatch '^S-1-5-21-(\d+-){3}\d+$') { throw 'Expected an individual Windows user data owner.' }
    $profile = [Environment]::ExpandEnvironmentVariables((Get-ItemProperty -LiteralPath ('HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList\' + $ownerSid) -Name ProfileImagePath).ProfileImagePath)
    $expectedData = [IO.Path]::GetFullPath((Join-Path $profile 'AppData\Local\PanoKopru'))
    $expectedInstall = [IO.Path]::GetFullPath((Join-Path $profile 'AppData\Local\Programs\PanoKopru'))
    $app = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
    $install = [IO.Path]::GetFullPath((Join-Path $app '..'))
    if ($context.dataRoot -ine $expectedData -or $install -ine $expectedInstall -or (Split-Path $app -Leaf) -ne 'app') { throw 'Data owner / installation binding mismatch. Redirected profiles require explicit support.' }
    return [pscustomobject]@{ Context = $context; OwnerSid = $ownerSid; Runtime = (Join-Path $install 'runtime\node.exe'); InstallRoot = $install }
}
