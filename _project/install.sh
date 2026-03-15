#!/usr/bin/env bash
# Smart Nursery Manager — server-first installer (single path)
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Lumeo-sd/smart-nursery-manager/main/_project/install.sh | bash

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
error()   { echo -e "${RED}[×]${NC} $1"; exit 1; }
section() { echo -e "\n${GREEN}--- $1 ---${NC}"; }

have_cmd() { command -v "$1" >/dev/null 2>&1; }

SUDO=""
if [ "${EUID:-$(id -u)}" -ne 0 ] && have_cmd sudo; then
  SUDO="sudo"
fi

detect_pkg_mgr() {
  if have_cmd apt-get; then echo "apt"; return; fi
  if have_cmd dnf; then echo "dnf"; return; fi
  if have_cmd yum; then echo "yum"; return; fi
  if have_cmd pacman; then echo "pacman"; return; fi
  echo "unknown"
}

install_pkg() {
  local mgr
  mgr="$(detect_pkg_mgr)"
  case "$mgr" in
    apt)    $SUDO apt-get update -y && $SUDO apt-get install -y "$@";;
    dnf)    $SUDO dnf install -y "$@";;
    yum)    $SUDO yum install -y "$@";;
    pacman) $SUDO pacman -Sy --noconfirm "$@";;
    *)      return 1;;
  esac
}

ensure_basic_tools() {
  section "Checking dependencies"
  if ! have_cmd curl; then
    warn "curl missing — installing"
    install_pkg curl || error "Cannot install curl automatically"
  fi
  if ! have_cmd git; then
    warn "git missing — installing"
    install_pkg git || error "Cannot install git automatically"
  fi
}

install_docker_linux() {
  if have_cmd docker; then return; fi
  warn "Docker missing — installing with get.docker.com"
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  $SUDO sh /tmp/get-docker.sh
  rm -f /tmp/get-docker.sh
  if have_cmd systemctl; then
    $SUDO systemctl enable docker
    $SUDO systemctl start docker
  fi
  if [ -n "$SUDO" ]; then
    $SUDO usermod -aG docker "$USER" || true
    warn "Added $USER to docker group. You may need to log out and back in."
  fi
}

ensure_docker() {
  if have_cmd docker; then
    if ! docker info >/dev/null 2>&1; then
      warn "Docker installed but not running — trying to start service"
      if have_cmd systemctl; then
        $SUDO systemctl start docker || true
        $SUDO systemctl enable docker || true
      elif have_cmd service; then
        $SUDO service docker start || true
      fi
    fi
    docker info >/dev/null 2>&1 || error "Docker installed but not running. Start Docker and retry."
    return
  fi

  case "$OSTYPE" in
    linux-gnu*)
      install_docker_linux
      ;;
    darwin*)
      error "Docker not found. Install Docker Desktop for Mac and re-run."
      ;;
    *)
      error "Docker not found. Install Docker and re-run."
      ;;
  esac
  docker info >/dev/null 2>&1 || error "Docker installed but not running. Start Docker and retry."
}

ensure_compose() {
  if docker compose version >/dev/null 2>&1; then return; fi
  warn "Docker Compose plugin missing — installing"
  install_pkg docker-compose-plugin || warn "Could not install docker-compose-plugin automatically"
}

echo ""
echo "  Smart Nursery Manager"
echo "  Install dir: $INSTALL_DIR"
echo ""

ensure_basic_tools
ensure_docker
ensure_compose

section "Prepare directories"
mkdir -p "$INSTALL_DIR"
info "Directory: $INSTALL_DIR"

section "Project"
if [ -d "$PROJECT_DIR/.git" ]; then
  warn "Project already present — updating"
  git -C "$PROJECT_DIR" pull --ff-only
else
  git clone "$REPO" "$PROJECT_DIR"
  info "Project cloned"
fi

section "ERPNext"
if [ -d "$FRAPPE_DIR/.git" ]; then
  warn "ERPNext already present — updating"
  git -C "$FRAPPE_DIR" pull --ff-only || warn "ERPNext update failed"
else
  git clone "$FRAPPE_REPO" "$FRAPPE_DIR"
  info "ERPNext cloned"
fi

if [ ! -f "$FRAPPE_DIR/.env" ]; then
  cp "$FRAPPE_DIR/example.env" "$FRAPPE_DIR/.env"
  warn ".env created — edit $FRAPPE_DIR/.env if needed"
fi

info "Starting ERPNext (may take 2–3 minutes)..."
docker compose -f "$FRAPPE_DIR/compose.yaml" up -d
info "ERPNext started"

section "MCP server"
MCP_DIR="$PROJECT_DIR/mcp/erpnext"
if [ ! -f "$MCP_DIR/.env" ]; then
  cp "$MCP_DIR/.env.example" "$MCP_DIR/.env"
  warn "MCP needs API keys:"
  warn "1) Open ERPNext: http://localhost:8080"
  warn "2) Settings → My Profile → API Access → Generate Keys"
  warn "3) Paste keys into: $MCP_DIR/.env"
  warn "4) Run: docker compose -f $MCP_DIR/docker-compose.yml up -d --build"
else
  docker compose -f "$MCP_DIR/docker-compose.yml" up -d --build
  info "MCP started on port 8000"
fi

section "PWA"
PWA_DIR="$PROJECT_DIR/pwa"
docker compose -f "$PWA_DIR/docker-compose.yml" up -d --build
info "PWA started on port 3000"

echo ""
echo "Done."
echo "ERPNext: http://localhost:8080/desk"
echo "PWA:     http://localhost:3000"
echo "MCP:     http://localhost:8000/mcp"
echo ""
warn "If this is the first ERPNext run, wait 2–3 minutes and open http://localhost:8080 to finish setup."
