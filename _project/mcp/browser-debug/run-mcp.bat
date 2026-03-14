@echo off
echo Starting Browser Debug MCP...
cd /d C:\Users\Admin\frappe_docker\frappe_docker-main\_project\mcp\browser-debug
set CHROME_URL=ws://localhost:9222
node server.js
