import React, { useState } from 'react'
import { onboardProfile } from '../../utils/jdApi'
import CollapsibleCard from './CollapsibleCard'

const ACCEPTED_EXTENSIONS = ['.docx', '.txt']

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // dataURL looks like "data:application/...;base64,AAAA..." — strip the prefix
      const commaIdx = reader.result.indexOf(',')
      resolve(reader.result.slice(commaIdx + 1))
    }
    reader.onerror = () => reject(reader.error || new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

// Resume-upload/onboarding UI (Phase 2, 11 Aug 2026) — nothing existing to
// adapt, no file-upload UI existed anywhere in this codebase before this.
// Wraps POST /api/onboard, which spawns the now-multi-profile-aware
// scripts/update_profile_from_resume.py --create-new-profile.
function ResumeUpload({ onOnboarded }) {
  const [profileName, setProfileName] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [error, setError] = useState(null)
  const [errorDetails, setErrorDetails] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const validName = /^[A-Za-z0-9_-]+$/.test(profileName)
  const ext = file ? `.${file.name.split('.').pop().toLowerCase()}` : null
  const validFile = file && ACCEPTED_EXTENSIONS.includes(ext)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validName || !validFile) return

    setSubmitting(true)
    setError(null)
    setErrorDetails(null)
    setSuccessMsg(null)
    setElapsedSec(0)
    const timer = setInterval(() => setElapsedSec((s) => s + 1), 1000)

    try {
      const contentBase64 = await readFileAsBase64(file)
      const result = await onboardProfile({ profileName, filename: file.name, contentBase64 })
      setSuccessMsg(
        `Created profile for ${result.profile.displayName} (${result.profile.experienceCount} roles, ${result.profile.achievementCount} achievements).`
      )
      setFile(null)
      onOnboarded?.(result.profile)
    } catch (err) {
      setError(err.message)
      if (err.data && (err.data.stderrTail || err.data.stdoutTail)) {
        setErrorDetails(err.data)
      }
    } finally {
      clearInterval(timer)
      setSubmitting(false)
    }
  }

  return (
    <CollapsibleCard title="Onboard a New Profile" defaultOpen={false}>
      {error && (
        <div className="jd-banner jd-banner--error">
          {error}
          {errorDetails && (
            <details className="jd-details">
              <summary>Debug output</summary>
              {errorDetails.stderrTail && <pre>{errorDetails.stderrTail}</pre>}
              {errorDetails.stdoutTail && <pre>{errorDetails.stdoutTail}</pre>}
            </details>
          )}
        </div>
      )}
      {successMsg && <div className="jd-banner jd-banner--success">{successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="jd-field">
          <label htmlFor="onboard-profile-name">Profile name (folder-safe, e.g. JaneDoe)</label>
          <input
            id="onboard-profile-name"
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="e.g. JaneDoe"
            disabled={submitting}
            required
          />
          {profileName && !validName && (
            <span className="jd-field-hint jd-field-hint--error">
              Letters, digits, hyphen, underscore only — no spaces or path separators.
            </span>
          )}
        </div>

        <div className="jd-field">
          <label htmlFor="onboard-resume-file">Resume file (.docx or .txt)</label>
          <input
            id="onboard-resume-file"
            type="file"
            accept=".docx,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={submitting}
            required
          />
        </div>

        <button type="submit" className="jd-button" disabled={submitting || !validName || !validFile}>
          {submitting ? 'Creating profile…' : 'Create Profile'}
        </button>

        {submitting && (
          <div className="jd-elapsed-timer">
            <span className="jd-typing-dots">
              <span></span><span></span><span></span>
            </span>
            <span>Extracting profile from resume… {elapsedSec}s (this can take a minute or two)</span>
          </div>
        )}
      </form>
    </CollapsibleCard>
  )
}

export default ResumeUpload
