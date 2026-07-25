import React, { useState, useEffect, useCallback } from 'react'
import { fetchHistory, deleteHistoryCompany, toDownloadUrl } from '../../utils/jdApi'
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

// Groups the (already recency-sorted) flat history list by employer. Map
// preserves insertion order, so the first time an employer is seen — from its
// most-recent run — determines that company's position; company order thus
// naturally follows "most recently active company first", same as today's
// unfiled ordering.
function groupByCompany(history) {
  const groups = new Map()
  history.forEach((entry, idx) => {
    const key = entry.employer
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ entry, idx })
  })
  return Array.from(groups.entries()).map(([employer, jobs]) => ({ employer, jobs }))
}

function JDHistoryList() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedCompany, setExpandedCompany] = useState(null)
  const [expandedJob, setExpandedJob] = useState(null) // jobKey | null
  const [expandedDoc, setExpandedDoc] = useState(null) // { key, jobKey, path, label } | null
  const [confirmingDelete, setConfirmingDelete] = useState(null) // employer | null
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

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

  const toggleCompany = (employer) => {
    setExpandedJob(null)
    setExpandedDoc(null)
    setExpandedCompany((prev) => (prev === employer ? null : employer))
  }

  const toggleJob = (jobKey) => {
    setExpandedDoc(null)
    setExpandedJob((prev) => (prev === jobKey ? null : jobKey))
  }

  const toggleDoc = (jobKey) => (docKey, path, label) => {
    setExpandedDoc((prev) => (prev?.key === docKey ? null : { key: docKey, jobKey, path, label }))
  }

  const handleDelete = async (employer) => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const result = await deleteHistoryCompany(employer)
      setHistory(result.history)
      setConfirmingDelete(null)
      if (expandedCompany === employer) {
        setExpandedCompany(null)
        setExpandedJob(null)
        setExpandedDoc(null)
      }
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const companies = groupByCompany(history)

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
      {deleteError && <div className="jd-banner jd-banner--error">{deleteError}</div>}

      {!loading && history.length === 0 && !error && (
        <p style={{ color: 'var(--portal-text-muted)', fontSize: 14 }}>No runs yet.</p>
      )}

      {companies.map(({ employer, jobs }) => {
        const isCompanyOpen = expandedCompany === employer

        const isConfirmingDelete = confirmingDelete === employer

        return (
          <div className="jd-history-card" key={employer}>
            <div
              className="jd-history-card-header"
              role="button"
              tabIndex={0}
              onClick={() => toggleCompany(employer)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleCompany(employer)
                }
              }}
              aria-expanded={isCompanyOpen}
            >
              <span className="jd-history-card-title">{employer}</span>
              <span className="jd-history-card-meta">
                <span className="jd-history-card-date">
                  {jobs.length} run{jobs.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  className="jd-button-danger jd-button-danger--icon"
                  title={`Delete all history for ${employer}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteError(null)
                    setConfirmingDelete(employer)
                  }}
                >
                  🗑
                </button>
                <span className={`jd-history-chevron${isCompanyOpen ? ' jd-history-chevron--open' : ''}`}>⌄</span>
              </span>
            </div>

            {isConfirmingDelete && (
              <div className="jd-banner jd-banner--warning" onClick={(e) => e.stopPropagation()}>
                Delete all {jobs.length} run{jobs.length === 1 ? '' : 's'} for <strong>{employer}</strong>? This
                moves the generated scorecards/resumes/cover-letters to a trash folder (source JD text and the
                blueprint cache are kept).
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="jd-button-danger"
                    disabled={deleting}
                    onClick={() => handleDelete(employer)}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                  <button
                    type="button"
                    className="jd-button jd-button-secondary"
                    disabled={deleting}
                    onClick={() => setConfirmingDelete(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isCompanyOpen && (
              <div className="jd-history-card-body">
                {jobs.map(({ entry, idx }) => {
                  const jobKey = `${employer}-${entry.date}-${idx}`
                  const isJobOpen = expandedJob === jobKey
                  const onToggleView = toggleDoc(jobKey)

                  return (
                    <div className="jd-history-job" key={jobKey}>
                      <button
                        type="button"
                        className="jd-history-job-header"
                        onClick={() => toggleJob(jobKey)}
                        aria-expanded={isJobOpen}
                      >
                        <span className="jd-history-job-title">{entry.roleTag || '(no role tag)'}</span>
                        <span className="jd-history-job-meta">
                          {entry.scorecard?.matchScore && (
                            <span className="jd-match-score jd-match-score--inline">
                              {entry.scorecard.matchScore.score} / {entry.scorecard.matchScore.maxScore} —{' '}
                              {entry.scorecard.matchScore.verdict}
                            </span>
                          )}
                          <span className="jd-history-job-date">{entry.date}</span>
                          <span className={`jd-history-chevron${isJobOpen ? ' jd-history-chevron--open' : ''}`}>⌄</span>
                        </span>
                      </button>

                      {isJobOpen && (
                        <div className="jd-history-job-body">
                          <div className="jd-download-links">
                            <DownloadLink label="Scorecard (.txt)" path={entry.scorecard?.txt} />
                            <DocxWithView
                              label="Scorecard (.docx)"
                              path={entry.scorecard?.docx}
                              docKey={`${jobKey}::scorecard`}
                              isOpen={expandedDoc?.key === `${jobKey}::scorecard`}
                              onToggleView={onToggleView}
                            />
                            <DownloadLink label="Resume (.txt)" path={entry.resume?.txt} />
                            <DocxWithView
                              label="Resume (.docx)"
                              path={entry.resume?.docx}
                              docKey={`${jobKey}::resume`}
                              isOpen={expandedDoc?.key === `${jobKey}::resume`}
                              onToggleView={onToggleView}
                            />
                            <DownloadLink label="Cover Letter (.txt)" path={entry.coverLetter?.txt} />
                            <DocxWithView
                              label="Cover Letter (.docx)"
                              path={entry.coverLetter?.docx}
                              docKey={`${jobKey}::coverletter`}
                              isOpen={expandedDoc?.key === `${jobKey}::coverletter`}
                              onToggleView={onToggleView}
                            />
                          </div>

                          {expandedDoc && expandedDoc.jobKey === jobKey && (
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
              </div>
            )}
          </div>
        )
      })}
    </CollapsibleCard>
  )
}

export default JDHistoryList
