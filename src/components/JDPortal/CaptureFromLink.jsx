import React, { useState } from 'react'
import { fetchJdFromLink } from '../../utils/jdApi'

function CaptureFromLink({ onExtracted, disabled }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const handleFetch = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await fetchJdFromLink(url.trim())
      onExtracted(result)
      setUrl('')
    } catch (err) {
      setError(
        err.status === 404 && err.message === 'Not found'
          ? 'The running backend does not have the job-link option yet — restart it (npm run dev:all), then try again.'
          : err.message
      )
    } finally {
      setBusy(false)
    }
  }

  const locked = busy || disabled

  return (
    <div className="jd-capture">
      <p className="jd-field-hint" style={{ marginBottom: 10 }}>
        Paste a LinkedIn job link (on the phone: open the job → Share → Copy link). The public job page is read — no LinkedIn
        login is used or needed — and Employer, Role and the description are filled in for you to review.
      </p>
      <form onSubmit={handleFetch}>
        <div className="jd-field">
          <label htmlFor="jd-link-url">LinkedIn job link</label>
          <input
            id="jd-link-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/jobs/view/…"
            disabled={locked}
          />
        </div>
        <div className="jd-capture-read">
          <button type="submit" className="jd-button" disabled={locked || !url.trim()}>
            {busy ? 'Reading the job page…' : 'Read job from link'}
          </button>
          {busy && (
            <span className="jd-elapsed-timer">
              <span className="jd-typing-dots">
                <span></span><span></span><span></span>
              </span>
              <span>Fetching from LinkedIn…</span>
            </span>
          )}
        </div>
      </form>
      {error && <div className="jd-banner jd-banner--error" role="alert" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  )
}

export default CaptureFromLink
