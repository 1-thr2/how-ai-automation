import React from 'react';
import { FlowStep } from '@/lib/types/automation';
import styles from './FlowNodeCard.module.css';

interface FlowNodeCardProps {
  step: FlowStep;
  onClick?: () => void;
}

export const FlowNodeCard: React.FC<FlowNodeCardProps> = ({ step, onClick }) => {
  return (
    <div 
      className={`${styles.flowStep} ${styles['step' + step.id]}`}
      onClick={onClick}
      data-step={step.id}
    >
      <div className={styles.stepNumber}>
        {step.id}
      </div>
      <div className={styles.stepIcon}>{step.icon}</div>
      <div className={styles.stepTitle}>{step.title}</div>
      <div className={styles.stepSubtitle}>{step.subtitle}</div>
      <div className={styles.stepDuration}>{step.duration}</div>
      <div className={styles.stepPreview}>{step.preview}</div>
      <div className={styles.stepTech}>
        {(step.tech ?? []).map((tech, i) => (
          <span key={i} className={styles.techTag}>
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
};
