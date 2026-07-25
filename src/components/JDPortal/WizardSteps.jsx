import React from 'react'
import './WizardSteps.css'

function WizardSteps({ steps, activeStep, onChange }) {
  return (
    <div className="wizard-steps">
      {steps.map((s, i) => (
        <button
          key={s.id}
          type="button"
          className={`wizard-step${activeStep === s.id ? ' wizard-step--active' : ''}`}
          onClick={() => onChange(s.id)}
        >
          <span className="wizard-step-num">{i + 1}</span>
          <span className="wizard-step-label">{s.label}</span>
        </button>
      ))}
    </div>
  )
}

export default WizardSteps
