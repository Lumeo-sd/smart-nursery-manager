/**
 * ERPNext REST API wrapper
 * GET /api/resource/ — без CSRF (token auth)
 * POST /api/resource/ — теж без CSRF з token auth
 * Authorization вставляється vite.config.js proxy.configure()
 */

const cleanLoc = (loc) =>
  loc ? loc.replace(/\s*-\s*SDR\s*$/, '').trim() : '—'

// Типи подій — точно як у Select в ERPNext (з емодзі!)
export const EVENT_TYPES = {
  'Підгодівля':    '💧 Підгодівля',
  'Обробка':       '🧪 Обробка (пестицид/фунгіцид)',
  'Пересадка':     '🌱 Пересадка',
  'Переміщення':   '📍 Переміщення',
  'Списання':      '☠️ Списання (загибели)',
  'Спостереження': '📝 Спостереження',
  'Мульчування':   '🌾 Мульчування',
}

async function getResource(doctype, params = {}) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`/api/api/resource/${encodeURIComponent(doctype)}?${qs}`)
  if (!res.ok) throw new Error(`GET ${doctype}: ${res.status}`)
  const data = await res.json()
  return data.data
}

async function postResource(doctype, body) {
  const res = await fetch(`/api/api/resource/${encodeURIComponent(doctype)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    let msg = `${res.status}`
    try {
      const j = await res.json()
      msg = j.exception || j.exc_type || j._server_messages || msg
    } catch {}
    throw new Error(msg)
  }
  const data = await res.json()
  return data.data
}

// ── Партії ────────────────────────────────────────────────
export async function getBatches() {
  const rows = await getResource('Plant Batch', {
    fields: JSON.stringify([
      'name', 'batch_title', 'status',
      'quantity_current', 'cost_per_plant',
      'current_location', 'plant_variety', 'pot_size'
    ]),
    filters: JSON.stringify([['status', 'not in', ['Закрита', 'Втрачена']]]),
    order_by: 'status asc',
    limit: 50
  })
  return rows.map(r => ({ ...r, current_location: cleanLoc(r.current_location) }))
}

export async function createPlantBatch(fields) {
  return postResource('Plant Batch', fields)
}

// ВАЖЛИВО: поле "batch", а не "batch_id"!
export async function createBatchEvent(batchId, eventTypeKey, data = {}) {
  const eventType = EVENT_TYPES[eventTypeKey] || eventTypeKey
  return postResource('Batch Event', {
    batch: batchId,
    event_type: eventType,
    event_date: new Date().toISOString().split('T')[0],
    quantity_lost: 0,
    cost: 0,
    ...data
  })
}

// ── Ціни ──────────────────────────────────────────────────
export async function getItemPrices() {
  return getResource('Item Price', {
    fields: JSON.stringify(['item_code', 'price_list_rate']),
    filters: JSON.stringify([['price_list', '=', '🛍️ Роздрібна ціна']]),
    limit: 50
  })
}

// ── Дашборд ───────────────────────────────────────────────
export async function getDashboardStats() {
  const batches = await getBatches()
  return {
    total_batches: batches.length,
    ready_to_sell: batches
      .filter(b => b.status === 'Готова до продажу')
      .reduce((s, b) => s + (b.quantity_current || 0), 0),
    rooting: batches
      .filter(b => b.status === 'Укорінення')
      .reduce((s, b) => s + (b.quantity_current || 0), 0),
  }
}
