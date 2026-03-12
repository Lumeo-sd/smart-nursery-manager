# ERPNext MCP Server

MCP сервер для [ERPNext / Frappe](https://erpnext.com/) — підключає Claude Desktop до вашого ERPNext.

**Архітектура:** Docker-контейнер з HTTP-сервером (порт 8000) + `mcp-remote` як stdio-міст для Claude Desktop.

```
Claude Desktop → mcp-remote (stdio) → HTTP :8000 → Docker (erpnext-mcp) → ERPNext :8080
```

---

## Вимоги

- Docker Desktop (запущений)
- Node.js >= 20 ([nodejs.org](https://nodejs.org/)) — потрібен для mcp-remote
- Запущений ERPNext (наприклад, на `localhost:8080`)

---

## Встановлення

### 1. Клонувати репозиторій

```powershell
git clone https://github.com/your-repo/erpnext-mcp-final.git
cd erpnext-mcp-final
```

### 2. Встановити mcp-remote глобально

> Якщо вже встановлено для іншого MCP сервера — пропустити цей крок.

```powershell
npm install -g mcp-remote
```

Перевірити:
```powershell
Get-Item "$env:APPDATA\npm\node_modules\mcp-remote\dist\proxy.js"
```

### 3. Отримати API ключі ERPNext

1. Зайти в ERPNext → **Settings → My Profile**
2. Відкрити вкладку **API Access**
3. Натиснути **Generate Keys**
4. Скопіювати **API Key** і **API Secret**

### 4. Створити `.env` файл

У папці проекту створити файл `.env` (скопіювати з прикладу):

```powershell
copy .env.example .env
```

Відкрити `.env` і вставити свої значення:

```
ERPNEXT_URL=http://host.docker.internal:8080
ERPNEXT_API_KEY=ваш_api_key
ERPNEXT_API_SECRET=ваш_api_secret
```

> `ERPNEXT_URL` залишити як є якщо ERPNext запущений локально на порту 8080.  
> Якщо інший порт — змінити відповідно.

### 5. Запустити Docker контейнер

```powershell
docker compose up -d --build
```

Перевірити що сервер відповідає:

```powershell
Invoke-RestMethod http://localhost:8000/mcp
# Або через curl:
curl http://localhost:8000/mcp
```

Має повернути відповідь без помилок авторизації.

### 6. Налаштувати Claude Desktop

Відкрити файл конфігурації:
```
%APPDATA%\Claude\claude_desktop_config.json
```

Додати `erpnext` в секцію `mcpServers` (зберігши існуючі записи):

```json
{
  "mcpServers": {
    "erpnext": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "C:\\Users\\ВАШЕ_ІМ'Я\\AppData\\Roaming\\npm\\node_modules\\mcp-remote\\dist\\proxy.js",
        "http://localhost:8000/mcp"
      ]
    }
  }
}
```

> Замінити `ВАШЕ_ІМ'Я` на реальне ім'я користувача Windows.

### 7. Перезапустити Claude Desktop

Закрити і відкрити знову. У нижньому лівому куті має з'явитись 🔨 іконка — ERPNext інструменти підключені.

---

## Налаштування для Zed

Відкрити файл конфігурації Zed:
```
%APPDATA%\Zed\settings.json
```

Додати `erpnext` в секцію `mcpServers`:

```json
{
  "mcp_servers": {
    "erpnext": {
      "command": {
        "program": "node",
        "args": [
          "C:\\Users\\ВАШЕ_ІМ'Я\\AppData\\Roaming\\npm\\node_modules\\mcp-remote\\dist\\proxy.js",
          "http://localhost:8000/mcp"
        ]
      }
    }
  }
}
```

> Замінити `ВАШЕ_ІМ'Я` на реальне ім'я користувача Windows.

Перезапустити Zed. ERPNext інструменти з'являться в панелі інструментів (MCP).

---

## Оновлення після змін коду

```powershell
docker compose up -d --build
```

---

## Усунення проблем

**Контейнер не запускається**
```powershell
docker logs erpnext-mcp
```
Найчастіша причина: невірний API key/secret або ERPNext недоступний.

**Перевірити що контейнер запущений:**
```powershell
docker ps | findstr erpnext-mcp
```

**ERPNext недоступний з контейнера**  
`host.docker.internal` — це спеціальний DNS-запис Docker що вказує на хост-машину.  
Якщо ERPNext запущений на іншій адресі — змінити `ERPNEXT_URL` в `.env`.

**Claude Desktop не бачить інструменти**  
1. Перевірити що `http://localhost:8000/mcp` відповідає  
2. Перевірити шляхи в `claude_desktop_config.json` — подвійні `\\`  
3. Перезапустити Claude Desktop повністю  

---

## Доступні інструменти

Сервер надає інструменти для роботи з ERPNext через API:
- Отримання, створення, оновлення, видалення документів (DocType records)
- Запити до API ERPNext
- Управління правами користувачів
- Перегляд метаданих DocType

Повний список інструментів відображається в Claude Desktop після підключення (🔨 → ERPNext).
