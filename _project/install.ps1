param(
    [string]$ERPNextPath = "C:\lumeo\erpnext",
    [string]$ProjectPath = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

function Write-Section($text) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Has-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Install-If-Missing($name, $wingetId, $displayName) {
    if (Has-Command $name) { return $true }

    if (Has-Command "winget") {
        Write-Host "Installing $displayName via winget..." -ForegroundColor Yellow
        Start-Process winget -ArgumentList @(
            "install", "-e", "--id", $wingetId,
            "--accept-source-agreements", "--accept-package-agreements"
        ) -Wait -NoNewWindow
        return (Has-Command $name)
    }

    Write-Host "Missing $displayName. Install it and re-run this script." -ForegroundColor Red
    return $false
}

Write-Section "Lumeo Nursery — Install"

Write-Host "[1/7] Checking dependencies..." -ForegroundColor Yellow

if (-not (Install-If-Missing "git" "Git.Git" "Git")) { exit 1 }
if (-not (Install-If-Missing "docker" "Docker.DockerDesktop" "Docker Desktop")) { exit 1 }
if (-not (Install-If-Missing "node" "OpenJS.NodeJS.LTS" "Node.js LTS")) { exit 1 }
if (-not (Has-Command "npm")) {
    Write-Host "Node.js installed but npm not found. Reopen PowerShell and try again." -ForegroundColor Red
    exit 1
}

# Docker Desktop must be running
$dockerRunning = docker info 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker is installed but not running. Start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}
Write-Host "Docker OK" -ForegroundColor Green

Write-Host ""
Write-Host "[2/7] Cloning ERPNext (frappe_docker)..." -ForegroundColor Yellow

if (-not (Test-Path $ERPNextPath)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $ERPNextPath) | Out-Null
    git clone https://github.com/frappe/frappe_docker.git $ERPNextPath
    Write-Host "ERPNext cloned to $ERPNextPath" -ForegroundColor Green
} else {
    Write-Host "ERPNext already exists at $ERPNextPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/7] Preparing ERPNext env..." -ForegroundColor Yellow

$envSource = "$ProjectPath\docs\erpnext.env.example"
$envDest = "$ERPNextPath\.env"

if (-not (Test-Path $envDest)) {
    if (Test-Path $envSource) {
        Copy-Item $envSource $envDest
        Write-Host "Copied .env for ERPNext — edit $envDest if needed" -ForegroundColor Yellow
    } else {
        @"
DB_PASSWORD=admin
SITE_NAME=frontend
FRAPPE_SITE_NAME_HEADER=frontend
"@ | Set-Content $envDest
    }
}

Write-Host ""
Write-Host "[4/7] Starting ERPNext..." -ForegroundColor Yellow

Push-Location $ERPNextPath
docker compose up -d
Pop-Location

Write-Host "ERPNext starting (wait ~2 minutes)" -ForegroundColor Green

Write-Host ""
Write-Host "[5/7] MCP server..." -ForegroundColor Yellow

$mcpEnv = "$ProjectPath\mcp\.env"
if (-not (Test-Path $mcpEnv)) {
    Write-Host ""
    Write-Host "MCP needs API keys:" -ForegroundColor Yellow
    Write-Host "1) Open ERPNext: http://localhost:8080" -ForegroundColor White
    Write-Host "2) Settings → My Profile → API Access → Generate Keys" -ForegroundColor White
    Write-Host "3) Copy mcp\.env.example → mcp\.env" -ForegroundColor White
    Write-Host "4) Paste API Key + Secret into mcp\.env" -ForegroundColor White
    Write-Host "5) Run: cd mcp; docker compose up -d --build" -ForegroundColor White
} else {
    Push-Location "$ProjectPath\mcp"
    docker compose up -d --build
    Pop-Location
    Write-Host "MCP server started at http://localhost:8000" -ForegroundColor Green
}

Write-Host ""
Write-Host "[6/7] PWA deps (dev mode optional)..." -ForegroundColor Yellow
if (Test-Path "$ProjectPath\pwa\package.json") {
    Push-Location "$ProjectPath\pwa"
    npm install
    Pop-Location
    Write-Host "PWA deps installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "[7/7] Done" -ForegroundColor Green
Write-Host "ERPNext: http://localhost:8080/desk" -ForegroundColor White
Write-Host "POS:     http://localhost:8080/desk/point-of-sale" -ForegroundColor White
Write-Host "MCP:     http://localhost:8000/mcp" -ForegroundColor White
