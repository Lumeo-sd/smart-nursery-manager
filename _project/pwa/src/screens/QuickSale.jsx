import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBatches, getItemPrices } from '../api/erpnext.js'

export default function QuickSale() {
  const navigate = useNavigate()
  const [items, setItems]   = useState([])
  const [cart, setCart]     = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    // Беремо партії "Готова до продажу" + роздрібні ціни
    Promise.all([getBatches(), getItemPrices()])
      .then(([batches, prices]) => {
        const priceMap = {}
        prices.forEach(p => { priceMap[p.item_code] = p.price_list_rate })

        // Групуємо партії по item_code / plant_variety
        const saleItems = batches
          .filter(b => b.status === 'Готова до продажу' && b.quantity_current > 0)
          .map(b => {
            // Визначаємо item_code (format: variety-potSize → THU-OCC-SMA-1L)
            const code = b.plant_variety
              ? `${b.plant_variety}-${(b.pot_size || '').replace('L', 'L')}`
              : b.name
            return {
              batchId:   b.name,
              batchTitle: b.batch_title,
              itemCode:  code,
              available: b.quantity_current,
              price:     priceMap[code] || 0,
              location:  b.current_location,
            }
          })
        setItems(saleItems)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const add = (id, max) =>
    setCart(c => ({ ...c, [id]: Math.min((c[id] || 0) + 1, max) }))
  const sub = (id) =>
    setCart(c => {
      const n = (c[id] || 0) - 1
      if (n <= 0) { const { [id]: _, ...rest } = c; return rest }
      return { ...c, [id]: n }
    })

  const total = items.reduce((s, i) => s + (cart[i.batchId] || 0) * i.price, 0)
  const hasItems = Object.values(cart).some(v => v > 0)

  const handleSell = async () => {
    if (!hasItems || saving) return
    setSaving(true)
    try {
      // TODO: POST до ERPNext POS API → Sales Invoice
      // Тимчасово: симуляція успішного продажу
      await new Promise(r => setTimeout(r, 600))
      const lines = items
        .filter(i => cart[i.batchId] > 0)
        .map(i => `${cart[i.batchId]}×${i.batchTitle.split(' ').slice(0,2).join(' ')}`)
        .join(', ')
      showToast(`✅ Продано: ${lines} — ${total} грн`)
      setCart({})
      setTimeout(() => navigate('/'), 1500)
    } catch (e) {
      showToast('❌ ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="screen">
      {toast && <div className="toast">{toast}</div>}

      <div className="screen-header">
        <div className="back-btn" onClick={() => navigate(-1)}>‹</div>
        <h2 className="screen-title">🛒 Продаж</h2>
      </div>

      <div className="content">
        {loading && <div className="loading">Завантаження асортименту...</div>}

        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-2)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌾</div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>Нічого продавати</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>Немає партій зі статусом "Готова до продажу"</div>
          </div>
        )}

        {items.map(item => (
          <div key={item.batchId} className="card">
            <div className="card-row" style={{ marginBottom: 4 }}>
              <div style={{ flex: 1, marginRight: 12 }}>
                <div className="card-title" style={{ fontSize: 16 }}>
                  {item.batchTitle}
                </div>
                <div className="card-sub">
                  {item.price > 0 ? `${item.price} грн` : '— ціна не вказана'} · є: {item.available} шт
                </div>
              </div>

              {/* Лічильник */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {cart[item.batchId] > 0 && (
                  <>
                    <CountBtn onClick={() => sub(item.batchId)} label="−" />
                    <span style={{ fontSize: 20, fontWeight: 700, minWidth: 28, textAlign: 'center' }}>
                      {cart[item.batchId]}
                    </span>
                  </>
                )}
                <CountBtn
                  onClick={() => add(item.batchId, item.available)}
                  label="+"
                  primary
                  disabled={cart[item.batchId] >= item.available}
                />
              </div>
            </div>

            {cart[item.batchId] > 0 && item.price > 0 && (
              <div style={{ color: 'var(--green)', fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                = {(cart[item.batchId] * item.price).toFixed(0)} грн
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Кнопка продажу */}
      {hasItems && (
        <div style={{
          padding: '12px 16px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
          borderTop: '1px solid var(--border)',
          background: 'rgba(10,10,10,0.95)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
        }}>
          <button className="btn btn-primary" onClick={handleSell} disabled={saving}>
            {saving ? 'Оформлення...' : `💰 Продати — ${total} грн`}
          </button>
        </div>
      )}
    </div>
  )
}

function CountBtn({ onClick, label, primary, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 34, height: 34, borderRadius: '50%', border: 'none',
        background: primary ? (disabled ? 'var(--surface-2)' : 'var(--green)') : 'var(--surface-2)',
        color: primary ? (disabled ? 'var(--text-2)' : '#000') : 'var(--text)',
        fontSize: 20, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'opacity 0.15s',
        flexShrink: 0,
      }}
    >{label}</button>
  )
}
