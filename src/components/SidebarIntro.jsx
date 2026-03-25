import React from 'react'
import './SidebarIntro.css'

function SidebarIntro({ onQuickPrompt }) {
  const quickPrompts = [
    "Tell me about John's AI work",
    "How much did John save in costs?",
    "What's John's leadership style?",
    "Explain John's VDI expertise",
    "What are John's key achievements?",
    "Tell me about John's technical expertise",
    "What's John's career background?"
  ]

  const handleQuickPrompt = (prompt) => {
    if (onQuickPrompt) {
      onQuickPrompt(prompt)
    }
  }

  return (
    <div className="sidebar-intro">
      <h1>🤖 John's Career Copilot</h1>
      <p>Ask anything about John Hau's professional experience, AI projects, and leadership achievements.</p>
      
      <div className="quick-prompts">
        <p className="quick-label">✨ Quick Questions:</p>
        {quickPrompts.map((prompt, idx) => (
          <button key={idx} className="quick-prompt" onClick={() => handleQuickPrompt(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <a href="https://linkedin.com/in/johnhau" target="_blank" rel="noopener noreferrer">
          💼 LinkedIn
        </a>
        <a href="mailto:haujon001@gmail.com">
          📧 Email
        </a>
      </div>
    </div>
  )
}

export default SidebarIntro
