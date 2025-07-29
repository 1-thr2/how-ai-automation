import React from 'react';
import { ShareIcon, GPTIcon, SaveIcon } from './icons';

interface FlowStep {
  icon?: string;
  title: string;
  role?: string;
  desc?: string;
  key?: string;
}

interface WowAutomationProps {
  flowDiagram: FlowStep[];
  onShare?: () => void;
  onDesignWithGPT?: () => void;
  onSave?: () => void;
}

const WowAutomation: React.FC<WowAutomationProps> = ({
  flowDiagram,
  onShare,
  onDesignWithGPT,
  onSave,
}) => {
  const handleShare = () => {
    if (onShare) onShare();
  };

  const handleDesignWithGPT = () => {
    if (onDesignWithGPT) onDesignWithGPT();
  };

  const handleSave = () => {
    if (onSave) onSave();
  };

  return (
    <div className="wow-automation">
      <div className="flow-diagram">
        {flowDiagram.map((step, index) => (
          <div key={step.key || index} className="flow-step">
            <div className="step-icon">{step.icon || '✨'}</div>
            <div className="step-content">
              <h3>{step.title}</h3>
              {step.desc && <p>{step.desc}</p>}
              {step.role && <span className="role-badge">{step.role}</span>}
            </div>
            {index < flowDiagram.length - 1 && <div className="flow-arrow">→</div>}
          </div>
        ))}
      </div>

      <div className="automation-actions">
        <button className="action-button" onClick={handleShare}>
          <ShareIcon /> 레시피 공유하기
        </button>
        <button className="action-button" onClick={handleDesignWithGPT}>
          <GPTIcon /> GPT와 같이 설계하기
        </button>
        <button className="action-button" onClick={handleSave}>
          <SaveIcon /> 저장하기
        </button>
      </div>

      <style jsx>{`
        .wow-automation {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          margin: 20px 0;
        }

        .flow-diagram {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          overflow-x: auto;
          padding: 10px;
        }

        .flow-step {
          display: flex;
          align-items: center;
          background: white;
          padding: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          min-width: 200px;
          margin: 0 10px;
        }

        .step-icon {
          font-size: 24px;
          margin-right: 10px;
        }

        .step-content {
          flex: 1;
        }

        .step-content h3 {
          margin: 0;
          font-size: 16px;
          color: #333;
        }

        .step-content p {
          margin: 5px 0 0;
          font-size: 14px;
          color: #666;
        }

        .role-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #e9ecef;
          border-radius: 12px;
          font-size: 12px;
          color: #495057;
          margin-top: 5px;
        }

        .flow-arrow {
          color: #adb5bd;
          margin: 0 10px;
        }

        .automation-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 20px;
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          background: #007bff;
          color: white;
          cursor: pointer;
          transition: background 0.2s;
        }

        .action-button:hover {
          background: #0056b3;
        }
      `}</style>
    </div>
  );
};

export default WowAutomation;
