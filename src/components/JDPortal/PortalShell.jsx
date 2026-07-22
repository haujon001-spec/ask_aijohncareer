import React from 'react'
import { Link } from 'react-router-dom'
import { usePortalAuth } from '../../context/PortalAuthContext'
import './PortalShell.css'

function PortalShell({ children }) {
  const { status, logout } = usePortalAuth()

  return (
    <div className="portal-shell" data-portal-theme="fintech">
      <header className="portal-header">
        <Link to="/portal" className="portal-brand">
          <span className="portal-brand-mark">JD</span>
          <span className="portal-brand-text">Automation Portal</span>
        </Link>
        <div className="portal-header-actions">
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
