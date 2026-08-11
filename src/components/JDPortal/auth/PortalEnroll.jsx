import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { fetchAuthStatus, enroll, confirmEnroll } from '../../../utils/jdApi'
import './PortalAuth.css'

function PortalEnroll({ basePath = '/portal' }) {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState('password') // 'password' | 'scan' | 'done'
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpauthUrl, setOtpauthUrl] = useState(null)
  const [secret, setSecret] = useState(null)
  const [totpCode, setTotpCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [checkError, setCheckError] = useState(null)

  const runStatusCheck = () => {
    setChecking(true)
    setCheckError(null)
    fetchAuthStatus()
      .then((res) => {
        if (res.enrolled) {
          navigate(`${basePath}/login`, { replace: true })
          return
        }
        setChecking(false)
      })
      .catch((err) => {
        // Don't fail open into "First-time Portal Setup" — a connectivity/CORS
        // error looks identical to genuinely-not-enrolled otherwise, and this
        // form re-enrolling over an existing account would be destructive.
        setCheckError(err.message || 'Could not reach the portal server')
        setChecking(false)
      })
  }

  useEffect(() => {
    runStatusCheck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, basePath])

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      const res = await enroll({ password })
      setOtpauthUrl(res.otpauthUrl)
      setSecret(res.secret)
      setStep('scan')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await confirmEnroll({ totpCode })
      setStep('done')
    } catch (err) {
      setError('Invalid code — try again')
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <div className="portal-auth-shell">
        <div className="portal-loading">Loading…</div>
      </div>
    )
  }

  if (checkError) {
    return (
      <div className="portal-auth-shell">
        <div className="portal-card portal-auth-card">
          <h2 className="portal-auth-title">Couldn't verify portal status</h2>
          <p className="portal-auth-subtitle">
            We couldn't confirm whether this portal is already enrolled — this usually means the
            portal server isn't reachable, not that setup hasn't happened yet.
          </p>
          <div className="portal-banner portal-banner--danger">{checkError}</div>
          <button type="button" className="portal-button" onClick={runStatusCheck}>
            Retry
          </button>
          <button
            type="button"
            className="portal-button portal-button--secondary"
            onClick={() => navigate(`${basePath}/login`)}
          >
            Already enrolled? Go to Sign-in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="portal-auth-shell">
      <div className="portal-card portal-auth-card">
        <h2 className="portal-auth-title">First-time Portal Setup</h2>
        <p className="portal-auth-subtitle">
          One-time enrollment for the JD Automation Portal — set a password, then link an
          authenticator app.
        </p>

        {error && <div className="portal-banner portal-banner--danger">{error}</div>}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <div className="portal-field">
              <label htmlFor="enroll-password">Password</label>
              <input
                id="enroll-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
                required
              />
            </div>
            <div className="portal-field">
              <label htmlFor="enroll-confirm-password">Confirm password</label>
              <input
                id="enroll-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
                required
              />
            </div>
            <button type="submit" className="portal-button" disabled={submitting}>
              {submitting ? 'Saving…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'scan' && (
          <>
            <div className="portal-qr-wrap">
              <QRCodeSVG value={otpauthUrl} size={200} bgColor="#eef2ff" fgColor="#05070d" />
            </div>
            <p className="portal-auth-hint">
              Scan with Google Authenticator (or any TOTP app). Can't scan?{' '}
              <span className="portal-secret">{secret}</span>
            </p>
            <form onSubmit={handleConfirmSubmit}>
              <div className="portal-field">
                <label htmlFor="enroll-confirm-code">Enter the 6-digit code to confirm</label>
                <input
                  id="enroll-confirm-code"
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
                {submitting ? 'Confirming…' : 'Confirm & Enable'}
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="portal-banner portal-banner--success">
              Enrollment complete. You can now sign in with your password and authenticator code.
            </div>
            <button type="button" className="portal-button" onClick={() => navigate(`${basePath}/login`)}>
              Go to Sign-in
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default PortalEnroll
