[CmdletBinding()]
param(
  [string] $Repository = 'C:\Users\bmarn\OneDrive\Dokumente\Dashboard\sysingdashboard-codex',
  [switch] $SkipLogin
)

$ErrorActionPreference = 'Stop'

function Invoke-GitHubCli {
  param([string[]] $Arguments, [switch] $SuppressErrors)
  if ($SuppressErrors) {
    & gh @Arguments *> $null
  } else {
    & gh @Arguments 2>&1 | ForEach-Object { Write-Host $_ }
  }
  return [int]$LASTEXITCODE
}

if (-not (Test-Path -LiteralPath $Repository -PathType Container)) {
  throw "BLOCKED: repository_missing path=$Repository"
}

Set-Location -LiteralPath $Repository
Write-Output "EVENT phase=github_auth status=START class=NONE reason=repository_selected action=check_cli path=$Repository"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw 'BLOCKED: gh_cli_missing action=install_github_cli'
}

$currentStatus = Invoke-GitHubCli @('auth', 'status') -SuppressErrors
if ($currentStatus -ne 0 -and -not $SkipLogin) {
  Write-Output 'EVENT phase=github_auth status=START class=INTERACTIVE reason=credential_refresh_required action=complete_device_login'
  Start-Process 'https://github.com/login/device'
  $loginStatus = Invoke-GitHubCli @('auth', 'login', '-h', 'github.com', '-p', 'https', '--web')
  if ($loginStatus -ne 0) {
    throw 'BLOCKED: github_device_login_incomplete action=rerun_and_complete_browser_authorization'
  }
}

$verifiedStatus = Invoke-GitHubCli @('auth', 'status')
if ($verifiedStatus -ne 0) {
  throw 'BLOCKED: github_auth_invalid action=run_device_login_in_this_terminal'
}

& git -c safe.directory='C:/Users/bmarn/OneDrive/Dokumente/Dashboard/sysingdashboard-codex' fetch origin --prune
if ($LASTEXITCODE -ne 0) {
  throw 'BLOCKED: git_fetch_failed action=inspect_git_credential_manager'
}

$main = (& git -c safe.directory='C:/Users/bmarn/OneDrive/Dokumente/Dashboard/sysingdashboard-codex' rev-parse origin/main).Trim()
Write-Output "EVENT phase=github_auth status=PASS class=NONE reason=fetch_complete action=continue origin_main=$main"
