import React from 'react'
import './TabBar.css'

function TabBar({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={`tab-bar ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-bar-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default TabBar
