import React, { useState } from 'react'
import { previewSync, runSync, previewProfileSync, runProfileSync } from '../../utils/jdApi'
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

function fmtTime(ms) {
  return ms ? new Date(ms).toLocaleString() : '—'
}

// john_profile.json has its own card (28 Oct 2026): one file, explicit direction,
// nothing is copied until the user has seen what differs and confirms.
function ProfileSyncCard() {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [confirmPull, setConfirmPull] = useState(false)

  const check = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setConfirmPull(false)
    try {
      setInfo(await previewProfileSync())
    } catch (err) {
      setInfo(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copy = async (direction) => {
    setRunning(true)
    setError(null)
    try {
      const res = await runProfileSync({
        direction,
        expectedLocalSha: info.local.sha256,
        expectedRemoteSha: info.remote.sha256
      })
      setResult(res)
      setInfo(null)
      setConfirmPull(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <CollapsibleCard title="Profile (john_profile.json)">
      <p style={{ color: 'var(--portal-text-muted)', fontSize: 14, marginBottom: 14 }}>
        Copies your career profile between this laptop and the live server. It is never touched by the bulk sync below.
        The laptop copy is the one you edit, so <strong>Push to VPS</strong> is the normal action. The file being
        replaced is backed up first, and success is confirmed by comparing the two files afterwards.
      </p>

      {error && <div className="jd-banner jd-banner--error">{error}</div>}

      <button type="button" className="jd-button" onClick={check} disabled={loading || running}>
        {loading ? 'Comparing…' : info ? 'Re-check profile' : 'Check profile'}
      </button>

      {info && (
        <div className="jd-sync-plan">
          <div className="jd-match-score" style={{ marginTop: 16 }}>
            {info.status === 'identical' ? 'Laptop and VPS profiles are identical.' : 'The laptop and VPS profiles differ.'}
          </div>
          <ul className="jd-sync-files">
            <li>
              Laptop: {formatSize(info.local.size)}, saved {fmtTime(info.local.mtimeMs)}
              {info.local.yearsExperience != null && <>, {info.local.yearsExperience} years</>}
            </li>
            <li>
              VPS: {formatSize(info.remote.size)}, saved {fmtTime(info.remote.mtimeMs)}
              {info.remote.yearsExperience != null && <>, {info.remote.yearsExperience} years</>}
            </li>
            {info.status === 'differ' && <li>Newer on: {info.newer === 'local' ? 'laptop' : 'VPS'} (by the profile's own timestamp)</li>}
          </ul>

          {info.changedSections.length > 0 && (
            <details className="jd-details" open>
              <summary>{info.changedSections.length} section(s) differ</summary>
              <ul className="jd-sync-files">
                {info.changedSections.map((c) => (
                  <li key={c.section}>
                    {c.section}: laptop {c.local ?? 'none'} · VPS {c.remote ?? 'none'}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {info.status === 'differ' && (
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              <button type="button" className="jd-button" onClick={() => copy('push')} disabled={running}>
                {running ? 'Copying…' : 'Push to VPS (laptop → VPS)'}
              </button>
              {!confirmPull ? (
                <button type="button" className="jd-button-secondary" onClick={() => setConfirmPull(true)} disabled={running}>
                  Pull from VPS…
                </button>
              ) : (
                <button type="button" className="jd-button-secondary" onClick={() => copy('pull')} disabled={running}>
                  Yes, overwrite my laptop profile with the VPS copy
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className={`jd-banner ${result.success ? 'jd-banner--success' : 'jd-banner--error'}`} style={{ marginTop: 16 }}>
          <strong>
            {!result.copied
              ? result.message
              : result.success
                ? `Profile ${result.direction === 'push' ? 'pushed to the VPS' : 'pulled to the laptop'} and verified identical on both sides.`
                : 'Copy finished but verification failed.'}
          </strong>
          {result.backups && (
            <ul className="jd-sync-files">
              {result.backups.vps && <li>VPS backup: {result.backups.vps}</li>}
              {result.backups.vpsVersion && <li>Restorable from the live Profile tab as: {result.backups.vpsVersion}</li>}
              {result.backups.local && <li>Laptop backup: {result.backups.local}</li>}
            </ul>
          )}
        </div>
      )}
    </CollapsibleCard>
  )
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
    <>
    <ProfileSyncCard />
    <CollapsibleCard title="Sync with VPS">
      <p style={{ color: 'var(--portal-text-muted)', fontSize: 14, marginBottom: 14 }}>
        Copies generated resumes, scorecards, cover letters (txt, docx, pdf) and the JD inputs behind them between this
        laptop and the live server. Nothing is ever deleted, <strong>secrets never move</strong> (the profile has its own card above), and
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
    </>
  )
}

export default SyncPanel
