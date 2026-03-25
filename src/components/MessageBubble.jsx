import React from 'react'
import './MessageBubble.css'

function MessageBubble({ message }) {
  const isBot = message.sender === 'bot'
  
  // Handle multi-line text
  const renderText = () => {
    const lines = message.text.split('\n')
    return lines.map((line, idx) => (
      <p key={idx} style={{ margin: '0 0 8px 0' }}>
        {line || <br />}
      </p>
    ))
  }

  return (
    <div className={`message-bubble ${message.sender}`}>
      <div className="message-content">
        {renderText()}
        
        {isBot && message.model && message.model !== 'system' && (
          <div className="message-meta">
            <span className={`model-badge ${message.fallbackUsed ? 'fallback' : ''}`}>
              {message.displayModel || message.model}
              {message.fallbackUsed && ' ⚠️'}
            </span>
            {message.latency && <span className="latency">{message.latency}ms</span>}
            {message.cost && <span className="cost">{message.cost}</span>}
          </div>
        )}
        
        {isBot && message.fallbackReason && (
          <div className="fallback-notice">
            <span className="fallback-icon">⚠️</span>
            <span>{message.fallbackReason}</span>
          </div>
        )}

        {isBot && message.reasoning && (
          <div className="reasoning-panel">
            <details>
              <summary>Reasoning</summary>
              <p>{message.reasoning}</p>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageBubble
