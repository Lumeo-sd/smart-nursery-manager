import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthConfig, saveAuthConfig, clearAuthConfig } from '../api/erpnext.js'

export default function Setup() {
  const navigate = useNavigate()
  const current = getAuthConfig()
  const [url, setUrl] = useState(current.url || '')
  const [apiKey, setApiKey] = useState(current.apiKey || '')
  const [apiSecret, setApiSecret] = useState(current.apiSecret || '')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function testConnection() {
    setBusy(true)
    setStatus('Testing connection...')
    try {
      const root = (url || '/api').replace(/\/+$/, '')
      const res = await fetch(`${root}/api/method/frappe.auth.get_logged_user`, {
        headers: {
          Authorization: apiKey && apiSecret ? `token ${apiKey}:${apiSecret}` : '',
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      if (body && body.message && body.message !== 'Guest') {
        setStatus(`Auth OK: ${body.message}`)
      } else {
        setStatus('ERPNext reachable, but auth failed (Guest). Check key/secret.')
      }
    } catch (err) {
      setStatus(`Connection failed: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  function save() {
    saveAuthConfig({ url, apiKey, apiSecret })
    setStatus('Saved')
    if (apiKey && apiSecret) {
      navigate('/')
    }
  }

  function reset() {
    clearAuthConfig()
    setUrl('')
    setApiKey('')
    setApiSecret('')
    setStatus('Cleared')
  }

  return (
    <>
      <div className="header">
        <h1>Setup</h1>
        <p className="subtitle">ERPNext API keys for first run</p>
      </div>

      <div className="content">
        <div className="setup-card">
          <label className="setup-label">ERPNext URL (optional)</label>
          <input
            className="input"
            placeholder="http://192.168.0.10:8080"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />

          <label className="setup-label">API Key</label>
          <input
            className="input"
            placeholder="Enter API key"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
          />

          <label className="setup-label">API Secret</label>
          <input
            className="input"
            placeholder="Enter API secret"
            value={apiSecret}
            onChange={e => setApiSecret(e.target.value)}
          />

          <div className="setup-actions">
            <button className="btn btn-ghost" onClick={testConnection} disabled={busy}>
              {busy ? 'Testing...' : 'Test'}
            </button>
            <button className="btn btn-primary" onClick={save}>Save</button>
            <button className="btn btn-ghost" onClick={reset}>Clear</button>
          </div>

          {status && <div className="setup-status">{status}</div>}
        </div>

        <div className="setup-help">
          <div className="help-title">Where to get keys</div>
          <div className="help-text">
            ERPNext → Settings → My Profile → API Access → Generate Keys.
          </div>
          <div className="help-text">
            Leave ERPNext URL empty to use the built-in proxy.
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    </>
  )
}
