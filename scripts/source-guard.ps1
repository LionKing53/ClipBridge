# Temporary development safety gate, not an authorization mechanism.
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot '..\SOURCE-CHECKOUT')) {
    throw 'Development-only checkout: Windows permission/certificate operations are blocked. See PROJECT-STATUS.md.'
}
