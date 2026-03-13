#!/usr/bin/env bash
# ============================================================
#  Smart Nursery Manager — One-line installer
#  Usage: curl -fsSL https://raw.githubusercontent.com/Lumeo-sd/smart-nursery-manager/main/install.sh | bash
# ============================================================

set -e

REPO="https://github.com/Lumeo-sd/smart-nursery-manager.git"
FRAPPE_REPO="https://github.com/frappe/frappe_docker.git"
INSTALL_DIR="${NURSERY_DIR:-$HOME/nursery}"
FRAPPE_DIR="$INSTALL_DIR/erpnext"
PROJECT_DIR="$INSTALL_DIR/project"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
section() { echo -e "\n${GREEN}━━━ $1 ━━━${NC}"; }

# ── Банер ──────────────────────────────────────────────────
echo ""
echo "  🌱  Smart Nursery Manager"
echo "  ─────────────────────────"
echo "  Встановлення в: $INSTALL_DIR"
echo ""

# ── Перевірка системи ──────────────────────────────────────
section "Перевірка залежностей"

command -v docker  >/dev/null 2>&1 || error "Docker не знайдено. Встанови: https://docs.docker.com/get-docker/"
command -v git     >/dev/null 2>&1 || error "Git не знайдено. Встанови: https://git-scm.com"

docker info >/dev/null 2>&1 || error "Docker не запущено. Запусти Docker і спробуй знову."

# Визначаємо ОС
OS="unknown"
if   [[ "$OSTYPE" == "linux-gnu"* ]]; then OS="linux"
elif [[ "$OSTYPE" == "darwin"*    ]]; then OS="mac"
fi
info "ОС: $OS | Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"

# ── Директорія ─────────────────────────────────────────────
section "Підготовка директорій"
mkdir -p "$INSTALL_DIR"
info "Директорія: $INSTALL_DIR"

# ── Клонування нашого проекту ──────────────────────────────
section "Завантаження проекту"
if [ -d "$PROJECT_DIR/.git" ]; then
    warn "Проект вже завантажено — оновлюємо"
    git -C "$PROJECT_DIR" pull --ff-only
else
    git clone "$REPO" "$PROJECT_DIR"
    info "Проект завантажено"
fi

# ── ERPNext ────────────────────────────────────────────────
section "Встановлення ERPNext"
if [ -d "$FRAPPE_DIR/.git" ]; then
    warn "ERPNext вже встановлено — пропускаємо"
else
    git clone "$FRAPPE_REPO" "$FRAPPE_DIR"
    info "ERPNext завантажено"
fi

# .env для ERPNext
if [ ! -f "$FRAPPE_DIR/.env" ]; then
    cp "$FRAPPE_DIR/example.env" "$FRAPPE_DIR/.env"
    warn ".env створено — відредагуй $FRAPPE_DIR/.env якщо потрібно"
fi

info "Запускаємо ERPNext (може зайняти 2-3 хвилини)..."
docker compose -f "$FRAPPE_DIR/compose.yaml" up -d
info "ERPNext запущено"

# ── MCP сервер ─────────────────────────────────────────────
section "Запуск MCP сервера"
MCP_DIR="$PROJECT_DIR/mcp/erpnext"

if [ ! -f "$MCP_DIR/.env" ]; then
    cp "$MCP_DIR/.env.example" "$MCP_DIR/.env"
    warn "Потрібно налаштувати MCP API ключі:"
    warn "  1. Відкрий ERPNext: http://localhost:8080"
    warn "  2. Settings → My Profile → API Access → Generate Keys"
    warn "  3. Встав ключі в: $MCP_DIR/.env"
    warn "  4. Запусти: docker compose -f $MCP_DIR/docker-compose.yml up -d --build"
else
    docker compose -f "$MCP_DIR/docker-compose.yml" up -d --build
    info "MCP сервер запущено на порту 8000"
fi

# ── PWA ────────────────────────────────────────────────────
section "Запуск PWA"
PWA_DIR="$PROJECT_DIR/pwa"
docker compose -f "$PWA_DIR/docker-compose.yml" up -d --build
info "PWA запущено на порту 3000"

# ── Фінал ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅  Встановлення завершено!           ${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "  🌿 ERPNext:   http://localhost:8080/desk"
echo "  📱 PWA:       http://localhost:3000"
echo "  🤖 MCP:       http://localhost:8000/mcp"
echo ""
echo "  📚 Документація: $PROJECT_DIR/context/CHAT_CONTEXT.md"
echo ""
warn "Якщо це перший запуск ERPNext — зачекай 2-3 хвилини"
warn "і зайди на http://localhost:8080 щоб завершити налаштування"
echo ""
