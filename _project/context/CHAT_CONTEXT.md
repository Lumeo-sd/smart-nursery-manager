# 🔁 CHAT CONTEXT — Smart Nursery Manager
> Версія: 13.0 | Дата: 2026-03-13 | ERPNext верифіковано ✅
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

### MCP модулі (всі в claude_desktop_config.json)
| Модуль | Призначення | Статус |
|---|---|---|
| `erpnext` | ERPNext CRUD | ✅ активний |
| `Windows-MCP` | Файли, PowerShell | ✅ активний |
| `sequential-thinking` | Покрокове мислення | ✅ |
| `memory` | Пам'ять між сесіями | ✅ |
| `github` | Репо (⚠️ токен не від Lumeo-sd) | ⚠️ |
| `opensprinkler` | Полив (потребує IP) | ⚠️ |
| `time` | Час Europe/Kyiv | ✅ |
| `weather` | Погода Open-Meteo (Python пакет) | ✅ |
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
- 8 складів, 5 цінових листів, 22 Item Prices (підтверджені)
- POS Profile: "Розсадник - Роздріб" (Cash, Роздрібна ціна, Теплиця А)
- Server Script: "Batch Event Update Parent Batch" — активний
- 4 маточники (відсутні: Спірея, Форзиція, Вейгела, Ялівець)
- Script Report "Список доступності" — працює

---

## БЛОК 4: PWA СТАН (активна розробка)

### Файли
```
_project/pwa/
├── .env                    ← API ключі (НЕ в git)
├── .env.example
├── vite.config.js          ← proxy :3002 → :8080, Authorization через configure()
├── package.json            ← react 18, react-router-dom, vite
├── Dockerfile + nginx.conf + docker-compose.yml (порт 3002)
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx             ← router + bottom nav (Головна/Партії/Продати)
    ├── index.css           ← iOS 26 dark theme, CSS токени
    ├── api/erpnext.js      ← API wrapper (без Authorization — proxy додає)
    └── screens/
        ├── Home.jsx        ← 6 тайлів + live stats (getDashboardStats)
        ├── BatchList.jsx   ← реальні партії, кольорові статуси, chips
        ├── BatchEvent.jsx  ← події (підживлення/списання/пересадка/обробка)
        ├── NewBatch.jsx    ← нова партія, вибір виду/горщика/локації
        └── QuickSale.jsx   ← продаж з партій "Готова до продажу" + ціни
```

### Поточна проблема (АКТИВНА)
**CSRFTokenError** — Vite proxy не передає Authorization до ERPNext.

**Рішення (застосувати при відновленні):**
Замінити в `vite.config.js` секцію proxy на:
```js
proxy: {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.setHeader('Authorization', `token ${apiKey}:${apiSecret}`)
        proxyReq.setHeader('X-Frappe-Site-Name', 'frontend')
      })
    }
  }
}
```
Після зміни — **перезапустити Vite** (`Ctrl+C` → `npm run dev`).

### Що працює
- ✅ UI рендериться (темний iOS 26 стиль)
- ✅ Навігація між екранами
- ✅ Форми (NewBatch, BatchEvent)
- ⚠️ Дані з ERPNext — CSRF помилка (proxy не передає токен)

### TODO PWA
- [ ] Виправити CSRF (proxy configure)
- [ ] QuickSale: підключити реальний POS / Sales Invoice API
- [ ] PIN авторизація (4 цифри)
- [ ] PWA manifest.json + іконки
- [ ] manifest.json для "Add to Home Screen"

---

## БЛОК 5: СТРУКТУРА ПРОЕКТУ

```
_project/
├── context/
│   ├── CHAT_CONTEXT.md        ← цей файл v13
│   └── PROJECT_WIKI.md
├── docs/
│   └── PORTS.md               ← карта портів
├── mcp/
│   ├── README.md
│   ├── erpnext/               ← ✅ .env з ключами
│   ├── mcp-memory/
│   ├── opensprinkler-mcp-sdr/
│   ├── sequentialthinking/
│   ├── time/
│   └── weather/               ← ✅ реальний Python пакет (Open-Meteo)
├── pwa/                       ← ✅ React PWA
├── skills/
│   ├── SKILL.md
│   ├── core/
│   │   ├── SKILL_sequential_thinking.md
│   │   ├── SKILL_memory.md
│   │   ├── SKILL_github.md
│   │   ├── SKILL_time.md
│   │   ├── SKILL_youtube.md
│   │   ├── SKILL_linkwarden.md
│   │   └── SKILL_local_llm.md
│   └── nursery/
│       ├── SKILL_status.md
│       ├── SKILL_batch_event.md
│       ├── SKILL_irrigation.md
│       └── SKILL_weather.md
├── scripts/archive/           ← 21 скрипт
├── install.sh                 ← one-line Linux installer
└── install.ps1
```

---

## БЛОК 6: ROADMAP

```
Фаза 0   100% ✅  Docker + ERPNext + Склади + Каталог
Фаза 1A  100% ✅  DocTypes + Scripts + Ціни + Report
Фаза 1B  100% ✅  POS + ПЕРШИЙ ПРОДАЖ (190 грн)
Фаза 2    30% 🎯  PWA React — scaffold готовий, CSRF треба виправити
Фаза 3     0% 📋  Аналітика + Дашборд
Фаза 4     0% 🔒  Планувальник (після 1 сезону!)
Фаза 5     0% 💡  AI розширення (Weather інтеграція, Viber/Telegram)
Фаза 6     0% 💡  Мульти-бізнес
```

---

## БЛОК 7: ВІДКРИТІ ЗАДАЧІ

### 🔴 Критичні
1. **CSRF помилка PWA** — виправити vite.config.js (рішення в Блоці 4)
2. **GitHub токен** — замінити на Lumeo-sd PAT
3. **Маточники** — Спірея, Форзиція, Вейгела, Ялівець

### 🟡 Важливі
4. QuickSale → реальний POS API
5. Weather MCP — інтегрувати в ранковий дайджест
6. OpenSprinkler — уточнити IP
7. Backup стратегія

### 🟢 Backlog
- PIN авторизація PWA
- PWA manifest + іконки
- Локальна LLM (Ollama) — після 1 сезону
- Viber/Telegram дайджест
- install.sh тест на реальному Linux сервері

---

## БЛОК 8: CHANGELOG

| Версія | Дата | Що зроблено |
|---|---|---|
| 1-7 | 2026-03-11 | Інфраструктура, DocTypes, POS, перший продаж |
| 8 | 2026-03-12 | _project/ структура, skills |
| 9 | 2026-03-12 | MCP реєстр, skills core/nursery |
| 10 | 2026-03-12 | Weather MCP stub, time в конфізі |
| 11 | 2026-03-13 | PWA scaffold (5 screens), install.sh, SKILL_local_llm |
| 12 | 2026-03-13 | PWA підключення ERPNext, реальні дані, порт 3002 |
| 13 | 2026-03-13 | CSRF проблема виявлена + задокументована, vite.config fix готовий |

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
