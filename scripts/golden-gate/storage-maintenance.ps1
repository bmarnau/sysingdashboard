[CmdletBinding()]
param(
  [ValidateSet('Plan', 'Quarantine', 'Restore', 'Purge')]
  [string] $Mode = 'Plan',
  [ValidateSet('Docker', 'Tmp', 'All')]
  [string] $Scope = 'All',
  [string] $CandidateId = '',
  [string] $ConfirmationToken = '',
  [switch] $Interactive,
  [string] $TmpRoot = 'C:\tmp',
  [string] $QuarantineRoot = 'C:\tmp\.golden-gate-quarantine'
)

$ErrorActionPreference = 'Stop'
$CandidatePattern = 'sysingdashboard-p1-candidate-*'

function Resolve-NormalizedPath {
  param([string] $Path)
  return [System.IO.Path]::GetFullPath($Path).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
}

function Test-ManagedTmpPath {
  param([string] $Path, [string] $TmpRoot)
  try {
    $root = Resolve-NormalizedPath $TmpRoot
    $candidate = Resolve-NormalizedPath $Path
    $prefix = "$root$([System.IO.Path]::DirectorySeparatorChar)"
    return $candidate.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)
  } catch { return $false }
}

function Get-GoldenGateTmpCandidates {
  param([string] $TmpRoot)
  if (-not (Test-Path -LiteralPath $TmpRoot -PathType Container)) { return @() }
  return @(
    Get-ChildItem -LiteralPath $TmpRoot -Directory -Force | Where-Object {
      $_.Name -like $CandidatePattern -and -not ($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint)
    } | ForEach-Object {
      [pscustomobject]@{
        Id = $_.Name
        Path = $_.FullName
        LastWriteUtc = $_.LastWriteTimeUtc.ToString('o')
        Classification = 'KNOWN_GOLDEN_GATE_CANDIDATE'
      }
    }
  )
}

function Get-StorageSnapshot {
  param([string] $DriveName = 'C')
  try {
    $drive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$DriveName`:'" -ErrorAction Stop
    return [pscustomobject]@{ Drive = "$DriveName`:"; FreeBytes = [int64]$drive.FreeSpace; TotalBytes = [int64]$drive.Size; Status = 'AVAILABLE' }
  } catch {
    return [pscustomobject]@{ Drive = "$DriveName`:"; FreeBytes = $null; TotalBytes = $null; Status = 'UNAVAILABLE' }
  }
}

function Invoke-QuarantineCandidate {
  param([object] $Candidate, [string] $TmpRoot, [string] $QuarantineRoot, [string] $ConfirmationToken)
  if ($ConfirmationToken -ne 'QUARANTINE_GOLDEN_GATE_TMP') { return [pscustomobject]@{ Status = 'BLOCKED'; Reason = 'confirmation_token_required' } }
  if (-not (Test-ManagedTmpPath -Path $Candidate.Path -TmpRoot $TmpRoot) -or $Candidate.Id -notlike $CandidatePattern) {
    return [pscustomobject]@{ Status = 'BLOCKED'; Reason = 'unmanaged_candidate' }
  }
  $source = Resolve-NormalizedPath $Candidate.Path
  if (-not (Test-Path -LiteralPath $source -PathType Container)) { return [pscustomobject]@{ Status = 'BLOCKED'; Reason = 'candidate_missing' } }
  $before = (Get-StorageSnapshot).FreeBytes
  $targetParent = Join-Path $QuarantineRoot ([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'))
  $target = Join-Path $targetParent $Candidate.Id
  New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
  $manifest = [ordered]@{ originalPath = $source; candidateId = $Candidate.Id; quarantinedAtUtc = [DateTime]::UtcNow.ToString('o') }
  Move-Item -LiteralPath $source -Destination $target -ErrorAction Stop
  $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $target 'manifest.json') -Encoding utf8
  [pscustomobject]@{ Status = 'PASS'; Reason = 'quarantined'; SourcePath = $source; TargetPath = $target; FreeBytesBefore = $before; FreeBytesAfter = (Get-StorageSnapshot).FreeBytes }
}

function Invoke-RestoreCandidate {
  param([string] $QuarantinePath, [string] $ConfirmationToken)
  if ($ConfirmationToken -ne 'RESTORE_GOLDEN_GATE_TMP') { return [pscustomobject]@{ Status = 'BLOCKED'; Reason = 'confirmation_token_required' } }
  $manifestPath = Join-Path $QuarantinePath 'manifest.json'
  if (-not (Test-Path -LiteralPath $manifestPath)) { return [pscustomobject]@{ Status = 'BLOCKED'; Reason = 'manifest_missing' } }
  try { $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json } catch { return [pscustomobject]@{ Status = 'BLOCKED'; Reason = 'manifest_invalid' } }
  if (-not $manifest.originalPath -or (Test-Path -LiteralPath $manifest.originalPath)) { return [pscustomobject]@{ Status = 'BLOCKED'; Reason = 'restore_destination_unavailable' } }
  $before = (Get-StorageSnapshot).FreeBytes
  Move-Item -LiteralPath $QuarantinePath -Destination $manifest.originalPath -ErrorAction Stop
  [pscustomobject]@{ Status = 'PASS'; Reason = 'restored'; SourcePath = $QuarantinePath; TargetPath = $manifest.originalPath; FreeBytesBefore = $before; FreeBytesAfter = (Get-StorageSnapshot).FreeBytes }
}

function Invoke-StorageMaintenance {
  param([string] $Mode, [string] $Scope, [string] $CandidateId, [string] $ConfirmationToken, [string] $TmpRoot, [string] $QuarantineRoot)
  if ($Mode -ne 'Plan') { throw "BLOCKED: mode_not_implemented_$Mode" }
  [pscustomobject]@{
    Mode = 'Plan'
    Storage = Get-StorageSnapshot
    Candidates = if ($Scope -in @('Tmp', 'All')) { @(Get-GoldenGateTmpCandidates -TmpRoot $TmpRoot) } else { @() }
    Docker = 'NOT_REQUESTED'
  }
}

if ($MyInvocation.InvocationName -ne '.') {
  Invoke-StorageMaintenance -Mode $Mode -Scope $Scope -CandidateId $CandidateId -ConfirmationToken $ConfirmationToken -TmpRoot $TmpRoot -QuarantineRoot $QuarantineRoot | ConvertTo-Json -Depth 5
}
