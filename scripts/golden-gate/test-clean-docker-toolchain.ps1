$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'clean-docker-toolchain.ps1')

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

$volumes = @(
  [pscustomobject]@{ Name = 'sysingdashboard-gg-deps-old'; Labels = @{}; Used = $false },
  [pscustomobject]@{ Name = 'sysingdashboard-gg-deps-active'; Labels = @{}; Used = $true },
  [pscustomobject]@{ Name = 'another-project-cache'; Labels = @{}; Used = $false }
)
$containers = @(
  [pscustomobject]@{ Id = 'stopped'; Labels = @{ 'org.sysingdashboard.golden-gate' = 'true' }; Running = $false },
  [pscustomobject]@{ Id = 'running'; Labels = @{ 'org.sysingdashboard.golden-gate' = 'true' }; Running = $true },
  [pscustomobject]@{ Id = 'foreign'; Labels = @{}; Running = $false }
)

$candidates = Get-GoldenGateCleanupCandidates -Volumes $volumes -Containers $containers
Assert-Equal $candidates.Volumes.Count 1 'selects only unused Golden-Gate volumes'
Assert-Equal $candidates.Volumes[0].Name 'sysingdashboard-gg-deps-old' 'selects named dependency volume'
Assert-Equal $candidates.Containers.Count 1 'selects only stopped labelled containers'
Assert-Equal $candidates.Containers[0].Id 'stopped' 'selects stopped labelled container'

$blocked = Test-GoldenGateCleanupAuthorization -Apply:$true -ConfirmationToken ''
Assert-Equal $blocked.Allowed $false 'rejects apply without confirmation token'
$authorized = Test-GoldenGateCleanupAuthorization -Apply:$true -ConfirmationToken 'CLEAN_GOLDEN_GATE_CACHE'
Assert-Equal $authorized.Allowed $true 'permits explicitly confirmed apply'
$plan = Test-GoldenGateCleanupAuthorization -Apply:$false -ConfirmationToken ''
Assert-Equal $plan.Allowed $true 'permits non-destructive plan'

$scriptText = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'clean-docker-toolchain.ps1') -Raw
Assert-Equal $scriptText.Contains('exit (Invoke-GoldenGateDockerCleanup') $false 'does not suppress direct-run inventory output'

if ($failures -gt 0) { exit 1 }
Write-Host 'PASS: clean-docker-toolchain contract'
