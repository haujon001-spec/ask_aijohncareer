import React, { useState, useEffect, useRef } from 'react'
import { runJd, toDownloadUrl } from '../../utils/jdApi'

const OUTPUT_LABELS = {
  scorecardTxt: 'Scorecard (.txt)',
  scorecardDocx: 'Scorecard (.docx)',
  resumeTxt: 'Resume (.txt)',
  resumeDocx: 'Resume (.docx)',
  coverLetterTxt: 'Cover Letter (.txt)',
  coverLetterDocx: 'Cover Letter (.docx)'
}

function JDRunPanel({ initialJdFile }) {
  const [jdFile, setJdFile] = useState(initialJdFile || '')
  const [llm, setLlm] = useState('sonnet')
  const [mode, setMode] = useState('all')
  const [refreshBlueprint, setRefreshBlueprint] = useState(false)
  const [generateDocx, setGenerateDocx] = useState(true)

  const [running, setRunning] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [errorDetails, setErrorDetails] = useState(null)
  const [runConflict, setRunConflict] = useState(false)

  const timerRef = useRef(null)

  useEffect(() => {
    if (initialJdFile) setJdFile(initialJdFile)
  }, [initialJdFile])

  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  const handleRun = async (e) => {
    e.preventDefault()
    setRunning(true)
    setError(null)
    setErrorDetails(null)
    setRunConflict(false)
    setResult(null)
    setElapsedSec(0)
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000)

    try {
      const response = await runJd({ jdFile, llm, mode, refreshBlueprint, generateDocx })
      setResult(response)
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
      setRunning(false)
    }
  }

  return (
    <div className="jd-portal-card">
      <h3>Run JD Pipeline</h3>

      {runConflict && (
        <div className="jd-banner jd-banner--warning">
          Another JD run is already in progress. Try again shortly.
        </div>
      )}

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
            placeholder="e.g. JD_McDonalds_IT_HeadOfInfrastructure.txt"
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
          </select>
        </div>

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

        <button type="submit" className="jd-button" disabled={running || !jdFile.trim()}>
          {running ? 'Running…' : 'Run'}
        </button>

        {running && (
          <div className="jd-elapsed-timer">
            <span className="jd-typing-dots">
              <span></span><span></span><span></span>
            </span>
            Running… {elapsedSec}s (this can take several minutes)
          </div>
        )}
      </form>

      {result && (
        <div style={{ marginTop: 20 }}>
          {result.outputs?.scorecard?.matchScore && (
            <div className="jd-match-score">
              Match Score: {result.outputs.scorecard.matchScore.score} / {result.outputs.scorecard.matchScore.maxScore} —{' '}
              {result.outputs.scorecard.matchScore.verdict}
            </div>
          )}

          {result.outputs?.scorecard?.strengths && (
            <div className="jd-details">
              <strong>Strengths</strong>
              <pre>{result.outputs.scorecard.strengths}</pre>
            </div>
          )}

          {result.outputs?.scorecard?.gaps && (
            <div className="jd-details">
              <strong>Gaps</strong>
              <pre>{result.outputs.scorecard.gaps}</pre>
            </div>
          )}

          {result.downloadUrls && Object.keys(result.downloadUrls).length > 0 && (
            <div className="jd-download-links">
              {Object.entries(result.downloadUrls).map(([key, url]) => (
                <a key={key} href={toDownloadUrl(url)} target="_blank" rel="noreferrer">
                  {OUTPUT_LABELS[key] || key}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default JDRunPanel
