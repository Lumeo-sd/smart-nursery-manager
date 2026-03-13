import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getBatches } from '../api/erpnext.js'

const STATUS_COLOR = {
  'Готова до продажу': 'green',
  'Укорінення':        'orange',
  'Зростання':         'orange',
  'Живцювання':        'yellow',
}
const STATUS_ICON = {
  'Готова до продажу': '✅',
  'Укорінення':        '🌱',
  'Зростання':         '🪴',
  'Живцювання':        '✂️',
}
const ACTION_EVENT = {
  event:    'Підгодівля',
  writeoff: 'Списання',
  repot:    'Пересадка',
}
const ACTION_HEADER = {
  event:    { icon: '💧', text: 'Для якої партії?' },
  writeoff: { icon: '☠️', text: 'Яку партію списати?' },
  repot:    { icon: '🌱', text: 'Яку пересаджуємо?' },
}

export default function BatchList() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [params]              = useSearchParams()
  const navigate              = useNavigate()
  const action                = params.get('action')

  useEffect(() => {
    getBatches()
      .then(setBatches)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleBatch = (batch) => {
    if (!action) return
    const eventType = ACTION_EVENT[action]
    navigate(`/event/${batch.name}/${eventType}?title=${encodeURIComponent(batch.batch_title || batch.name)}`)
  }

  const header = ACTION_HEADER[action] || { icon: '🌿', text: 'Всі партії' }

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="back-btn" onClick={() => navigate('/')}>‹</div>
        <h2 className="screen-title">{header.icon} {header.text}</h2>
      </div>
      <div className="content">
        {loading && <div className="loading">Завантаження...</div>}

        {error && (
          <div className="card" style={{ borderColor: 'var(--red)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
            <div className="card-title" style={{ color: 'var(--red)' }}>Немає з'єднання</div>
            <div className="card-sub" style={{ marginTop: 4 }}>{error}</div>
          </div>
        )}

        {batches.map(b => {
          const color      = STATUS_COLOR[b.status] || 'blue'
          const statusIcon = STATUS_ICON[b.status]  || '📦'
          return (
            <div key={b.name} className="card"
              style={{ cursor: action ? 'pointer' : 'default', borderLeft: `3px solid var(--${color})`, paddingLeft: 16 }}
              onClick={() => action && handleBatch(b)}>
              <div className="card-row" style={{ marginBottom: 6 }}>
                <div className="card-title">{b.batch_title || b.name}</div>
                <span className={`badge ${color !== 'green' ? color : ''}`}>
                  {b.quantity_current} шт
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Chip>{statusIcon} {b.status}</Chip>
                {b.current_location && <Chip>📍 {b.current_location}</Chip>}
                {b.cost_per_plant > 0 && <Chip>💰 {b.cost_per_plant.toFixed(2)} грн</Chip>}
              </div>
            </div>
          )
        })}

        {!loading && !error && batches.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-2)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌾</div>
            <div>Партій поки немає</div>
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ children }) {
  return (
    <span style={{
      background: 'var(--surface-2)', borderRadius: 100,
      padding: '3px 10px', fontSize: 12,
      color: 'var(--text-2)', whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}
