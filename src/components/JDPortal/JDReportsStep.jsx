import React, { useState } from 'react'
import { toDownloadUrl } from '../../utils/jdApi'
import DocViewer from './DocViewer'
import CollapsibleCard from './CollapsibleCard'

const OUTPUT_LABELS = {
  scorecardTxt: 'Scorecard (.txt)',
  scorecardDocx: 'Scorecard (.docx)',
  resumeTxt: 'Resume (.txt)',
  resumeDocx: 'Resume (.docx)',
  coverLetterTxt: 'Cover Letter (.txt)',
  coverLetterDocx: 'Cover Letter (.docx)'
}

function JDReportsStep({ result, onBackToRun }) {
  const [viewing, setViewing] = useState(null) // { path, label } | null
  const [copiedKey, setCopiedKey] = useState(null)

  const handleCopy = async (key, text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500)
    } catch {
      // clipboard unavailable/denied — silently ignore, button just won't confirm
    }
  }

  if (!result) {
    return (
      <CollapsibleCard title="Reports">
        <p style={{ color: 'var(--portal-text-muted)', fontSize: 14, marginBottom: 14 }}>
          No report yet — run a JD pipeline first to see results here.
        </p>
        <button type="button" className="jd-button" onClick={onBackToRun}>
          Go to JD Run
        </button>
      </CollapsibleCard>
    )
  }

  return (
    <CollapsibleCard title="Reports">
      {result.outputs?.scorecard?.matchScore && (
        <div className="jd-match-score">
          Match Score: {result.outputs.scorecard.matchScore.score} / {result.outputs.scorecard.matchScore.maxScore} —{' '}
          {result.outputs.scorecard.matchScore.verdict}
        </div>
      )}

      {result.outputs?.scorecard?.strengths && (
        <div className="jd-details">
          <div className="jd-details-header">
            <strong>Strengths</strong>
            <button
              type="button"
              className="jd-button-copy"
              onClick={() => handleCopy('strengths', result.outputs.scorecard.strengths)}
            >
              {copiedKey === 'strengths' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre>{result.outputs.scorecard.strengths}</pre>
        </div>
      )}

      {result.outputs?.scorecard?.gaps && (
        <div className="jd-details">
          <div className="jd-details-header">
            <strong>Gaps</strong>
            <button
              type="button"
              className="jd-button-copy"
              onClick={() => handleCopy('gaps', result.outputs.scorecard.gaps)}
            >
              {copiedKey === 'gaps' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre>{result.outputs.scorecard.gaps}</pre>
        </div>
      )}

      {result.downloadUrls && Object.keys(result.downloadUrls).length > 0 && (
        <div className="jd-download-links">
          {Object.entries(result.downloadUrls).map(([key, url]) => {
            const label = OUTPUT_LABELS[key] || key
            if (key.endsWith('Docx')) {
              return (
                <span className="jd-download-group" key={key}>
                  <a href={toDownloadUrl(url)} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                  <button
                    type="button"
                    className="jd-button-view"
                    onClick={() => setViewing({ path: url, label })}
                  >
                    View
                  </button>
                </span>
              )
            }
            return (
              <a key={key} href={toDownloadUrl(url)} target="_blank" rel="noreferrer">
                {label}
              </a>
            )
          })}
        </div>
      )}

      {viewing && (
        <DocViewer path={viewing.path} label={viewing.label} onClose={() => setViewing(null)} />
      )}
    </CollapsibleCard>
  )
}

export default JDReportsStep
