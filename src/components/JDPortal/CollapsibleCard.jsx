import React, { useState } from 'react'

function CollapsibleCard({ title, defaultOpen = true, headerExtra, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="jd-portal-card">
      <div
        className={`jd-collapsible-header${open ? '' : ' jd-collapsible-header--closed'}`}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((o) => !o)
          }
        }}
      >
        <h3>{title}</h3>
        <div className="jd-collapsible-header-right">
          {headerExtra && (
            <span onClick={(e) => e.stopPropagation()}>{headerExtra}</span>
          )}
          <span className={`jd-history-chevron${open ? ' jd-history-chevron--open' : ''}`}>⌄</span>
        </div>
      </div>

      {open && <div className="jd-collapsible-body">{children}</div>}
    </div>
  )
}

export default CollapsibleCard
