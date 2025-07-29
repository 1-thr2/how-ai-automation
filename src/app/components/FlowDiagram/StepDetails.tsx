import React from 'react';
import styles from './FlowDiagramSection.module.css';

interface StepGuide {
  number: number;
  title: string;
  description: string;
}

interface StepDetailsProps {
  step: {
    title: string;
    subtitle: string;
    guide: {
      steps: StepGuide[];
      code?: string;
    };
    duration?: string;
  };
  onClose: () => void;
}

const StepDetails: React.FC<StepDetailsProps> = ({ step, onClose }) => {
  console.log('[StepDetails] step 데이터:', step);
  if (!step || !step.guide || !Array.isArray(step.guide.steps)) {
    return null;
  }

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles['modal-content']} onClick={e => e.stopPropagation()}>
        <button className={styles['close-btn']} onClick={onClose}>
          ×
        </button>
        <div className={styles['modal-header']}>
          <div className={styles['modal-title']}>{step.title}</div>
          <div className={styles['modal-subtitle']}>{step.subtitle}</div>
        </div>
        <div>
          {step.guide.steps.map((g, idx) => (
            <div key={idx} className={styles['guide-step']}>
              <div className={styles['guide-number']}>{g.number}</div>
              <div className={styles['guide-content']}>
                <h4>{g.title}</h4>
                <p>{g.description}</p>
              </div>
            </div>
          ))}
          {step.guide.code && (
            <div className={styles['code-showcase']}>
              <button
                className={styles['copy-code']}
                onClick={() => navigator.clipboard.writeText(step.guide.code || '')}
              >
                복사
              </button>
              <pre>
                <code>{step.guide.code}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepDetails;
