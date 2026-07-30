import React from 'react'
import { diffWords } from 'diff'
import { SECTION_KEYS, SECTION_SCHEMAS } from '../../../shared/profileSchema'

function WordDiff({ before, after }) {
  const parts = diffWords(String(before || ''), String(after || ''))
  return (
    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>
      {parts.map((part, i) => {
        if (part.added) return <ins key={i} style={{ background: 'var(--portal-success-bg, #1e4620)', color: 'inherit', textDecoration: 'none' }}>{part.value}</ins>
        if (part.removed) return <del key={i} style={{ background: 'var(--portal-danger-bg, #4a1f1f)', color: 'inherit', opacity: 0.8 }}>{part.value}</del>
        return <React.Fragment key={i}>{part.value}</React.Fragment>
      })}
    </p>
  )
}

function entityLabel(entry, identityFields) {
  return identityFields.map((f) => entry[f]).filter(Boolean).join(' · ')
}

function identityKey(entry, identityFields) {
  return JSON.stringify(identityFields.map((f) => entry[f]))
}

function ObjectArrayDiff({ schema, before, after }) {
  const beforeList = before || []
  const afterList = after || []
  const beforeMap = new Map(beforeList.map((e) => [identityKey(e, schema.identityFields), e]))
  const afterMap = new Map(afterList.map((e) => [identityKey(e, schema.identityFields), e]))

  const added = afterList.filter((e) => !beforeMap.has(identityKey(e, schema.identityFields)))
  const removed = beforeList.filter((e) => !afterMap.has(identityKey(e, schema.identityFields)))
  const changed = afterList
    .filter((e) => beforeMap.has(identityKey(e, schema.identityFields)))
    .map((e) => ({ before: beforeMap.get(identityKey(e, schema.identityFields)), after: e }))
    .filter(({ before: b, after: a }) => JSON.stringify(b) !== JSON.stringify(a))

  if (added.length === 0 && removed.length === 0 && changed.length === 0) return null

  return (
    <div>
      {added.map((e, i) => (
        <div key={`add-${i}`} style={{ marginBottom: 8 }}>
          <span className="jd-tag" style={{ background: 'var(--portal-success-bg, #1e4620)' }}>+ added</span>{' '}
          <strong>{entityLabel(e, schema.identityFields)}</strong>
        </div>
      ))}
      {removed.map((e, i) => (
        <div key={`rem-${i}`} style={{ marginBottom: 8 }}>
          <span className="jd-tag" style={{ background: 'var(--portal-danger-bg, #4a1f1f)' }}>− removed</span>{' '}
          <strong>{entityLabel(e, schema.identityFields)}</strong>
        </div>
      ))}
      {changed.map(({ before: b, after: a }, i) => (
        <div key={`chg-${i}`} style={{ marginBottom: 10 }}>
          <span className="jd-tag">~ changed</span> <strong>{entityLabel(a, schema.identityFields)}</strong>
          {Object.keys(a).map((field) => {
            const bv = b[field]
            const av = a[field]
            if (JSON.stringify(bv) === JSON.stringify(av)) return null
            if (Array.isArray(av)) {
              return (
                <div key={field} style={{ marginTop: 4, fontSize: 13 }}>
                  <em>{field}</em>: <StringArrayDiff before={bv || []} after={av || []} />
                </div>
              )
            }
            return (
              <div key={field} style={{ marginTop: 4 }}>
                <em style={{ fontSize: 12 }}>{field}</em>
                <WordDiff before={bv} after={av} />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function StringArrayDiff({ before, after }) {
  const beforeSet = new Set(before || [])
  const afterSet = new Set(after || [])
  const added = (after || []).filter((x) => !beforeSet.has(x))
  const removed = (before || []).filter((x) => !afterSet.has(x))
  if (added.length === 0 && removed.length === 0) return <span style={{ color: 'var(--portal-text-muted)' }}>no change</span>
  return (
    <span className="jd-tag-list" style={{ display: 'inline-flex' }}>
      {added.map((x, i) => <span className="jd-tag" key={`a${i}`} style={{ background: 'var(--portal-success-bg, #1e4620)' }}>+ {x}</span>)}
      {removed.map((x, i) => <span className="jd-tag" key={`r${i}`} style={{ background: 'var(--portal-danger-bg, #4a1f1f)' }}>− {x}</span>)}
    </span>
  )
}

function CategoryMapDiff({ before, after }) {
  const categories = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
  return (
    <div>
      {[...categories].map((cat) => {
        const b = (before || {})[cat] || []
        const a = (after || {})[cat] || []
        if (JSON.stringify(b) === JSON.stringify(a)) return null
        return (
          <div key={cat} style={{ marginBottom: 8 }}>
            <strong style={{ fontSize: 13 }}>{cat.replace(/_/g, ' ')}</strong>
            <div><StringArrayDiff before={b} after={a} /></div>
          </div>
        )
      })}
    </div>
  )
}

function SectionDiff({ section, before, after }) {
  const schema = SECTION_SCHEMAS[section]
  if (JSON.stringify(before) === JSON.stringify(after)) return null

  return (
    <div className="jd-details" style={{ marginBottom: 14 }}>
      <strong>{schema.label}</strong>
      <div style={{ marginTop: 6 }}>
        {schema.kind === 'text' && <WordDiff before={before} after={after} />}
        {schema.kind === 'object' && Object.keys({ ...before, ...after }).map((f) => {
          const bv = before?.[f]
          const av = after?.[f]
          if (JSON.stringify(bv) === JSON.stringify(av)) return null
          return (
            <div key={f} style={{ marginBottom: 4 }}>
              <em style={{ fontSize: 12 }}>{f}</em>
              <WordDiff before={bv} after={av} />
            </div>
          )
        })}
        {schema.kind === 'stringArray' && <StringArrayDiff before={before} after={after} />}
        {schema.kind === 'categoryMap' && <CategoryMapDiff before={before} after={after} />}
        {schema.kind === 'objectArray' && <ObjectArrayDiff schema={schema} before={before} after={after} />}
      </div>
    </div>
  )
}

// Pure client-side diff between two already-fetched {profile} payloads —
// either two past versions, or a past version vs. the live current profile.
function ProfileDiff({ before, after }) {
  const sectionsWithChanges = SECTION_KEYS.filter((s) => JSON.stringify(before?.[s]) !== JSON.stringify(after?.[s]))

  if (sectionsWithChanges.length === 0) {
    return <p style={{ color: 'var(--portal-text-muted)', fontSize: 13 }}>No differences between these two versions.</p>
  }

  return (
    <div>
      {sectionsWithChanges.map((section) => (
        <SectionDiff key={section} section={section} before={before[section]} after={after[section]} />
      ))}
    </div>
  )
}

export default ProfileDiff
