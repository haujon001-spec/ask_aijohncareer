import React, { useState, useEffect } from 'react'
import { fetchPdfCapabilities, convertToPdf, toDownloadUrl } from '../../utils/jdApi'

// One capability lookup per page load, shared by every PdfControl on screen.
let capabilityPromise = null
function loadCapability() {
  if (!capabilityPromise) {
    capabilityPromise = fetchPdfCapabilities().catch(() => ({ available: false }))
  }
  return capabilityPromise
}

export function usePdfCapability() {
  const [capability, setCapability] = useState(null)
  useEffect(() => {
    let alive = true
    loadCapability().then((c) => alive && setCapability(c))
    return () => {
      alive = false
    }
  }, [])
  return capability
}

/**
 * Next to a .docx link: shows "PDF" (download) when a PDF already exists,
 * otherwise a "Convert to PDF" button — but only on a server that has a PDF
 * engine (Word/LibreOffice). On the production VPS (no engine) a PDF only
 * appears once it has been generated on the laptop and synced across.
 */
function PdfControl({ docxPath, pdfPath }) {
  const capability = usePdfCapability()
  const [pdf, setPdf] = useState(pdfPath || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setPdf(pdfPath || null)
  }, [pdfPath])

  if (!docxPath && !pdf) return null

  const handleConvert = async (e) => {
    e.stopPropagation()
    setBusy(true)
    setError(null)
    try {
      const response = await convertToPdf(docxPath)
      setPdf(response.pdf)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (pdf) {
    return (
      <a href={toDownloadUrl(pdf)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
        PDF
      </a>
    )
  }

  if (!capability?.available) return null

  return (
    <span className="jd-download-group">
      <button type="button" className="jd-button-view" onClick={handleConvert} disabled={busy}>
        {busy ? 'Converting…' : 'Convert to PDF'}
      </button>
      {error && <span className="jd-field-hint" style={{ color: 'var(--portal-danger, #e5484d)' }}>{error}</span>}
    </span>
  )
}

export default PdfControl
