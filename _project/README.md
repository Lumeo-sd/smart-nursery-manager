# 🌱 Lumeo Nursery

> Smart management system for a decorative plant nursery.
> Built on ERPNext + custom AI interface via Claude MCP.

**Private repository** — Lumeo-sd

---

## Quick Start (одна команда)

```powershell
git clone https://github.com/Lumeo-sd/lumeo-nursery.git
cd lumeo-nursery
.\install.ps1
```

Скрипт автоматично:
- Клонує ERPNext (frappe_docker)
- Запускає Docker контейнери
- Налаштовує MCP сервер

---

## Stack

| Компонент | Технологія | Версія |
|---|---|---|
| ERP Backend | ERPNext / Frappe | 16.7.3 / 16.10.7 |
| Database | MariaDB | Docker |
| AI Interface | Claude + MCP | — |
| MCP Server | Python (FastMCP) | `mcp/` |
| PWA | React | _in development_ |

---

## Структура проекту

```
lumeo-nursery/
├── 📁 mcp/              MCP сервер (AI ↔ ERPNext)
├── 📁 context/          Стан проекту та документація
├── 📁 skills/           AI інструкції (Skills для Claude)
├── 📁 scripts/          Утилітарні скрипти
├── 📁 docs/             Документація
├── install.ps1          Автоматичне встановлення
└── README.md
```

---

## Ручне налаштування MCP

1. Отримай API ключі ERPNext: `Settings → My Profile → API Access`
2. `cp mcp/.env.example mcp/.env` → встав ключі
3. `cd mcp && docker compose up -d --build`
4. Перевір: `curl http://localhost:8000/mcp`

Додай в `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "erpnext": {
      "command": "node",
      "args": ["C:\\...\\mcp-remote\\dist\\proxy.js", "http://localhost:8000/mcp"]
    }
  }
}
```

---

## Перейменування проекту

Весь проект параметризований для легкого перейменування:
- GitHub: `Settings → Rename repository`
- Локально: перейменуй папку
- ERPNext компанія: `ERPNext → Company Settings`

---

## Roadmap

```
✅ Фаза 0  Інфраструктура (ERPNext + Docker)
✅ Фаза 1A Виробничий облік (Plant Batch, Server Scripts, Ціни)
✅ Фаза 1B Перший продаж (POS)
🔄 Фаза 2  PWA для персоналу (React)
📋 Фаза 3  Аналітика
🔒 Фаза 4  Планувальник
```
