import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPlantBatch } from '../api/erpnext.js'

const VARIETIES = [
  { code: 'THU-OCC-SMA', label: 'Туя Smaragd' },
  { code: 'HYD-PAN-LIM', label: 'Гортензія Limelight' },
  { code: 'HYD-ARB-INC', label: 'Гортензія Incrediball' },
  { code: 'COR-ALB-SIB', label: 'Дерен Sibirica' },
  { code: 'FOR-INT',     label: 'Форзиція' },
  { code: 'SPI-JAP-ANT', label: 'Спірея Anthony' },
  { code: 'WEI-FLO-RED', label: 'Вейгела Red' },
  { code: 'JUN-HOR-BLC', label: 'Ялівець Blue Chip' },
]

const POT_SIZES   = ['Касета', '1L', '3L', '5L']
const LOCATIONS   = ['Теплиця А', 'Теплиця Б', 'Майданчик Північ', 'Майданчик Південь']
const INIT_STATUS = 'Укорінення'

export default function NewBatch() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ variety: '', pot: 'Касета', qty: '', location: 'Теплиця Б' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const handleSave = async () => {
    if (!form.variety) return showToast('⚠️ Оберіть вид рослини')
    if (!form.qty || parseInt(form.qty) < 1) return showToast('⚠️ Вкажіть кількість')
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const variety = VARIETIES.find(v => v.code === form.variety)
      const title = `${variety?.label || form.variety} ${form.pot} — живці ${today}`
      await createPlantBatch({
        batch_title: title,
        plant_variety: form.variety,
        pot_size: form.pot,
        quantity_current: parseInt(form.qty),
        quantity_start: parseInt(form.qty),
        status: INIT_STATUS,
        current_location: form.location,
        start_date: today,
      })
      showToast('✅ Партію створено!')
      setTimeout(() => navigate('/batches'), 1200)
    } catch (e) {
      showToast('❌ ' + e.message)
      setSaving(false)
    }
  }

  return (
    <div className="screen">
      {toast && <div className="toast">{toast}</div>}

      <div className="screen-header">
        <div className="back-btn" onClick={() => navigate(-1)}>‹</div>
        <h2 className="screen-title">🌱 Нові живці</h2>
      </div>

      <div className="content">

        {/* Вид рослини */}
        <label className="input-label">Вид рослини</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {VARIETIES.map(v => (
            <div
              key={v.code}
              onClick={() => set('variety', v.code)}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: `1px solid ${form.variety === v.code ? 'var(--green)' : 'var(--border)'}`,
                background: form.variety === v.code ? 'var(--green-dim)' : 'var(--surface)',
                cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span style={{
                fontSize: 16,
                color: form.variety === v.code ? 'var(--green)' : 'var(--text)',
                fontWeight: form.variety === v.code ? 600 : 400,
              }}>{v.label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{v.code}</span>
            </div>
          ))}
        </div>

        {/* Горщик */}
        <label className="input-label">Тип посуду</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
          {POT_SIZES.map(p => (
            <div
              key={p}
              onClick={() => set('pot', p)}
              style={{
                textAlign: 'center', padding: '12px 0',
                borderRadius: 12,
                border: `1px solid ${form.pot === p ? 'var(--green)' : 'var(--border)'}`,
                background: form.pot === p ? 'var(--green-dim)' : 'var(--surface)',
                cursor: 'pointer', fontSize: 15,
                fontWeight: form.pot === p ? 700 : 400,
                color: form.pot === p ? 'var(--green)' : 'var(--text)',
              }}
            >{p}</div>
          ))}
        </div>

        {/* Кількість */}
        <label className="input-label">Кількість живців</label>
        <input
          className="input"
          type="number" inputMode="numeric"
          placeholder="Наприклад: 120"
          value={form.qty}
          onChange={e => set('qty', e.target.value)}
        />

        {/* Розташування */}
        <label className="input-label">Де розміщено</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
          {LOCATIONS.map(l => (
            <div
              key={l}
              onClick={() => set('location', l)}
              style={{
                padding: '12px 10px', textAlign: 'center',
                borderRadius: 12,
                border: `1px solid ${form.location === l ? 'var(--green)' : 'var(--border)'}`,
                background: form.location === l ? 'var(--green-dim)' : 'var(--surface)',
                cursor: 'pointer', fontSize: 13,
                fontWeight: form.location === l ? 600 : 400,
                color: form.location === l ? 'var(--green)' : 'var(--text)',
              }}
            >{l}</div>
          ))}
        </div>

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Збереження...' : '🌱 Створити партію'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginTop: 10 }}>
          Скасувати
        </button>
      </div>
    </div>
  )
}
