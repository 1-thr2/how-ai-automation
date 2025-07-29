import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

interface FloatingFAQProps {
  data: FAQItem[];
}

const FloatingFAQ: React.FC<FloatingFAQProps> = ({ data }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#6C5CE7',
          color: '#fff',
          padding: '16px 20px',
          borderRadius: 16,
          fontSize: 14,
          fontWeight: 600,
          boxShadow: '0 8px 32px rgba(108,92,231,0.3)',
          cursor: 'pointer',
          zIndex: 1000,
          opacity: 1,
          transition: 'all 0.4s ease',
        }}
        onClick={() => setOpen(true)}
      >
        ❓ 자주 묻는 질문
      </div>
      {open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 24,
              padding: 40,
              maxWidth: 500,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: '#F8F9FA',
                border: 'none',
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 18,
                color: '#666',
              }}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#333', marginBottom: 8 }}>
                ❓ 자주 묻는 질문
              </div>
            </div>
            <div>
              {Array.isArray(data) && data.length > 0 ? (
                data.map((faq, i) => (
                  <div
                    key={i}
                    style={{ marginBottom: 24, background: '#F8F9FA', borderRadius: 12, padding: 20 }}
                  >
                    <h4 style={{ color: '#333', marginBottom: 12, fontSize: 16 }}>{faq.question}</h4>
                    <p style={{ color: '#666', fontSize: 14, lineHeight: 1.5 }}>{faq.answer}</p>
                  </div>
                ))
              ) : (
                <div style={{ color: '#888', textAlign: 'center', padding: 24 }}>
                  FAQ 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingFAQ;
