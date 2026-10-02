function Test-PanoKopruRuleOwnership {
    param($Rule, [string[]]$Programs, [string]$ExpectedRuntime)
    return ($Rule.Name -cmatch '^PanoKopru-(Local-(HTTPS|mDNS)|Network-[a-f0-9]{32}-(HTTPS|mDNS))$' -and $Rule.Group -ceq 'PanoKopru' -and $Programs.Count -eq 1 -and $Programs[0] -ieq $ExpectedRuntime)
}
