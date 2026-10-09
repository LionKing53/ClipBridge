function Test-ClipBridgeRuleOwnership {
    param($Rule, [string[]]$Programs, [string]$ExpectedRuntime)
    $ownedName = $Rule.Name -cmatch '^(ClipBridge|PanoKopru)-(Local-(HTTPS|mDNS)|Network-[a-f0-9]{32}-(HTTPS|mDNS))$'
    $matchedGroup = ($Rule.Group -ceq 'ClipBridge' -and $Rule.Name.StartsWith('ClipBridge-')) -or ($Rule.Group -ceq 'PanoKopru' -and $Rule.Name.StartsWith('PanoKopru-'))
    return ($ownedName -and $matchedGroup -and $Programs.Count -eq 1 -and $Programs[0] -ieq $ExpectedRuntime)
}
