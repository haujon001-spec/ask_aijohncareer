import React, { useState, useEffect, useCallback } from 'react'
import { fetchProfile, profileExportUrl } from '../../utils/jdApi'
import CollapsibleCard from './CollapsibleCard'

function boldify(text) {
  // Renders **bold** spans from the profile's existing bold-markup convention.
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
  )
}

function TagList({ items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="jd-tag-list">
      {items.map((item, i) => (
        <span className="jd-tag" key={i}>{item}</span>
      ))}
    </div>
  )
}

function ProfileView() {
  const [profile, setProfile] = useState(null)
  const [timestamp, setTimestamp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchProfile()
      setProfile(res.profile)
      setTimestamp(res.timestamp)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <CollapsibleCard title="Profile">
        <p className="portal-loading">Loading profile…</p>
      </CollapsibleCard>
    )
  }

  if (error) {
    return (
      <CollapsibleCard title="Profile">
        <div className="jd-banner jd-banner--error">{error}</div>
      </CollapsibleCard>
    )
  }

  if (!profile) return null

  const m = profile.metadata || {}

  return (
    <>
      <CollapsibleCard
        title="Profile"
        headerExtra={
          <div className="jd-download-links" style={{ margin: 0 }}>
            <a href={profileExportUrl('txt')} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
              Download .txt
            </a>
            <a href={profileExportUrl('docx')} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
              Download .docx
            </a>
          </div>
        }
      >
        <p style={{ color: 'var(--portal-text-muted)', fontSize: 13, marginBottom: 14 }}>
          Read-only view of <code>src/data/john_profile.json</code>, the authoritative source of truth for JD scorecard matching and resume/cover-letter generation.
          {timestamp && <> Last updated {new Date(timestamp).toLocaleString()}.</>}
        </p>

        <h4>{m.name}</h4>
        <p style={{ color: 'var(--portal-text-secondary)', marginTop: 0 }}>{m.title}</p>
        <p style={{ color: 'var(--portal-text-muted)', fontSize: 13 }}>
          {[m.location, m.email, m.phone, m.linkedin].filter(Boolean).join(' · ')}
        </p>

        {profile.summary && (
          <div className="jd-details">
            <strong>Summary</strong>
            <p>{boldify(profile.summary)}</p>
          </div>
        )}
      </CollapsibleCard>

      {Array.isArray(profile.professional_experience) && (
        <CollapsibleCard title={`Professional Experience (${profile.professional_experience.length})`} defaultOpen={false}>
          {profile.professional_experience.map((exp, i) => (
            <div className="jd-history-job" key={i} style={{ marginBottom: 16 }}>
              <div className="jd-history-job-header" style={{ cursor: 'default' }}>
                <span className="jd-history-job-title">{exp.company} — {exp.title}</span>
                <span className="jd-history-job-date">{exp.period}</span>
              </div>
              {exp.scope && <p style={{ color: 'var(--portal-text-muted)', fontSize: 13, margin: '4px 0' }}>{exp.scope}</p>}
              <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                {(exp.highlights || []).map((h, j) => (
                  <li key={j} style={{ marginBottom: 4, fontSize: 13.5 }}>{boldify(h)}</li>
                ))}
              </ul>
            </div>
          ))}
        </CollapsibleCard>
      )}

      {Array.isArray(profile.major_achievements) && (
        <CollapsibleCard title={`Major Achievements (${profile.major_achievements.length})`} defaultOpen={false}>
          {profile.major_achievements.map((a, i) => {
            const extras = Object.entries(a).filter(([k]) => !['achievement', 'company'].includes(k))
            return (
              <div className="jd-details" key={i} style={{ marginBottom: 10 }}>
                <strong>{a.achievement}</strong> <span style={{ color: 'var(--portal-text-muted)' }}>— {a.company}</span>
                {extras.length > 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                    {extras.map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ')}
                  </p>
                )}
              </div>
            )
          })}
        </CollapsibleCard>
      )}

      {profile.core_competencies && (
        <CollapsibleCard title="Core Competencies" defaultOpen={false}>
          {Object.entries(profile.core_competencies).map(([category, items]) => (
            <div key={category} style={{ marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>{category.replace(/_/g, ' ')}</strong>
              <TagList items={Array.isArray(items) ? items : [items]} />
            </div>
          ))}
        </CollapsibleCard>
      )}

      <CollapsibleCard title="Skills, Education & Languages" defaultOpen={false}>
        {Array.isArray(profile.technical_skills) && (
          <div style={{ marginBottom: 14 }}>
            <strong style={{ fontSize: 13 }}>Technical Skills</strong>
            <TagList items={profile.technical_skills} />
          </div>
        )}
        {Array.isArray(profile.soft_skills) && (
          <div style={{ marginBottom: 14 }}>
            <strong style={{ fontSize: 13 }}>Soft Skills</strong>
            <TagList items={profile.soft_skills} />
          </div>
        )}
        {Array.isArray(profile.languages) && profile.languages.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <strong style={{ fontSize: 13 }}>Languages</strong>
            <TagList items={profile.languages.map((l) => (typeof l === 'string' ? l : `${l.language} (${l.proficiency})`))} />
          </div>
        )}
        {Array.isArray(profile.education_certifications) && (
          <div>
            <strong style={{ fontSize: 13 }}>Education & Certifications</strong>
            <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
              {profile.education_certifications.map((e, i) => (
                <li key={i} style={{ marginBottom: 4, fontSize: 13.5 }}>
                  {typeof e === 'string' ? e : [e.credential, e.issuer].filter(Boolean).join(' — ')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CollapsibleCard>

      {Array.isArray(profile.ai_projects) && (
        <CollapsibleCard title={`AI Projects (${profile.ai_projects.length})`} defaultOpen={false}>
          {profile.ai_projects.map((p, i) => (
            <div className="jd-details" key={i} style={{ marginBottom: 12 }}>
              <strong>{p.title}</strong>
              {p.description && <p style={{ margin: '4px 0' }}>{p.description}</p>}
              {p.impact && <p style={{ margin: 0, color: 'var(--portal-text-muted)', fontSize: 13 }}>{p.impact}</p>}
            </div>
          ))}
        </CollapsibleCard>
      )}

      {Array.isArray(profile.linkedin_recommendations) && (
        <CollapsibleCard title={`LinkedIn Recommendations (${profile.linkedin_recommendations.length})`} defaultOpen={false}>
          {profile.linkedin_recommendations.map((r, i) => (
            <div className="jd-details" key={i} style={{ marginBottom: 12 }}>
              <strong>{r.recommender_name}</strong>
              <span style={{ color: 'var(--portal-text-muted)' }}> — {[r.recommender_title, r.recommender_company].filter(Boolean).join(', ')}</span>
              {r.recommendation && <p style={{ margin: '4px 0 0' }}>{r.recommendation}</p>}
            </div>
          ))}
        </CollapsibleCard>
      )}

      {Array.isArray(profile.key_topics_for_qa) && (
        <CollapsibleCard title={`Key Topics for Q&A (${profile.key_topics_for_qa.length})`} defaultOpen={false}>
          <TagList items={profile.key_topics_for_qa} />
        </CollapsibleCard>
      )}
    </>
  )
}

export default ProfileView
