import React, { useState, useEffect, useCallback } from 'react'
import { fetchProfile, saveProfileManual } from '../../utils/jdApi'
import { SECTION_KEYS, SECTION_SCHEMAS } from '../../../shared/profileSchema'
import CollapsibleCard from './CollapsibleCard'

// ── Small typed sub-editors, one per SECTION_SCHEMAS `kind` ─────────────────

function TextSectionEditor({ schema, value, onChange }) {
  return (
    <div className="jd-field">
      <label>{schema.label}</label>
      <textarea rows={5} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function ObjectSectionEditor({ schema, value, onChange }) {
  const obj = value || {}
  return (
    <>
      {schema.fields.map((f) => (
        <div className="jd-field" key={f.key}>
          <label>{f.label}</label>
          <input
            type={f.type === 'number' ? 'number' : 'text'}
            value={obj[f.key] ?? ''}
            onChange={(e) => onChange({ ...obj, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
          />
        </div>
      ))}
    </>
  )
}

function StringArrayEditor({ items, onChange }) {
  const [draft, setDraft] = useState('')
  const list = items || []
  return (
    <div>
      <div className="jd-tag-list">
        {list.map((item, i) => (
          <span className="jd-tag" key={i}>
            {item}
            <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} style={{ marginLeft: 6, cursor: 'pointer' }}>
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="jd-key-row" style={{ marginTop: 8 }}>
        <input
          type="text"
          placeholder="Add item…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              e.preventDefault()
              onChange([...list, draft.trim()])
              setDraft('')
            }
          }}
        />
        <button
          type="button"
          className="jd-button jd-button-secondary"
          onClick={() => {
            if (draft.trim()) {
              onChange([...list, draft.trim()])
              setDraft('')
            }
          }}
        >
          Add
        </button>
      </div>
    </div>
  )
}

function CategoryMapEditor({ value, onChange }) {
  const map = value || {}
  return (
    <>
      {Object.entries(map).map(([category, items]) => (
        <div key={category} style={{ marginBottom: 14 }}>
          <strong style={{ fontSize: 13 }}>{category.replace(/_/g, ' ')}</strong>
          <StringArrayEditor items={items} onChange={(next) => onChange({ ...map, [category]: next })} />
        </div>
      ))}
    </>
  )
}

// Fixed fields + a repeatable key/value row editor for major_achievements'
// genuinely irregular extra metrics (scale/impact/metric/cost_savings/...).
function DynamicEntryEditor({ entry, onChange }) {
  const fixed = { achievement: entry.achievement || '', company: entry.company || '' }
  const extras = Object.entries(entry).filter(([k]) => !['achievement', 'company'].includes(k))

  return (
    <>
      <div className="jd-field">
        <label>Achievement</label>
        <input type="text" value={fixed.achievement} onChange={(e) => onChange({ ...entry, achievement: e.target.value })} />
      </div>
      <div className="jd-field">
        <label>Company</label>
        <input type="text" value={fixed.company} onChange={(e) => onChange({ ...entry, company: e.target.value })} />
      </div>
      {extras.map(([key, val], i) => (
        <div className="jd-key-row" key={i}>
          <input
            type="text"
            placeholder="field name"
            value={key}
            onChange={(e) => {
              const next = { ...entry }
              delete next[key]
              next[e.target.value] = val
              onChange(next)
            }}
          />
          <input
            type="text"
            placeholder="value"
            value={val}
            onChange={(e) => onChange({ ...entry, [key]: e.target.value })}
          />
          <button
            type="button"
            className="jd-button-danger--icon"
            onClick={() => {
              const next = { ...entry }
              delete next[key]
              onChange(next)
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="jd-button jd-button-secondary"
        onClick={() => onChange({ ...entry, '': '' })}
        style={{ marginTop: 6 }}
      >
        + Add field
      </button>
    </>
  )
}

function ObjectArrayEditor({ schema, items, onChange }) {
  const list = items || []

  function updateEntry(i, next) {
    onChange(list.map((e, j) => (j === i ? next : e)))
  }
  function removeEntry(i) {
    onChange(list.filter((_, j) => j !== i))
  }
  function addEntry() {
    const blank = {}
    for (const f of schema.fields || []) blank[f.key] = f.type === 'stringArray' ? [] : ''
    onChange([...list, blank])
  }

  return (
    <>
      {list.map((entry, i) => (
        <div className="jd-history-job" key={i} style={{ marginBottom: 14 }}>
          <div className="jd-history-job-header" style={{ cursor: 'default' }}>
            <span className="jd-history-job-title">{entry.company || entry.achievement || entry.title || entry.language || entry.credential || `Entry ${i + 1}`}</span>
            <button type="button" className="jd-button-danger--icon" onClick={() => removeEntry(i)}>🗑</button>
          </div>
          <div className="jd-history-job-body">
            {schema.dynamicMetrics ? (
              <DynamicEntryEditor entry={entry} onChange={(next) => updateEntry(i, next)} />
            ) : (
              schema.fields.map((f) => (
                <div className="jd-field" key={f.key}>
                  <label>{f.label}</label>
                  {f.type === 'textarea' && <textarea rows={3} value={entry[f.key] || ''} onChange={(e) => updateEntry(i, { ...entry, [f.key]: e.target.value })} />}
                  {f.type === 'text' && <input type="text" value={entry[f.key] || ''} onChange={(e) => updateEntry(i, { ...entry, [f.key]: e.target.value })} />}
                  {f.type === 'number' && <input type="number" value={entry[f.key] ?? ''} onChange={(e) => updateEntry(i, { ...entry, [f.key]: Number(e.target.value) })} />}
                  {f.type === 'stringArray' && <StringArrayEditor items={entry[f.key]} onChange={(next) => updateEntry(i, { ...entry, [f.key]: next })} />}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
      <button type="button" className="jd-button jd-button-secondary" onClick={addEntry}>+ Add entry</button>
    </>
  )
}

// ── Container ────────────────────────────────────────────────────────────────

function ProfileEditForm() {
  const [profile, setProfile] = useState(null)
  const [timestamp, setTimestamp] = useState(null)
  const [draft, setDraft] = useState(null) // working copy, section -> value
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [savedMessage, setSavedMessage] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchProfile()
      setProfile(res.profile)
      setTimestamp(res.timestamp)
      setDraft(res.profile)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function setSectionValue(section, value) {
    setDraft((d) => ({ ...d, [section]: value }))
    setSavedMessage(null)
  }

  // Diffs draft against the last-loaded profile and emits one op per changed
  // section/entry, dispatched by SECTION_SCHEMAS kind.
  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setConflict(null)
    try {
      const ops = []
      for (const section of SECTION_KEYS) {
        const schema = SECTION_SCHEMAS[section]
        const before = JSON.stringify(profile[section])
        const after = JSON.stringify(draft[section])
        if (before === after) continue

        if (schema.kind === 'text') {
          ops.push({ kind: 'replaceText', section, value: draft[section] })
        } else if (schema.kind === 'object') {
          ops.push({ kind: 'updateObject', section, patch: draft[section] })
        } else if (schema.kind === 'stringArray') {
          const beforeList = profile[section] || []
          const afterList = draft[section] || []
          const added = afterList.filter((x) => !beforeList.includes(x))
          const removed = beforeList.filter((x) => !afterList.includes(x))
          if (added.length) ops.push({ kind: 'appendStrings', section, items: added, dedupe: false })
          if (removed.length) ops.push({ kind: 'removeStrings', section, items: removed })
        } else if (schema.kind === 'categoryMap') {
          const beforeMap = profile[section] || {}
          const afterMap = draft[section] || {}
          for (const category of Object.keys(afterMap)) {
            const beforeList = beforeMap[category] || []
            const afterList = afterMap[category] || []
            const added = afterList.filter((x) => !beforeList.includes(x))
            const removed = beforeList.filter((x) => !afterList.includes(x))
            if (added.length) ops.push({ kind: 'appendStrings', section, field: category, items: added, dedupe: false })
            if (removed.length) ops.push({ kind: 'removeStrings', section, field: category, items: removed })
          }
        } else if (schema.kind === 'objectArray') {
          const beforeList = profile[section] || []
          const afterList = draft[section] || []
          const beforeKeys = new Set(beforeList.map((e) => JSON.stringify(schema.identityFields.map((f) => e[f]))))
          for (const entry of afterList) {
            const key = JSON.stringify(schema.identityFields.map((f) => entry[f]))
            if (beforeKeys.has(key)) {
              const original = beforeList.find((e) => JSON.stringify(schema.identityFields.map((f) => e[f])) === key)
              if (JSON.stringify(original) !== JSON.stringify(entry)) {
                ops.push({ kind: 'upsertEntry', section, identity: Object.fromEntries(schema.identityFields.map((f) => [f, entry[f]])), entry })
              }
            } else {
              ops.push({ kind: 'upsertEntry', section, entry })
            }
          }
          const afterKeys = new Set(afterList.map((e) => JSON.stringify(schema.identityFields.map((f) => e[f]))))
          for (const entry of beforeList) {
            const key = JSON.stringify(schema.identityFields.map((f) => entry[f]))
            if (!afterKeys.has(key)) {
              ops.push({ kind: 'removeEntry', section, identity: Object.fromEntries(schema.identityFields.map((f) => [f, entry[f]])) })
            }
          }
        }
      }

      if (ops.length === 0) {
        setSaving(false)
        return
      }

      const res = await saveProfileManual({ ops, expectedTimestamp: timestamp })
      setProfile(res.profile)
      setDraft(res.profile)
      setTimestamp(res.timestamp)
      setSavedMessage(`Saved (backup: ${res.backup})`)
    } catch (err) {
      if (err.status === 409) {
        setConflict(err.data)
      } else {
        setSaveError(err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleReload() {
    setConflict(null)
    await load()
  }

  if (loading) return <p className="portal-loading">Loading profile…</p>
  if (error) return <div className="jd-banner jd-banner--error">{error}</div>
  if (!draft) return null

  const hasChanges = profile && draft && SECTION_KEYS.some((s) => JSON.stringify(profile[s]) !== JSON.stringify(draft[s]))

  return (
    <>
      <div className="jd-portal-card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <p style={{ margin: 0, color: 'var(--portal-text-muted)', fontSize: 13 }}>
            Edit any section, then Save. A backup snapshot is taken automatically before every write.
          </p>
          <button type="button" className="jd-button" disabled={!hasChanges || saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
        {savedMessage && <div className="jd-banner jd-banner--success" style={{ marginTop: 10 }}>{savedMessage}</div>}
        {saveError && <div className="jd-banner jd-banner--error" style={{ marginTop: 10 }}>{saveError}</div>}
        {conflict && (
          <div className="jd-banner jd-banner--warning" style={{ marginTop: 10 }}>
            {conflict.error} Your unsaved edits on this page will be discarded.
            <div style={{ marginTop: 10 }}>
              <button type="button" className="jd-button" onClick={handleReload}>Reload latest</button>
            </div>
          </div>
        )}
      </div>

      {SECTION_KEYS.map((section) => {
        const schema = SECTION_SCHEMAS[section]
        return (
          <CollapsibleCard title={schema.label} defaultOpen={false} key={section}>
            {schema.kind === 'text' && (
              <TextSectionEditor schema={schema} value={draft[section]} onChange={(v) => setSectionValue(section, v)} />
            )}
            {schema.kind === 'object' && (
              <ObjectSectionEditor schema={schema} value={draft[section]} onChange={(v) => setSectionValue(section, v)} />
            )}
            {schema.kind === 'stringArray' && (
              <StringArrayEditor items={draft[section]} onChange={(v) => setSectionValue(section, v)} />
            )}
            {schema.kind === 'categoryMap' && (
              <CategoryMapEditor value={draft[section]} onChange={(v) => setSectionValue(section, v)} />
            )}
            {schema.kind === 'objectArray' && (
              <ObjectArrayEditor schema={schema} items={draft[section]} onChange={(v) => setSectionValue(section, v)} />
            )}
          </CollapsibleCard>
        )
      })}
    </>
  )
}

export default ProfileEditForm
