import React, { useState } from 'react'
import { proposeProfileUpdate, approveProfileUpdate } from '../../utils/jdApi'
import { SECTION_SCHEMAS } from '../../../shared/profileSchema'
import CollapsibleCard from './CollapsibleCard'

function boldify(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
  )
}

function proposalSummary(item) {
  if (item.operation === 'upsertEntry') {
    return item.entry?.achievement || item.entry?.title || item.entry?.credential || item.entry?.language || JSON.stringify(item.entry)
  }
  return (item.items || []).map((s) => boldify(s))
}

function ProposalCard({ item, checked, onToggle }) {
  const schema = SECTION_SCHEMAS[item.section]
  return (
    <div className="jd-history-job" style={{ marginBottom: 10 }}>
      <div className="jd-history-job-header" style={{ cursor: 'default' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} />
          <span className="jd-history-job-title">{schema.label}</span>
        </label>
        {item.identity && (
          <span className="jd-history-job-date">
            {Object.values(item.identity).filter(Boolean).join(' · ')}
          </span>
        )}
      </div>
      <div className="jd-history-job-body">
        <div style={{ fontSize: 13.5, marginBottom: 6 }}>
          {Array.isArray(proposalSummary(item))
            ? proposalSummary(item).map((s, i) => <div key={i}>{s}</div>)
            : proposalSummary(item)}
        </div>
        <p style={{ margin: '4px 0', fontSize: 12, color: 'var(--portal-text-muted)' }}>
          <em>Grounded in:</em> "{item.groundingQuote}"
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--portal-text-muted)' }}>
          <em>Why:</em> {item.rationale}
        </p>
      </div>
    </div>
  )
}

function ProfileUpdateFromResume() {
  const [sources, setSources] = useState([{ label: 'Resume 1', text: '' }])
  const [llm, setLlm] = useState('sonnet')
  const [proposing, setProposing] = useState(false)
  const [proposeError, setProposeError] = useState(null)

  const [proposalId, setProposalId] = useState(null)
  const [items, setItems] = useState([])
  const [rejected, setRejected] = useState([])
  const [checkedIds, setCheckedIds] = useState(new Set())

  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState(null)
  const [approvedMessage, setApprovedMessage] = useState(null)

  function updateSource(i, field, value) {
    setSources((list) => list.map((s, j) => (j === i ? { ...s, [field]: value } : s)))
  }
  function addSource() {
    setSources((list) => [...list, { label: `Resume ${list.length + 1}`, text: '' }])
  }
  function removeSource(i) {
    setSources((list) => list.filter((_, j) => j !== i))
  }

  async function handlePropose() {
    setProposing(true)
    setProposeError(null)
    setApprovedMessage(null)
    setItems([])
    setRejected([])
    setProposalId(null)
    try {
      const validSources = sources.filter((s) => s.text.trim())
      if (validSources.length === 0) {
        setProposeError('Paste at least one resume source.')
        return
      }
      const res = await proposeProfileUpdate({ sources: validSources, llm })
      setProposalId(res.proposalId)
      setItems(res.items)
      setRejected(res.rejected)
      setCheckedIds(new Set(res.items.map((i) => i.id)))
    } catch (err) {
      setProposeError(err.message)
    } finally {
      setProposing(false)
    }
  }

  function toggleItem(id) {
    setCheckedIds((set) => {
      const next = new Set(set)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleApprove() {
    setApproving(true)
    setApproveError(null)
    try {
      const approvedItemIds = [...checkedIds]
      const res = await approveProfileUpdate({ proposalId, approvedItemIds })
      setApprovedMessage(`Saved ${approvedItemIds.length} item(s) (backup: ${res.backup}).`)
      setItems([])
      setRejected([])
      setProposalId(null)
    } catch (err) {
      setApproveError(err.message)
    } finally {
      setApproving(false)
    }
  }

  function handleDiscard() {
    setItems([])
    setRejected([])
    setProposalId(null)
    setApprovedMessage(null)
  }

  return (
    <>
      <CollapsibleCard title="Update from Resume">
        <p style={{ color: 'var(--portal-text-muted)', fontSize: 13 }}>
          Paste resume text below. An LLM proposes new facts not already in the profile — nothing is written
          until you review and approve.
        </p>

        {sources.map((s, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div className="jd-field">
              <label>Source label</label>
              <input type="text" value={s.label} onChange={(e) => updateSource(i, 'label', e.target.value)} />
            </div>
            <div className="jd-field">
              <label>Resume text</label>
              <textarea rows={6} value={s.text} onChange={(e) => updateSource(i, 'text', e.target.value)} />
            </div>
            {sources.length > 1 && (
              <button type="button" className="jd-button jd-button-secondary" onClick={() => removeSource(i)}>
                Remove this source
              </button>
            )}
          </div>
        ))}
        <button type="button" className="jd-button jd-button-secondary" onClick={addSource}>+ Add another source</button>

        <div className="jd-field" style={{ marginTop: 14, maxWidth: 240 }}>
          <label>LLM</label>
          <select value={llm} onChange={(e) => setLlm(e.target.value)}>
            <option value="sonnet">Sonnet</option>
            <option value="deepseek">DeepSeek</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>

        <div style={{ marginTop: 14 }}>
          <button type="button" className="jd-button" disabled={proposing} onClick={handlePropose}>
            {proposing ? 'Proposing…' : 'Propose Changes'}
          </button>
        </div>

        {proposeError && <div className="jd-banner jd-banner--error" style={{ marginTop: 10 }}>{proposeError}</div>}
        {approvedMessage && <div className="jd-banner jd-banner--success" style={{ marginTop: 10 }}>{approvedMessage}</div>}
      </CollapsibleCard>

      {items.length > 0 && (
        <CollapsibleCard title={`Proposed Changes (${items.length})`}>
          {items.map((item) => (
            <ProposalCard key={item.id} item={item} checked={checkedIds.has(item.id)} onToggle={toggleItem} />
          ))}

          {approveError && <div className="jd-banner jd-banner--error">{approveError}</div>}

          <div className="jd-banner jd-banner--warning" style={{ marginTop: 10 }}>
            Approving writes the checked items to <code>john_profile.json</code> (a backup is taken automatically first).
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button type="button" className="jd-button" disabled={approving || checkedIds.size === 0} onClick={handleApprove}>
                {approving ? 'Saving…' : `Approve Selected (${checkedIds.size})`}
              </button>
              <button type="button" className="jd-button jd-button-secondary" disabled={approving} onClick={handleDiscard}>
                Discard
              </button>
            </div>
          </div>
        </CollapsibleCard>
      )}

      {rejected.length > 0 && (
        <CollapsibleCard title={`Rejected (${rejected.length})`} defaultOpen={false}>
          {rejected.map((item, i) => (
            <div className="jd-details" key={i} style={{ marginBottom: 10 }}>
              <strong>{SECTION_SCHEMAS[item.section]?.label || item.section}</strong>
              <p style={{ margin: '4px 0', fontSize: 12.5, color: 'var(--portal-text-muted)' }}>
                {(item.reasons || []).join('; ')}
              </p>
            </div>
          ))}
        </CollapsibleCard>
      )}
    </>
  )
}

export default ProfileUpdateFromResume
