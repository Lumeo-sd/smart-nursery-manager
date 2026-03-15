import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats, hasAuthConfig } from '../api/erpnext.js'

const TILES = [
  { icon: '▦', label: 'Наявність',  sub: 'Всі партії',                  path: '/batches',               color: 'blue'   },
  { icon: '+', label: 'Живці',      sub: 'Нова партія',                 path: '/new-batch',             color: 'green'  },
  { icon: '◧', label: 'Пересадка',  sub: 'В більший горщик',            path: '/batches?action=repot',  color: 'purple' },
  { icon: '○', label: 'Подія',      sub: 'Підживлення / обробка',       path: '/batches?action=event',  color: 'yellow' },
  { icon: '◼', label: 'Продати',    sub: 'Швидкий продаж',              path: '/sale',                  color: 'orange' },
  { icon: '×', label: 'Списати',    sub: 'Загибель рослин',             path: '/batches?action=writeoff', color: 'red'  },
]

export default function Home() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const needsSetup = !hasAuthConfig()

  useEffect(() => {
    if (needsSetup) return
    getDashboardStats()
      .then(setStats)
      .catch(() => setStats(null))
  }, [needsSetup])

  const dateStr = new Date().toLocaleDateString('uk-UA', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <>
      <div className="header">
        <h1>Розсадник</h1>
        <p className="subtitle">{dateStr}</p>

        {stats && (
          <div style={{
            display: 'flex', gap: 12, marginTop: 14,
            flexWrap: 'wrap'
          }}>
            <StatChip color="var(--green)"  value={stats.ready_to_sell} label="до продажу" />
            <StatChip color="var(--orange)" value={stats.rooting}       label="укорінення" />
            <StatChip color="var(--blue)"   value={stats.total_batches} label="партій"     />
          </div>
        )}
      </div>

      <div className="content">
        {needsSetup && (
          <div className="setup-banner" onClick={() => navigate('/setup')}>
            Потрібні API ключі ERPNext — натисни, щоб додати
          </div>
        )}
        <div className="tile-grid">
          {TILES.map(t => (
            <div
              key={t.path}
              className="tile"
              data-color={t.color}
              onClick={() => navigate(t.path)}
            >
              <div className="tile-icon">{t.icon}</div>
              <div>
                <div className="tile-label">{t.label}</div>
                <div className="tile-sub">{t.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function StatChip({ color, value, label }) {
  return (
    <div style={{
      background: `${color}18`,
      border: `1px solid ${color}33`,
      borderRadius: 100,
      padding: '4px 12px',
      fontSize: 13,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }}>
      <span style={{ color }}>{value}</span>
      <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>{label}</span>
    </div>
  )
}
