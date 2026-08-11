import React, { useState, useEffect, useRef } from 'react'
import { runJdV3, fetchRunStatusV3, cancelRunV3 } from '../../utils/jdApi'
import CollapsibleCard from './CollapsibleCard'

// Profile-aware sibling of JDRunStep.jsx (added Phase 2, 11 Aug 2026) — same
// UI/behavior, but targets jd_scorecard_resume_v3.py via /api/jd-v3/run for
// a given profileName instead of jd_scorecard_resume_v2.py via /api/jd/run.
// Kept as its own file (small diff from JDRunStep.jsx) rather than a v2/v3
// conditional inside one file, so "portal on v2 is untouched" stays visible
// at the file level.

const STATUS_POLL_MS = 2000

const MODE_FLAGS = {
  scorecard: '--scorecard-only',
  resume: '--resume-only',
  coverletter: '--coverletter-only',
  all: null
}

function buildCommandPreview({ profileName, jdFile, llm, mode, refreshBlueprint, generateDocx, resumeAdjustment, customProvider, customModelSlug }) {
  const parts = ['python scripts/jd_scorecard_resume_v3.py']
  parts.push(`--profile=${profileName || '<Name>'}`)
  parts.push(`"data_raw/${profileName || '<Name>'}/jd/txt/${jdFile || '<JD file>'}"`)
  const modeFlag = MODE_FLAGS[mode || 'all']
  if (modeFlag) parts.push(modeFlag)
  if (refreshBlueprint) parts.push('--refresh-blueprint')
  if (generateDocx === false) parts.push('--no-docx')
  if (resumeAdjustment) parts.push('--ResumeAdjustment')
  if (llm === 'custom') {
    parts.push('--llm=custom', `--model=${customModelSlug || '<model id>'}`, `--provider=${customProvider}`)
  } else {
    parts.push(`--llm=${llm}`)
  }
  return parts.join(' ')
}

function JDRunStepV3({ profileName, initialJdFile, onComplete }) {
  const [jdFile, setJdFile] = useState(initialJdFile || '')
  const [llm, setLlm] = useState('sonnet')
  const [customProvider, setCustomProvider] = useState('openrouter')
  const [customModelSlug, setCustomModelSlug] = useState('')
  const [mode, setMode] = useState('all')
  const [refreshBlueprint, setRefreshBlueprint] = useState(false)
  const [generateDocx, setGenerateDocx] = useState(true)
  const [resumeAdjustment, setResumeAdjustment] = useState(false)

  const [running, setRunning] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [progressStep, setProgressStep] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelledMsg, setCancelledMsg] = useState(null)
  const [error, setError] = useState(null)
  const [errorDetails, setErrorDetails] = useState(null)
  const [runConflict, setRunConflict] = useState(false)

  const timerRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    if (initialJdFile) setJdFile(initialJdFile)
  }, [initialJdFile])

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      clearInterval(pollRef.current)
    }
  }, [])

  const handleRun = async (e) => {
    e.preventDefault()
    setRunning(true)
    setError(null)
    setErrorDetails(null)
    setRunConflict(false)
    setCancelledMsg(null)
    setElapsedSec(0)
    setProgressStep(null)
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000)
    pollRef.current = setInterval(async () => {
      try {
        const status = await fetchRunStatusV3()
        if (status.running) setProgressStep(status.currentStep)
      } catch {
        // status polling is best-effort — a failed poll shouldn't disrupt the run
      }
    }, STATUS_POLL_MS)

    const customModel = llm === 'custom' ? { provider: customProvider, slug: customModelSlug.trim() } : undefined

    try {
      const response = await runJdV3({ profileName, jdFile, llm, mode, refreshBlueprint, generateDocx, resumeAdjustment, customModel })
      if (response.cancelled) {
        setCancelledMsg(`Run stopped — steps already completed before the stop were kept (${response.jdFile}).`)
      } else {
        onComplete(response)
      }
    } catch (err) {
      if (err.status === 409) {
        setRunConflict(true)
      } else {
        setError(err.message)
        if (err.data && (err.data.stderrTail || err.data.stdoutTail)) {
          setErrorDetails(err.data)
        }
      }
    } finally {
      clearInterval(timerRef.current)
      clearInterval(pollRef.current)
      setProgressStep(null)
      setRunning(false)
      setCancelling(false)
    }
  }

  const handleStop = async () => {
    setCancelling(true)
    try {
      await cancelRunV3()
    } catch {
      // if there's nothing to cancel (race with natural completion), the run
      // finishing on its own will resolve handleRun's try/finally regardless
    }
  }

  return (
    <CollapsibleCard title="Run JD Pipeline">
      {runConflict && (
        <div className="jd-banner jd-banner--warning">
          Another JD run is already in progress (on either portal). Try again shortly.
        </div>
      )}

      {cancelledMsg && <div className="jd-banner jd-banner--warning">{cancelledMsg}</div>}

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

      <form onSubmit={handleRun}>
        <div className="jd-field">
          <label htmlFor="jd-file">JD File</label>
          <input
            id="jd-file"
            type="text"
            value={jdFile}
            onChange={(e) => setJdFile(e.target.value)}
            placeholder="e.g. JD_ExampleCorp_ITDirector.txt"
            disabled={running}
            required
          />
        </div>

        <div className="jd-field">
          <label htmlFor="jd-llm">LLM</label>
          <select id="jd-llm" value={llm} onChange={(e) => setLlm(e.target.value)} disabled={running}>
            <option value="sonnet">Sonnet</option>
            <option value="deepseek">DeepSeek</option>
            <option value="gemini">Gemini</option>
            <option value="custom">Custom…</option>
          </select>
        </div>

        {llm === 'custom' && (
          <>
            <div className="jd-field">
              <label htmlFor="jd-custom-provider">Provider</label>
              <select
                id="jd-custom-provider"
                value={customProvider}
                onChange={(e) => setCustomProvider(e.target.value)}
                disabled={running}
              >
                <option value="openrouter">OpenRouter</option>
                <option value="deepseek">DeepSeek</option>
              </select>
            </div>

            <div className="jd-field">
              <label htmlFor="jd-custom-model">Model ID</label>
              <input
                id="jd-custom-model"
                type="text"
                value={customModelSlug}
                onChange={(e) => setCustomModelSlug(e.target.value)}
                placeholder={customProvider === 'openrouter' ? 'e.g. anthropic/claude-opus-4-8' : 'e.g. deepseek-chat'}
                disabled={running}
                required
              />
              <span className="jd-field-hint">
                Any model id your {customProvider === 'openrouter' ? 'OpenRouter' : 'DeepSeek'} key can access.
              </span>
            </div>
          </>
        )}

        <div className="jd-field">
          <label htmlFor="jd-mode">Mode</label>
          <select id="jd-mode" value={mode} onChange={(e) => setMode(e.target.value)} disabled={running}>
            <option value="all">All (scorecard + resume + cover letter)</option>
            <option value="scorecard">Scorecard only</option>
            <option value="resume">Resume only</option>
            <option value="coverletter">Cover letter only</option>
          </select>
        </div>

        <div className="jd-checkbox-field">
          <input
            id="jd-refresh-blueprint"
            type="checkbox"
            checked={refreshBlueprint}
            onChange={(e) => setRefreshBlueprint(e.target.checked)}
            disabled={running}
          />
          <label htmlFor="jd-refresh-blueprint">Refresh blueprint</label>
        </div>

        <div className="jd-checkbox-field">
          <input
            id="jd-generate-docx"
            type="checkbox"
            checked={generateDocx}
            onChange={(e) => setGenerateDocx(e.target.checked)}
            disabled={running}
          />
          <label htmlFor="jd-generate-docx">Generate .docx</label>
        </div>

        <div className="jd-checkbox-field">
          <input
            id="jd-resume-adjustment"
            type="checkbox"
            checked={resumeAdjustment}
            onChange={(e) => setResumeAdjustment(e.target.checked)}
            disabled={running}
          />
          <label htmlFor="jd-resume-adjustment">
            Apply Resume Adjustments (uses this JD's own Match Scorecard "6a" guidance to tailor wording)
          </label>
        </div>

        <div className="jd-field">
          <label htmlFor="jd-command-preview">Command Preview</label>
          <pre id="jd-command-preview" className="jd-command-preview">
            {buildCommandPreview({ profileName, jdFile, llm, mode, refreshBlueprint, generateDocx, resumeAdjustment, customProvider, customModelSlug })}
          </pre>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="submit"
            className="jd-button"
            disabled={running || !jdFile.trim() || !profileName || (llm === 'custom' && !customModelSlug.trim())}
          >
            {running ? 'Running…' : 'Run'}
          </button>
          {running && (
            <button type="button" className="jd-button jd-button-secondary" onClick={handleStop} disabled={cancelling}>
              {cancelling ? 'Stopping…' : 'Stop'}
            </button>
          )}
        </div>

        {running && (
          <div className="jd-elapsed-timer">
            <span className="jd-typing-dots">
              <span></span><span></span><span></span>
            </span>
            <span>
              Running… {elapsedSec}s (this can take several minutes)
              {progressStep && <div className="jd-progress-step">{progressStep}</div>}
            </span>
          </div>
        )}
      </form>
    </CollapsibleCard>
  )
}

export default JDRunStepV3
