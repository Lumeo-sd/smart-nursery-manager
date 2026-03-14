# ===========================================================
# LUMEO NURSERY — Автоматичне встановлення
# ===========================================================
# Використання: .\install.ps1
# Або з GitHub одразу:
#   git clone https://github.com/Lumeo-sd/lumeo-nursery.git && cd lumeo-nursery && .\install.ps1

param(
    [string]$ERPNextPath = "C:\lumeo\erpnext",
    [string]$ProjectPath = $PSScriptRoot
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   🌱 LUMEO NURSERY — Встановлення" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# --- КРОК 1: Перевірка залежностей ---
Write-Host "[1/5] Перевірка залежностей..." -ForegroundColor Yellow

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker не знайдено. Встанови Docker Desktop: https://docker.com" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git не знайдено. Встанови Git: https://git-scm.com" -ForegroundColor Red
    exit 1
}

$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker запущено але не відповідає. Запусти Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker OK" -ForegroundColor Green

# --- КРОК 2: Клонування ERPNext ---
Write-Host ""
Write-Host "[2/5] Клонування ERPNext (frappe_docker)..." -ForegroundColor Yellow

if (-not (Test-Path $ERPNextPath)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $ERPNextPath) | Out-Null
    git clone https://github.com/frappe/frappe_docker.git $ERPNextPath
    Write-Host "✅ ERPNext клоновано в $ERPNextPath" -ForegroundColor Green
} else {
    Write-Host "✅ ERPNext вже існує в $ERPNextPath" -ForegroundColor Green
}

# --- КРОК 3: Налаштування .env для ERPNext ---
Write-Host ""
Write-Host "[3/5] Налаштування ERPNext..." -ForegroundColor Yellow

$envSource = "$ProjectPath\docs\erpnext.env.example"
$envDest = "$ERPNextPath\.env"

if (-not (Test-Path $envDest)) {
    if (Test-Path $envSource) {
        Copy-Item $envSource $envDest
        Write-Host "📋 Скопійовано .env для ERPNext — відредагуй $envDest" -ForegroundColor Yellow
    } else {
        # Базовий .env
        @"
DB_PASSWORD=admin
SITE_NAME=frontend
FRAPPE_SITE_NAME_HEADER=frontend
"@ | Set-Content $envDest
    }
}

# --- КРОК 4: Запуск ERPNext ---
Write-Host ""
Write-Host "[4/5] Запуск ERPNext..." -ForegroundColor Yellow

Push-Location $ERPNextPath
docker compose up -d
Pop-Location

Write-Host "✅ ERPNext запускається (зачекай ~2 хвилини)" -ForegroundColor Green

# --- КРОК 5: Запуск MCP ---
Write-Host ""
Write-Host "[5/5] Налаштування MCP сервера..." -ForegroundColor Yellow

$mcpEnv = "$ProjectPath\mcp\.env"
if (-not (Test-Path $mcpEnv)) {
    Write-Host ""
    Write-Host "⚠️  Потрібно налаштувати MCP:" -ForegroundColor Yellow
    Write-Host "   1. Відкрий ERPNext: http://localhost:8080" -ForegroundColor White
    Write-Host "   2. Settings → My Profile → API Access → Generate Keys" -ForegroundColor White
    Write-Host "   3. Скопіюй mcp\.env.example → mcp\.env" -ForegroundColor White
    Write-Host "   4. Встав API Key і Secret в mcp\.env" -ForegroundColor White
    Write-Host "   5. Запусти: cd mcp && docker compose up -d --build" -ForegroundColor White
} else {
    Push-Location "$ProjectPath\mcp"
    docker compose up -d --build
    Pop-Location
    Write-Host "✅ MCP сервер запущено на http://localhost:8000" -ForegroundColor Green
}

# --- ФІНАЛ ---
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   ✅ Встановлення завершено!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "ERPNext:  http://localhost:8080/desk" -ForegroundColor White
Write-Host "POS:      http://localhost:8080/desk/point-of-sale" -ForegroundColor White
Write-Host "MCP:      http://localhost:8000/mcp" -ForegroundColor White
Write-Host ""
Write-Host "📖 Claude Desktop config: додай в %APPDATA%\Claude\claude_desktop_config.json" -ForegroundColor Yellow
Write-Host @"
{
  "mcpServers": {
    "erpnext": {
      "command": "node",
      "args": ["PATH_TO_mcp-remote", "http://localhost:8000/mcp"]
    }
  }
}
"@
Write-Host ""
Write-Host "📚 Документація: $ProjectPath\context\CHAT_CONTEXT.md" -ForegroundColor Yellow
Write-Host ""
