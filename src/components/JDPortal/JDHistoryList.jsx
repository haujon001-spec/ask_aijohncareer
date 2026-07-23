import React, { useState, useEffect, useCallback } from 'react'
import { fetchHistory, toDownloadUrl } from '../../utils/jdApi'
import DocViewerInline from './DocViewerInline'
import CollapsibleCard from './CollapsibleCard'

function DownloadLink({ label, path }) {
  if (!path) return null
  return (
    <a href={toDownloadUrl(path)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
      {label}
    </a>
  )
}

function DocxWithView({ label, path, docKey, isOpen, onToggleView }) {
  if (!path) return null
  return (
    <span className="jd-download-group">
      <a href={toDownloadUrl(path)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
        {label}
      </a>
      <button
        type="button"
        className="jd-button-view"
        onClick={(e) => {
          e.stopPropagation()
          onToggleView(docKey, path, label)
        }}
      >
        {isOpen ? 'Hide' : 'View'}
      </button>
    </span>
  )
}

function JDHistoryList() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedCompany, setExpandedCompany] = useState(null)
  const [expandedDoc, setExpandedDoc] = useState(null) // { key, companyKey, path, label } | null

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

  const toggleCompany = (companyKey) => {
    setExpandedDoc(null)
    setExpandedCompany((prev) => (prev === companyKey ? null : companyKey))
  }

  const toggleDoc = (companyKey) => (docKey, path, label) => {
    setExpandedDoc((prev) => (prev?.key === docKey ? null : { key: docKey, companyKey, path, label }))
  }

  return (
    <CollapsibleCard
      title="Run History"
      headerExtra={
        <button type="button" className="jd-button jd-button-secondary" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      }
    >
      {error && <div className="jd-banner jd-banner--error">{error}</div>}

      {!loading && history.length === 0 && !error && (
        <p style={{ color: 'var(--portal-text-muted)', fontSize: 14 }}>No runs yet.</p>
      )}

      {history.map((entry, idx) => {
        const companyKey = `${entry.employer}-${entry.date}-${idx}`
        const isCompanyOpen = expandedCompany === companyKey
        const onToggleView = toggleDoc(companyKey)

        return (
          <div className="jd-history-card" key={companyKey}>
            <button
              type="button"
              className="jd-history-card-header"
              onClick={() => toggleCompany(companyKey)}
              aria-expanded={isCompanyOpen}
            >
              <span className="jd-history-card-title">
                {entry.employer}
                {entry.roleTag ? ` — ${entry.roleTag}` : ''}
              </span>
              <span className="jd-history-card-meta">
                {entry.scorecard?.matchScore && (
                  <span className="jd-match-score jd-match-score--inline">
                    {entry.scorecard.matchScore.score} / {entry.scorecard.matchScore.maxScore} —{' '}
                    {entry.scorecard.matchScore.verdict}
                  </span>
                )}
                <span className="jd-history-card-date">{entry.date}</span>
                <span className={`jd-history-chevron${isCompanyOpen ? ' jd-history-chevron--open' : ''}`}>⌄</span>
              </span>
            </button>

            {isCompanyOpen && (
              <div className="jd-history-card-body">
                <div className="jd-download-links">
                  <DownloadLink label="Scorecard (.txt)" path={entry.scorecard?.txt} />
                  <DocxWithView
                    label="Scorecard (.docx)"
                    path={entry.scorecard?.docx}
                    docKey={`${companyKey}::scorecard`}
                    isOpen={expandedDoc?.key === `${companyKey}::scorecard`}
                    onToggleView={onToggleView}
                  />
                  <DownloadLink label="Resume (.txt)" path={entry.resume?.txt} />
                  <DocxWithView
                    label="Resume (.docx)"
                    path={entry.resume?.docx}
                    docKey={`${companyKey}::resume`}
                    isOpen={expandedDoc?.key === `${companyKey}::resume`}
                    onToggleView={onToggleView}
                  />
                  <DownloadLink label="Cover Letter (.txt)" path={entry.coverLetter?.txt} />
                  <DocxWithView
                    label="Cover Letter (.docx)"
                    path={entry.coverLetter?.docx}
                    docKey={`${companyKey}::coverletter`}
                    isOpen={expandedDoc?.key === `${companyKey}::coverletter`}
                    onToggleView={onToggleView}
                  />
                </div>

                {expandedDoc && expandedDoc.companyKey === companyKey && (
                  <DocViewerInline
                    path={expandedDoc.path}
                    label={expandedDoc.label}
                    onClose={() => setExpandedDoc(null)}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </CollapsibleCard>
  )
}

export default JDHistoryList
