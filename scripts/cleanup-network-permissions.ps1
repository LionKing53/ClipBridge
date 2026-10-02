param([Parameter(Mandatory=$true)][string]$DataRoot, [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9-]{36}$')][string]$RequestId)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'source-guard.ps1')
. (Join-Path $PSScriptRoot 'runtime-context.ps1')
. (Join-Path $PSScriptRoot 'firewall-ownership.ps1')
$binding = Get-PanoKopruProductionBinding -DataRoot $DataRoot
$requestPath = Join-Path $binding.Context.dataRoot ('lan\network-request-' + $RequestId + '.json')
$resultPath = Join-Path $binding.Context.dataRoot ('lan\network-result-' + $RequestId + '.json')
try {
    if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Administrator approval required.' }
    $request = Get-Content -LiteralPath $requestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    if ($request.operation -cne 'cleanup' -or $request.expiresAt -lt $now -or $request.expiresAt -gt ($now + 180000)) { throw 'Invalid cleanup operation.' }
    $removed = 0
    foreach ($rule in @(Get-NetFirewallRule -Group PanoKopru -ErrorAction SilentlyContinue)) {
        $programs = @($rule | Get-NetFirewallApplicationFilter | ForEach-Object { [string]$_.Program })
        if (Test-PanoKopruRuleOwnership -Rule $rule -Programs $programs -ExpectedRuntime $binding.Runtime) {
            if (!(Test-Path -LiteralPath $requestPath) -or $request.expiresAt -lt [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()) { throw 'Cleanup expired.' }
            $rule | Remove-NetFirewallRule
            $removed++
        }
    }
    # Never modify Windows network categories, Tailscale Serve, or certificates here.
    [IO.File]::WriteAllText($resultPath, (@{ ok=$true; removed=$removed } | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding($false)))
} catch {
    [IO.File]::WriteAllText($resultPath, '{"ok":false}', (New-Object Text.UTF8Encoding($false)))
    exit 1
}
