import React, { useState } from 'react'
import TabBar from '../TabBar'
import JDWizard from './JDWizard'
import JDHistoryList from './JDHistoryList'
import ProfileView from './ProfileView'
import ApiKeySettings from './ApiKeySettings'
import './JDPortal.css'

function JDPortal() {
  const [view, setView] = useState('new')

  return (
    <div className="jd-portal">
      <TabBar
        tabs={[
          { id: 'new', label: 'New JD Run' },
          { id: 'history', label: 'History' },
          { id: 'profile', label: 'Profile' }
        ]}
        activeTab={view}
        onChange={setView}
        className="tab-bar--sub"
      />

      <ApiKeySettings />

      {view === 'new' && <JDWizard />}

      {view === 'history' && <JDHistoryList />}

      {view === 'profile' && <ProfileView />}

      {view === 'new' && (
        <button
          className="profile-update-stub"
          disabled
          title="Coming in Phase 3 (NLP profile updates)"
        >
          🔒 Update Profile from JD (Coming Soon)
        </button>
      )}
    </div>
  )
}

export default JDPortal
