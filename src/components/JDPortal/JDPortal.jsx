import React, { useState } from 'react'
import TabBar from '../TabBar'
import JDUploadForm from './JDUploadForm'
import JDRunPanel from './JDRunPanel'
import JDHistoryList from './JDHistoryList'
import ApiKeySettings from './ApiKeySettings'
import './JDPortal.css'

function JDPortal() {
  const [view, setView] = useState('new')
  const [lastUpload, setLastUpload] = useState(null)

  return (
    <div className="jd-portal">
      <TabBar
        tabs={[
          { id: 'new', label: 'New JD Run' },
          { id: 'history', label: 'History' }
        ]}
        activeTab={view}
        onChange={setView}
        className="tab-bar--sub"
      />

      <ApiKeySettings />

      {view === 'new' && (
        <>
          <JDUploadForm onUploaded={setLastUpload} />
          <JDRunPanel initialJdFile={lastUpload?.filename} />
        </>
      )}

      {view === 'history' && <JDHistoryList />}

      <button
        className="profile-update-stub"
        disabled
        title="Coming in Phase 3 (NLP profile updates)"
      >
        🔒 Update Profile from JD (Coming Soon)
      </button>
    </div>
  )
}

export default JDPortal
