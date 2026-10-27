import React, { useState, useRef, useEffect } from 'react'
import { captureJdFromImages, fetchCaptureLimits } from '../../utils/jdApi'

// Mirrors backend/lib/jdCapture.js (the server re-checks everything).
const MAX_IMAGES = 10
const MAX_SIDE_PX = 2400 // long edge; keeps small job-ad text legible
const JPEG_QUALITY = 0.85

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Could not read "${file.name}" as an image`))
    }
    img.src = url
  })
}

// Phone screenshots are large PNGs (and photos can be HEIC): re-encode every
// image as a JPEG at a bounded size so ten of them upload quickly and always
// fit the server's per-image limit.
async function toJpegBase64(file) {
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff' // transparent PNG areas would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  return { mediaType: 'image/jpeg', data: dataUrl.split(',')[1] }
}

let nextId = 1

function CaptureFromScreenshots({ onExtracted, disabled }) {
  const [items, setItems] = useState([]) // [{ id, file, preview }]
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [backendMissing, setBackendMissing] = useState(false)
  const galleryRef = useRef(null)
  const cameraRef = useRef(null)
  const itemsRef = useRef(items)
  itemsRef.current = items

  // A backend started before this feature existed answers 404 here (and would
  // reject the real upload with an opaque 413) — say so up front.
  useEffect(() => {
    fetchCaptureLimits().catch((err) => {
      if (err.status === 404) setBackendMissing(true)
    })
  }, [])

  // Release the preview blobs when the panel goes away.
  useEffect(() => () => itemsRef.current.forEach((it) => URL.revokeObjectURL(it.preview)), [])

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (incoming.length === 0) return
    setError(null)
    setItems((prev) => {
      const room = MAX_IMAGES - prev.length
      if (incoming.length > room) setError(`Only ${MAX_IMAGES} screenshots at a time — extra ones were ignored.`)
      const added = incoming.slice(0, Math.max(room, 0)).map((file) => ({ id: nextId++, file, preview: URL.createObjectURL(file) }))
      return [...prev, ...added]
    })
  }

  const remove = (id) =>
    setItems((prev) => {
      const gone = prev.find((it) => it.id === id)
      if (gone) URL.revokeObjectURL(gone.preview)
      return prev.filter((it) => it.id !== id)
    })

  const move = (index, delta) =>
    setItems((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const handleRead = async () => {
    setBusy(true)
    setError(null)
    try {
      const images = []
      for (const it of items) images.push(await toJpegBase64(it.file))
      const result = await captureJdFromImages(images)
      onExtracted(result)
      items.forEach((it) => URL.revokeObjectURL(it.preview))
      setItems([])
    } catch (err) {
      setError(
        err.status === 413
          ? 'The screenshots were too large for the server. Remove a few and try again — or restart the portal backend if you have not since updating.'
          : err.status === 404
            ? 'The running backend does not have screenshot capture yet — restart it (npm run dev:all), then try again.'
            : err.message
      )
    } finally {
      setBusy(false)
    }
  }

  const locked = busy || disabled

  return (
    <div className="jd-capture">
      <p className="jd-field-hint" style={{ marginBottom: 10 }}>
        Add the screenshots of the job ad in order, top of the page first. Overlapping scroll screenshots are fine — repeated
        lines are removed, and if they are out of order the model will re-order them and tell you. The images are read once and
        not stored.
      </p>
      <p className="jd-field-hint" style={{ marginBottom: 10 }}>
        <strong>You do not need to type or paste anything below</strong> — Employer, Role and the job description are filled in
        for you (replacing what is there now).
      </p>
      {backendMissing && (
        <div className="jd-banner jd-banner--error" style={{ marginBottom: 10 }}>
          The running portal backend was started before screenshot capture was added. Stop it and run <code>npm run dev:all</code>{' '}
          (or <code>npm run dev:lan</code>) again, then reload this page.
        </div>
      )}

      <div className="jd-capture-actions">
        <button type="button" className="jd-button jd-button-secondary" disabled={locked || items.length >= MAX_IMAGES} onClick={() => galleryRef.current?.click()}>
          Choose screenshots
        </button>
        <button type="button" className="jd-button jd-button-secondary" disabled={locked || items.length >= MAX_IMAGES} onClick={() => cameraRef.current?.click()}>
          Take photo
        </button>
        <input
          ref={galleryRef}
          data-testid="capture-gallery-input"
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {items.length > 0 && (
        <>
          <div className="jd-capture-read">
            <button type="button" className="jd-button" disabled={locked} onClick={handleRead}>
              {busy ? 'Reading screenshots…' : `Read job description from ${items.length} screenshot${items.length === 1 ? '' : 's'}`}
            </button>
            {busy && (
              <span className="jd-elapsed-timer" style={{ marginLeft: 12 }}>
                <span className="jd-typing-dots">
                  <span></span><span></span><span></span>
                </span>
                <span>Uploading and reading — this can take up to a minute…</span>
              </span>
            )}
          </div>

          {error && <div className="jd-banner jd-banner--error" role="alert" style={{ marginTop: 10 }}>{error}</div>}

          <ol className="jd-capture-list">
            {items.map((it, i) => (
              <li key={it.id} className="jd-capture-item">
                <img src={it.preview} alt={`Screenshot ${i + 1}`} />
                <div className="jd-capture-item-body">
                  <strong>Screenshot {i + 1}</strong>
                  <span className="jd-field-hint">{Math.max(1, Math.round(it.file.size / 1024))} KB</span>
                </div>
                <div className="jd-capture-item-buttons">
                  <button type="button" className="jd-button-view" aria-label={`Move screenshot ${i + 1} up`} disabled={locked || i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button type="button" className="jd-button-view" aria-label={`Move screenshot ${i + 1} down`} disabled={locked || i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
                  <button type="button" className="jd-button-view" aria-label={`Remove screenshot ${i + 1}`} disabled={locked} onClick={() => remove(it.id)}>✕</button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {/* errors before any screenshot is queued (e.g. too many files picked) */}
      {items.length === 0 && error && <div className="jd-banner jd-banner--error" role="alert" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  )
}

export default CaptureFromScreenshots
