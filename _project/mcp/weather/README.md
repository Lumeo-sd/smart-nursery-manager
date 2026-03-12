# Weather MCP Server

**Статус: 🚧 TODO — заглушка готова, реальний API ще не підключений**

## Що буде робити

Безкоштовний Open-Meteo API — без ключа, без реєстрації.

| Інструмент | Що робить |
|---|---|
| `get_current_weather` | Температура, вологість, вітер, умови |
| `get_forecast` | Прогноз на 7 днів |
| `get_frost_alert` | ⚠️ Попередження якщо вночі очікується мороз |
| `get_irrigation_recommendation` | Чи потрібен полив (враховує дощ) |

## Чому критично для розсадника

- **Мороз вночі** → треба накрити розсаду або перемістити в теплицю
- **Дощ завтра** → полив OpenSprinkler можна пропустити
- **Спека** → підвищити частоту поливу, затінення
- **Ранковий дайджест** = погода + стан партій + що робити сьогодні

## Координати розсадника
```
LAT = 49.5   # ← уточнити у власника
LON = 31.5   # ← уточнити у власника
```

## Реалізація (TODO)

```python
import urllib.request, json

def get_weather(lat, lon):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,precipitation,windspeed_10m&daily=temperature_2m_min,precipitation_sum&timezone=Europe/Kyiv&forecast_days=3"
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())
```

## Файли
- `weather_stub.py` — заглушка для розробки (повертає тестові дані)
- `server.py` — TODO: реальний MCP сервер
- `Dockerfile` — TODO

## Інтеграція з OpenSprinkler
```
Weather: rain_probability > 60% 
  → OpenSprinkler: skip_irrigation = True
  → Batch Event: "Полив пропущено — дощ очікується"
```
