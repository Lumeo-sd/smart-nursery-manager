# Browser Debug MCP - Інструкція

## Перед початком роботи (кожного разу):

### 1. Запустити Brave з remote debugging
```powershell
Start-Process 'C:\Users\Admin\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe' -ArgumentList '--remote-debugging-port=9222','--no-first-run','--no-default-browser-check','--user-data-dir=C:\temp\brave-debug' -WindowStyle Hidden
```

### 2. Запустити MCP сервер
```powershell
cd C:\Users\Admin\frappe_docker\frappe_docker-main\_project\mcp\browser-debug
node server.js
```
Або просто:
```powershell
C:\Users\Admin\frappe_docker\frappe_docker-main\_project\mcp\browser-debug\run-mcp.bat
```

### 3. Запустити opencode

---

## Конфігурація для opencode (mcpServers)

```json
{
  "browser-debug": {
    "type": "local", 
    "command": [
      "powershell",
      "-Command",
      "$env:CHROME_URL='ws://localhost:9222'; & 'C:\\Program Files\\nodejs\\node.exe' 'C:\\Users\\Admin\\frappe_docker\\frappe_docker-main\\_project\\mcp\\browser-debug\\server.js'"
    ],
    "enabled": true
  }
}
```

Додай цей блок в секцію "mcp" файлу `C:\Users\Admin\.config\opencode\opencode.json`

---

## Альтернатива - працювати без MCP:

Якщо MCP не підключається - просто:
1. Запусти PWA: `cd _project\pwa && npm run dev`
2. Відкрий Brave з PWA
3. Давай мені результати з консолі (F12)
