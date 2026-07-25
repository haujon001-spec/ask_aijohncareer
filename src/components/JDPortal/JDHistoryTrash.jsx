import React, { useState, useEffect, useCallback } from 'react'
import { fetchTrash, restoreTrash } from '../../utils/jdApi'
import CollapsibleCard from './CollapsibleCard'

function JDHistoryTrash({ onRestored }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(null) // `${trashId}::${employer}` | null
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState(null)
  const [conflicts, setConflicts] = useState(null) // { key, files } | null

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchTrash()
      setEntries(res.entries)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRestore = async (trashId, employer) => {
    const key = `${trashId}::${employer}`
    setRestoring(true)
    setRestoreError(null)
    setConflicts(null)
    try {
      await restoreTrash(trashId, employer)
      setConfirming(null)
      await load()
      if (onRestored) onRestored()
    } catch (err) {
      if (err.status === 409 && err.data?.conflicts) {
        setConflicts({ key, files: err.data.conflicts })
      } else {
        setRestoreError(err.message)
      }
    } finally {
      setRestoring(false)
    }
  }

  if (!loading && entries.length === 0 && !error) return null

  return (
    <CollapsibleCard
      title={`Deleted Items${entries.length ? ` (${entries.length})` : ''}`}
      defaultOpen={false}
      headerExtra={
        <button type="button" className="jd-button jd-button-secondary" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      }
    >
      {error && <div className="jd-banner jd-banner--error">{error}</div>}
      {restoreError && <div className="jd-banner jd-banner--error">{restoreError}</div>}

      {!loading && entries.length === 0 && !error && (
        <p style={{ color: 'var(--portal-text-muted)', fontSize: 14 }}>Nothing in trash.</p>
      )}

      {entries.map((entry) => {
        const key = `${entry.trashId}::${entry.employer}`
        const isConfirming = confirming === key
        const conflictHere = conflicts?.key === key

        return (
          <div className="jd-history-job" key={key} style={{ marginBottom: 10 }}>
            <div className="jd-history-job-header" style={{ cursor: 'default' }}>
              <span className="jd-history-job-title">{entry.employer}</span>
              <span className="jd-history-job-meta">
                <span className="jd-history-job-date">
                  {new Date(entry.deletedAt).toLocaleString()} · {entry.fileCount} file{entry.fileCount === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  className="jd-button jd-button-secondary"
                  onClick={() => {
                    setRestoreError(null)
                    setConflicts(null)
                    setConfirming(key)
                  }}
                >
                  Restore
                </button>
              </span>
            </div>

            {conflictHere && (
              <div className="jd-banner jd-banner--error" style={{ marginTop: 8 }}>
                Restore blocked — {conflicts.files.length} file(s) already exist live:
                <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                  {conflicts.files.map((f) => (
                    <li key={f} style={{ fontSize: 12.5 }}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {isConfirming && (
              <div className="jd-banner jd-banner--warning" style={{ marginTop: 8 }}>
                Restore <strong>{entry.employer}</strong>'s {entry.fileCount} deleted file{entry.fileCount === 1 ? '' : 's'} back to
                Run History? Blocked automatically if any file already exists live.
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="jd-button"
                    disabled={restoring}
                    onClick={() => handleRestore(entry.trashId, entry.employer)}
                  >
                    {restoring ? 'Restoring…' : 'Restore'}
                  </button>
                  <button
                    type="button"
                    className="jd-button jd-button-secondary"
                    disabled={restoring}
                    onClick={() => setConfirming(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </CollapsibleCard>
  )
}

export default JDHistoryTrash
