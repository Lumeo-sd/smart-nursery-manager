# 🌱 LUMEO NURSERY — AI Interface

> Читай цей файл на початку кожної сесії.

## Де що знаходиться

```
C:\Users\Admin\frappe_docker\frappe_docker-main\_project\
├── context/CHAT_CONTEXT.md    ← стан проекту (читай першим)
├── mcp/                       ← всі MCP модулі
└── skills/                    ← цей файл + решта skills
```

**ERPNext:** `http://localhost:8080` | Company: SDR | Site: `frontend`

---

## Підключені MCP модулі

| Модуль | Що робить | Skill |
|---|---|---|
| `erpnext` | ERPNext API — DocTypes, POS, Stock | nursery/SKILL_status.md |
| `sequential-thinking` | Покрокове мислення | core/SKILL_sequential_thinking.md |
| `memory` | Пам'ять між сесіями | core/SKILL_memory.md |
| `github` | Робота з репо Lumeo-sd/lumeo-nursery | core/SKILL_github.md |
| `opensprinkler` | Керування поливом | nursery/SKILL_irrigation.md |
| `time` | Поточний час, часові зони | — |

---

## Skills бібліотека

### Core (будь-який проект)
- `core/SKILL_sequential_thinking.md` — коли і як думати послідовно
- `core/SKILL_memory.md` — персистентна пам'ять
- `core/SKILL_github.md` — workflow з репо

### Nursery (розсадник)
- `nursery/SKILL_status.md` — дайджест системи
- `nursery/SKILL_batch_event.md` — запис подій партій
- `nursery/SKILL_irrigation.md` — керування поливом

---

## Критичні правила

- Site name = `frontend` (не localhost!)
- НЕ писати `import frappe` в Server Scripts
- НЕ комітити `.env` файли
- Оновлювати `CHAT_CONTEXT.md` після кожної сесії
