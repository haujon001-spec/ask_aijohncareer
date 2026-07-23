import React, { useState, useEffect } from 'react'
import { fetchLlmKeyStatus, saveLlmKey, clearLlmKey } from '../../utils/jdApi'
import CollapsibleCard from './CollapsibleCard'

const PROVIDER_LABELS = { openrouter: 'OpenRouter', deepseek: 'DeepSeek' }

function ProviderKeyRow({ provider, status, onSaved }) {
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    setError(null)
    try {
      const result = await saveLlmKey(provider, apiKey.trim())
      setApiKey('')
      onSaved(result.providers)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await clearLlmKey(provider)
      onSaved(result.providers)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="jd-field">
      <label htmlFor={`jd-key-${provider}`}>{PROVIDER_LABELS[provider]} API Key</label>
      <div className="jd-key-row">
        <input
          id={`jd-key-${provider}`}
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste a personal API key to override the server default"
          disabled={saving}
          autoComplete="off"
        />
        <button type="button" className="jd-button" disabled={saving || !apiKey.trim()} onClick={handleSave}>
          Save
        </button>
        {status?.userKeySet && (
          <button type="button" className="jd-button jd-button-secondary" disabled={saving} onClick={handleClear}>
            Clear
          </button>
        )}
      </div>
      {error && <div className="jd-field-hint jd-field-hint--error">{error}</div>}
      <span className="jd-field-hint">
        {status?.userKeySet
          ? `Using your saved key (${status.userKeyPreview})`
          : status?.envKeySet
            ? "Using the server's default key — save your own above to override it"
            : 'No key available yet — set one here or in .env.local'}
      </span>
    </div>
  )
}

function ApiKeySettings() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLlmKeyStatus()
      .then((result) => setStatus(result.providers))
      .catch((err) => setError(err.message))
  }, [])

  return (
    <CollapsibleCard title="API Keys" defaultOpen={false}>
      <p className="jd-field-hint" style={{ marginBottom: 14 }}>
        Optional — bring your own OpenRouter/DeepSeek key. If you don't set one here, the
        server's own key (from .env.local) is used, same as before.
      </p>
      {error && <div className="jd-banner jd-banner--error">{error}</div>}
      {status && (
        <>
          <ProviderKeyRow provider="openrouter" status={status.openrouter} onSaved={setStatus} />
          <ProviderKeyRow provider="deepseek" status={status.deepseek} onSaved={setStatus} />
        </>
      )}
    </CollapsibleCard>
  )
}

export default ApiKeySettings
