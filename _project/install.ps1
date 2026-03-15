param(
    [string]$ERPNextPath = "C:\lumeo\erpnext",
    [string]$ProjectPath = $PSScriptRoot,
    [string]$SiteName = "frontend",
    [string]$AdminPassword = "admin",
    [string]$ERPMode = "pwd"
)

$ErrorActionPreference = "Stop"

function Set-EnvValue($path, $key, $value) {
    if (-not (Test-Path $path)) { return }
    $lines = Get-Content $path
    $updated = $false
    $out = @()
    foreach ($line in $lines) {
        if ($line -match ("^" + [regex]::Escape($key) + "=")) {
            $out += "$key=$value"
            $updated = $true
        } else {
            $out += $line
        }
    }
    if (-not $updated) {
        $out += "$key=$value"
    }
    Set-Content -Path $path -Value $out
}

function Get-EnvValue($path, $key) {
    if (-not (Test-Path $path)) { return $null }
    $line = Get-Content $path | Where-Object { $_ -match ("^" + [regex]::Escape($key) + "=") } | Select-Object -Last 1
    if (-not $line) { return $null }
    return $line.Split("=", 2)[1]
}

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

Write-Section "Lumeo Nursery - Install"

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

$envDest = "$ERPNextPath\.env"

if (-not (Test-Path $envDest)) {
    $envSource = "$ERPNextPath\example.env"
    if (Test-Path $envSource) {
        Copy-Item $envSource $envDest
        Write-Host "Copied .env for ERPNext - edit $envDest if needed" -ForegroundColor Yellow
    } else {
        @"
DB_PASSWORD=admin
SITE_NAME=$SiteName
FRAPPE_SITE_NAME_HEADER=$SiteName
"@ | Set-Content $envDest
    }
}
Set-EnvValue $envDest "SITE_NAME" $SiteName
Set-EnvValue $envDest "FRAPPE_SITE_NAME_HEADER" $SiteName

Write-Host ""
Write-Host "[4/7] Starting ERPNext..." -ForegroundColor Yellow

Push-Location $ERPNextPath
$pwdPath = Join-Path $ERPNextPath "pwd.yml"
if ($ERPMode -eq "pwd" -and (Test-Path $pwdPath)) {
    docker compose -f $pwdPath up -d
} else {
    $composeArgs = @(
        "-f", "compose.yaml",
        "-f", "overrides\\compose.mariadb.yaml",
        "-f", "overrides\\compose.redis.yaml",
        "-f", "overrides\\compose.noproxy.yaml"
    )
    docker compose @composeArgs up -d
}
Pop-Location

Write-Host "ERPNext starting (wait ~2 minutes)" -ForegroundColor Green

Write-Host ""
Write-Host "Creating ERPNext site if missing..." -ForegroundColor Yellow
$backendName = "erpnext-backend-1"
Start-Sleep -Seconds 10
docker exec $backendName bash -c "test -d /home/frappe/frappe-bench/sites/$SiteName" 2>$null
if ($LASTEXITCODE -ne 0) {
    $dbPass = Get-EnvValue $envDest "DB_PASSWORD"
    if (-not $dbPass) { $dbPass = "admin" }
    docker exec $backendName bash -c "bench new-site $SiteName --mariadb-root-password $dbPass --admin-password $AdminPassword --install-app erpnext"
}

Write-Host ""
Write-Host "[5/7] MCP server..." -ForegroundColor Yellow

$mcpPath = Join-Path $ProjectPath "mcp\\erpnext"
$mcpEnv = Join-Path $mcpPath ".env"
if (-not (Test-Path $mcpEnv)) {
    Write-Host ""
    Write-Host "MCP needs API keys:" -ForegroundColor Yellow
    Write-Host "1) Open ERPNext: http://localhost:8080" -ForegroundColor White
    Write-Host "2) Settings -> My Profile -> API Access -> Generate Keys" -ForegroundColor White
    Write-Host "3) Copy .env.example -> .env in $mcpPath" -ForegroundColor White
    Write-Host "4) Paste API Key + Secret into $mcpEnv" -ForegroundColor White
    Write-Host "5) Run: docker compose -f $mcpPath\\docker-compose.yml up -d --build" -ForegroundColor White
} else {
    docker compose -f "$mcpPath\\docker-compose.yml" up -d --build
    Write-Host "MCP server started at http://localhost:8000" -ForegroundColor Green
}

Write-Host ""
Write-Host "[6/7] PWA..." -ForegroundColor Yellow
$pwaPath = Join-Path $ProjectPath "pwa"
if (Test-Path "$pwaPath\\docker-compose.yml") {
    docker compose -f "$pwaPath\\docker-compose.yml" up -d --build
    Write-Host "PWA started at http://localhost:3002" -ForegroundColor Green
} elseif (Test-Path "$pwaPath\\package.json") {
    Push-Location "$pwaPath"
    npm install
    Pop-Location
    Write-Host "PWA deps installed (run npm run dev)" -ForegroundColor Green
}

Write-Host ""
Write-Host "[7/7] Done" -ForegroundColor Green
Write-Host "ERPNext: http://localhost:8080/desk" -ForegroundColor White
Write-Host "POS:     http://localhost:8080/desk/point-of-sale" -ForegroundColor White
Write-Host "MCP:     http://localhost:8000/mcp" -ForegroundColor White
Write-Host "PWA:     http://localhost:3002" -ForegroundColor White
