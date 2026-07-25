import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import DOMPurify from 'dompurify'
import { viewDoc } from '../../utils/jdApi'
import './DocViewer.css'

function DocViewer({ path, label, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [html, setHtml] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    viewDoc(path)
      .then((res) => {
        if (cancelled) return
        setHtml(DOMPurify.sanitize(res.html))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [path])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Portaled to document.body (see below) to escape .jd-portal-card's
  // backdrop-filter, which otherwise breaks this modal's position:fixed
  // containing block. That also takes it outside .portal-shell's themed
  // subtree, so the data-portal-theme attribute (and the --portal-* CSS
  // vars it defines) is re-applied directly on the portaled root here.
  const portalTheme = document.querySelector('.portal-shell')?.getAttribute('data-portal-theme') || 'fintech'

  return createPortal(
    <div className="doc-viewer-overlay" data-portal-theme={portalTheme} onClick={onClose}>
      <div className="doc-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="doc-viewer-header">
          <span className="doc-viewer-title">{label}</span>
          <button type="button" className="doc-viewer-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="doc-viewer-body">
          {loading && <div className="portal-loading">Rendering document…</div>}
          {error && <div className="portal-banner portal-banner--danger">{error}</div>}
          {!loading && !error && (
            <div className="doc-viewer-content" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default DocViewer
