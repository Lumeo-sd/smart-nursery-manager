# MCP Modules — Реєстр

## ✅ Активні модулі

| Папка | Порт | Призначення | Статус |
|---|---|---|---|
| `erpnext/` | 8000 | ERPNext API → Claude | ✅ запущений |
| `sequentialthinking/` | stdio | Покрокове мислення | ✅ підключений |
| `mcp-memory/` | stdio | Пам'ять між сесіями | ✅ підключений |
| `opensprinkler-mcp-sdr/` | stdio | Керування поливом | ⚠️ потребує IP |
| `time/` | stdio | Час Europe/Kyiv | ✅ додано в конфіг |
| `weather/` | stdio | Погода та якість повітря (Open-Meteo) | ✅ встановлено |

## 🚧 В розробці

| Папка | Призначення | Статус |
|---|---|---|
| `backup` | ERPNext dump → Google Drive | 🔄 планується |

## ☁️ Хмарні (без Docker)

| Модуль | Призначення | Статус |
|---|---|---|
| `github` | Репо Lumeo-sd/smart-nursery-manager | ⚠️ токен від іншого акаунту — замінити |
| `youtube_transcript` | Транскрипти YouTube | ✅ підключений |
| `linkwarden` | Менеджер закладок | ✅ підключений |
| `Windows-MCP` | Файли, PowerShell | ✅ підключений |

## 📋 TODO (нові модулі)

| Модуль | Пріоритет | Для чого |
|---|---|---|
| `backup` | 🟡 Середній | ERPNext dump → Google Drive / локально |
| `telegram-bot` | 🟢 Низький | Ранковий дайджест в Telegram |

## Архітектура підключення

```
Claude Desktop
    ├── erpnext       → HTTP :8000 → Docker → ERPNext :8080
    ├── memory        → Docker stdio (mcp/memory image)
    ├── sequentialthinking → npx stdio
    ├── opensprinkler → Docker stdio → OpenSprinkler WiFi
    ├── time          → Docker stdio (mcp/time image)
    ├── weather       → pip install mcp-weather-server → stdio → Open-Meteo API
    ├── github        → Docker stdio → GitHub API
    ├── youtube       → Docker stdio
    ├── linkwarden    → Docker → Linkwarden сервер
    └── Windows-MCP   → uvx stdio → Windows system
```
