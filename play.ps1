param([string]$Branch = 'main', [switch]$Local)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$port = 4300

$ref = if ($Local) { 'HEAD' } else { git fetch origin; "origin/$Branch" }
$sha = git rev-parse --verify "$ref^{commit}"
if ($LASTEXITCODE -ne 0 -or -not $sha) { throw "Cannot resolve $ref" }
$sha = $sha.Trim()

$probe = [Net.Sockets.TcpClient]::new()
try {
  $probe.Connect('localhost', $port)
  $inUse = $true
} catch {
  $inUse = $false
} finally {
  $probe.Dispose()
}
if ($inUse) {
  Write-Host "Port $port is already in use. Stop whatever is serving on it and run play.ps1 again."
  exit 1
}

$root = Join-Path $env:TEMP 'star-catcher-play'
$dir = Join-Path $root ($Branch -replace '[\/]', '_')
New-Item -ItemType Directory -Force $root | Out-Null

git worktree prune
if (Test-Path (Join-Path $dir '.git')) {
  git -C $dir checkout --detach $sha | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Cannot check out $sha in $dir" }
} else {
  git worktree add --detach $dir $sha | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Cannot create worktree $dir" }
}

Write-Host "Serving $ref at $($sha.Substring(0, 8)) from $dir"
Push-Location $dir
try {
  $hashFile = Join-Path $dir '.package-lock.sha'
  $lockHash = (Get-FileHash package-lock.json).Hash
  $installed = (Test-Path node_modules/.package-lock.json) -and (Test-Path $hashFile) -and ((Get-Content $hashFile -Raw).Trim() -eq $lockHash)
  if ($installed) {
    Write-Host 'Dependencies unchanged, skipping npm ci'
  } else {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
    Set-Content $hashFile $lockHash
  }
  npx ng serve --open --port $port
} finally {
  Pop-Location
}
