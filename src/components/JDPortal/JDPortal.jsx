import React, { useState } from 'react'
import TabBar from '../TabBar'
import JDWizard from './JDWizard'
import JDHistoryList from './JDHistoryList'
import JDProfile from './JDProfile'
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

      {view === 'profile' && <JDProfile />}
    </div>
  )
}

export default JDPortal
