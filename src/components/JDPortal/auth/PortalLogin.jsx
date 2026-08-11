import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAuthStatus, login } from '../../../utils/jdApi'
import { usePortalAuth } from '../../../context/PortalAuthContext'
import './PortalAuth.css'

function PortalLogin({ basePath = '/portal' }) {
  const navigate = useNavigate()
  const { markAuthenticated } = usePortalAuth()
  const [checkingEnrollment, setCheckingEnrollment] = useState(true)
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAuthStatus()
      .then((res) => {
        if (!res.enrolled) {
          navigate(`${basePath}/enroll`, { replace: true })
          return
        }
        setCheckingEnrollment(false)
      })
      .catch(() => setCheckingEnrollment(false))
  }, [navigate, basePath])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login({ password, totpCode })
      markAuthenticated()
      navigate(basePath, { replace: true })
    } catch (err) {
      setError(err.status === 429 ? err.message : 'Invalid password or code')
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingEnrollment) {
    return (
      <div className="portal-auth-shell">
        <div className="portal-loading">Loading…</div>
      </div>
    )
  }

  return (
    <div className="portal-auth-shell">
      <div className="portal-card portal-auth-card">
        <h2 className="portal-auth-title">JD Portal Sign-in</h2>
        <p className="portal-auth-subtitle">Password + authenticator code required.</p>

        {error && <div className="portal-banner portal-banner--danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="portal-field">
            <label htmlFor="portal-password">Password</label>
            <input
              id="portal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={submitting}
              required
            />
          </div>

          <div className="portal-field">
            <label htmlFor="portal-totp">Authenticator code</label>
            <input
              id="portal-totp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              autoComplete="one-time-code"
              placeholder="6-digit code"
              disabled={submitting}
              required
            />
          </div>

          <button type="submit" className="portal-button" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PortalLogin
