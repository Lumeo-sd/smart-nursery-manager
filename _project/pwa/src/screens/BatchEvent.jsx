import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createBatchEvent } from '../api/erpnext.js'

const EVENT_CONFIG = {
  'Підгодівля':     { icon: '○', color: 'yellow', hasQty: false, hasCost: true,  danger: false },
  'Обробка':        { icon: '◧', color: 'blue',   hasQty: false, hasCost: true,  danger: false },
  'Пересадка':      { icon: '◩', color: 'purple', hasQty: false, hasCost: true,  danger: false },
  'Спостереження':  { icon: '◔', color: 'green',  hasQty: false, hasCost: false, danger: false },
  'Списання':       { icon: '×', color: 'red',    hasQty: true,  hasCost: false, danger: true  },
  'Переміщення':    { icon: '◐', color: 'blue',   hasQty: false, hasCost: false, danger: false },
}

export default function BatchEvent() {
  const { batchId, type } = useParams()
  const [searchParams] = useSearchParams()
  const batchTitle = searchParams.get('title') || batchId
  const navigate = useNavigate()

  const cfg = EVENT_CONFIG[type] || EVENT_CONFIG['Спостереження']

  const [notes, setNotes]   = useState('')
  const [qty, setQty]       = useState('')
  const [cost, setCost]     = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const handleSave = async () => {
    if (saving) return
    if (type === 'Списання' && (!qty || parseInt(qty) < 1)) {
      showToast('! Вкажи кількість загиблих')
      return
    }
    setSaving(true)
    try {
      await createBatchEvent(batchId, type, {
        notes,
        quantity_lost: qty ? parseInt(qty) : 0,
        cost: cost ? parseFloat(cost) : 0,
      })
      showToast('✓ Збережено')
      setTimeout(() => navigate('/'), 1200)
    } catch (e) {
      showToast('× ' + e.message)
      setSaving(false)
    }
  }

  return (
    <div className="screen">
      {toast && <div className="toast">{toast}</div>}
      <div className="screen-header">
        <div className="back-btn" onClick={() => navigate(-1)}>‹</div>
        <h2 className="screen-title">{cfg.icon} {type}</h2>
      </div>
      <div className="content">
        <div className="card" style={{ borderLeft: `3px solid var(--${cfg.color})`, paddingLeft: 16, marginBottom: 20 }}>
          <div className="card-sub">Партія</div>
          <div className="card-title" style={{ marginTop: 2 }}>{batchTitle}</div>
        </div>

        {cfg.hasQty && (
          <>
            <label className="input-label">Кількість загиблих рослин</label>
            <input className="input" type="number" inputMode="numeric"
              placeholder="0" value={qty} onChange={e => setQty(e.target.value)} autoFocus />
          </>
        )}

        {cfg.hasCost && (
          <>
            <label className="input-label">Вартість витрат (грн)</label>
            <input className="input" type="number" inputMode="decimal"
              placeholder="0.00" value={cost} onChange={e => setCost(e.target.value)} />
          </>
        )}

        <label className="input-label">Нотатки</label>
        <input className="input" type="text" placeholder="Коментар..."
          value={notes} onChange={e => setNotes(e.target.value)} />

        <button className={`btn ${cfg.danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={handleSave} disabled={saving} style={{ marginTop: 8 }}>
          {saving ? 'Збереження...' : `${cfg.icon} Зберегти`}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginTop: 10 }}>
          Скасувати
        </button>
      </div>
    </div>
  )
}
