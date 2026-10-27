import React, { useState } from 'react'
import { uploadJd } from '../../utils/jdApi'
import CollapsibleCard from './CollapsibleCard'
import CaptureFromScreenshots from './CaptureFromScreenshots'
import CaptureFromLink from './CaptureFromLink'

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

// uploadFn/extraParams (added Phase 2, 11 Aug 2026): lets a profile-aware
// caller (portal2) pass uploadJdV3 + { profileName } without duplicating this
// whole form — defaults preserve the exact existing /portal (v2) behavior.
// enableCapture (27 Oct 2026): shows the "Capture from screenshots" option. Off by
// default so /portal2 is unchanged; /portal turns it on.
function JDUploadForm({ onUploaded, uploadFn = uploadJd, extraParams = {}, enableCapture = false }) {
  const lastSaved = loadLastSavedJd()
  const [employer, setEmployer] = useState(lastSaved?.employer || '')
  const [role, setRole] = useState(lastSaved?.role || '')
  const [jdText, setJdText] = useState(lastSaved?.jdText || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [captureMode, setCaptureMode] = useState(null) // 'screenshots' | 'link' | null
  const [captureNotice, setCaptureNotice] = useState(null) // { source, imagesRead, notes, empty? } | null

  const tooShort = jdText.trim().length < MIN_JD_LENGTH

  const submit = async (overwrite = false) => {
    setSubmitting(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const result = await uploadFn({ employer, role, jdText, overwrite, ...extraParams })
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

  // A capture replaces the whole form: the fields are normally pre-filled with the
  // LAST saved JD, so keeping the old employer/role next to new text would save the
  // new job under the old company's file name.
  const handleExtracted = (result) => {
    if (!result.jdText) {
      // Nothing readable: tell the user why, but never wipe what is already in the form.
      setCaptureNotice({ source: result.source, imagesRead: result.imagesRead, notes: result.notes || [], empty: true })
      return
    }
    setEmployer(result.employer || '')
    setRole(result.role || '')
    setJdText(result.jdText || '')
    setCaptureNotice({ source: result.source, imagesRead: result.imagesRead, notes: result.notes || [] })
    setConflict(null)
    setSuccessMsg(null)
    setError(null)
    setCaptureMode(null)
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

      {enableCapture && (
        <div className="jd-capture-wrap">
          <div className="jd-capture-actions">
            <button
              type="button"
              className="jd-button jd-button-secondary"
              aria-expanded={captureMode === 'screenshots'}
              onClick={() => setCaptureMode((m) => (m === 'screenshots' ? null : 'screenshots'))}
            >
              {captureMode === 'screenshots' ? 'Hide screenshot capture' : 'Capture from screenshots'}
            </button>
            <button
              type="button"
              className="jd-button jd-button-secondary"
              aria-expanded={captureMode === 'link'}
              onClick={() => setCaptureMode((m) => (m === 'link' ? null : 'link'))}
            >
              {captureMode === 'link' ? 'Hide job link' : 'Paste a LinkedIn job link'}
            </button>
          </div>
          {captureMode === 'screenshots' && <CaptureFromScreenshots onExtracted={handleExtracted} disabled={submitting} />}
          {captureMode === 'link' && <CaptureFromLink onExtracted={handleExtracted} disabled={submitting} />}
        </div>
      )}

      {captureNotice && (
        <div className={`jd-banner ${captureNotice.notes.length || captureNotice.empty ? 'jd-banner--warning' : 'jd-banner--success'}`}>
          {captureNotice.empty
            ? 'No job description could be read — the form was left unchanged.'
            : captureNotice.source === 'link'
              ? 'Filled from the LinkedIn job page — please read it through before saving.'
              : `Filled from ${captureNotice.imagesRead} screenshot${captureNotice.imagesRead === 1 ? '' : 's'} — please read it through and fix any misread words before saving.`}
          {captureNotice.notes.length > 0 && (
            <ul className="jd-capture-notes">
              {captureNotice.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
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

        {/* sticky: stays at the bottom of the scroll area so Save is always in view */}
        <div className="jd-form-actions">
          <button type="submit" className="jd-button" disabled={submitting || tooShort || !employer.trim()}>
            {submitting ? 'Saving…' : 'Save JD'}
          </button>
          {(tooShort || !employer.trim()) && (
            <span className="jd-field-hint">
              {!employer.trim() ? 'Employer is required.' : `Add at least ${MIN_JD_LENGTH} characters of job description.`}
            </span>
          )}
        </div>
      </form>
    </CollapsibleCard>
  )
}

export default JDUploadForm
