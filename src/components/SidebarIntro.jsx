import React from 'react'
import './SidebarIntro.css'

function SidebarIntro({ onQuickPrompt }) {
  const [selectedPrompt, setSelectedPrompt] = React.useState('')
  
  const quickPrompts = [
    "Tell me about John's leadership?",
    "How much experience does John have with IT infrastructure?",
    "What technical and soft skills does John have?",
    "What is John's experience with cloud computing?",
    "What are John's key strengths?",
    "What are John's key achievements?",
    "What's John's career background?",
    "What is John good at?",
    "What new technologies has John been exploring?",
    "What do people say about John based on his LinkedIn recommendations?",
    "Tell me about John's AI work?",
    "What cost savings has John achieved?",
    "What innovations has John achieved?",
    "How much cybersecurity experience does John have?"
  ]

  const [isOpen, setIsOpen] = React.useState(false)

  const handleDropdownChange = (prompt) => {
    setSelectedPrompt(prompt)
    setIsOpen(false)
    if (onQuickPrompt) {
      onQuickPrompt(prompt)
    }
  }

  return (
    <div className="quick-questions-section">
      <label className="quick-label">✨ Quick Questions</label>
      
      <div className="dropdown-wrapper">
        <button 
          className="dropdown-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="dropdown-text">
            {selectedPrompt || "Choose a question..."}
          </span>
          <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div className="dropdown-menu">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                className="dropdown-item"
                onClick={() => handleDropdownChange(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SidebarIntro
