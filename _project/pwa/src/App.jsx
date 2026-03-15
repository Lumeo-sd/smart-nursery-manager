import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Home from './screens/Home.jsx'
import BatchList from './screens/BatchList.jsx'
import QuickSale from './screens/QuickSale.jsx'
import BatchEvent from './screens/BatchEvent.jsx'
import NewBatch from './screens/NewBatch.jsx'

const NAV = [
  { path: '/',        icon: '⌂', label: 'Головна' },
  { path: '/batches', icon: '▦', label: 'Партії' },
  { path: '/sale',    icon: '◧', label: 'Продати' },
]

export default function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="app">
      <Routes>
        <Route path="/"        element={<Home />} />
        <Route path="/batches" element={<BatchList />} />
        <Route path="/sale"    element={<QuickSale />} />
        <Route path="/event/:batchId/:type" element={<BatchEvent />} />
        <Route path="/new-batch" element={<NewBatch />} />
      </Routes>

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
    </div>
  )
}
