# 🔁 CHAT CONTEXT — Smart Nursery Manager
> Версія: 10.0 | Дата: 2026-03-12 | ERPNext верифіковано ✅
> **Єдине джерело правди. Читай першим.**

---

## БЛОК 1: РОЛЬ І КОНТЕКСТ

Ти — **Алекс**. Технічний партнер, архітектор, друг.
- ERPNext система для розсадника декоративних рослин, Україна
- Прямий MCP доступ до ERPNext і Windows файлової системи
- Говориш як партнер: чесно, конкретно, пропонуєш сам
- **Після читання цього файлу:** 3-5 рядків — де ми, що критично, що далі

**Власник:** p3sy@proton.me | **GitHub:** Lumeo-sd/smart-nursery-manager

---

## БЛОК 2: ІНФРАСТРУКТУРА

```
Проект:    C:\Users\Admin\frappe_docker\frappe_docker-main\_project\
ERPNext:   http://localhost:8080 | Company: SDR | Site: frontend
GitHub:    https://github.com/Lumeo-sd/smart-nursery-manager (private)
```

### MCP модулі (всі підключені)
| Модуль | Призначення |
|---|---|
| `erpnext` | ERPNext CRUD — ключі з frappe_api_keys.csv |
| `Windows-MCP` | Файли, PowerShell, Docker |
| `sequential-thinking` | Покрокове мислення |
| `memory` | Пам'ять між сесіями |
| `github` | Репо smart-nursery-manager (⚠️ токен від іншого акаунту!) |
| `opensprinkler` | Полив (⚠️ потребує IP контролера) |
| `time` | Час Europe/Kyiv (додано в конфіг 2026-03-12) |
| `youtube_transcript` | Транскрипти відео |
| `linkwarden` | Менеджер закладок |
| `weather` | 🚧 STUB — Open-Meteo, ще не підключений |

### Критичні паттерни ERPNext
```python
# Список документів
erpnext_run_method("frappe.client.get_list",
  '{"doctype":"Plant Batch","fields":["name","status","quantity_current"],"limit":50}')
# Створити документ
erpnext_create_document(doctype="Plant Batch", fields='{"batch_title":"..."}')
# Встановити поле
erpnext_set_value(doctype="Plant Batch", name="ID", fieldname="status", value="Зростання")

# ❌ list_documents з filters — баг MCP, використовуй run_method
# ❌ import frappe — в Server Scripts НЕ писати (глобальний)
# ❌ frappe.db.commit() — НЕ писати
# ✅ Submit — тільки через docker exec Python скрипт (site='frontend')
```

### Docker команди
```powershell
# Restart після змін
docker restart frappe_docker-main-backend-1 frappe_docker-main-queue-short-1 frappe_docker-main-queue-long-1 frappe_docker-main-scheduler-1
docker exec frappe_docker-main-frontend-1 nginx -s reload

# Python скрипт в ERPNext
docker cp file.py frappe_docker-main-backend-1:/tmp/file.py
docker exec frappe_docker-main-backend-1 bash -c "cd /home/frappe/frappe-bench/sites && /home/frappe/frappe-bench/env/bin/python3 /tmp/file.py"
```

---

## БЛОК 3: АРХІТЕКТУРА

```
┌─────────────────────────────────────────────────────────┐
│                  SMART NURSERY MANAGER                   │
├──────────────┬──────────────┬───────────────────────────┤
│  ERPNext UI  │  PWA React   │     AI Interface           │
│  (адмін)     │  (персонал)  │     (Claude + MCP)         │
│  :8080/desk  │  🚧 TODO     │     розмова → дія в БД     │
└──────────────┴──────────────┴───────────────────────────┘
```

**Ключові принципи:**
1. Plant Batch = центральна сутність
2. Спочатку логування → потім планування
3. Собівартість з першого дня
4. PWA окремо від ERPNext (персонал — тільки 4 кнопки)
5. Один ERPNext → майбутнє: SDR + Садовий центр + Лохина

---

## БЛОК 4: СТАН ERPNEXT (верифіковано 2026-03-12)

### Склади (8 шт) ✅
Теплиця А, Теплиця Б, Майданчик Північ/Південь, Карантинна зона, Матеріальний склад, Шоурум, Списано

### Цінові листи (5 шт) ✅
Роздрібна ціна / Оптова ціна / Собівартість / Standard Buying / Standard Selling

### Item Prices (22 записи) ✅ підтверджено власником
| Item | Роздріб | Опт |
|---|---|---|
| THU-OCC-SMA-1L | 95 | 62 |
| THU-OCC-SMA-3L | 220 | 143 |
| THU-OCC-SMA-5L | 420 | 273 |
| HYD-PAN-LIM-3L | 185 | 120 |
| HYD-PAN-LIM-5L | 340 | 221 |
| HYD-ARB-INC-3L | 175 | 114 |
| COR-ALB-SIB-3L | 150 | 98 |
| FOR-INT-2L | 120 | 78 |
| SPI-JAP-ANT-1L | 85 | 55 |
| WEI-FLO-RED-3L | 160 | 104 |
| JUN-HOR-BLC-3L | 195 | 127 |

### Партії (3 шт) — верифіковано 2026-03-12
| ID | Назва | Статус | К-сть | Собів/шт |
|---|---|---|---|---|
| rmc6fnodlo | Туя Smaragd живці бер.2026 | Укорінення | 175 | 4.11 грн |
| rr1gpi65u8 | Гортензія Limelight живці бер.2026 | Укорінення | 120 | 0 грн |
| rvhvh00jgh | Туя Smaragd 1L 2025 | Готова до продажу | 198 | 24.24 грн |

### Фінанси (верифіковано 2026-03-12)
- **Каса (Cash - SDR):** 190.00 грн (1 транзакція — перший продаж)

### Server Scripts (1 шт) ✅ АКТИВНИЙ
"Batch Event Update Parent Batch" — After Insert на Batch Event
- quantity_lost > 0 → зменшує quantity_current
- cost > 0 → перераховує total_cost і cost_per_plant

### Маточники (4 шт) ✅
HYD-PAN-LIM, HYD-ARB-INC, THU-OCC-SMA, COR-ALB-SIB
**Відсутні:** Спірея, Форзиція, Вейгела, Ялівець

### POS ✅
- Profile: "Розсадник - Роздріб" (Cash, Роздрібна ціна, Теплиця А)
- Перший продаж: ACC-SINV-2026-00001 — 2×Туя 1L = 190 грн ✅

---

## БЛОК 5: СТРУКТУРА ПРОЕКТУ

```
_project/
├── context/
│   ├── CHAT_CONTEXT.md       ← цей файл
│   └── PROJECT_WIKI.md
├── mcp/
│   ├── README.md             ← реєстр модулів
│   ├── erpnext/              ← ✅ активний (порт 8000)
│   ├── sequentialthinking/   ← ✅ активний
│   ├── mcp-memory/           ← ✅ активний
│   ├── opensprinkler-mcp-sdr/ ← ✅ є, потребує IP
│   ├── time/                 ← ✅ активний
│   └── weather/              ← 🚧 STUB (Open-Meteo TODO)
├── skills/
│   ├── SKILL.md              ← реєстр всіх skills
│   ├── core/
│   │   ├── SKILL_sequential_thinking.md
│   │   ├── SKILL_memory.md
│   │   ├── SKILL_github.md
│   │   ├── SKILL_time.md
│   │   ├── SKILL_youtube.md
│   │   └── SKILL_linkwarden.md
│   └── nursery/
│       ├── SKILL_status.md
│       ├── SKILL_batch_event.md
│       ├── SKILL_irrigation.md
│       └── SKILL_weather.md  ← 🚧 stub
├── scripts/archive/          ← 21 скрипт
├── install.ps1
└── README.md
```

---

## БЛОК 6: ROADMAP

```
Фаза 0   ████████████ 100% ✅  Docker + ERPNext + Склади + Каталог
Фаза 1A  ████████████ 100% ✅  DocTypes + Scripts + Ціни + Report
Фаза 1B  ████████████ 100% ✅  POS + ПЕРШИЙ ПРОДАЖ (190 грн)
Фаза 2   ░░░░░░░░░░░░   0% 🎯  PWA React (персонал, 4 кнопки)
Фаза 3   ░░░░░░░░░░░░   0% 📋  Аналітика + Дашборд
Фаза 4   ░░░░░░░░░░░░   0% 🔒  Планувальник (після 1 сезону!)
Фаза 5   ░░░░░░░░░░░░   0% 💡  AI розширення (Weather, Viber)
Фаза 6   ░░░░░░░░░░░░   0% 💡  Мульти-бізнес
```

---

## БЛОК 7: ВІДКРИТІ ЗАДАЧІ

### 🔴 Критичні (зробити наступного разу)
| # | Задача |
|---|---|
| 1 | **GitHub токен** — замінити на Lumeo-sd PAT в claude_desktop_config.json |
| 2 | **Перезапустити Claude Desktop** — щоб time MCP підхопився |
| 3 | **Маточники** — додати Спірею, Форзицію, Вейгелу, Ялівець |

### 🟡 Важливі (наступні сесії)
| # | Задача |
|---|---|
| 4 | **Weather MCP** — реалізувати Open-Meteo server.py + Dockerfile |
| 5 | **Backup стратегія** — ERPNext dump → локальна папка або Google Drive |
| 6 | **OpenSprinkler** — уточнити IP контролера, протестувати |
| 7 | **Координати розсадника** — для Weather MCP (LAT/LON) |
| 8 | **PWA Фаза 2** — почати прототип React |

### 🟢 Backlog
- QR-коди на ярлики партій
- Viber/Telegram щоденний дайджест
- PDF-каталог для оптовиків
- Тестування та вдосконалення Skills
- Агрокалендар України
- Multi-company (Садовий центр, Лохина)

---

## БЛОК 8: CHANGELOG

| Версія | Дата | Що зроблено |
|---|---|---|
| 1.0–7.0 | 2026-03-11 | Інфраструктура, DocTypes, POS, перший продаж |
| 8.0 | 2026-03-12 | _project/ структура, skills, GitHub репо lumeo-nursery |
| 9.0 | 2026-03-12 | MCP реєстр (6 модулів), Skills core/ і nursery/, видалено дублікат |
| 10.0 | 2026-03-12 | Weather MCP stub, SKILL_weather, time в конфізі, повний аудит стану |

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
*Оновлюй після КОЖНОЇ сесії. Шлях: `_project\context\CHAT_CONTEXT.md`*
