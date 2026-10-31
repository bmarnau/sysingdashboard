$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'invoke-p1-toolchain-gates.ps1')

$failures = 0
function Assert-Equal {
  param([object] $Actual, [object] $Expected, [string] $Name)
  if ($Actual -ne $Expected) {
    Write-Host "FAIL: $Name (expected '$Expected', got '$Actual')"
    $script:failures++
  } else {
    Write-Host "PASS: $Name"
  }
}

$names = Get-DependencyVolumeNames -LockHash '0123456789abcdef' -ImageDigest 'sha256:abcdef0123456789'
Assert-Equal $names.NodeModules 'sysingdashboard-gg-deps-0123456789ab-abcdef012345-node-modules' 'derives node-modules volume from dependency contract'
Assert-Equal $names.BunCache 'sysingdashboard-gg-deps-0123456789ab-abcdef012345-bun-cache' 'derives bun cache volume from dependency contract'

if ($failures -gt 0) { exit 1 }
Write-Host 'PASS: invoke-p1-toolchain-gates contract'
