import React from 'react'
import './ModelSelector.css'

function ModelSelector({ selectedModel, onModelChange }) {
  const models = [
    { id: 'deepseek', name: 'Liquid LFM 2.2 6B', icon: '⚡', desc: 'FASTEST (2-7s)' },
    { id: 'nemotron', name: 'DeepSeek R1', icon: '🧠', desc: 'REASONING ENABLED' }
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
