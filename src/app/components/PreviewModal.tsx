import React from 'react';

interface PreviewModalProps {
  title: string;
  icon: string;
  onClose: () => void;
  children: React.ReactNode;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ title, icon, onClose, children }) => {
  return (
    <div className="result-modal" onClick={onClose}>
      <div className="result-modal-content" onClick={e => e.stopPropagation()}>
        <button className="result-close-btn" onClick={onClose}>×</button>
        <div className="result-modal-header">
          <div className="result-modal-title">{icon} {title}</div>
          <div className="result-modal-subtitle">미리보기</div>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal; 