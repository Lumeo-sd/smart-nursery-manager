/**
 * ERPNext REST API wrapper
 * GET  /api/resource/  — без CSRF (token auth)
 * POST /api/resource/  — без CSRF (token auth через proxy)
 * POST /api/method/    — без CSRF (token auth через proxy)
 */

const cleanLoc = (loc) =>
  loc ? loc.replace(/\s*-\s*SDR\s*$/, '').trim() : '—'

const STORAGE_KEY = 'nursery.erpnext.auth'
const DEFAULT_ROOT = '/api'

function emit(name, detail = {}) {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  } catch {
    // Ignore event issues (older browsers / locked down env).
  }
}

function maybeAuthRedirect(res) {
  if (!res) return
  if (res.status === 401 || res.status === 403) {
    emit('nursery:auth-required', {
      status: res.status,
      url: res.url,
      hasAuth: hasAuthConfig(),
    })
  }
}

function safeParse(json) {
  try { return JSON.parse(json) } catch { return null }
}

function normalizeValue(value) {
  if (!value) return ''
  const trimmed = String(value).trim()
  const lower = trimmed.toLowerCase()
  const placeholders = new Set([
    'your_api_key_here',
    'your_api_secret_here',
    'change_me',
    'changeme',
    'admin',
    'http://localhost:8080',
    'https://localhost:8080',
    'http://127.0.0.1:8080',
    'https://127.0.0.1:8080',
  ])
  if (placeholders.has(lower)) return ''
  return trimmed
}

export function getAuthConfig() {
  const stored = safeParse(localStorage.getItem(STORAGE_KEY) || '')
  const envRoot = import.meta.env.VITE_ERPNEXT_URL || ''
  const envKey = import.meta.env.VITE_API_KEY || ''
  const envSecret = import.meta.env.VITE_API_SECRET || ''

  const url = normalizeValue((stored && stored.url) || envRoot || '')
  const apiKey = normalizeValue((stored && stored.apiKey) || envKey || '')
  const apiSecret = normalizeValue((stored && stored.apiSecret) || envSecret || '')

  return {
    url: url.trim(),
    apiKey: apiKey.trim(),
    apiSecret: apiSecret.trim(),
  }
}

export function saveAuthConfig({ url = '', apiKey = '', apiSecret = '' }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    url: url.trim(),
    apiKey: apiKey.trim(),
    apiSecret: apiSecret.trim(),
  }))
  emit('nursery:auth-changed', { hasAuth: hasAuthConfig() })
}

export function clearAuthConfig() {
  localStorage.removeItem(STORAGE_KEY)
  emit('nursery:auth-changed', { hasAuth: false })
}

export function hasAuthConfig() {
  const { apiKey, apiSecret } = getAuthConfig()
  return Boolean(apiKey && apiSecret)
}

function getApiRoot() {
  const { url } = getAuthConfig()
  if (!url) return DEFAULT_ROOT
  return url.replace(/\/+$/, '')
}

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const { apiKey, apiSecret } = getAuthConfig()
  if (apiKey && apiSecret) {
    headers.Authorization = `token ${apiKey}:${apiSecret}`
  }
  return headers
}

export const EVENT_TYPES = {
  'Підгодівля':    '💧 Підгодівля',
  'Обробка':       '🧪 Обробка (пестицид/фунгіцид)',
  'Пересадка':     '🌱 Пересадка',
  'Переміщення':   '📍 Переміщення',
  'Списання':      '☠️ Списання (загибели)',
  'Спостереження': '📝 Спостереження',
  'Мульчування':   '🌾 Мульчування',
}

// ── низькорівневі ──────────────────────────────────────────
async function getResource(doctype, params = {}) {
  const root = getApiRoot()
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(
    `${root}/api/resource/${encodeURIComponent(doctype)}?${qs}`,
    { headers: buildHeaders() }
  )
  maybeAuthRedirect(res)
  if (!res.ok) throw new Error(`GET ${doctype}: ${res.status}`)
  return (await res.json()).data
}

// GET одного документу по імені — повертає повний doc з актуальним modified
async function getDoc(doctype, name) {
  const root = getApiRoot()
  const res = await fetch(
    `${root}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { headers: buildHeaders() }
  )
  maybeAuthRedirect(res)
  if (!res.ok) throw new Error(`GET ${doctype}/${name}: ${res.status}`)
  return (await res.json()).data
}

async function postResource(doctype, body) {
  const root = getApiRoot()
  const res = await fetch(`${root}/api/resource/${encodeURIComponent(doctype)}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  })
  maybeAuthRedirect(res)
  if (!res.ok) {
    let msg = `${res.status}`
    try { const j = await res.json(); msg = j.exception || j.exc_type || msg } catch {}
    throw new Error(msg)
  }
  return (await res.json()).data
}

async function callMethod(method, args = {}) {
  const root = getApiRoot()
  const res = await fetch(`${root}/api/method/${method}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(args),
  })
  maybeAuthRedirect(res)
  if (!res.ok) {
    let msg = `${res.status}`
    try { const j = await res.json(); msg = j.exception || j.exc_type || msg } catch {}
    throw new Error(msg)
  }
  return (await res.json()).message
}

export async function getLoggedUser() {
  const root = getApiRoot()
  const res = await fetch(`${root}/api/method/frappe.auth.get_logged_user`, {
    headers: buildHeaders(),
  })
  maybeAuthRedirect(res)
  if (!res.ok) throw new Error(`GET logged_user: ${res.status}`)
  const body = await res.json()
  return body.message
}

/**
 * Після create ERPNext оновлює modified через хуки.
 * Треба GET свіжий doc → submit з актуальним modified.
 * Інакше: TimestampMismatchError
 */
async function submitDoc(doctype, name) {
  const fresh = await getDoc(doctype, name)
  return callMethod('frappe.client.submit', { doc: fresh })
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

// ── POS Opening Entry ─────────────────────────────────────
export async function ensurePosOpen() {
  const today = new Date().toISOString().split('T')[0]

  const existing = await getResource('POS Opening Entry', {
    fields: JSON.stringify(['name']),
    filters: JSON.stringify([
      ['status', '=', 'Open'],
      ['posting_date', '=', today],
      ['pos_profile', '=', 'Розсадник - Роздріб'],
    ]),
    limit: 1,
  })
  if (existing && existing.length > 0) return existing[0].name

  const draft = await postResource('POS Opening Entry', {
    pos_profile:       'Розсадник - Роздріб',
    user:              'p3sy@proton.me',
    company:           'SDR',
    posting_date:      today,
    period_start_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    balance_details:   [{ mode_of_payment: 'Cash', opening_amount: 0 }],
  })

  await submitDoc('POS Opening Entry', draft.name)
  return draft.name
}

// ── Продаж ────────────────────────────────────────────────
export async function createAndSubmitSale(cartLines, total) {
  await ensurePosOpen()

  const draft = await postResource('Sales Invoice', {
    company:              'SDR',
    customer:             'Роздрібний покупець',
    posting_date:         new Date().toISOString().split('T')[0],
    is_pos:               1,
    pos_profile:          'Розсадник - Роздріб',
    is_created_using_pos: 1,
    update_stock:         1,
    set_warehouse:        'Теплиця А (холодна) - SDR',
    currency:             'UAH',
    selling_price_list:   '🛍️ Роздрібна ціна',
    items: cartLines.map(l => ({
      item_code: l.item_code,
      qty:       l.qty,
      rate:      l.rate,
      warehouse: 'Теплиця А (холодна) - SDR',
    })),
    payments: [{
      mode_of_payment: 'Cash',
      amount:          total,
      account:         'Cash - SDR',
      type:            'Cash',
      default:         1,
    }],
  })

  // GET свіжий doc → submit з актуальним modified
  await submitDoc('Sales Invoice', draft.name)
  return draft.name
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
