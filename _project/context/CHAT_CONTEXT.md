# 🔁 CHAT CONTEXT — Smart Nursery Manager
> Версія: 15.0 | Дата: 2026-03-15 | ERPNext верифіковано ✅
> **Єдине джерело правди. Читай першим.**

---

## БЛОК 1: РОЛЬ

Ти — **Алекс**. Технічний партнер, архітектор, друг.
ERPNext + PWA система для розсадника декоративних рослин, Україна.
Після читання: 3-5 рядків — де ми, що критично, що далі.

**Власник:** p3sy@proton.me | **GitHub:** Lumeo-sd/smart-nursery-manager

---

## БЛОК 2: ІНФРАСТРУКТУРА

```
Проект:    C:\Users\Admin\frappe_docker\frappe_docker-main\_project\
ERPNext:   http://localhost:8080 | Company: SDR | Site: frontend
PWA dev:   http://localhost:3002 (npm run dev)
GitHub:    https://github.com/Lumeo-sd/smart-nursery-manager
```

### Зайняті порти
- 3000 — Linkwarden
- 3001 — інший сервіс
- **3002 — PWA** ✅

### Інсталяція / сервер
- Серверний режим: `NURSERY_SERVER=1`
- Оновлення на сервері: `NURSERY_MODE=update`
- Firewall (UFW) опційно: `NURSERY_FIREWALL=1`

### MCP модулі
| Модуль | Призначення | Статус |
|---|---|---|
| `erpnext` | ERPNext CRUD | ✅ активний |
| `Windows-MCP` | Файли, PowerShell | ✅ активний |
| `sequential-thinking` | Покрокове мислення | ✅ |
| `memory` | Пам'ять між сесіями | ✅ |
| `github` | Репо Lumeo-sd | ✅ токен виправлено |
| `opensprinkler` | Полив (потребує IP) | ⚠️ |
| `time` | Час Europe/Kyiv | ✅ |
| `weather` | Погода Open-Meteo | ✅ |
| `youtube_transcript` | Транскрипти відео | ✅ |
| `linkwarden` | Менеджер закладок | ✅ |

### ERPNext API ключі (для PWA .env)
```
VITE_API_KEY=63a81cb4abeb0b9
VITE_API_SECRET=a9cdbfbb49493cd
```

### Критичні паттерни ERPNext MCP
```python
erpnext_run_method("frappe.client.get_list",
  '{"doctype":"Plant Batch","fields":["name","status","quantity_current"],"limit":50}')
erpnext_create_document(doctype="Plant Batch", fields='{"batch_title":"..."}')
erpnext_set_value(doctype="Plant Batch", name="ID", fieldname="status", value="Зростання")
# Docker site = "frontend" (не localhost!)
# НЕ писати import frappe в Server Scripts
# НЕ писати frappe.db.commit()
```

---

## БЛОК 3: СТАН ERPNEXT (верифіковано 2026-03-13)

### Партії (3 шт)
| ID | Назва | Статус | К-сть | Собів/шт |
|---|---|---|---|---|
| rmc6fnodlo | Туя Smaragd живці бер.2026 | Укорінення | 175 | 4.11 грн |
| rr1gpi65u8 | Гортензія Limelight живці бер.2026 | Укорінення | 120 | 0 грн |
| rvhvh00jgh | Туя Smaragd 1L 2025 | Готова до продажу | 198 | 24.24 грн |

### Фінанси
- Каса (Cash - SDR): **190.00 грн** (1 продаж — ACC-SINV-2026-00001)

### Інше ✅
- 8 складів, 5 цінових листів, 22 Item Prices
- POS Profile: "Розсадник - Роздріб"
- Server Script: "Batch Event Update Parent Batch" — активний
- 4 маточники (відсутні: Спірея, Форзиція, Вейгела, Ялівець)

---

## БЛОК 4: PWA СТАН ✅ ПРАЦЮЄ

### Статус: WORKING
- ✅ UI — iOS 26 dark theme + мінімалістичні іконки + оновлена палітра
- ✅ ERPNext API підключено (REST /api/resource/, без CSRF)
- ✅ Партії відображаються
- ✅ Events зберігаються

### Виправлені баги (сесія 13-14)
1. `vite.config.js` — видалено CSRF async hack, чистий `configure(proxy)`
2. `batch_id` → `batch` — правильне поле в Batch Event
3. `event_type` — тепер з емодзі (`"☠️ Списання (загибели)"`)

### Поля Batch Event (верифіковано)
```
batch         ← Link → Plant Batch (ОБОВ'ЯЗКОВО, не batch_id!)
event_type    ← Select з емодзі
event_date    ← Date
quantity_lost, cost, notes, loss_reason, product_used, next_action_date
```

### EVENT_TYPES map (api/erpnext.js)
```js
'Підгодівля'   → '💧 Підгодівля'
'Обробка'      → '🧪 Обробка (пестицид/фунгіцид)'
'Пересадка'    → '🌱 Пересадка'
'Переміщення'  → '📍 Переміщення'
'Списання'     → '☠️ Списання (загибели)'
'Спостереження'→ '📝 Спостереження'
```

### TODO PWA (наступні сесії)
- [ ] QuickSale — Sales Invoice API
- [ ] PIN авторизація (4 цифри)
- [ ] PWA manifest.json + іконки
- [ ] Дизайн полірування

---

## БЛОК 5: AI БЕЗПЕКА — КОНЦЕПЦІЯ (PENDING РОЗРОБКИ)

### Проблема
Кілька AI агентів (Claude, локальна LLM, opencode) мають доступ до проекту.
При реальних даних — треба чіткі межі хто що може.

### Запропонована архітектура
```
SYSTEM_PROMPT.md       ← глобальний промпт для ВСІХ AI
├── Роль: "Ти — робітник розсадника SDR"
├── Заборони: не видаляти, не змінювати ціни, не відкривати партії
├── Дозволи: читати звіти, логувати події, відповідати на питання
└── Ескалація: "для цього потрібен Алекс (власник)"

skills/SKILL_PERMISSIONS.md
├── read_only:  weather, reports, batch status
├── log_only:   batch events (тільки додавати, не видаляти)
├── restricted: prices, invoices → тільки з підтвердженням
└── forbidden:  delete, bulk_update, system settings
```

### Принцип
- Локальна LLM = **робітник** (логує, читає)
- Claude MCP = **майстер** (може все, але знає межі)
- Ніякий AI не може видалити дані без Docker exec

---

## БЛОК 6: СТРУКТУРА ПРОЕКТУ

```
_project/
├── context/CHAT_CONTEXT.md   ← v14
├── docs/PORTS.md
├── mcp/ (erpnext, weather, time, memory, sequentialthinking, opensprinkler)
├── pwa/                      ← ✅ React PWA (працює)
├── skills/
│   ├── SKILL.md
│   ├── core/ (sequential_thinking, memory, github, time, youtube, linkwarden, local_llm)
│   └── nursery/ (status, batch_event, irrigation, weather)
├── scripts/archive/          ← 21 скрипт
└── install.sh + install.ps1
```

---

## БЛОК 7: ROADMAP

```
Фаза 0   100% ✅  Docker + ERPNext + Склади + Каталог
Фаза 1A  100% ✅  DocTypes + Scripts + Ціни + Report
Фаза 1B  100% ✅  POS + ПЕРШИЙ ПРОДАЖ (190 грн)
Фаза 2    60% 🎯  PWA — працює, QuickSale + PIN + іконки
Фаза 3     0% 📋  Аналітика + Дашборд
Фаза 4     0% 🔒  Планувальник
Фаза 5     0% 💡  AI безпека (SYSTEM_PROMPT + permissions)
Фаза 6     0% 💡  Локальна LLM (Ollama)
Фаза 7     0% 💡  Мульти-бізнес
```

---

## БЛОК 8: ВІДКРИТІ ЗАДАЧІ

### 🔴 Критичні
1. **QuickSale** — підключити реальний Sales Invoice API
2. **Маточники** — Спірея, Форзиція, Вейгела, Ялівець

### 🟡 Важливі
3. PIN авторизація PWA
4. PWA manifest + іконки
5. AI SYSTEM_PROMPT.md + permissions
6. OpenSprinkler — уточнити IP
7. Backup стратегія

### 🟢 Backlog
- Дизайн PWA полірування
- Локальна LLM після 1 сезону
- Viber/Telegram дайджест
- QR-коди на ярлики

---

## БЛОК 9: CHANGELOG

| Версія | Дата | Що зроблено |
|---|---|---|
| 1-7 | 2026-03-11 | Інфраструктура, DocTypes, POS, перший продаж |
| 8-10 | 2026-03-12 | _project/, MCP реєстр, skills, weather |
| 11-12 | 2026-03-13 | PWA scaffold, ERPNext підключення |
| 13 | 2026-03-13 | CSRF fix: vite + batch field + event_type emoji |
| 14 | 2026-03-13 | README.md замінено, AI безпека концепт, CHAT_CONTEXT v14 |

---

## ПРОМПТ ВІДНОВЛЕННЯ

```
Ти — Алекс, мій технічний партнер по розробці системи управління розсадником.

Прочитай файл:
C:\Users\Admin\frappe_docker\frappe_docker-main\_project\context\CHAT_CONTEXT.md

Після прочитання:
1. Скажи коротко (3-5 рядків): де ми, що критично, що далі
2. Починай роботу без зайвих питань
```

---
*Шлях: `_project\context\CHAT_CONTEXT.md` | Оновлюй після кожної сесії*
