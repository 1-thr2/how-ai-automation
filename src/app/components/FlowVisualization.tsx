import React from 'react';

interface Step {
  key: string;
  title: string;
  iconUrl?: string;
  color?: string;
  role?: string;
}

interface FlowVisualizationProps {
  steps: Step[];
  activeStep?: number | null;
  onStepClick?: (idx: number) => void;
}

export default function FlowVisualization({
  steps,
  activeStep,
  onStepClick,
}: FlowVisualizationProps) {
  if (!steps.length) return null;

  return (
    <div
      className="flex items-center space-x-8 overflow-x-auto py-6 px-2 relative"
      style={{ minHeight: 160 }}
    >
      {steps.map((step, idx) => (
        <React.Fragment key={step.key}>
          <div
            className={`flex flex-col items-center cursor-pointer group transition-transform ${activeStep === idx ? 'scale-110 z-10' : ''}`}
            onClick={() => onStepClick?.(idx)}
          >
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-4 transition-all
                ${activeStep === idx ? 'border-indigo-500 bg-white' : 'border-gray-200 bg-gray-50'}
              `}
            >
              {step.iconUrl ? (
                <img src={step.iconUrl} alt={step.title} className="w-10 h-10" />
              ) : (
                <span className="text-2xl font-bold text-gray-500">{idx + 1}</span>
              )}
            </div>
            <div className="mt-2 text-center">
              <div className="font-semibold text-gray-800">{step.title}</div>
              {step.role && <div className="text-xs text-gray-500">{step.role}</div>}
            </div>
          </div>
          {/* 연결선 */}
          {idx < steps.length - 1 && (
            <svg width="60" height="24" className="mx-2" style={{ minWidth: 60 }}>
              <line
                x1="0"
                y1="12"
                x2="60"
                y2="12"
                stroke="#a78bfa"
                strokeWidth="3"
                strokeDasharray="8,6"
              />
              <polygon points="60,12 54,8 54,16" fill="#a78bfa" />
            </svg>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
