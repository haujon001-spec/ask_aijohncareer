import React, { useState } from 'react'
import { previewSync, runSync } from '../../utils/jdApi'
import CollapsibleCard from './CollapsibleCard'

const DIRECTIONS = [
  { id: 'both', label: 'Both ways (laptop ⇄ VPS)' },
  { id: 'push', label: 'Push only (laptop → VPS)' },
  { id: 'pull', label: 'Pull only (VPS → laptop)' }
]

function formatSize(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`
}

function fileName(rel) {
  return rel.split('/').slice(-3).join('/')
}

function SyncPanel() {
  const [direction, setDirection] = useState('both')
  const [plan, setPlan] = useState(null) // { companies, totals } | null
  const [included, setIncluded] = useState({}) // company -> bool
  const [resolutions, setResolutions] = useState({}) // company -> 'skip' | 'local' | 'remote'
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const doPush = direction === 'both' || direction === 'push'
  const doPull = direction === 'both' || direction === 'pull'

  const handlePreview = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await previewSync()
      setPlan(response)
      const inc = {}
      const res = {}
      response.companies.forEach((g) => {
        inc[g.company] = g.newLocal.length + g.newRemote.length + g.conflicts.length > 0
        res[g.company] = 'skip'
      })
      setIncluded(inc)
      setResolutions(res)
    } catch (err) {
      setPlan(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const changeCount = (g) =>
    (doPush ? g.newLocal.length : 0) +
    (doPull ? g.newRemote.length : 0) +
    g.conflicts.filter((c) => resolutions[g.company] !== 'skip').length

  const visible = plan ? plan.companies.filter((g) => g.newLocal.length + g.newRemote.length + g.conflicts.length > 0) : []
  const selected = visible.filter((g) => included[g.company])
  const totalToCopy = selected.reduce((n, g) => n + changeCount(g), 0)

  const handleRun = async () => {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const response = await runSync({
        direction,
        companies: selected.map((g) => g.company),
        resolutions
      })
      setResult(response)
      setPlan(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <CollapsibleCard title="Sync with VPS">
      <p style={{ color: 'var(--portal-text-muted)', fontSize: 14, marginBottom: 14 }}>
        Copies generated resumes, scorecards, cover letters (txt, docx, pdf) and the JD inputs behind them between this
        laptop and the live server. Nothing is ever deleted, <strong>secrets and profile data never move</strong>, and
        every file that would be overwritten is backed up first.
      </p>

      {error && <div className="jd-banner jd-banner--error">{error}</div>}

      <div className="jd-field">
        <label htmlFor="sync-direction">Direction</label>
        <select
          id="sync-direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          disabled={loading || running}
        >
          {DIRECTIONS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <button type="button" className="jd-button" onClick={handlePreview} disabled={loading || running}>
        {loading ? 'Comparing…' : plan ? 'Re-check differences' : 'Check differences'}
      </button>

      {plan && (
        <div className="jd-sync-plan">
          <div className="jd-match-score" style={{ marginTop: 16 }}>
            {plan.totals.newLocal} only on laptop · {plan.totals.newRemote} only on VPS · {plan.totals.conflicts} differ ·{' '}
            {plan.totals.identical} identical
          </div>

          {visible.length === 0 && <p>Both sides are already in sync.</p>}

          {visible.map((g) => (
            <div className="jd-sync-company" key={g.company}>
              <label className="jd-sync-company-head">
                <input
                  type="checkbox"
                  checked={!!included[g.company]}
                  onChange={(e) => setIncluded({ ...included, [g.company]: e.target.checked })}
                  disabled={running}
                />
                <strong>{g.company}</strong>
                <span className="jd-sync-counts">
                  {doPush && g.newLocal.length > 0 && <span>→ {g.newLocal.length} to VPS</span>}
                  {doPull && g.newRemote.length > 0 && <span>← {g.newRemote.length} to laptop</span>}
                  {g.conflicts.length > 0 && <span className="jd-sync-conflict-tag">⚠ {g.conflicts.length} differ</span>}
                </span>
              </label>

              {g.conflicts.length > 0 && (
                <div className="jd-field jd-sync-resolve">
                  <label htmlFor={`sync-res-${g.company}`}>Where {g.company} files differ, keep:</label>
                  <select
                    id={`sync-res-${g.company}`}
                    value={resolutions[g.company]}
                    onChange={(e) => setResolutions({ ...resolutions, [g.company]: e.target.value })}
                    disabled={running || !included[g.company]}
                  >
                    <option value="skip">Skip — leave both as they are</option>
                    {doPush && <option value="local">Laptop version (overwrites VPS, backed up)</option>}
                    {doPull && <option value="remote">VPS version (overwrites laptop, backed up)</option>}
                  </select>
                </div>
              )}

              <details className="jd-details">
                <summary>Files</summary>
                <ul className="jd-sync-files">
                  {doPush && g.newLocal.map((f) => (
                    <li key={f.rel}>→ {fileName(f.rel)} <span>({formatSize(f.localSize)})</span></li>
                  ))}
                  {doPull && g.newRemote.map((f) => (
                    <li key={f.rel}>← {fileName(f.rel)} <span>({formatSize(f.remoteSize)})</span></li>
                  ))}
                  {g.conflicts.map((f) => (
                    <li key={f.rel}>
                      ⚠ {fileName(f.rel)}{' '}
                      <span>
                        (laptop {formatSize(f.localSize)}, VPS {formatSize(f.remoteSize)}; newer on {f.newer === 'local' ? 'laptop' : 'VPS'})
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ))}

          {visible.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                className="jd-button"
                onClick={handleRun}
                disabled={running || totalToCopy === 0}
              >
                {running ? 'Syncing…' : `Sync ${totalToCopy} file${totalToCopy === 1 ? '' : 's'}`}
              </button>
              {totalToCopy === 0 && <span className="jd-field-hint">Nothing selected to copy.</span>}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className={`jd-banner ${result.success ? 'jd-banner--success' : 'jd-banner--error'}`} style={{ marginTop: 16 }}>
          <strong>{result.success ? 'Sync complete.' : 'Sync finished with problems.'}</strong>
          <ul className="jd-sync-files">
            <li>{result.pushed} file(s) sent to the VPS, {result.pulled} fetched to the laptop</li>
            <li>{result.verified} verified identical on both sides by sha256</li>
            {result.skippedConflicts > 0 && <li>{result.skippedConflicts} differing file(s) skipped (untouched)</li>}
            {result.backups?.vps && <li>VPS backups of overwritten files: {result.backups.vps}</li>}
            {result.backups?.local && <li>Laptop backups of overwritten files: {result.backups.local}</li>}
            {result.failed?.length > 0 && <li>Failed verification: {result.failed.join(', ')}</li>}
            {result.errors?.length > 0 && <li>Errors: {result.errors.join(' | ')}</li>}
          </ul>
        </div>
      )}
    </CollapsibleCard>
  )
}

export default SyncPanel
