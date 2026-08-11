import React, { useEffect, useState, useCallback } from 'react'
import { fetchProfiles } from '../../utils/jdApi'
import CollapsibleCard from './CollapsibleCard'

const LAST_PROFILE_KEY = 'jdPortal2.lastProfile'

// Profile picker for /portal2 (Phase 2, 11 Aug 2026) — lets the logged-in
// operator choose which onboarded profile (src/data/<Name>/profile.json) to
// run the v3 JD-matching pipeline against. Not per-person login — reuses the
// same single shared auth gate as /portal, per the "operator manages
// multiple profiles" decision.
function ProfilePicker({ profileName, onChange }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchProfiles()
      .then((res) => {
        setProfiles(res.profiles || [])
        if (!profileName) {
          const last = localStorage.getItem(LAST_PROFILE_KEY)
          const preferred = res.profiles.find((p) => p.name === last) || res.profiles[0]
          if (preferred) onChange(preferred.name)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const handleChange = (name) => {
    onChange(name)
    try {
      localStorage.setItem(LAST_PROFILE_KEY, name)
    } catch {
      // localStorage unavailable — selection just won't be remembered next visit
    }
  }

  return (
    <CollapsibleCard title="Profile" defaultOpen={!profileName}>
      {error && <div className="jd-banner jd-banner--error">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--portal-text-muted)', fontSize: 14 }}>Loading profiles…</p>
      ) : profiles.length === 0 ? (
        <p style={{ color: 'var(--portal-text-muted)', fontSize: 14 }}>
          No profiles onboarded yet — use "Onboard a New Profile" below to create one from a resume.
        </p>
      ) : (
        <div className="jd-field">
          <label htmlFor="profile-picker-select">Active profile</label>
          <select
            id="profile-picker-select"
            value={profileName || ''}
            onChange={(e) => handleChange(e.target.value)}
          >
            <option value="" disabled>Select a profile…</option>
            {profiles.map((p) => (
              <option key={p.name} value={p.name}>{p.displayName}</option>
            ))}
          </select>
        </div>
      )}

      <button type="button" className="jd-button jd-button-secondary" onClick={reload} disabled={loading}>
        Refresh list
      </button>
    </CollapsibleCard>
  )
}

export default ProfilePicker
