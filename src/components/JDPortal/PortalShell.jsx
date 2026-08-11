import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePortalAuth } from '../../context/PortalAuthContext'
import './PortalShell.css'

const PORTAL_THEME_KEY = 'jdPortalTheme'

function PortalShell({ children, basePath = '/portal', brandLabel = 'Automation Portal' }) {
  const { status, logout } = usePortalAuth()
  const [portalTheme, setPortalTheme] = useState(() => localStorage.getItem(PORTAL_THEME_KEY) || 'fintech')

  useEffect(() => {
    localStorage.setItem(PORTAL_THEME_KEY, portalTheme)
  }, [portalTheme])

  const toggleTheme = () => setPortalTheme((t) => (t === 'fintech' ? 'daylight' : 'fintech'))

  return (
    <div className="portal-shell" data-portal-theme={portalTheme}>
      <header className="portal-header">
        <Link to={basePath} className="portal-brand">
          <span className="portal-brand-mark">JD</span>
          <span className="portal-brand-text">{brandLabel}</span>
        </Link>
        <div className="portal-header-actions">
          <button type="button" className="portal-theme-toggle" onClick={toggleTheme}>
            {portalTheme === 'fintech' ? (
              <>☀️ <span className="portal-theme-toggle-label">Light</span></>
            ) : (
              <>🌙 <span className="portal-theme-toggle-label">Dark</span></>
            )}
          </button>
          <Link to="/" className="portal-header-link">Back to Career Copilot</Link>
          {status === 'authenticated' && (
            <button type="button" className="portal-logout-button" onClick={logout}>
              Log out
            </button>
          )}
        </div>
      </header>
      <main className="portal-main">{children}</main>
    </div>
  )
}

export default PortalShell
