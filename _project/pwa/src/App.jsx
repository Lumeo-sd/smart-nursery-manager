import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { hasAuthConfig } from './api/erpnext.js'
import Home from './screens/Home.jsx'
import BatchList from './screens/BatchList.jsx'
import QuickSale from './screens/QuickSale.jsx'
import BatchEvent from './screens/BatchEvent.jsx'
import NewBatch from './screens/NewBatch.jsx'
import Setup from './screens/Setup.jsx'

const NAV = [
  { path: '/',        icon: '⌂', label: 'Головна' },
  { path: '/batches', icon: '▦', label: 'Партії' },
  { path: '/sale',    icon: '◧', label: 'Продати' },
  { path: '/setup',   icon: '⚙', label: 'Налашт.' },
]

export default function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [, setAuthRev] = useState(0)
  const needsSetup = !hasAuthConfig()

  useEffect(() => {
    function onAuthRequired() {
      if (window.location.pathname !== '/setup') {
        navigate('/setup', { replace: true })
      }
    }
    function onAuthChanged() {
      setAuthRev(v => v + 1)
    }

    window.addEventListener('nursery:auth-required', onAuthRequired)
    window.addEventListener('nursery:auth-changed', onAuthChanged)
    return () => {
      window.removeEventListener('nursery:auth-required', onAuthRequired)
      window.removeEventListener('nursery:auth-changed', onAuthChanged)
    }
  }, [navigate])

  return (
    <div className="app">
      <Routes>
        {needsSetup ? (
          <>
            <Route path="/setup" element={<Setup />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : (
          <>
            <Route path="/"        element={<Home />} />
            <Route path="/batches" element={<BatchList />} />
            <Route path="/sale"    element={<QuickSale />} />
            <Route path="/event/:batchId/:type" element={<BatchEvent />} />
            <Route path="/new-batch" element={<NewBatch />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>

      {!needsSetup && (
        <nav className="bottom-nav">
          {NAV.map(n => (
            <div
              key={n.path}
              className={`nav-item ${pathname === n.path ? 'active' : ''}`}
              onClick={() => navigate(n.path)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </div>
          ))}
        </nav>
      )}
    </div>
  )
}
