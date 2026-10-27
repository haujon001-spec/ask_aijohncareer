import React, { useState, useEffect } from 'react'
import TabBar from '../TabBar'
import JDWizard from './JDWizard'
import JDHistoryList from './JDHistoryList'
import JDProfile from './JDProfile'
import SyncPanel from './SyncPanel'
import ApiKeySettings from './ApiKeySettings'
import { fetchSyncStatus } from '../../utils/jdApi'
import './JDPortal.css'

function JDPortal() {
  const [view, setView] = useState('new')
  // The Sync tab only exists on the laptop: the production server reports
  // enabled:false (it has no ssh key, by design).
  const [syncEnabled, setSyncEnabled] = useState(false)

  useEffect(() => {
    fetchSyncStatus()
      .then((s) => setSyncEnabled(!!s.enabled))
      .catch(() => setSyncEnabled(false))
  }, [])

  return (
    <div className="jd-portal">
      <TabBar
        tabs={[
          { id: 'new', label: 'New JD Run' },
          { id: 'history', label: 'History' },
          { id: 'profile', label: 'Profile' },
          ...(syncEnabled ? [{ id: 'sync', label: 'Sync' }] : [])
        ]}
        activeTab={view}
        onChange={setView}
        className="tab-bar--sub"
      />

      <ApiKeySettings />

      {view === 'new' && <JDWizard />}

      {view === 'history' && <JDHistoryList />}

      {view === 'profile' && <JDProfile />}

      {view === 'sync' && syncEnabled && <SyncPanel />}
    </div>
  )
}

export default JDPortal
