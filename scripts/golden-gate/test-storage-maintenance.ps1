$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'storage-maintenance.ps1')

$failures = 0
function Assert-Equal {
  param([object] $Actual, [object] $Expected, [string] $Name)
  if ($Actual -ne $Expected) { Write-Host "FAIL: $Name (expected '$Expected', got '$Actual')"; $script:failures++ }
  else { Write-Host "PASS: $Name" }
}

$fixture = Join-Path ([System.IO.Path]::GetTempPath()) "gg-storage-maintenance-$PID"
New-Item -ItemType Directory -Path $fixture -Force | Out-Null
try {
  New-Item -ItemType Directory -Path (Join-Path $fixture 'sysingdashboard-p1-candidate-old') | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $fixture 'foreign-project-cache') | Out-Null
  $candidates = @(Get-GoldenGateTmpCandidates -TmpRoot $fixture)
  Assert-Equal $candidates.Count 1 'includes only known Golden-Gate candidate'
  Assert-Equal $candidates[0].Id 'sysingdashboard-p1-candidate-old' 'uses directory name as deterministic candidate id'
  Assert-Equal (Test-ManagedTmpPath -Path (Join-Path $fixture 'sysingdashboard-p1-candidate-old') -TmpRoot $fixture) $true 'accepts managed child path'
  Assert-Equal (Test-ManagedTmpPath -Path "$fixture-sibling\sysingdashboard-p1-candidate-old" -TmpRoot $fixture) $false 'rejects prefix-matching sibling path'
  $quarantine = Join-Path $fixture '.golden-gate-quarantine'
  $blocked = Invoke-QuarantineCandidate -Candidate $candidates[0] -TmpRoot $fixture -QuarantineRoot $quarantine -ConfirmationToken ''
  Assert-Equal $blocked.Status 'BLOCKED' 'blocks quarantine without token'
  $moved = Invoke-QuarantineCandidate -Candidate $candidates[0] -TmpRoot $fixture -QuarantineRoot $quarantine -ConfirmationToken 'QUARANTINE_GOLDEN_GATE_TMP'
  Assert-Equal $moved.Status 'PASS' 'quarantines known candidate with token'
  Assert-Equal (Test-Path -LiteralPath $moved.TargetPath) $true 'creates quarantine target'
  $restored = Invoke-RestoreCandidate -QuarantinePath $moved.TargetPath -ConfirmationToken 'RESTORE_GOLDEN_GATE_TMP'
  Assert-Equal $restored.Status 'PASS' 'restores quarantined candidate with token'
  Assert-Equal (Test-Path -LiteralPath $candidates[0].Path) $true 'restores original path'
} finally {
  Remove-Item -LiteralPath $fixture -Recurse -Force -ErrorAction SilentlyContinue
}

if ($failures -gt 0) { exit 1 }
Write-Host 'PASS: storage-maintenance inventory contract'
