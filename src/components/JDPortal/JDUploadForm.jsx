import React, { useState } from 'react'
import { uploadJd } from '../../utils/jdApi'
import CollapsibleCard from './CollapsibleCard'

const MIN_JD_LENGTH = 50
const LAST_SAVED_JD_KEY = 'jdPortal.lastSavedJd'

function loadLastSavedJd() {
  try {
    const raw = localStorage.getItem(LAST_SAVED_JD_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function JDUploadForm({ onUploaded }) {
  const lastSaved = loadLastSavedJd()
  const [employer, setEmployer] = useState(lastSaved?.employer || '')
  const [role, setRole] = useState(lastSaved?.role || '')
  const [jdText, setJdText] = useState(lastSaved?.jdText || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const tooShort = jdText.trim().length < MIN_JD_LENGTH

  const submit = async (overwrite = false) => {
    setSubmitting(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const result = await uploadJd({ employer, role, jdText, overwrite })
      setConflict(null)
      setSuccessMsg(`Saved as ${result.file.filename}`)
      try {
        localStorage.setItem(LAST_SAVED_JD_KEY, JSON.stringify({ employer, role, jdText }))
      } catch {
        // localStorage unavailable (e.g. private browsing) — caching is a convenience, not required
      }
      onUploaded(result.file)
    } catch (err) {
      if (err.status === 409) {
        setConflict(err.data.existing)
      } else {
        setError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (tooShort || !employer.trim()) return
    submit(false)
  }

  return (
    <CollapsibleCard title="Paste a Job Description">
      {error && <div className="jd-banner jd-banner--error">{error}</div>}
      {successMsg && <div className="jd-banner jd-banner--success">{successMsg}</div>}

      {conflict && (
        <div className="jd-banner jd-banner--warning">
          A JD file already exists for this employer/role ({conflict.filename}, last modified{' '}
          {new Date(conflict.modifiedAt).toLocaleString()}, {conflict.sizeBytes} bytes).
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="jd-button"
              disabled={submitting}
              onClick={() => submit(true)}
            >
              Overwrite
            </button>
            <button
              type="button"
              className="jd-button jd-button-secondary"
              disabled={submitting}
              onClick={() => setConflict(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="jd-field">
          <label htmlFor="jd-employer">Employer *</label>
          <input
            id="jd-employer"
            type="text"
            value={employer}
            onChange={(e) => setEmployer(e.target.value)}
            placeholder="e.g. McDonalds"
            required
          />
        </div>

        <div className="jd-field">
          <label htmlFor="jd-role">Role (optional)</label>
          <input
            id="jd-role"
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. IT_HeadOfInfrastructure"
          />
        </div>

        <div className="jd-field">
          <label htmlFor="jd-text">Job Description Text *</label>
          <textarea
            id="jd-text"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the full job description here..."
          />
          <span className={`jd-field-hint ${tooShort && jdText.length > 0 ? 'jd-field-hint--error' : ''}`}>
            {jdText.trim().length} / {MIN_JD_LENGTH} characters minimum
          </span>
        </div>

        <button type="submit" className="jd-button" disabled={submitting || tooShort || !employer.trim()}>
          {submitting ? 'Saving…' : 'Save JD'}
        </button>
      </form>
    </CollapsibleCard>
  )
}

export default JDUploadForm
