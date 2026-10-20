$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $projectRoot

if (-not $env:GH_TOKEN_YWAINZH) {
  throw 'GH_TOKEN_YWAINZH is not available in this PowerShell session.'
}

$env:GH_TOKEN = $env:GH_TOKEN_YWAINZH

if ((git branch --show-current) -ne 'main') {
  throw 'Switch to the main branch before publishing.'
}

if (git status --porcelain) {
  throw 'Commit all project changes before publishing.'
}

$latestReleaseJson = gh release list --repo ywainzh/Html-Review --json tagName --limit 1 | Out-String
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to read GitHub Releases.'
}

$latestReleaseJson = $latestReleaseJson.Trim()
if (-not $latestReleaseJson -or $latestReleaseJson -eq '[]') {
  $Tag = 'v0.0.1'
} else {
  $latestRelease = @(ConvertFrom-Json -InputObject $latestReleaseJson)
  if ($latestRelease[0].tagName -notmatch '^v0\.0\.(\d+)$') {
    throw "Latest GitHub Release tag must use v0.0.N: $($latestRelease[0].tagName)"
  }
  $Tag = "v0.0.$([int]$Matches[1] + 1)"
}

npm run check
if ($LASTEXITCODE -ne 0) {
  throw 'Project checks failed.'
}

$archiveDirectory = Join-Path $projectRoot ".cache/releases/$Tag"
New-Item -ItemType Directory -Path $archiveDirectory -Force | Out-Null
$archivePath = ".cache/releases/$Tag/html-review.tar.gz"

tar.exe -czf $archivePath -C (Join-Path $projectRoot 'dist') .
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to create the release archive.'
}

gh release create $Tag $archivePath `
  --repo ywainzh/Html-Review `
  --title "HTML Preview $Tag" `
  --notes "Static site build for $Tag."
if ($LASTEXITCODE -ne 0) {
  throw "Failed to publish GitHub Release $Tag."
}

$setupCheck = 'sudo test -x /usr/local/sbin/html-review-deploy'
ssh.exe oracle_vm $setupCheck 2>$null
$isInitialized = $LASTEXITCODE -eq 0

if ($isInitialized) {
  ssh.exe oracle_vm "sudo /usr/local/sbin/html-review-deploy $Tag"
} else {
  $bootstrapUrl = 'https://raw.githubusercontent.com/ywainzh/Html-Review/main/scripts/oracle-setup.sh'
  ssh.exe oracle_vm "curl -fsSL $bootstrapUrl | sudo bash -s -- $Tag"
}

if ($LASTEXITCODE -ne 0) {
  throw "Oracle deployment failed for release $Tag."
}

Write-Host "Deployed GitHub Release $Tag to https://html.liaofan.us.ci/"
