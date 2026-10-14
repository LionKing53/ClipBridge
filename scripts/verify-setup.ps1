param([Parameter(Mandatory=$true)][string]$Candidate)
# Read resources as metadata only. No Setup methods, Main or OS adapters invoked.
$ErrorActionPreference = 'Stop'
foreach ($buildModule in @('Microsoft.PowerShell.Management','Microsoft.PowerShell.Utility','Microsoft.PowerShell.Security')) {
    Import-Module -Name ([IO.Path]::Combine($PSHOME,'Modules',$buildModule,$buildModule+'.psd1')) -ErrorAction Stop
}
Add-Type -AssemblyName System.IO.Compression
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$work = [IO.Path]::GetFullPath((Join-Path $project $Candidate))
if (!$work.StartsWith((Join-Path $project 'build') + '\', [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($work) -notmatch '^candidate-[a-f0-9-]{36}$') { throw 'Owned candidate required' }
function Assert-NoLinks([string]$value) {
    for ($part=$value; $part; $part=[IO.Path]::GetDirectoryName($part)) {
        if ((Test-Path -LiteralPath $part) -and ((Get-Item -LiteralPath $part -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Linked verification input' }
    }
}
Assert-NoLinks $work
$candidateEvidence = Get-Content -LiteralPath (Join-Path $work 'candidate-evidence.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$evidence = Get-Content -LiteralPath (Join-Path $work 'setup-build-evidence.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$exe = Join-Path $work 'ClipBridgeSetup.exe'; Assert-NoLinks $exe
if (!$evidence.standalone -or (Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant() -ne $evidence.executableSHA256 -or $evidence.commit -ne $candidateEvidence.commit -or $evidence.payloadManifestHash -ne $candidateEvidence.hash) { throw 'Setup evidence mismatch' }
$assembly = [Reflection.Assembly]::ReflectionOnlyLoadFrom($exe)
$policyStream = $assembly.GetManifestResourceStream('SetupPolicy')
try { $reader=New-Object IO.StreamReader($policyStream); $policy=$reader.ReadToEnd() | ConvertFrom-Json } finally { if($reader){$reader.Dispose()} }
if ($policy.manifestHash -ne $candidateEvidence.hash -or $policy.payloadArchiveHash -ne $evidence.embeddedPayload.sha256) { throw 'Embedded policy mismatch' }
$resource = $assembly.GetManifestResourceStream('SetupPayload')
if (!$resource -or !$resource.CanSeek) { throw 'Missing embedded payload' }
try {
    $sha=[Security.Cryptography.SHA256]::Create()
    try { $digest=[BitConverter]::ToString($sha.ComputeHash($resource)).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
    if($digest -ne $policy.payloadArchiveHash){throw 'Embedded archive mismatch'}
    $resource.Position=0
    $zip=New-Object IO.Compression.ZipArchive($resource,[IO.Compression.ZipArchiveMode]::Read,$true)
    try {
        $manifestPath=Join-Path $work 'payload/release.json'; Assert-NoLinks $manifestPath
        if((Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $policy.manifestHash){throw 'Manifest mismatch'}
        $manifest=Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if($manifest.commit -ne $evidence.commit -or $manifest.version -ne $evidence.version){throw 'Source/version mismatch'}
        $expected=@{'release.json'=@{sha256=$policy.manifestHash;bytes=(Get-Item -LiteralPath $manifestPath).Length}}
        foreach($file in $manifest.files){if($expected.ContainsKey($file.path)){throw 'Duplicate manifest path'};$expected[$file.path]=@{sha256=$file.sha256;bytes=$file.bytes}}
        $seen=@{}
        foreach($entry in $zip.Entries){
            $name=$entry.FullName
            if(!$expected.ContainsKey($name) -or $seen.ContainsKey($name) -or $name -match '(^/|\\|:|(^|/)\.\.?(/|$))' -or (($entry.ExternalAttributes -shr 16) -band 61440) -eq 40960 -or $entry.Length -ne $expected[$name].bytes){throw 'Unsafe, unexpected or changed entry'}
            $seen[$name]=$true; $stream=$entry.Open(); $sha=[Security.Cryptography.SHA256]::Create()
            try {$digest=[BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','').ToLowerInvariant()}finally{$stream.Dispose();$sha.Dispose()}
            if($digest -ne $expected[$name].sha256){throw 'Embedded file hash mismatch'}
        }
        if($seen.Count -ne $expected.Count -or $seen.Count -ne $evidence.embeddedPayload.entries){throw 'Missing entries'}
    }finally{$zip.Dispose()}
}finally{$resource.Dispose()}
$report=[ordered]@{format=1;version=$evidence.version;commit=$evidence.commit;standalone=$true;executableSHA256=$evidence.executableSHA256;payloadArchiveSHA256=$policy.payloadArchiveHash;manifestSHA256=$policy.manifestHash;verifiedEntries=$seen.Count;entryPointInvoked=$false;installed=$false;cleanDeviceAcceptance='pending';passed=$true}
$target=Join-Path $work 'embedded-resource-review.json'; Assert-NoLinks $target
$json=$report | ConvertTo-Json -Depth 6
$stream=[IO.File]::Open($target,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
try{$bytes=[Text.Encoding]::UTF8.GetBytes($json);$stream.Write($bytes,0,$bytes.Length)}finally{$stream.Dispose()}
$json
