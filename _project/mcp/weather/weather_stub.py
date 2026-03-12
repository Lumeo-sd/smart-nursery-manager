"""
Weather MCP Server — STUB (заглушка)
=====================================
Статус: TODO — замінити на реальний Open-Meteo API

Поки повертає фіксовані дані для розробки.
Реальна імплементація: https://open-meteo.com/en/docs (безкоштовно, без API ключа)

Майбутні інструменти:
  get_current_weather(lat, lon) — поточна погода
  get_forecast(lat, lon, days)  — прогноз на N днів
  get_frost_alert(lat, lon)     — попередження про мороз (критично для розсадника!)

Координати розсадника (Україна — оновити!):
  LAT = 49.5  # уточнити
  LON = 31.5  # уточнити
"""

NURSERY_LAT = 49.5
NURSERY_LON = 31.5

def get_current_weather():
    """STUB — поверне тестові дані"""
    return {
        "temperature_c": 8,
        "feels_like_c": 5,
        "condition": "Хмарно",
        "wind_kmh": 12,
        "humidity_pct": 75,
        "is_stub": True,
        "note": "TODO: підключити Open-Meteo API"
    }

def get_frost_alert():
    """STUB — попередження про мороз нижче 0°C"""
    return {
        "frost_tonight": False,
        "min_temp_tonight": 3,
        "alert": None,
        "is_stub": True
    }

def get_irrigation_recommendation():
    """STUB — чи потрібен полив сьогодні"""
    return {
        "irrigate_today": True,
        "reason": "Немає дощу прогнозується",
        "rain_probability_pct": 15,
        "is_stub": True
    }

if __name__ == "__main__":
    print("Weather MCP Stub — тестовий запуск")
    print(get_current_weather())
    print(get_frost_alert())
    print(get_irrigation_recommendation())
