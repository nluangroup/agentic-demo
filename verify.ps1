#Requires -Version 7
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'Continue'
$env:CI = '1'
Set-Location $PSScriptRoot

$failed = $false

function Invoke-Captured {
    param([string]$Command, [string[]]$Arguments)
    $output = & $Command @Arguments 2>&1 | ForEach-Object { "$_" }
    [pscustomobject]@{ ExitCode = $LASTEXITCODE; Lines = @($output) }
}

function Write-Tail {
    param([string[]]$Lines)
    $Lines | Select-Object -Last 30 | ForEach-Object { "    $_" }
}

if (-not (Test-Path (Join-Path $PSScriptRoot 'node_modules'))) {
    $install = Invoke-Captured npm.cmd @('ci')
    if ($install.ExitCode -ne 0) {
        Write-Tail $install.Lines
        Write-Output 'FAIL: install — npm ci failed'
        exit 1
    }
}

function Report-Check {
    param([string]$Name, $Result, [string]$Hint, [switch]$ShowOutput)
    if ($ShowOutput) { $Result.Lines }
    if ($Result.ExitCode -eq 0) {
        Write-Output "PASS: $Name"
    } else {
        $script:failed = $true
        if (-not $ShowOutput) { Write-Tail $Result.Lines }
        Write-Output "FAIL: $Name — $Hint"
    }
}

Report-Check 'format' (Invoke-Captured npm.cmd @('run', 'format:check')) 'run: npx prettier --write .'
Report-Check 'lint' (Invoke-Captured npm.cmd @('run', 'lint')) 'run: npm run lint and fix the reported problems'

$build = Invoke-Captured npm.cmd @('run', 'build')
Report-Check 'build' $build 'run: npm run build and fix the compile errors'

Report-Check 'unit tests' (Invoke-Captured npm.cmd @('run', 'test:ci')) 'run: npm run test:ci and fix the failing tests' -ShowOutput

if ($build.ExitCode -ne 0) {
    Write-Output 'SKIPPED: smoke render — build failed'
} else {
    $smoke = Invoke-Captured node @((Join-Path $PSScriptRoot 'tools/smoke.mjs'))
    if ($smoke.ExitCode -eq 2) {
        Write-Output 'SKIPPED: smoke render — Playwright Chromium not installed (run: npx playwright install chromium)'
    } else {
        Report-Check 'smoke render' $smoke 'run: npm run build, then node tools/smoke.mjs, and fix what it reports'
    }
}

if ($failed) { exit 1 }
exit 0
