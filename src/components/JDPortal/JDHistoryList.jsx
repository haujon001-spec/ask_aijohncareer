import React, { useState, useEffect, useCallback } from 'react'
import { fetchHistory, toDownloadUrl } from '../../utils/jdApi'
import DocViewer from './DocViewer'

function DownloadLink({ label, path }) {
  if (!path) return null
  return (
    <a href={toDownloadUrl(path)} target="_blank" rel="noreferrer">
      {label}
    </a>
  )
}

function DocxWithView({ label, path, onView }) {
  if (!path) return null
  return (
    <span className="jd-download-group">
      <a href={toDownloadUrl(path)} target="_blank" rel="noreferrer">
        {label}
      </a>
      <button type="button" className="jd-button-view" onClick={() => onView(path, label)}>
        View
      </button>
    </span>
  )
}

function JDHistoryList() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewing, setViewing] = useState(null) // { path, label } | null

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchHistory()
      setHistory(response.history)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openView = (path, label) => setViewing({ path, label })
  const closeView = () => setViewing(null)

  return (
    <div className="jd-portal-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Run History</h3>
        <button type="button" className="jd-button jd-button-secondary" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="jd-banner jd-banner--error">{error}</div>}

      {!loading && history.length === 0 && !error && (
        <p style={{ color: 'var(--portal-text-muted)', fontSize: 14 }}>No runs yet.</p>
      )}

      {history.map((entry, idx) => (
        <div className="jd-history-card" key={`${entry.employer}-${entry.date}-${idx}`}>
          <div className="jd-history-card-header">
            <span className="jd-history-card-title">
              {entry.employer}
              {entry.roleTag ? ` — ${entry.roleTag}` : ''}
            </span>
            <span className="jd-history-card-date">{entry.date}</span>
          </div>

          {entry.scorecard?.matchScore && (
            <div className="jd-match-score">
              {entry.scorecard.matchScore.score} / {entry.scorecard.matchScore.maxScore} —{' '}
              {entry.scorecard.matchScore.verdict}
            </div>
          )}

          <div className="jd-download-links">
            <DownloadLink label="Scorecard (.txt)" path={entry.scorecard?.txt} />
            <DocxWithView label="Scorecard (.docx)" path={entry.scorecard?.docx} onView={openView} />
            <DownloadLink label="Resume (.txt)" path={entry.resume?.txt} />
            <DocxWithView label="Resume (.docx)" path={entry.resume?.docx} onView={openView} />
            <DownloadLink label="Cover Letter (.txt)" path={entry.coverLetter?.txt} />
            <DocxWithView label="Cover Letter (.docx)" path={entry.coverLetter?.docx} onView={openView} />
          </div>
        </div>
      ))}

      {viewing && <DocViewer path={viewing.path} label={viewing.label} onClose={closeView} />}
    </div>
  )
}

export default JDHistoryList
