import React, { useState } from 'react'
import WizardSteps from './WizardSteps'
import JDUploadForm from './JDUploadForm'
import JDRunStep from './JDRunStep'
import JDReportsStep from './JDReportsStep'

const STEPS = [
  { id: 'configure', label: 'Configure' },
  { id: 'run', label: 'JD Run' },
  { id: 'reports', label: 'Reports' }
]

function JDWizard() {
  const [step, setStep] = useState('configure')
  const [lastUpload, setLastUpload] = useState(null)
  const [runResult, setRunResult] = useState(null)

  return (
    <div className="jd-wizard">
      <WizardSteps steps={STEPS} activeStep={step} onChange={setStep} />

      {step === 'configure' && (
        <JDUploadForm
          onUploaded={(file) => {
            setLastUpload(file)
            setStep('run')
          }}
        />
      )}

      {step === 'run' && (
        <JDRunStep
          initialJdFile={lastUpload?.filename}
          onComplete={(result) => {
            setRunResult(result)
            setStep('reports')
          }}
        />
      )}

      {step === 'reports' && (
        <JDReportsStep result={runResult} onBackToRun={() => setStep('run')} />
      )}
    </div>
  )
}

export default JDWizard
