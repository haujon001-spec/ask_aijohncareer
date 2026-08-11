import React, { useState } from 'react'
import WizardSteps from './WizardSteps'
import JDUploadForm from './JDUploadForm'
import JDRunStepV3 from './JDRunStepV3'
import JDReportsStep from './JDReportsStep'
import { uploadJdV3 } from '../../utils/jdApi'

const STEPS = [
  { id: 'configure', label: 'Configure' },
  { id: 'run', label: 'JD Run' },
  { id: 'reports', label: 'Reports' }
]

// Profile-aware sibling of JDWizard.jsx (Phase 2, 11 Aug 2026) — same
// Configure/Run/Reports flow, scoped to one profile at a time. JDUploadForm
// and JDReportsStep are reused unchanged (profile-agnostic); only the run
// step (JDRunStepV3) and the upload target (uploadJdV3) differ from v2.
function JDWizardV3({ profileName }) {
  const [step, setStep] = useState('configure')
  const [lastUpload, setLastUpload] = useState(null)
  const [runResult, setRunResult] = useState(null)

  return (
    <div className="jd-wizard">
      <WizardSteps steps={STEPS} activeStep={step} onChange={setStep} />

      {step === 'configure' && (
        <JDUploadForm
          uploadFn={uploadJdV3}
          extraParams={{ profileName }}
          onUploaded={(file) => {
            setLastUpload(file)
            setStep('run')
          }}
        />
      )}

      {step === 'run' && (
        <JDRunStepV3
          profileName={profileName}
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

export default JDWizardV3
