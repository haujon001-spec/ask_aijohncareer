import React from 'react'
import './ModelSelector.css'

function ModelSelector({ selectedModel, onModelChange }) {
  const models = [
    { id: 'deepseek', name: 'Mistral 7B Instruct', icon: '⚡', desc: 'FASTEST' },
    { id: 'nemotron', name: 'DeepSeek R1', icon: '🧠', desc: 'BEST REASONING' }
  ]

  return (
    <div className="model-selector">
      <label>Select Model</label>
      <div className="models-grid">
        {models.map((model) => (
          <button
            key={model.id}
            className={`model-button ${selectedModel === model.id ? 'active' : ''}`}
            onClick={() => onModelChange(model.id)}
          >
            <span className="model-icon">{model.icon}</span>
            <span className="model-name">{model.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ModelSelector
