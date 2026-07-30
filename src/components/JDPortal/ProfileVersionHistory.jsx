import React, { useState, useEffect, useCallback } from 'react'
import { fetchProfile, fetchProfileVersions, fetchProfileVersion, restoreProfileVersion } from '../../utils/jdApi'
import CollapsibleCard from './CollapsibleCard'
import ProfileDiff from './ProfileDiff'

const CURRENT = '__current__'

function ProfileVersionHistory() {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [confirming, setConfirming] = useState(null) // filename | null
  const [restoring, setRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState(null)
  const [restoredMessage, setRestoredMessage] = useState(null)

  const [compareA, setCompareA] = useState('')
  const [compareB, setCompareB] = useState(CURRENT)
  const [diffData, setDiffData] = useState(null) // { before, after }
  const [diffLoading, setDiffLoading] = useState(false)
  const [diffError, setDiffError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchProfileVersions()
      setVersions(res.versions)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleRestore(filename) {
    setRestoring(true)
    setRestoreError(null)
    try {
      await restoreProfileVersion(filename)
      setConfirming(null)
      setRestoredMessage(`Restored from ${filename} (a pre-restore backup was taken automatically).`)
      await load()
    } catch (err) {
      setRestoreError(err.message)
    } finally {
      setRestoring(false)
    }
  }

  async function loadVersionPayload(selection) {
    if (selection === CURRENT) {
      const res = await fetchProfile()
      return res.profile
    }
    const res = await fetchProfileVersion(selection)
    return res.profile
  }

  async function handleCompare() {
    if (!compareA || !compareB) return
    setDiffLoading(true)
    setDiffError(null)
    setDiffData(null)
    try {
      const [before, after] = await Promise.all([loadVersionPayload(compareA), loadVersionPayload(compareB)])
      setDiffData({ before, after })
    } catch (err) {
      setDiffError(err.message)
    } finally {
      setDiffLoading(false)
    }
  }

  return (
    <>
      <CollapsibleCard
        title={`Version History${versions.length ? ` (${versions.length})` : ''}`}
        headerExtra={
          <button type="button" className="jd-button jd-button-secondary" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        }
      >
        <p style={{ color: 'var(--portal-text-muted)', fontSize: 13 }}>
          A backup snapshot is taken automatically before every save. Restoring itself takes a fresh snapshot first, so a restore is always undoable.
        </p>

        {error && <div className="jd-banner jd-banner--error">{error}</div>}
        {restoreError && <div className="jd-banner jd-banner--error">{restoreError}</div>}
        {restoredMessage && <div className="jd-banner jd-banner--success">{restoredMessage}</div>}

        {!loading && versions.length === 0 && !error && (
          <p style={{ color: 'var(--portal-text-muted)', fontSize: 14 }}>No backups yet.</p>
        )}

        {versions.map((v) => {
          const isConfirming = confirming === v.filename
          return (
            <div className="jd-history-job" key={v.filename} style={{ marginBottom: 10 }}>
              <div className="jd-history-job-header" style={{ cursor: 'default' }}>
                <span className="jd-history-job-title">{new Date(v.timestamp).toLocaleString()}</span>
                <span className="jd-history-job-meta">
                  <span className="jd-history-job-date">{v.profileSize} bytes</span>
                  <button type="button" className="jd-button jd-button-secondary" onClick={() => setConfirming(v.filename)}>
                    Restore
                  </button>
                </span>
              </div>

              {isConfirming && (
                <div className="jd-banner jd-banner--warning" style={{ marginTop: 8 }}>
                  Restore the profile to this {new Date(v.timestamp).toLocaleString()} snapshot? The current state will be
                  backed up first, so this is undoable.
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button type="button" className="jd-button" disabled={restoring} onClick={() => handleRestore(v.filename)}>
                      {restoring ? 'Restoring…' : 'Restore'}
                    </button>
                    <button type="button" className="jd-button jd-button-secondary" disabled={restoring} onClick={() => setConfirming(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </CollapsibleCard>

      <CollapsibleCard title="Compare Versions" defaultOpen={false}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="jd-field" style={{ minWidth: 220 }}>
            <label>Compare A</label>
            <select value={compareA} onChange={(e) => setCompareA(e.target.value)}>
              <option value="">Select a version…</option>
              <option value={CURRENT}>Current</option>
              {versions.map((v) => (
                <option key={v.filename} value={v.filename}>{new Date(v.timestamp).toLocaleString()}</option>
              ))}
            </select>
          </div>
          <div className="jd-field" style={{ minWidth: 220 }}>
            <label>Compare B</label>
            <select value={compareB} onChange={(e) => setCompareB(e.target.value)}>
              <option value={CURRENT}>Current</option>
              {versions.map((v) => (
                <option key={v.filename} value={v.filename}>{new Date(v.timestamp).toLocaleString()}</option>
              ))}
            </select>
          </div>
          <button type="button" className="jd-button" disabled={!compareA || diffLoading} onClick={handleCompare}>
            {diffLoading ? 'Comparing…' : 'Compare'}
          </button>
        </div>

        {diffError && <div className="jd-banner jd-banner--error" style={{ marginTop: 10 }}>{diffError}</div>}

        {diffData && (
          <div style={{ marginTop: 14 }}>
            <ProfileDiff before={diffData.before} after={diffData.after} />
          </div>
        )}
      </CollapsibleCard>
    </>
  )
}

export default ProfileVersionHistory
