# 🌿 Smart Nursery Manager

> Система управління декоративним розсадником — ERPNext + PWA + AI (Claude MCP)

[![ERPNext](https://img.shields.io/badge/ERPNext-16.x-blue)](https://erpnext.com)
[![React](https://img.shields.io/badge/PWA-React%2018-61dafb)](https://react.dev)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Що це?

Повна система обліку та управління для невеликого розсадника декоративних рослин (Україна).

**Стек:**
- **ERPNext 16** — бекенд (партії, продажі, собівартість, звіти)
- **React PWA** — мобільний інтерфейс для персоналу (додати на домашній екран)
- **Claude MCP** — AI-управління через природню мову (голосові команди в ERPNext)
- **Docker** — весь стек в контейнерах, одна команда для запуску

**Унікальні можливості:**
- Облік партій рослин від живця до продажу
- Автоматичний перерахунок собівартості при кожній події
- AI-асистент що вміє писати в ERPNext напряму через MCP
- PWA — без апстору, просто "Додати на домашній екран"

---

## ⚡ Швидкий старт (одна команда)

### Windows
```powershell
irm https://raw.githubusercontent.com/Lumeo-sd/smart-nursery-manager/master/_project/install.ps1 | iex
```

### Linux / Mac
```bash
curl -fsSL https://raw.githubusercontent.com/Lumeo-sd/smart-nursery-manager/master/_project/install.sh | bash
```

Що відбудеться:
1. Перевірить наявність Docker
2. Клонує репозиторій
3. Підніме ERPNext на порту `:8080`
4. Запустить PWA dev-сервер на порту `:3002`

> Перший запуск займає ~5 хв (завантаження Docker образів)

---

## Ручний запуск

```bash
git clone https://github.com/Lumeo-sd/smart-nursery-manager.git
cd smart-nursery-manager

# ERPNext
docker compose -f compose.yaml up -d

# PWA (окремий термінал)
cd _project/pwa
cp .env.example .env   # заповни API ключі
npm install
npm run dev
```

**ERPNext:** http://localhost:8080  
**PWA:** http://localhost:3002

---

## Структура проекту

```
smart-nursery-manager/
├── _project/               ← наш проект
│   ├── context/            ← CHAT_CONTEXT.md (для AI сесій)
│   ├── mcp/                ← MCP модулі (ERPNext, Weather, Poliv...)
│   ├── pwa/                ← React PWA (мобільний інтерфейс)
│   ├── skills/             ← AI навички (що вміє Алекс)
│   ├── scripts/archive/    ← скрипти налаштування ERPNext
│   ├── install.ps1         ← Windows інсталятор
│   └── install.sh          ← Linux/Mac інсталятор
├── compose.yaml            ← ERPNext Docker stack
└── ...                     ← Frappe Docker конфіги
```

---

## Модулі ERPNext

| Модуль | Опис |
|---|---|
| **Plant Batch** | Партії рослин (від живця до продажу) |
| **Batch Event** | Підживлення, обробка, списання, пересадка |
| **POS** | Швидкий продаж на касі |
| **Script Report** | Список доступності (що є в наявності) |

---

## PWA — екрани

| Екран | Функція |
|---|---|
| 🏠 Головна | Дашборд: к-сть партій, готово до продажу, в укоріненні |
| 🌿 Партії | Список всіх партій з кольоровими статусами |
| 💧 Подія | Підгодівля / Обробка / Списання / Пересадка |
| ➕ Нова партія | Зареєструвати нову партію |
| 💰 Продати | Швидкий продаж з підбором партії та ціни |

---

## AI-управління (Claude MCP)

Підключені модулі:

```
erpnext          → пряма робота з ERPNext
Windows-MCP      → файлова система, PowerShell
weather          → погода (Open-Meteo)
opensprinkler    → автополив
github           → код репозиторій
time             → час (Europe/Kyiv)
memory           → пам'ять між сесіями
```

**Відновлення сесії:**
```
Ти — Алекс, технічний партнер.
Прочитай: _project/context/CHAT_CONTEXT.md
Скажи де ми і що далі.
```

---

## Roadmap

```
Фаза 0   ✅  Docker + ERPNext + Склади + Каталог
Фаза 1A  ✅  DocTypes + Scripts + Ціни + Report
Фаза 1B  ✅  POS + Перший продаж
Фаза 2   🎯  PWA (в розробці)
Фаза 3   📋  Аналітика + Дашборд
Фаза 4   🔒  Планувальник
Фаза 5   💡  AI розширення (Weather, Viber/Telegram)
Фаза 6   💡  Мульти-бізнес
```

---

## Вимоги

- Docker Desktop 4.x+
- Node.js 18+ (для PWA)
- 4 GB RAM (рекомендовано 8 GB)
- Windows 10+ / Ubuntu 20+ / macOS 12+

---

## Ліцензія

MIT — дивись [LICENSE](LICENSE)
