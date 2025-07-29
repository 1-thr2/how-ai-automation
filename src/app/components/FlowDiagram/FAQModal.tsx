import React from 'react';
import styles from './FlowDiagramSection.module.css';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQModalProps {
  faq: FAQItem[];
  onClose: () => void;
}

const FAQModal: React.FC<FAQModalProps> = ({ faq, onClose }) => {
  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles['modal-content']} onClick={e => e.stopPropagation()}>
        <button className={styles['close-btn']} onClick={onClose}>
          ×
        </button>
        <div className={styles['modal-header']}>
          <div className={styles['modal-title']}>❓ 자주 묻는 질문</div>
          <div className={styles['modal-subtitle']}>따라하기만 하면 완성됩니다</div>
        </div>
        <div>
          {faq.map((item, idx) => (
            <div key={idx} className={styles['guide-step']}>
              <div className={styles['guide-content']}>
                <h4>Q. {item.question}</h4>
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
        <div className={styles['guide-content']} style={{ marginTop: '20px', textAlign: 'center' }}>
          💬 더 궁금한 점이 있다면 "GPT와 함께 설계하기"에서 1:1 맞춤 답변을 받아보세요!
        </div>
      </div>
    </div>
  );
};

export default FAQModal;
