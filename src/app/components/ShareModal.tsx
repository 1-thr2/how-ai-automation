'use client';

import { useState, useEffect } from 'react';

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

  const shareToApp = (app: string) => {
    if (!shareUrl || shareUrl.includes('오류')) return;

    const shareText = `${title} - 쉽고 실용적인 자동화 가이드\n\n${userInput}`;
    let shareLink = '';

    switch (app) {
      case 'slack':
        shareLink = `https://slack.com/intl/en-kr/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      case 'kakao':
        shareLink = `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400');
      const appNames = {
        slack: 'Slack',
        kakao: '카카오톡',
        linkedin: 'LinkedIn',
        twitter: '트위터',
      };
      showToast(`✨ ${appNames[app as keyof typeof appNames]}으로 공유되었습니다!`);

      // 1.5초 후 모달 닫기
      setTimeout(() => onClose(), 1500);
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

            {!isGenerating && !shareUrl.includes('오류') && (
              <div className="apps-section">
                <div className="section-title">앱으로 공유하기</div>
                <div className="apps-grid">
                  <div className="app-item" onClick={() => shareToApp('slack')}>
                    <div className="app-icon slack">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                      </svg>
                    </div>
                    <div className="app-name">Slack</div>
                  </div>
                  <div className="app-item" onClick={() => shareToApp('kakao')}>
                    <div className="app-icon kakao">💬</div>
                    <div className="app-name">카카오톡</div>
                  </div>
                  <div className="app-item" onClick={() => shareToApp('linkedin')}>
                    <div className="app-icon linkedin">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </div>
                    <div className="app-name">LinkedIn</div>
                  </div>
                  <div className="app-item" onClick={() => shareToApp('twitter')}>
                    <div className="app-icon twitter">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                      </svg>
                    </div>
                    <div className="app-name">트위터</div>
                  </div>
                </div>
              </div>
            )}
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

        .apps-section {
          margin-top: 8px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #212529;
          margin-bottom: 20px;
        }

        .apps-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .app-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 20px 16px;
          border-radius: 16px;
          border: 1px solid #f1f3f5;
        }

        .app-item:hover {
          background: #f8f9fa;
          transform: translateY(-2px);
          border-color: #e9ecef;
        }

        .app-icon {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }

        .app-item:hover .app-icon {
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          transform: scale(1.05);
        }

        .app-name {
          font-size: 14px;
          color: #495057;
          font-weight: 600;
          text-align: center;
        }

        /* 앱별 색상 */
        .slack {
          background: #4a154b;
          color: white;
        }
        .kakao {
          background: #fee500;
          color: #3c1e1e;
        }
        .linkedin {
          background: #0a66c2;
          color: white;
        }
        .twitter {
          background: #1da1f2;
          color: white;
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

          .apps-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          .app-icon {
            width: 56px;
            height: 56px;
            font-size: 24px;
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
