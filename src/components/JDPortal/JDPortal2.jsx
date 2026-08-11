import React, { useState } from 'react'
import ProfilePicker from './ProfilePicker'
import ResumeUpload from './ResumeUpload'
import JDWizardV3 from './JDWizardV3'
import './JDPortal.css'

// Multi-profile portal page (Phase 2, 11 Aug 2026), mounted at /portal2 —
// parallel to JDPortal.jsx (mounted at /portal, John-only via v2). Reuses
// the same auth gate (see App.jsx) but adds a profile picker and browser
// resume onboarding on top of the same JD-matching wizard shape.
function JDPortal2() {
  const [profileName, setProfileName] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="jd-portal">
      <ProfilePicker key={refreshKey} profileName={profileName} onChange={setProfileName} />

      <ResumeUpload
        onOnboarded={(profile) => {
          setProfileName(profile.name)
          setRefreshKey((k) => k + 1)
        }}
      />

      {profileName ? (
        <JDWizardV3 key={profileName} profileName={profileName} />
      ) : (
        <p style={{ color: 'var(--portal-text-muted)', fontSize: 14, padding: '0 4px' }}>
          Select or onboard a profile above to start a JD run.
        </p>
      )}
    </div>
  )
}

export default JDPortal2
