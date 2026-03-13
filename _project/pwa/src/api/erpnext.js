/**
 * ERPNext REST API wrapper
 * GET  /api/resource/  — без CSRF (token auth)
 * POST /api/resource/  — без CSRF (token auth через proxy)
 * POST /api/method/    — без CSRF (token auth через proxy)
 */

const cleanLoc = (loc) =>
  loc ? loc.replace(/\s*-\s*SDR\s*$/, '').trim() : '—'

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
  return (await res.json()).data
}

async function postResource(doctype, body) {
  const res = await fetch(`/api/api/resource/${encodeURIComponent(doctype)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let msg = `${res.status}`
    try { const j = await res.json(); msg = j.exception || j.exc_type || msg } catch {}
    throw new Error(msg)
  }
  return (await res.json()).data
}

async function callMethod(method, args = {}) {
  const res = await fetch(`/api/api/method/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!res.ok) {
    let msg = `${res.status}`
    try { const j = await res.json(); msg = j.exception || j.exc_type || msg } catch {}
    throw new Error(msg)
  }
  return (await res.json()).message
}

// ── Партії ────────────────────────────────────────────────
export async function getBatches() {
  const rows = await getResource('Plant Batch', {
    fields: JSON.stringify([
      'name', 'batch_title', 'status',
      'quantity_current', 'cost_per_plant',
      'current_location', 'plant_variety', 'pot_size',
    ]),
    filters: JSON.stringify([['status', 'not in', ['Закрита', 'Втрачена']]]),
    order_by: 'status asc',
    limit: 50,
  })
  return rows.map(r => ({ ...r, current_location: cleanLoc(r.current_location) }))
}

export async function createPlantBatch(fields) {
  return postResource('Plant Batch', fields)
}

// ВАЖЛИВО: поле "batch", а не "batch_id"!
export async function createBatchEvent(batchId, eventTypeKey, data = {}) {
  return postResource('Batch Event', {
    batch: batchId,
    event_type: EVENT_TYPES[eventTypeKey] || eventTypeKey,
    event_date: new Date().toISOString().split('T')[0],
    quantity_lost: 0,
    cost: 0,
    ...data,
  })
}

// ── Ціни ──────────────────────────────────────────────────
export async function getItemPrices() {
  return getResource('Item Price', {
    fields: JSON.stringify(['item_code', 'price_list_rate']),
    filters: JSON.stringify([['price_list', '=', '🛍️ Роздрібна ціна']]),
    limit: 50,
  })
}

// ── Продаж ────────────────────────────────────────────────
/**
 * Створює і відразу підтверджує (submit) Sales Invoice.
 * cartLines: [{ item_code, qty, rate }]
 * total: загальна сума (грн)
 */
export async function createAndSubmitSale(cartLines, total) {
  // 1. Створити чернетку
  const draft = await postResource('Sales Invoice', {
    company: 'SDR',
    customer: 'Роздрібний покупець',
    posting_date: new Date().toISOString().split('T')[0],
    is_pos: 1,
    pos_profile: 'Розсадник - Роздріб',
    is_created_using_pos: 1,
    update_stock: 1,
    set_warehouse: 'Теплиця А (холодна) - SDR',
    currency: 'UAH',
    selling_price_list: '🛍️ Роздрібна ціна',
    items: cartLines.map(l => ({
      item_code: l.item_code,
      qty: l.qty,
      rate: l.rate,
      warehouse: 'Теплиця А (холодна) - SDR',
    })),
    payments: [{
      mode_of_payment: 'Cash',
      amount: total,
      account: 'Cash - SDR',
      type: 'Cash',
      default: 1,
    }],
  })

  // 2. Підтвердити (submit)
  await callMethod('frappe.client.submit', {
    doc: { doctype: 'Sales Invoice', name: draft.name },
  })

  return draft.name  // напр. "ACC-SINV-2026-00002"
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
