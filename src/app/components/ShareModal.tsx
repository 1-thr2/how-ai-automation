'use client';

import { useState, useEffect, useCallback } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  userInput: string;
  cardData: any[];
  result: any;
}

export default function ShareModal({
  isOpen,
  onClose,
  title,
  userInput,
  cardData,
  result,
}: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const generateShareLink = useCallback(async () => {
    setIsGenerating(true);

    try {
      console.log('📤 [Share] 공유 링크 생성 시작...');

      // 안전한 데이터 추출
      const safeUserInput = userInput || result?.context?.userInput || result?.userInput || '';
      const safeFollowupAnswers = result?.context?.followupAnswers || result?.followupAnswers || {};
      
      console.log('📊 [Share] 데이터 확인:', {
        userInput: safeUserInput,
        followupAnswers: safeFollowupAnswers,
        cardData: cardData?.length || 0
      });

      // API가 기대하는 구조로 데이터 정리
      const automationData = {
        user_input: safeUserInput,
        followup_answers: safeFollowupAnswers,
        generated_cards: cardData || [],
        user_session_id: `session_${Date.now()}`,
        processing_time_ms: 0,
        success: true,
      };

      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          automationData: automationData,
          // requestId는 없으므로 새로 생성됨
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [Share] API 응답 오류:', errorText);
        throw new Error(`공유 링크 생성 실패: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('📥 [Share] API 응답:', responseData);
      
      if (responseData.error) {
        throw new Error(responseData.error);
      }

      const generatedUrl = `${window.location.origin}/s/${responseData.id}`;
      setShareUrl(generatedUrl);

      console.log('✅ [Share] 공유 링크 생성 완료:', generatedUrl);
    } catch (error: any) {
      console.error('❌ [Share] 공유 링크 생성 실패:', error);
      setShareUrl('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  }, [userInput, result, cardData]);

  // 🔗 공유 링크 생성
  useEffect(() => {
    if (isOpen && !shareUrl) {
      generateShareLink();
    }
  }, [isOpen, shareUrl, generateShareLink]);

  const copyToClipboard = async () => {
    if (!shareUrl || shareUrl.includes('오류')) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      showToast('📋 링크가 클립보드에 복사되었습니다!');
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      showToast('복사에 실패했습니다 😅', 'error');
    }
  };



  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // 간단한 토스트 구현 (react-hot-toast 사용 가능)
    const toast = document.createElement('div');
    toast.className = `share-toast ${type}`;
    toast.innerHTML = `
      <div class="progress-bar"></div>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="share-overlay active" onClick={handleOverlayClick}>
        <div className="share-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{title}</div>
            <div className="modal-subtitle">
              <div
                className={`status-indicator ${isGenerating ? 'generating' : 'completed'}`}
              ></div>
              {isGenerating ? '공유 링크 생성 중...' : '공유 링크가 생성되었습니다'}
            </div>
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="modal-content">
            <div className="share-link">
              <div className="link-label">공유 링크</div>
              <div className="link-container">
                <div className="link-url">{isGenerating ? '링크 생성 중...' : shareUrl}</div>
                <button
                  className={`copy-btn ${copySuccess ? 'copied' : ''}`}
                  onClick={copyToClipboard}
                  disabled={isGenerating || shareUrl.includes('오류')}
                >
                  <span>📋</span>
                  <span className="copy-text">{copySuccess ? '완료!' : '복사'}</span>
                </button>
              </div>
            </div>


          </div>
        </div>
      </div>

      <style jsx>{`
        /* 공유 모달 CSS */
        .share-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .share-overlay.active {
          opacity: 1;
          visibility: visible;
        }

        .share-modal {
          background: white;
          border-radius: 20px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          transform: scale(0.9) translateY(20px);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .share-overlay.active .share-modal {
          transform: scale(1) translateY(0);
        }

        .modal-header {
          padding: 32px 32px 24px;
          border-bottom: 1px solid #f1f3f5;
          position: relative;
        }

        .modal-title {
          font-size: 24px;
          font-weight: 700;
          color: #212529;
          margin-bottom: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .modal-subtitle {
          font-size: 16px;
          color: #6c757d;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
        }

        .status-indicator.generating {
          background: #f59e0b;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .close-btn {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 40px;
          height: 40px;
          border: none;
          background: #f8f9fa;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #6c757d;
          font-size: 20px;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: #e9ecef;
          color: #495057;
        }

        .modal-content {
          padding: 32px;
        }

        .share-link {
          background: #f8f9fa;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
          border: 1px solid #e9ecef;
        }

        .link-label {
          font-size: 14px;
          color: #6c757d;
          font-weight: 600;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .link-container {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #e9ecef;
        }

        .link-url {
          flex: 1;
          font-size: 14px;
          color: #495057;
          font-family: 'SF Mono', Monaco, monospace;
          word-break: break-all;
          line-height: 1.4;
        }

        .copy-btn {
          background: #8b5cf6;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .copy-btn:hover:not(:disabled) {
          background: #7c3aed;
          transform: translateY(-1px);
        }

        .copy-btn.copied {
          background: #10b981;
        }

        .copy-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }



        /* 토스트 알림 */
        .share-toast {
          position: fixed;
          top: 32px;
          right: 32px;
          background: rgba(16, 185, 129, 0.95);
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          transform: translateX(400px);
          opacity: 0;
          transition: all 0.3s ease;
          z-index: 10000;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .share-toast.show {
          transform: translateX(0);
          opacity: 1;
        }

        .share-toast.error {
          background: rgba(239, 68, 68, 0.95);
        }

        .progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 0 0 12px 12px;
          animation: progress 3s linear;
        }

        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        /* 반응형 */
        @media (max-width: 768px) {
          .modal-content {
            padding: 24px;
          }

          .modal-header {
            padding: 24px 24px 20px;
          }



          .share-toast {
            top: 20px;
            right: 20px;
            left: 20px;
            transform: translateY(-80px);
          }

          .share-toast.show {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
