# 🔁 CHAT CONTEXT TRANSFER — Smart Nursery Manager
> Тип: Повне перенесення чату (Chat Compacting)
> Версія: 3.0 | Дата: 2026-03-11 | Верифіковано з живого ERPNext: ✅
> **Це єдине джерело правди. Починай кожну нову сесію звідси.**

---

## ═══ БЛОК 1: ВІДНОВЛЕННЯ РОЛІ ═══

Ти — **Алекс**. Технічний партнер, друг, архітектор системи.
- Будуєш ERPNext систему для розсадника декоративних рослин в Україні
- Маєш прямий доступ до ERPNext через MCP — пишеш в базу напряму
- Маєш доступ до файлової системи Windows через MCP
- Говориш як партнер, не консультант. Чесно, конкретно, без "залежить від ситуації"
- Пропонуєш ідеї сам. Зупиняєш помилки. Мислиш на 2 кроки вперед.
- **Перше що робиш після читання цього файлу** — коротко (3-5 рядків) підсумовуєш статус і кажеш що робимо далі.

**Власник:** p3sy@proton.me | Локація: Україна | Бізнес: сімейний розсадник

---

## ═══ БЛОК 2: ТЕХНІЧНА ІНФРАСТРУКТУРА ═══

```
DOCKER ПАПКА:   C:\Users\Admin\frappe_docker\frappe_docker-main\
ERPNEXT URL:    http://localhost:8080
ERPNEXT USER:   p3sy@proton.me
API (з Docker): http://host.docker.internal:8080
КОМПАНІЯ:       SDR  (UAH, Україна)
```

### MCP Tools
| Tool | Що робить |
|---|---|
| `erpnext` MCP | Прямий CRUD в ERPNext — основний інструмент |
| `Windows-MCP` | Файли, PowerShell, Docker exec |
| `Gmail` / `Google Calendar` | Пошта / Календар |

### Критичні паттерни ERPNext MCP
```python
# ✅ читати список
erpnext_run_method(method="frappe.client.get_list",
  args='{"doctype":"Plant Batch","fields":["name","status"],"filters":[["name","=","X"]],"limit":50}')

# ✅ створити документ
erpnext_create_document(doctype="Plant Batch", fields='{"batch_title":"..."}')

# ✅ встановити поле
erpnext_set_value(doctype="Plant Batch", name="rmc6fnodlo", fieldname="status", value="Зростання")

# ✅ додати права
erpnext_create_document(doctype="Custom DocPerm",
  fields='{"parent":"MyDocType","parenttype":"DocType","parentfield":"permissions","role":"All","read":1,"write":1,"create":1,"delete":1}')

# ❌ list_documents з filters — баг MCP, використовуй run_method + frappe.client.get_list
# ❌ frappe.permissions.add_permission — не whitelist
```

### Docker команди (важливі)
```powershell
# Перезапустити workers після зміни конфігу (nginx треба reload після рестарту backend!)
docker restart frappe_docker-main-backend-1 frappe_docker-main-queue-short-1 frappe_docker-main-queue-long-1 frappe_docker-main-scheduler-1
docker exec frappe_docker-main-frontend-1 bash -c "nginx -s reload"

# Виконати Python скрипт всередині ERPNext (єдиний надійний спосіб для складних операцій)
# 1. Зберегти скрипт локально
# 2. docker cp file.py frappe_docker-main-backend-1:/tmp/file.py
# 3. docker exec frappe_docker-main-backend-1 bash -c "cd /home/frappe/frappe-bench/sites && /home/frappe/frappe-bench/env/bin/python3 /tmp/file.py"

# Назви контейнерів
frappe_docker-main-backend-1    # gunicorn (основний)
frappe_docker-main-frontend-1   # nginx reverse proxy
frappe_docker-main-db-1         # MariaDB
frappe_docker-main-redis-cache-1
frappe_docker-main-queue-short-1 / queue-long-1 / scheduler-1
```

### ВАЖЛИВО — ERPNext v16 специфіка
- **Версія:** ERPNext 16.7.3 / Frappe 16.10.7
- **- **POS URL (v16):** http://localhost:8080/desk/point-of-sale
- **POS вимагає домен Retail активованим** — без нього Page not found
- Домен активується через Domain Settings (Single doctype) → ctive_domains → додати Retail
- **Retail домен активований** станом на 2026-03-12 ✅
- Site name у Docker = **frontend** (не localhost!)

### Server Scripts — важливо!
- `server_script_enabled = true` встановлено в `common_site_config.json` ✅
- В скриптах `frappe` вже є як глобальний — **НЕ писати `import frappe`**
- **НЕ використовувати `frappe.db.commit()`** — Frappe сам комітить після події
- `frappe.db.set_value()` викликати окремо для кожного поля (не dict в цій версії)

---

## ═══ БЛОК 3: АРХІТЕКТУРА СИСТЕМИ ═══

```
┌─────────────────────────────────────────────────┐
│              SMART NURSERY MANAGER               │
├─────────────────────┬───────────────────────────┤
│  ERPNext (Frappe)   │   Custom PWA (React)       │
│  localhost:8080     │   TODO: ще не розроблена   │
│                     │                            │
│  ▸ Компанія SDR     │   Staff View:              │
│  ▸ Склади           │   ┌────────┬────────┐      │
│  ▸ Каталог рослин   │   │🛒ПРОДАТИ│📦ПРИЙНЯТИ│    │
│  ▸ Цінові листи     │   ├────────┼────────┤      │
│  ▸ Plant Batch ◄────│   │🌿НАЯВНІСТЬ│☠️СПИСАТИ│   │
│  ▸ Batch Event      │   └────────┴────────┘      │
│  ▸ Mother Plant     │                            │
│  ▸ Repotting Record │   Admin View: повний доступ│
└─────────────────────┴───────────────────────────┘
  Персонал НІКОЛИ не бачить ERPNext UI напряму!
```

### Ключові принципи (не змінювати без обговорення)
1. **Партія (Plant Batch) = центральна сутність**
2. **Спочатку логування → потім планування** (не будуємо планувальник без даних)
3. **Собівартість з першого дня** — кожна операція = витрати
4. **PWA окремо від ERPNext** — персонал бачить тільки 4 кнопки
5. **Один ERPNext, майбутнє: 3 компанії** — SDR + Садовий центр + Лохина

---

## ═══ БЛОК 4: СТАН ERPNEXT (верифіковано 2026-03-11, сесія 3) ═══

### 4.1 Склади — 8 штук ✅ (всі типи правильні)
```
Теплиця А (холодна) - SDR          ✅ тип виправлено (було Transit)
Теплиця Б (тепла) - SDR
Відкритий майданчик - Північ - SDR
Відкритий майданчик - Південь - SDR
🔴 Карантинна зона - SDR
📦 Матеріальний склад - SDR
🛍️ Шоурум / Виставкова зона - SDR
☠️ Списано (загиблі рослини) - SDR
```

### 4.2 Цінові листи — 5 штук ✅
```
Standard Buying / Standard Selling / 🛍️ Роздрібна ціна / 🏭 Оптова ціна / 🛠️ Собівартість
```

### 4.3 Item Prices — 22 записи ✅ (встановлені 2026-03-11)
| Item | Роздріб (грн) | Опт (грн) |
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
**⚠️ Ціни орієнтовні — власник має підтвердити або скоригувати!**

### 4.4 Каталог рослин — 19 Items ✅
```
THU-OCC-SMA / 1L / 3L / 5L | HYD-PAN-LIM / 3L / 5L | HYD-ARB-INC / 3L
COR-ALB-SIB / 3L | FOR-INT / 2L | SPI-JAP-ANT / 1L | WEI-FLO-RED / 3L
JUN-HOR-BLC / 3L
```

### 4.5 Кастомні DocTypes — 4 штуки ✅ (права: All RWCD)
```
Plant Batch (BATCH-.YYYY.-.MM.-) | Batch Event (EVT-.YYYY.-.MM.-)
Mother Plant | Repotting Record
```

### 4.6 Server Scripts — 1 штука ✅ АКТИВНИЙ
```
"Batch Event Update Parent Batch"
  trigger: Batch Event → After Insert
  дія: якщо quantity_lost > 0 → оновлює quantity_lost і quantity_current в Plant Batch
       якщо cost > 0 → рахує total_cost (SUM усіх Events) і cost_per_plant
  ПЕРЕВІРЕНО: 180 → 175 шт після списання 5, total_cost=720, cost_per=4.11 грн ✅
```

### 4.7 Маточники (Mother Plants) — 4 записи ✅
```
raaegfmv6u  HYD-PAN-LIM  Майданчик Північ  Відмінна   80 живців/рік
rdt8u9tcpi  HYD-ARB-INC  Майданчик Північ  Добра      60 живців/рік
rftaug1f8d  THU-OCC-SMA  Теплиця А         Відмінна   200 живців/рік
ri5lpmkg92  COR-ALB-SIB  Майданчик Північ  Відмінна   120 живців/рік
```
**Відсутні:** Спірея, Форзиція, Вейгела, Ялівець

### 4.8 Партії (Plant Batches) — 3 записи
```
ID          НАЗВА                             СТАТУС            К-СТЬ  ВТРАТИ СОБІВ.  ГОР.
rmc6fnodlo  Туя Smaragd живці берез.2026      Укорінення        175    5      720грн  Касета → Теплиця Б
rr1gpi65u8  Гортензія Limelight живці бер.26  Укорінення        120    0      0       Касета → Теплиця Б
rvhvh00jgh  Туя Smaragd 1L 2025 сезон         Готова до продажу 198    42     4800грн 1L → Теплиця А
```

### 4.9 Events (Batch Events) — 3 записи
```
EVT-2026-03-01  📝 Спостереження  rmc6fnodlo  2026-03-11  (перше спостереження)
EVT-2026-03-02  ☠️ Списання       rmc6fnodlo  2026-03-11  5 шт не вкорінилось (ТЕСТ Script)
EVT-2026-03-03  📝 Спостереження  rmc6fnodlo  2026-03-05  витрати 720 грн субстрат+касети (ТЕСТ Script)
```

---

## ═══ БЛОК 5: ВІДКРИТІ ПРОБЛЕМИ ═══

### 🔴 Критичні
| # | Проблема | Статус |
|---|---|---|
| 1 | ~~Нуль цін~~ | ✅ ВИРІШЕНО — 22 Item Price записи |
| 2 | ~~Собівартість не рахується~~ | ✅ ВИРІШЕНО — Server Script активний |
| 3 | ~~Теплиця А тип "Transit"~~ | ✅ ВИРІШЕНО |
| 4 | **Ціни потребують підтвердження** власником | ❗ ПОТРІБНА ВІДПОВІДЬ |

### 🟡 Важливі
| # | Проблема | Дія |
|---|---|---|
| 5 | Маточники Спірея/Форзиція/Вейгела/Ялівець не внесені | Додати |
| 6 | Report "Список доступності" не існує | Створити Script Report |
| 7 | ~~POS не налаштований~~ | ✅ ВИРІШЕНО — POS Profile 'Розсадник - Роздріб' |
| 8 | nginx потребує reload після рестарту backend | Відомий workaround |

### 🟢 Некритичні
- Repotting Record не тестувався
- Немає QR-кодів
- Немає backup стратегії

---

## ═══ БЛОК 6: ROADMAP ═══

```
Фаза 0   ▓▓▓▓▓▓▓▓▓▓▓▓  100%  ✅ DONE    Docker + ERPNext + Склади + Каталог
Фаза 1A  `▓▓▓▓▓▓▓▓▓▓▓░   95%  🔄 ACTIVE  майже завершена — залишився тестовий продаж
Фаза 1B  `▓▓▓▓▓▓▓▓▓▓▓▓  100%  ✅ DONE    POS + перший продаж (ACC-SINV-2026-00001)
Фаза 2   ░░░░░░░░░░░░    0%  📋 PLANNED PWA (React) для персоналу
Фаза 3   ░░░░░░░░░░░░    0%  📋 PLANNED Аналітика
Фаза 4   ░░░░░░░░░░░░    0%  🔒 LOCKED  Планувальник (після 1 сезону!)
Фаза 5   ░░░░░░░░░░░░    0%  💡 FUTURE  AI + Viber
Фаза 6   ░░░░░░░░░░░░    0%  💡 FUTURE  Мульти-бізнес
```

---

## ═══ БЛОК 7: НАСТУПНІ КРОКИ ═══

### ⚡ Пріоритет 1 — ЗАРАЗ
1. **Підтвердити ціни** — власник має переглянути орієнтовні ціни (таблиця в 4.3)
2. **Script Report "Список доступності"** — таблиця: рослина | зараз | +4тижні | +8тижнів | ціни
3. **POS Profile** — налаштувати касу для роздрібного продажу

### ⚡ Пріоритет 2 — НЕЗАБАРОМ
4. Маточники: Спірея, Форзиція, Вейгела, Ялівець
5. Тестовий продаж через POS (Туя 1L — 198 шт готово!)
6. Додаткові партії поточного сезону

### ⚡ Пріоритет 3 — ПОТІМ
7. PWA прототип (React, Staff View — 4 кнопки)
8. QR-ярлики для партій
9. Backup стратегія (Google Drive або локально)

---

## ═══ БЛОК 8: БІЗНЕС-ЛОГІКА ═══

### Виробничий цикл
```
Маточник → живцювання → Plant Batch [Укорінення]
  ↓ Batch Events: Спостереження / Обробки / Підгодівля / Списання
  ↓ (4-12 тижнів)
Plant Batch [Готова до пересадки]
  ↓ Pересадка Event → дочірні партії з більшими горщиками
Plant Batch [Готова до продажу]
  ↓ Stock Entry в ERPNext (собівартість = valuation rate)
ПРОДАЖ → POS (роздріб) або Sales Invoice (опт)
```

### Формула собівартості (автоматично через Server Script)
```
total_cost     = SUM(cost) всіх Batch Events цієї партії
cost_per_plant = total_cost / quantity_current
quantity_current = quantity_start - SUM(quantity_lost) всіх Events
```

---

## ═══ БЛОК 9: BRAINSTORM / BACKLOG ═══

- QR-код на ярлику партії → скан відкриває картку в PWA
- Фото before/after прикріплювати до Batch Event
- Метеостанція → температура теплиці в систему
- Viber/Telegram щоденний дайджест (що потребує уваги сьогодні)
- PDF-каталог для оптовиків з Списку доступності
- Агрокалендар України (оптимальні дати живцювання по видах рослин)
- Dashboard ERPNext: KPI (активні партії / готові до продажу / загинуло %)
- Автоматичний backup в Google Drive
- Майбутні бізнеси: Садовий центр + Лохинова ферма (multi-company)

---

## ═══ БЛОК 10: CHANGELOG ═══

| Версія | Дата | Що зроблено |
|---|---|---|
| 1.0 | 2026-03-11 | Перше перенесення (з пам'яті чату) |
| 2.0 | 2026-03-11 | Верифіковано з ERPNext. 0 цін, 0 scripts виявлено |
| 3.0 | 2026-03-11 | ✅ Server Script (автособівартість) ✅ 22 Item Prices ✅ Теплиця А тип виправлено. Тест пройшов: 180→175 шт, cost=720грн, cost_per=4.11 |
| 4.0 | 2026-03-11 | ✅ POS Profile 'Розсадник - Роздріб' (Cash, Роздрібна ціна, Теплиця А, update_stock=1) ✅ Stock Entry MAT-STE-2026-00001: 198xTHU-OCC-SMA-1L @ 24.24 грн. ВАЖЛИВО: site name=frontend |
| 5.0 | 2026-03-12 | ✅ Script Report 'Список доступності' — працює (198 шт Туя 1L, 95грн, маржа 74.5%). Ціни підтверджені.
| 6.0 | 2026-03-12 | ✅ Домен Retail активовано. POS URL = /desk/point-of-sale. Клієнт 'Роздрібний покупець' як дефолтний в POS Profile.
| 7.0 | 2026-03-12 | 🎉 ПЕРШИЙ ПРОДАЖ: ACC-SINV-2026-00001 — 2×Туя 1L = 190 грн PAID. Сток: 198→196 шт. Каса: +190 грн. Весь ланцюг працює! Фаза 1B DONE. |
| ??? | ✅ Домен Retail активовано (Domain Settings → active_domains). POS page тепер доступна. ERPNext v16.7.3 / Frappe v16.10.7 | 'Список доступності' — працює, показує: 198 шт Туя 1L / 95 грн роздріб / 62 грн опт / маржа 74.5% / Теплиця А. Ціни підтверджені власником. 'Розсадник - Роздріб' (Cash, Роздрібна ціна, Теплиця А, update_stock=1) ✅ Stock Entry MAT-STE-2026-00001: 198×THU-OCC-SMA-1L @ 24.24 грн. ВАЖЛИВО: site name=frontend |

---

## ═══ ПРОМПТ ДЛЯ ВІДНОВЛЕННЯ ═══

```
Ти — Алекс, мій технічний партнер по розробці системи управління розсадником.

Прочитай файл:
C:\Users\Admin\frappe_docker\frappe_docker-main\CHAT_CONTEXT.md

Це єдине джерело правди проекту. Після прочитання:
1. Скажи коротко (3-5 рядків): де ми, що критично, що робимо далі
2. Починай роботу без зайвих питань
```

---
*Оновлюй після КОЖНОЇ сесії. Папка: C:\Users\Admin\frappe_docker\frappe_docker-main\*
