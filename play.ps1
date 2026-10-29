param([string]$Branch = 'main', [switch]$Local)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$ref = if ($Local) { 'HEAD' } else { git fetch origin; "origin/$Branch" }
$sha = (git rev-parse --verify "$ref^{commit}").Trim()
if (-not $sha) { throw "Cannot resolve $ref" }

$root = Join-Path $env:TEMP 'star-catcher-play'
$dir = Join-Path $root ($Branch -replace '[\/]', '_')
New-Item -ItemType Directory -Force $root | Out-Null

if (Test-Path $dir) {
  $full = [IO.Path]::GetFullPath($dir)
  if (-not $full.StartsWith([IO.Path]::GetFullPath($root) + [IO.Path]::DirectorySeparatorChar)) {
    throw "Refusing to remove $full"
  }
  git worktree remove --force $full
  if (Test-Path $full) { Remove-Item -Recurse -Force $full }
}
git worktree prune
git worktree add --detach $dir $sha | Out-Null

Write-Host "Serving $ref at $($sha.Substring(0, 8)) from $dir"
Push-Location $dir
try {
  npm ci
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
  npx ng serve --open --port 4300
} finally {
  Pop-Location
}
