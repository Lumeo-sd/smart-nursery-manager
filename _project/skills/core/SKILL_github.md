# SKILL: GitHub MCP — Робота з репозиторієм

**Репо:** `Lumeo-sd/lumeo-nursery` (приватний)
**Коли:** зміни в коді, skills, документації — напряму з чату

---

## Доступні операції

| Операція | Коли |
|---|---|
| `create_or_update_file` | Зберегти skill, оновити документацію |
| `get_file_contents` | Прочитати файл з GitHub |
| `create_repository` | Нові репо (рідко) |
| `push_files` | Кілька файлів одним комітом |
| `create_issue` | Записати задачу / баг |
| `search_code` | Знайти де щось використовується |

---

## Workflow для Skills

```
1. Розробив/оновив skill локально (_project/skills/)
2. Одразу пушу на GitHub через MCP
3. Локальна копія + GitHub = синхронізовані
```

---

## Правила комітів

| Тип зміни | Префікс | Приклад |
|---|---|---|
| Новий skill | `feat:` | `feat: add SKILL_irrigation.md` |
| Оновлення skill | `update:` | `update: SKILL_status — add batch count` |
| Документація | `docs:` | `docs: update mcp README` |
| Фікс | `fix:` | `fix: wrong path in install.ps1` |
| Контекст | `context:` | `context: update CHAT_CONTEXT v9` |

---

## Важливо

- **НІКОЛИ** не комітити `.env` файли з ключами
- `scripts/archive/` — не обов'язково комітити (великий)
- `context/CHAT_CONTEXT.md` — комітити після кожної сесії
