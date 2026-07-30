import React, { useState } from 'react'
import TabBar from '../TabBar'
import ProfileView from './ProfileView'
import ProfileEditForm from './ProfileEditForm'
import ProfileUpdateFromResume from './ProfileUpdateFromResume'
import ProfileVersionHistory from './ProfileVersionHistory'

// Thin container resolving the "Profile" tab's coexistence between the
// pre-existing read-only ProfileView (untouched) and the new edit/update/
// version-history features — each rendered as its own sub-tab.
function JDProfile() {
  const [subView, setSubView] = useState('view')

  return (
    <div>
      <TabBar
        tabs={[
          { id: 'view', label: 'View' },
          { id: 'edit', label: 'Edit' },
          { id: 'update', label: 'Update from Resume' },
          { id: 'history', label: 'History' },
        ]}
        activeTab={subView}
        onChange={setSubView}
        className="tab-bar--sub-nested"
      />

      {subView === 'view' && <ProfileView />}
      {subView === 'edit' && <ProfileEditForm />}
      {subView === 'update' && <ProfileUpdateFromResume />}
      {subView === 'history' && <ProfileVersionHistory />}
    </div>
  )
}

export default JDProfile
