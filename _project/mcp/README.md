# MCP Modules — Реєстр

Кожна підпапка = окремий MCP сервер.

## ✅ Активні модулі

| Папка | Порт | Призначення | Статус |
|---|---|---|---|
| `erpnext/` | 8000 | ERPNext API → Claude (DocTypes, POS, Stock) | ✅ запущений |
| `sequentialthinking/` | stdio | Покрокове мислення для складних задач | ✅ підключений |
| `mcp-memory/` | stdio | Персистентна пам'ять між сесіями | ✅ підключений |
| `opensprinkler-mcp-sdr/` | stdio | Керування поливом (OpenSprinkler) | ✅ підключений |
| `time/` | stdio | Поточний час, конвертація часових зон | ✅ підключений |

## 📋 GitHub MCP
Підключений напряму через Claude — не потребує Docker.
Дає доступ до репо `Lumeo-sd/lumeo-nursery` прямо з чату.

## 🗂️ Архів

| Папка | Примітка |
|---|---|
| `erpnext-mcp-final/` | Старий оригінал — залишений для довідки |

## Як додати новий модуль

1. Створи папку: `mcp/назва-модуля/`
2. Додай `Dockerfile` або `package.json`
3. Додай запис в таблицю вище
4. Створи `skills/SKILL_назва.md`

## Архітектура підключення

```
Claude Desktop
    │
    ├── erpnext MCP     → HTTP :8000 → Docker → ERPNext :8080
    ├── memory MCP      → stdio (Docker image)
    ├── sequentialthinking → stdio (Node.js)
    ├── opensprinkler   → stdio → OpenSprinkler контролер
    ├── time            → stdio (Python)
    └── github MCP      → GitHub API (через claude.ai)
```
