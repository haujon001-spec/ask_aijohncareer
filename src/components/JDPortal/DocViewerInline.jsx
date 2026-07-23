import React, { useState, useEffect } from 'react'
import DOMPurify from 'dompurify'
import { viewDoc } from '../../utils/jdApi'
import './DocViewerInline.css'

function DocViewerInline({ path, label, onClose }) {
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

  return (
    <div className="doc-viewer-inline">
      <div className="doc-viewer-inline-header">
        <span className="doc-viewer-inline-title">{label}</span>
        <button type="button" className="doc-viewer-inline-close" onClick={onClose}>
          Hide
        </button>
      </div>
      <div className="doc-viewer-inline-body">
        {loading && <div className="portal-loading">Rendering document…</div>}
        {error && <div className="portal-banner portal-banner--danger">{error}</div>}
        {!loading && !error && (
          <div className="doc-viewer-inline-content" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  )
}

export default DocViewerInline
