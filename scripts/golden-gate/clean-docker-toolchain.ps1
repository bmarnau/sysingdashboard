[CmdletBinding()]
param(
  [switch] $Apply,
  [ValidateSet('All', 'StaleContainers', 'ObsoleteCaches')]
  [string] $Scope = 'All',
  [string] $ConfirmationToken = ''
)

$ErrorActionPreference = 'Stop'
$ProjectVolumePrefix = 'sysingdashboard-gg-'
$GoldenGateLabel = 'org.sysingdashboard.golden-gate'
$RequiredConfirmationToken = 'CLEAN_GOLDEN_GATE_CACHE'

function Test-GoldenGateCleanupAuthorization {
  param([bool] $Apply, [string] $ConfirmationToken)

  if (-not $Apply) { return [pscustomobject]@{ Allowed = $true; Reason = 'plan_mode' } }
  if ($ConfirmationToken -ne $RequiredConfirmationToken) {
    return [pscustomobject]@{ Allowed = $false; Reason = 'confirmation_token_required' }
  }
  return [pscustomobject]@{ Allowed = $true; Reason = 'explicitly_confirmed' }
}

function Get-GoldenGateCleanupCandidates {
  param([object[]] $Volumes, [object[]] $Containers)

  $unusedVolumes = @($Volumes | Where-Object {
      $_.Name -like "$ProjectVolumePrefix*" -and -not $_.Used
    })
  $stoppedContainers = @($Containers | Where-Object {
      $_.Labels[$GoldenGateLabel] -eq 'true' -and -not $_.Running
    })
  return [pscustomobject]@{ Volumes = $unusedVolumes; Containers = $stoppedContainers }
}

function Invoke-Docker {
  param([string[]] $Arguments)
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) { throw "docker command failed: docker $($Arguments -join ' ')" }
}

function Get-DockerInventory {
  Invoke-Docker @('version', '--format', 'CLIENT={{.Client.Version}} SERVER={{.Server.Version}}') | Write-Output
  $volumeNames = @(Invoke-Docker @('volume', 'ls', '--format', '{{.Name}}'))
  $volumes = foreach ($name in $volumeNames) {
    if ([string]::IsNullOrWhiteSpace($name)) { continue }
    $references = @(Invoke-Docker @('ps', '-a', '--filter', "volume=$name", '--format', '{{.ID}}')) |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    [pscustomobject]@{ Name = $name; Labels = @{}; Used = ($references.Count -gt 0) }
  }

  $containerLines = @(Invoke-Docker @('ps', '-a', '--format', '{{.ID}}|{{.State}}|{{.Labels}}'))
  $containers = foreach ($line in $containerLines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $parts = $line -split '\|', 3
    $labels = @{}
    if ($parts.Count -ge 3 -and -not [string]::IsNullOrWhiteSpace($parts[2])) {
      foreach ($label in ($parts[2] -split ',')) {
        $pair = $label -split '=', 2
        if ($pair.Count -eq 2) { $labels[$pair[0]] = $pair[1] }
      }
    }
    [pscustomobject]@{ Id = $parts[0]; Labels = $labels; Running = ($parts[1] -eq 'running') }
  }
  return [pscustomobject]@{ Volumes = @($volumes); Containers = @($containers) }
}

function Get-DockerWslVhdxReport {
  $candidates = @(
    (Join-Path $env:LOCALAPPDATA 'Docker\wsl\data\ext4.vhdx'),
    (Join-Path $env:LOCALAPPDATA 'DockerDesktop\vm-data\DockerDesktop.vhdx')
  )
  foreach ($path in $candidates) {
    if (Test-Path -LiteralPath $path) {
      $item = Get-Item -LiteralPath $path
      Write-Output "VHDX path=$($item.FullName) bytes=$($item.Length) action=report_only"
    }
  }
  Write-Output 'VHDX action=not_automated reason=requires_stopped_docker_and_can_affect_other_wsl_distributions'
}

function Write-CleanupEvent {
  param([string] $Status, [string] $Reason, [string] $Action)
  Write-Output "EVENT timestamp=$([DateTime]::UtcNow.ToString('o')) phase=docker_cleanup status=$Status class=MAINTENANCE reason=$Reason action=$Action"
}

function Invoke-GoldenGateDockerCleanup {
  param([bool] $Apply, [string] $Scope, [string] $ConfirmationToken)

  $authorization = Test-GoldenGateCleanupAuthorization -Apply:$Apply -ConfirmationToken $ConfirmationToken
  if (-not $authorization.Allowed) {
    Write-CleanupEvent -Status 'BLOCKED' -Reason $authorization.Reason -Action 'rerun_with_explicit_confirmation'
    return 2
  }

  $inventory = Get-DockerInventory
  $candidates = Get-GoldenGateCleanupCandidates -Volumes $inventory.Volumes -Containers $inventory.Containers
  Get-DockerWslVhdxReport
  Write-Output "PLAN stale_containers=$($candidates.Containers.Count) obsolete_caches=$($candidates.Volumes.Count) scope=$Scope apply=$Apply"

  if (-not $Apply) {
    Write-CleanupEvent -Status 'PASS' -Reason 'plan_complete_no_changes' -Action 'review_then_apply_if_desired'
    return 0
  }

  if ($Scope -in @('All', 'StaleContainers')) {
    foreach ($container in $candidates.Containers) {
      Invoke-Docker @('rm', $container.Id) | Out-Null
      Write-CleanupEvent -Status 'PASS' -Reason "removed_container_$($container.Id)" -Action 'continue'
    }
  }
  if ($Scope -in @('All', 'ObsoleteCaches')) {
    foreach ($volume in $candidates.Volumes) {
      Invoke-Docker @('volume', 'rm', $volume.Name) | Out-Null
      Write-CleanupEvent -Status 'PASS' -Reason "removed_volume_$($volume.Name)" -Action 'continue'
    }
  }

  Write-CleanupEvent -Status 'PASS' -Reason 'cleanup_complete' -Action 'review_docker_system_df'
  return 0
}

if ($MyInvocation.InvocationName -ne '.') {
  $result = @(Invoke-GoldenGateDockerCleanup -Apply:$Apply -Scope $Scope -ConfirmationToken $ConfirmationToken)
  $exitCode = 0
  foreach ($item in $result) {
    if ($item -is [int]) { $exitCode = $item } else { Write-Output $item }
  }
  exit $exitCode
}
