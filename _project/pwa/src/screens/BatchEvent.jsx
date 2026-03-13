import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createBatchEvent } from '../api/erpnext.js'

const EVENT_CONFIG = {
  'Підживлення':   { icon: '💧', color: 'yellow', hasQty: false, hasCost: true,  btnClass: 'btn-primary' },
  'Списання':      { icon: '☠️', color: 'red',    hasQty: true,  hasCost: false, btnClass: 'btn-danger'  },
  'Пересадка':     { icon: '🪴', color: 'purple', hasQty: false, hasCost: true,  btnClass: 'btn-primary' },
  'Обробка':       { icon: '🧪', color: 'blue',   hasQty: false, hasCost: true,  btnClass: 'btn-primary' },
  'Спостереження': { icon: '📝', color: 'green',  hasQty: false, hasCost: false, btnClass: 'btn-primary' },
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

  const showToast = (msg, dur = 2000) => {
    setToast(msg)
    setTimeout(() => setToast(null), dur)
  }

  const handleSave = async () => {
    if (saving) return
    if (type === 'Списання' && !qty) {
      showToast('⚠️ Вкажи кількість загиблих')
      return
    }
    setSaving(true)
    try {
      await createBatchEvent(batchId, type, {
        notes,
        quantity_lost: qty ? parseInt(qty) : 0,
        cost: cost ? parseFloat(cost) : 0,
      })
      showToast('✅ Збережено!')
      setTimeout(() => navigate('/'), 1200)
    } catch (e) {
      showToast('❌ Помилка: ' + e.message)
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
        {/* Назва партії */}
        <div className="card" style={{
          borderLeft: `3px solid var(--${cfg.color})`,
          paddingLeft: 16,
          marginBottom: 20
        }}>
          <div className="card-sub">Партія</div>
          <div className="card-title" style={{ marginTop: 2 }}>{batchTitle}</div>
        </div>

        {/* Кількість (тільки для Списання) */}
        {cfg.hasQty && (
          <div>
            <label className="input-label">Кількість загиблих рослин</label>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={qty}
              onChange={e => setQty(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Вартість */}
        {cfg.hasCost && (
          <div>
            <label className="input-label">Вартість витрат (грн)</label>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={cost}
              onChange={e => setCost(e.target.value)}
            />
          </div>
        )}

        {/* Нотатки */}
        <div>
          <label className="input-label">Нотатки (необов'язково)</label>
          <input
            className="input"
            type="text"
            placeholder="Коментар до події..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <button
          className={`btn ${cfg.btnClass}`}
          onClick={handleSave}
          disabled={saving}
          style={{ marginTop: 8 }}
        >
          {saving ? 'Збереження...' : `${cfg.icon} Зберегти ${type.toLowerCase()}`}
        </button>

        <button
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ marginTop: 10 }}
        >
          Скасувати
        </button>
      </div>
    </div>
  )
}
