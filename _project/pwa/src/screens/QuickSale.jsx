import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBatches, getItemPrices, createAndSubmitSale } from '../api/erpnext.js'

export default function QuickSale() {
  const navigate = useNavigate()
  const [items, setItems]     = useState([])
  const [cart, setCart]       = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [result, setResult]   = useState(null)
  const [toast, setToast]     = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    Promise.all([getBatches(), getItemPrices()])
      .then(([batches, prices]) => {
        const priceMap = {}
        prices.forEach(p => { priceMap[p.item_code] = p.price_list_rate })

        const saleItems = batches
          .filter(b => b.status === 'Готова до продажу' && b.quantity_current > 0)
          .map(b => {
            const code = (b.plant_variety && b.pot_size)
              ? `${b.plant_variety}-${b.pot_size}`
              : b.plant_variety || b.name
            return {
              batchId:    b.name,
              batchTitle: b.batch_title || b.name,
              itemCode:   code,
              available:  b.quantity_current,
              price:      priceMap[code] || 0,
              location:   b.current_location,
            }
          })
        setItems(saleItems)
      })
      .catch(e => showToast('× ' + e.message))
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

  const cartItems = items.filter(i => (cart[i.batchId] || 0) > 0)
  const total = cartItems.reduce((s, i) => s + cart[i.batchId] * i.price, 0)
  const hasItems = cartItems.length > 0

  const handleSell = async () => {
    if (!hasItems || saving) return
    const noPriceItem = cartItems.find(i => !i.price)
    if (noPriceItem) {
      showToast(`! Немає ціни: ${noPriceItem.batchTitle}`)
      return
    }
    setSaving(true)
    try {
      const cartLines = cartItems.map(i => ({
        item_code: i.itemCode,
        qty:       cart[i.batchId],
        rate:      i.price,
      }))
      const invoiceNo = await createAndSubmitSale(cartLines, total)
      setResult({
        invoiceNo,
        total,
        lines: cartItems.map(i =>
          `${cart[i.batchId]}× ${i.batchTitle.split(' ').slice(0,3).join(' ')}`
        ),
      })
      setCart({})
    } catch (e) {
      showToast('× ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (result) {
    return (
      <div className="screen">
        <div className="content" style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Продаж оформлено!</div>
          <div style={{ color: 'var(--green)', fontSize: 32, fontWeight: 800, marginBottom: 24 }}>
            {result.total} грн
          </div>
          <div className="card" style={{ textAlign: 'left', marginBottom: 24 }}>
            <div className="card-sub" style={{ marginBottom: 8 }}>№ {result.invoiceNo}</div>
            {result.lines.map((l, i) => (
              <div key={i} style={{
                padding: '6px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: 14,
              }}>{l}</div>
            ))}
          </div>
          <button className="btn btn-primary"
            onClick={() => { setResult(null); navigate('/') }}>
            На головну
          </button>
          <button className="btn btn-ghost" style={{ marginTop: 10 }}
            onClick={() => setResult(null)}>
            Ще один продаж
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      {toast && <div className="toast">{toast}</div>}
      <div className="screen-header">
        <div className="back-btn" onClick={() => navigate(-1)}>‹</div>
        <h2 className="screen-title">Продаж</h2>
        {hasItems && (
          <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: 16 }}>
            {total} грн
          </div>
        )}
      </div>

      <div className="content">
        {loading && <div className="loading">Завантаження асортименту...</div>}

        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-2)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>○</div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>Нічого продавати</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>
              Немає партій зі статусом "Готова до продажу"
            </div>
          </div>
        )}

        {items.map(item => {
          const qty = cart[item.batchId] || 0
          return (
            <div key={item.batchId} className="card" style={{
              borderLeft: qty > 0 ? '3px solid var(--green)' : '3px solid transparent',
              paddingLeft: 16,
            }}>
              <div className="card-row" style={{ marginBottom: 4 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div className="card-title" style={{ fontSize: 16 }}>{item.batchTitle}</div>
                  <div className="card-sub">
                    {item.price > 0
                      ? `${item.price} грн/шт`
                      : <span style={{ color: 'var(--orange)' }}>! Ціна не вказана</span>}
                    {' · '}Є: {item.available} шт
                    {item.location && ` · •${item.location}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {qty > 0 && (
                    <>
                      <CountBtn onClick={() => sub(item.batchId)} label="−" />
                      <span style={{ fontSize: 20, fontWeight: 700, minWidth: 28, textAlign: 'center' }}>
                        {qty}
                      </span>
                    </>
                  )}
                  <CountBtn
                    onClick={() => add(item.batchId, item.available)}
                    label="+"
                    primary
                    disabled={qty >= item.available || !item.price}
                  />
                </div>
              </div>
              {qty > 0 && item.price > 0 && (
                <div style={{ color: 'var(--green)', fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                  = {(qty * item.price).toFixed(0)} грн
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hasItems && (
        <div style={{
          padding: '12px 16px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
          borderTop: '1px solid var(--border)',
          background: 'rgba(10,10,10,0.95)',
          backdropFilter: 'blur(20px)',
          flexShrink: 0,
        }}>
          {cartItems.map(i => (
            <div key={i.batchId} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 13, color: 'var(--text-2)', marginBottom: 4,
            }}>
              <span>{cart[i.batchId]}× {i.batchTitle.split(' ').slice(0,3).join(' ')}</span>
              <span>{(cart[i.batchId] * i.price).toFixed(0)} грн</span>
            </div>
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
          <button className="btn btn-primary" onClick={handleSell} disabled={saving}>
            {saving ? 'Оформлення...' : `Оформити — ${total} грн`}
          </button>
        </div>
      )}
    </div>
  )
}

function CountBtn({ onClick, label, primary, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 36, height: 36, borderRadius: '50%', border: 'none',
      background: primary ? (disabled ? 'var(--surface-2)' : 'var(--green)') : 'var(--surface-2)',
      color: primary ? (disabled ? 'var(--text-2)' : '#000') : 'var(--text)',
      fontSize: 22, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>{label}</button>
  )
}
