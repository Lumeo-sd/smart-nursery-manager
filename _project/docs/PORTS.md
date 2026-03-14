# Порти проекту Smart Nursery Manager

| Сервіс | Порт | URL | Статус |
|---|---|---|---|
| ERPNext | 8080 | http://localhost:8080/desk | ✅ активний |
| ERPNext MCP | 8000 | http://localhost:8000/mcp | ✅ активний |
| **PWA** | **3002** | **http://localhost:3002** | 🚧 в розробці |

## Зайняті іншими сервісами (не чіпати)
| Порт | Сервіс |
|---|---|
| 3000 | Linkwarden |
| 3001 | Інший сервіс |

## Запуск PWA для розробки
```powershell
cd C:\Users\Admin\frappe_docker\frappe_docker-main\_project\pwa
npm install
npm run dev
# → http://localhost:3002
```

## Запуск PWA через Docker
```powershell
cd C:\Users\Admin\frappe_docker\frappe_docker-main\_project\pwa
docker compose up -d --build
# → http://localhost:3002
```
