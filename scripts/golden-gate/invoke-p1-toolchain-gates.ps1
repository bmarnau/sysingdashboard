[CmdletBinding()]
param(
  [ValidateSet('Prepare', 'Run')]
  [string] $Mode = 'Run',
  [string] $Workspace = (Get-Location).Path,
  [string] $Image = 'sysingdashboard-golden-gate:local'
)

$ErrorActionPreference = 'Stop'
$GoldenGateLabel = 'org.sysingdashboard.golden-gate=true'

function Get-DependencyVolumeNames {
  param([string] $LockHash, [string] $ImageDigest)
  $lockPart = $LockHash.Substring(0, 12)
  $imagePart = ($ImageDigest -replace '^sha256:', '').Substring(0, 12)
  $prefix = "sysingdashboard-gg-deps-$lockPart-$imagePart"
  return [pscustomobject]@{
    NodeModules = "$prefix-node-modules"
    BunCache = "$prefix-bun-cache"
  }
}

function Invoke-Docker {
  param([string[]] $Arguments)
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) { throw "docker command failed: docker $($Arguments -join ' ')" }
}

function Test-DockerVolume {
  param([string] $Name)
  & docker volume inspect $Name *> $null
  return ($LASTEXITCODE -eq 0)
}

function Ensure-DockerVolume {
  param([string] $Name)
  if (-not (Test-DockerVolume $Name)) {
    Invoke-Docker @('volume', 'create', '--label', $GoldenGateLabel, $Name) | Out-Null
    Write-Output "EVENT phase=dependency-volume status=PASS class=NONE reason=created_$Name action=continue"
  }
}

function Invoke-P1Toolchain {
  param([string] $Mode, [string] $Workspace, [string] $Image)

  $resolvedWorkspace = (Resolve-Path -LiteralPath $Workspace).Path
  $lockFile = Join-Path $resolvedWorkspace 'bun.lock'
  if (-not (Test-Path -LiteralPath $lockFile)) { throw "BLOCKED: bun.lock missing in $resolvedWorkspace" }
  Invoke-Docker @('version', '--format', 'CLIENT={{.Client.Version}} SERVER={{.Server.Version}}') | Write-Output
  $imageDigest = (Invoke-Docker @('image', 'inspect', '--format', '{{.Id}}', $Image) | Select-Object -Last 1).Trim()
  if ($imageDigest -notmatch '^sha256:[0-9a-f]+$') { throw "BLOCKED: image digest unavailable for $Image" }
  $lockHash = (Get-FileHash -LiteralPath $lockFile -Algorithm SHA256).Hash.ToLowerInvariant()
  $volumes = Get-DependencyVolumeNames -LockHash $lockHash -ImageDigest $imageDigest

  if ($Mode -eq 'Prepare') {
    Ensure-DockerVolume $volumes.NodeModules
    Ensure-DockerVolume $volumes.BunCache
  } elseif (-not (Test-DockerVolume $volumes.NodeModules) -or -not (Test-DockerVolume $volumes.BunCache)) {
    throw 'BLOCKED: dependency volumes missing; rerun with -Mode Prepare'
  }

  $scriptName = if ($Mode -eq 'Prepare') {
    'scripts/golden-gate/prepare-p1-toolchain-dependencies.sh'
  } else {
    'scripts/golden-gate/run-p1-toolchain-gates.sh'
  }
  $dockerArguments = @(
    'run', '--rm', '--label', $GoldenGateLabel,
    '-e', "GG_IMAGE_DIGEST=$imageDigest",
    '-e', 'GG_DEPENDENCY_CACHE_DIR=/golden-gate-deps',
    '-e', 'BUN_INSTALL_CACHE_DIR=/golden-gate-deps/bun-cache',
    '-v', "${resolvedWorkspace}:/workspace",
    '-v', "$($volumes.NodeModules):/workspace/node_modules",
    '-v', "$($volumes.BunCache):/golden-gate-deps",
    '-w', '/workspace', $Image, 'bash', $scriptName
  )
  Write-Output "EVENT phase=$Mode status=START class=NONE reason=dependency_contract_ready action=observe-output"
  Invoke-Docker $dockerArguments
}

if ($MyInvocation.InvocationName -ne '.') {
  Invoke-P1Toolchain -Mode $Mode -Workspace $Workspace -Image $Image
}
