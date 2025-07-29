import React, { useState } from 'react';
import { FlowStep } from '@/types/automation';

interface FlowDiagramSectionProps {
  steps: FlowStep[];
  onStepClick?: (step: FlowStep) => void;
}

const FlowDiagramSection: React.FC<FlowDiagramSectionProps> = ({ steps, onStepClick }) => {
  const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);

  const handleStepClick = (step: FlowStep) => {
    setSelectedStep(step);
    onStepClick?.(step);
  };

  return (
    <div className="flow-container">
      <div className="flow-steps">
        {steps.map((step, index) => (
          <div
            key={step.id || index}
            className="flow-step"
            onClick={() => handleStepClick(step)}
          >
            <div className="step-number">{index + 1}</div>
            <div className="step-icon">{step.icon || '✨'}</div>
            <div className="step-title">{step.title}</div>
            <div className="step-subtitle">{step.role || ''}</div>
            {step.preview && (
              <div className="step-preview">{step.preview}</div>
            )}
          </div>
        ))}
      </div>
      
      {selectedStep && (
        <div className="step-details">
          <h3>{selectedStep.title}</h3>
          {selectedStep.guide && <div className="guide">{selectedStep.guide}</div>}
          {selectedStep.code && <div className="code">{selectedStep.code}</div>}
          {selectedStep.tip && <div className="tip">{selectedStep.tip}</div>}
        </div>
      )}
    </div>
  );
};

export default FlowDiagramSection;
