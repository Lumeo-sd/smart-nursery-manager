# 🌱 LUMEO NURSERY — AI Interface Master Skill

> Читай цей файл на початку кожної сесії.

## Проект
```
Локально:  C:\Users\Admin\frappe_docker\frappe_docker-main\_project\
GitHub:    https://github.com/Lumeo-sd/smart-nursery-manager
ERPNext:   http://localhost:8080 | Company: SDR | Docker site: frontend
```

---

## Всі підключені MCP модулі

### Проектні (наш стек)
| Модуль | Призначення | Skill |
|---|---|---|
| `erpnext` | ERPNext CRUD, POS, Stock, звіти | `nursery/SKILL_status.md` |
| `opensprinkler` | Полив розсадника | `nursery/SKILL_irrigation.md` |

### Системні (інструменти розробки)
| Модуль | Призначення | Skill |
|---|---|---|
| `Windows-MCP` | Файли, PowerShell, Docker | — (вбудований) |
| `sequential-thinking` | Покрокове мислення | `core/SKILL_sequential_thinking.md` |
| `memory` | Пам'ять між сесіями | `core/SKILL_memory.md` |
| `github` | Репо smart-nursery-manager | `core/SKILL_github.md` |
| `time` | Час, Europe/Kyiv, сезони | `core/SKILL_time.md` |

### Продуктивність
| Модуль | Призначення | Skill |
|---|---|---|
| `youtube_transcript` | Транскрипти відео | `core/SKILL_youtube.md` |
| `linkwarden` | Менеджер закладок | `core/SKILL_linkwarden.md` |

---

## Skills бібліотека

```
skills/
├── SKILL.md                          ← цей файл
├── core/
│   ├── SKILL_sequential_thinking.md
│   ├── SKILL_memory.md
│   ├── SKILL_github.md
│   ├── SKILL_time.md
│   ├── SKILL_youtube.md
│   └── SKILL_linkwarden.md
└── nursery/
    ├── SKILL_status.md
    ├── SKILL_batch_event.md
    └── SKILL_irrigation.md
```

---

## Критичні правила ERPNext
- Docker site = `frontend` (не localhost!)
- НЕ писати `import frappe` в Server Scripts
- НЕ писати `frappe.db.commit()` в Server Scripts
- Submit → тільки через `docker exec` Python скрипт

## Правила Git
- НЕ комітити `.env` з ключами
- Репо: `Lumeo-sd/smart-nursery-manager`
- Формат: `feat:` / `update:` / `fix:` / `context:` / `docs:`
