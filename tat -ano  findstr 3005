'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ShareModal from './ShareModal';
import FlowDiagramSection from './FlowDiagramSection';
import WowCardRenderer from './WowCardRenderer';

interface WowAutomationResultProps {
  result: {
    context: { userInput: string; followupAnswers?: any };
    cards: any[];
    error?: string;
    fallbackExample?: string;
    followupQuestions?: string[];
    raw?: any;
  };
  title?: string;
  cards?: any[]; // 공유 페이지에서 직접 전달받는 경우
  isSharedView?: boolean; // 공유 뷰 여부
}

export default function WowAutomationResult({
  result,
  title,
  cards,
  isSharedView = false,
}: WowAutomationResultProps) {
  // 카드 데이터는 직접 전달받은 것 우선, 없으면 result에서 사용
  const cardData = cards || result.cards;
  const [showFAQ, setShowFAQ] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const router = useRouter();

  console.log('🎨 WowAutomationResult - 받은 카드들:', cardData);
  console.log('🔍 각 카드 상세 구조:');
  cardData.forEach((card: any, index: number) => {
    console.log(`${index + 1}. ${card.type}:`, JSON.stringify(card, null, 2));
  });

  // 카드 타입별 분류
  const flowCard = cardData.find((c: any) => c.type === 'flow');
  const faqCard = cardData.find((c: any) => c.type === 'faq');
  const shareCard = cardData.find((c: any) => c.type === 'share');
  const expansionCard = cardData.find((c: any) => c.type === 'expansion');

  // 플로우 단계 처리
  const getStepIcon = (index: number, title: string) => {
    // 제목 기반 아이콘 자동 선택
    const titleLower = title.toLowerCase();
    if (titleLower.includes('로그인') || titleLower.includes('계정') || titleLower.includes('가입'))
      return '🔐';
    if (titleLower.includes('연결') || titleLower.includes('연동') || titleLower.includes('api'))
      return '🔗';
    if (titleLower.includes('데이터') || titleLower.includes('수집') || titleLower.includes('입력'))
      return '📊';
    if (titleLower.includes('설정') || titleLower.includes('구성') || titleLower.includes('설치'))
      return '⚙️';
    if (titleLower.includes('전송') || titleLower.includes('알림') || titleLower.includes('메시지'))
      return '📤';
    if (
      titleLower.includes('분석') ||
      titleLower.includes('리포트') ||
      titleLower.includes('보고서')
    )
      return '📈';
    if (titleLower.includes('테스트') || titleLower.includes('확인') || titleLower.includes('검증'))
      return '✅';

    // 순서 기반 기본 아이콘
    const defaultIcons = ['🚀', '⚡', '🎯', '🔥', '✨', '💡'];
    return defaultIcons[index] || defaultIcons[index % defaultIcons.length];
  };

  const processedFlowSteps =
    flowCard?.steps?.map((step: any, index: number) => {
      // 🔍 디버깅: 각 단계의 실제 데이터 확인
      console.log(`🔍 [Step ${index + 1}] 원본 데이터:`, step);
      console.log(`🔍 [Step ${index + 1}] 타입:`, typeof step);

      // 🔧 데이터 타입에 따라 처리
      if (typeof step === 'string') {
        // 문자열인 경우: AI가 문자열 배열로 생성한 경우
        return {
          id: String(index + 1),
          icon: getStepIcon(index, step),
          title: step.replace(/^\d+\.\s*/, ''), // "1. " 제거
          subtitle: '',
          duration: '5분',
          preview: '',
          techTags: [],
        };
      } else {
        // 객체인 경우: 기존 로직 유지
        return {
          id: String(step.id || index + 1),
          icon: step.icon || getStepIcon(index, step.title || ''),
          title: step.title ? step.title.replace(/^\d+\.\s*/, '') : `단계 ${index + 1}`,
          subtitle: step.subtitle || '',
          duration: step.duration || step.timing || '5분',
          preview: step.preview || step.userValue || '',
          techTags: step.tech || step.techTags || [],
        };
      }
    }) || [];

  // 🔍 디버깅: 데이터 구조 확인
  console.log('🔍 [UI Debug] cardData:', cardData);
  console.log('🔍 [UI Debug] flowCard:', flowCard);
  console.log('🔍 [UI Debug] processedFlowSteps:', processedFlowSteps);

  const handleNewRecipe = () => {
    router.push('/');
  };

  // 공유하기 핸들러 - 새 모달 방식
  const handleShare = () => {
    setShowShareModal(true);
  };

  // URL 추출 및 클릭 처리 함수
  const extractAndHandleUrl = (text: string) => {
    const urlMatch = text.match(/(https?:\/\/[^\s\)]+)/);
    if (urlMatch) {
      const url = urlMatch[1];
      // 새 창에서 열기
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // 텍스트에서 URL을 감지하여 클릭 가능한 요소로 렌더링
  const renderTextWithClickableUrl = (text: string, index: number) => {
    const urlMatch = text.match(/(https?:\/\/[^\s\)]+)/);
    if (urlMatch) {
      const url = urlMatch[1];
      const beforeUrl = text.substring(0, urlMatch.index);
      const afterUrl = text.substring(urlMatch.index! + url.length);

      return (
        <li key={index} className="clickable-item" onClick={() => extractAndHandleUrl(text)}>
          {beforeUrl}
          <span style={{ color: '#6C5CE7', textDecoration: 'underline', fontWeight: '500' }}>
            {url}
          </span>
          {afterUrl}
        </li>
      );
    }

    // URL이 없으면 일반 텍스트로 렌더링 (클릭 불가)
    return (
      <li key={index} className="text-only-item">
        {text}
      </li>
    );
  };

  // 동적 헤더 제목 생성
  const getDynamicTitle = () => {
    const flowCard = cardData.find((c: any) => c.type === 'flow');
    const needsCard = cardData.find((c: any) => c.type === 'needs_analysis');

    // 1순위: flow 카드의 제목 사용
    if (
      flowCard?.title &&
      flowCard.title !== '자동화 플로우' &&
      flowCard.title !== '🚀 자동화 플로우'
    ) {
      return flowCard.title;
    }

    // 2순위: needs_analysis 카드의 실제 니즈 사용
    if (needsCard?.realNeed) {
      return `🎯 ${needsCard.realNeed}`;
    }

    // 3순위: 사용자 입력 기반으로 제목 생성
    const userInput = result.context?.userInput || '';
    if (userInput.includes('스프레드시트')) {
      return '📊 스프레드시트 자동화';
    } else if (userInput.includes('채용') || userInput.includes('잡코리아')) {
      return '👥 채용 데이터 분석 자동화';
    } else if (userInput.includes('메일') || userInput.includes('이메일')) {
      return '📧 메일 자동화';
    } else if (userInput.includes('데이터') && userInput.includes('분석')) {
      return '📈 데이터 분석 자동화';
    } else if (userInput.includes('시각화')) {
      return '📊 데이터 시각화 자동화';
    } else {
      return '🚀 맞춤형 자동화';
    }
  };

  // 동적 헤더 설명 생성
  const getDynamicSubtitle = () => {
    const stepCount = processedFlowSteps.length;
    const needsCard = cardData.find((c: any) => c.type === 'needs_analysis');

    // 예상 효과가 있으면 포함
    if (needsCard?.expectedBenefit) {
      return `${stepCount}단계로 완성 • ${needsCard.expectedBenefit}`;
    }

    return `${stepCount}단계로 완성되는 자동화 가이드`;
  };

  // 플로우 개수에 따른 동적 스타일 계산
  const dynamicStyles = {
    containerPadding: processedFlowSteps.length === 1 ? '20px 20px 60px 20px' : '20px',
    shareMarginTop: processedFlowSteps.length === 1 ? '20px' : '32px',
  };

  return (
    <div>
      <style jsx>{`
        .container {
          max-width: 800px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8f9fa;
          min-height: auto;
          padding: ${dynamicStyles.containerPadding};
          color: #333;
        }

        .header {
          text-align: center;
          margin-bottom: 32px;
          background: white;
          padding: 32px 24px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .header h1 {
          font-size: 22px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .header p {
          font-size: 14px;
          color: #666;
          margin: 0;
          line-height: 1.5;
        }

        .guide-cards-section {
          margin: 32px 0;
        }

        .guide-card-wrapper {
          margin-bottom: 24px;
        }

        .expansion-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin: 32px 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
        }

        .expansion-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .expansion-header h3 {
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }

        .expansion-header p {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        .expansion-content {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        .expansion-content.has-both {
          grid-template-columns: 1fr 1fr;
        }

        .expansion-possibilities,
        .expansion-future {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid #e9ecef;
        }

        .expansion-possibilities h4,
        .expansion-future h4 {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;
        }

        .expansion-possibilities ul,
        .expansion-future ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .expansion-possibilities li,
        .expansion-future li {
          background: white;
          border-radius: 6px;
          padding: 10px 12px;
          margin-bottom: 8px;
          font-size: 13px;
          line-height: 1.4;
          color: #4a5568;
          border: 1px solid #e9ecef;
          transition: all 0.2s ease;
          position: relative;
          text-decoration: none;
        }

        /* URL이 있는 항목은 기본 상태에서도 약간 다르게 */
        .expansion-possibilities li.clickable-item,
        .expansion-future li.clickable-item {
          color: #5a67d8;
          border-color: #cbd5e0;
          background: #fafafa;
        }

        /* URL이 있는 클릭 가능한 항목 */
        .expansion-possibilities li.clickable-item,
        .expansion-future li.clickable-item {
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .expansion-possibilities li.clickable-item::before,
        .expansion-future li.clickable-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 3px;
          height: 100%;
          background: #6c5ce7;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .expansion-possibilities li.clickable-item:hover,
        .expansion-future li.clickable-item:hover {
          color: #6c5ce7;
          background: #f0f7ff;
          border-color: #6c5ce7;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(108, 92, 231, 0.15);
        }

        .expansion-possibilities li.clickable-item:hover::before,
        .expansion-future li.clickable-item:hover::before {
          opacity: 1;
        }

        /* URL이 없는 일반 텍스트 항목 */
        .expansion-possibilities li.text-only-item,
        .expansion-future li.text-only-item {
          cursor: default;
        }

        .expansion-possibilities li.text-only-item:hover,
        .expansion-future li.text-only-item:hover {
          background: #f8f9fa;
          border-color: #dee2e6;
        }

        .expansion-possibilities li::after,
        .expansion-future li::after {
          content: '↗';
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c5ce7;
          font-weight: bold;
          opacity: 0;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        /* URL이 있는 항목은 기본 상태에서도 화살표 살짝 보이게 */
        .expansion-possibilities li.clickable-item::after,
        .expansion-future li.clickable-item::after {
          opacity: 0.3;
        }

        /* URL이 있는 항목에만 화살표 강조 */
        .expansion-possibilities li.clickable-item:hover::after,
        .expansion-future li.clickable-item:hover::after {
          opacity: 1;
        }

        .expansion-new-recipe {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e9ecef;
        }

        .expansion-new-recipe-btn {
          background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .expansion-new-recipe-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
          background: linear-gradient(135deg, #5a4fcf 0%, #9089fc 100%);
        }

        .expansion-new-recipe-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(108, 92, 231, 0.2);
        }

        @media (max-width: 768px) {
          .expansion-content {
            grid-template-columns: 1fr;
          }
        }

        .share-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          margin-bottom: 24px;
          margin-top: ${dynamicStyles.shareMarginTop};
        }

        .share-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 6px;
        }

        .share-header p {
          font-size: 13px;
          color: #666;
          margin-bottom: 16px;
        }

        .share-btn {
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
        }

        .share-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        }

        .floating-faq {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #6c5ce7;
          color: white;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(108, 92, 231, 0.2);
          transition: all 0.3s ease;
          cursor: pointer;
          z-index: 1000;
          border: none;
        }

        .floating-faq:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
        }

        .faq-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }

        .faq-content {
          background: white;
          border-radius: 24px;
          max-width: 700px;
          width: 100%;
          max-height: 85vh;
          overflow: hidden;
          position: relative;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .faq-header {
          background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
          padding: 32px 24px;
          border-bottom: none;
          position: relative;
          text-align: center;
        }

        .faq-title {
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin: 0 0 8px 0;
          line-height: 1.3;
        }

        .faq-subtitle {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          line-height: 1.4;
        }

        .faq-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 18px;
        }

        .faq-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .faq-body {
          padding: 0;
          max-height: 70vh;
          overflow-y: auto;
        }

        .faq-item {
          padding: 24px;
          border-bottom: 1px solid #f0f0f0;
          transition: all 0.3s ease;
        }

        .faq-item:last-child {
          border-bottom: none;
        }

        .faq-item:hover {
          background: #fafbfc;
        }

        .faq-question {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .faq-q-icon {
          width: 28px !important;
          height: 28px !important;
          background: #ff6b6b !important;
          color: white !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          flex-shrink: 0 !important;
        }

        .faq-q-text {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin: 0;
          line-height: 1.4;
        }

        .faq-answer {
          margin-left: 40px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .faq-a-icon {
          width: 24px !important;
          height: 24px !important;
          background: #10b981 !important;
          color: white !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          flex-shrink: 0 !important;
          margin-top: 2px !important;
        }

        .faq-a-content {
          background: #f8fffe !important;
          border-left: 3px solid #10b981 !important;
          padding: 16px 20px !important;
          border-radius: 8px !important;
          flex: 1 !important;
        }

        .faq-a-text {
          font-size: 14px;
          color: #374151;
          line-height: 1.6;
          margin: 0;
        }

        @media (max-width: 768px) {
          .container {
            padding: 16px;
          }

          .header {
            padding: 32px 24px;
          }
        }
      `}</style>

      <div className="container">
        {/* 헤더 */}
        <div className="header text-center mb-8">
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            <h1 className="text-3xl font-bold mb-3 leading-tight">{getDynamicTitle()}</h1>
          </div>
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl px-6 py-3 inline-block">
            <p className="text-lg font-medium text-gray-700">{getDynamicSubtitle()}</p>
          </div>
        </div>

        {/* 플로우 다이어그램 */}
        {processedFlowSteps.length > 0 && (
          <FlowDiagramSection
            steps={processedFlowSteps}
            cards={cardData}
            engine={flowCard?.engine}
            flowMap={flowCard?.flowMap}
            fallback={flowCard?.fallback}
            flowTitle={getDynamicTitle()}
            flowSubtitle={getDynamicSubtitle()}
          />
        )}

        {/* 상세 가이드 카드들 */}
        <div className="guide-cards-section">
          {cardData
            .filter((card: any) =>
              [
                'tool_recommendation',
                'slide_guide',
                'video_guide',
                'landing_guide',
                'dashboard_guide',
                'creative_guide',
                'audio_guide',
                'chatbot_guide',
                'wow_preview',
              ].includes(card.type)
            )
            .map((card: any, index: number) => {
              // 방어 코드: card가 유효한지 확인
              if (!card || !card.type) {
                return null;
              }

              return (
                <div key={`card-${index}-${card.type}`} className="guide-card-wrapper">
                  <WowCardRenderer card={card} />
                </div>
              );
            })}
        </div>

        {/* 확장 아이디어 섹션 */}
        {expansionCard && (
          <div className="expansion-section">
            <div className="expansion-header">
              <h3>🚀 이제 여기서 한 단계 더!</h3>
              <p>지금 만든 자동화를 더 스마트하게 업그레이드하는 방법</p>
            </div>
            <div
              className={`expansion-content ${
                expansionCard.ideas &&
                Array.isArray(expansionCard.ideas) &&
                expansionCard.ideas.length > 0 &&
                expansionCard.futureVision &&
                expansionCard.futureVision.length > 0
                  ? 'has-both'
                  : ''
              }`}
            >
              {expansionCard.ideas &&
                Array.isArray(expansionCard.ideas) &&
                expansionCard.ideas.length > 0 && (
                  <div className="expansion-possibilities">
                    <h4>🚀 이렇게 더 발전시켜보세요!</h4>
                    <ul>
                      {expansionCard.ideas.map((idea: any, index: number) => {
                        // idea가 문자열인지 객체인지 확인
                        const ideaText =
                          typeof idea === 'string'
                            ? idea
                            : idea.title ||
                              idea.idea ||
                              idea.description ||
                              `아이디어 ${index + 1}`;

                        return (
                          <li
                            key={`expansion-idea-${index}`}
                            style={{ marginBottom: '8px', color: '#4f46e5' }}
                          >
                            💡 {ideaText}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              {expansionCard.futureVision && expansionCard.futureVision.length > 0 && (
                <div className="expansion-future">
                  <h4>🎯 이렇게 발전시키면 더욱 강력해집니다</h4>
                  <ul>
                    {expansionCard.futureVision.map((vision: string, index: number) =>
                      renderTextWithClickableUrl(vision, index)
                    )}
                  </ul>
                </div>
              )}
            </div>
            <div className="expansion-new-recipe">
              <button className="expansion-new-recipe-btn" onClick={handleNewRecipe}>
                ✨ 이 아이디어로 새 자동화 만들기
              </button>
            </div>
          </div>
        )}

        {/* 공유 섹션 */}
        <div className="share-section">
          <div className="share-header">
            <h3>📤 도움이 되었다면 공유해주세요</h3>
            <p>다른 사람들도 이 자동화의 혜택을 누릴 수 있도록</p>
          </div>
          <button className="share-btn" onClick={handleShare}>
            공유하기
          </button>
        </div>
      </div>

      {/* 플로팅 FAQ */}
      <button className="floating-faq" onClick={() => setShowFAQ(true)}>
        ❓ 자주 묻는 질문
      </button>

      {/* 공유 모달 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={title || getDynamicTitle(cardData) || '자동화 레시피'}
        userInput={result.context.userInput}
        cardData={cardData}
        result={result}
      />

      {/* FAQ 모달 */}
      {showFAQ && (
        <div className="faq-modal" onClick={() => setShowFAQ(false)}>
          <div className="faq-content" onClick={e => e.stopPropagation()}>
            <div className="faq-header">
              <button className="faq-close" onClick={() => setShowFAQ(false)}>
                ×
              </button>
              <h2 className="faq-title">자주 묻는 질문</h2>
              <p className="faq-subtitle">단계별로 따라하시면 자동화가 완성됩니다</p>
            </div>
            <div className="faq-body">
              {/* 🔍 FAQ 디버깅 */}
              {console.log('🔍 [FAQ Debug] faqCard:', faqCard)}
              {console.log('🔍 [FAQ Debug] faqCard?.items:', faqCard?.items)}
              {console.log('🔍 [FAQ Debug] faqCard?.faqs:', faqCard?.faqs)}
              {console.log('🔍 [FAQ Debug] faqCard?.questions:', faqCard?.questions)}

              {faqCard?.items && Array.isArray(faqCard.items) && faqCard.items.length > 0 ? (
                faqCard.items.map((item: any, index: number) => {
                  if (!item) return null;
                  return (
                    <div key={index} className="faq-item">
                      <div className="faq-question">
                        <span className="faq-q-icon">Q</span>
                        <span className="faq-q-text">
                          {item.question || item.q || '질문이 없습니다.'}
                        </span>
                      </div>
                      <div className="faq-answer">
                        <span className="faq-a-icon">A</span>
                        <div className="faq-a-content">
                          <span className="faq-a-text">
                            {item.answer || item.a || '답변이 없습니다.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="faq-item">
                    <div className="faq-question">
                      <span className="faq-q-icon">Q</span>
                      <span className="faq-q-text">설정이 어려워 보이는데 정말 쉬운가요?</span>
                    </div>
                    <div className="faq-answer">
                      <span className="faq-a-icon">A</span>
                      <div className="faq-a-content">
                        <span className="faq-a-text">
                          네! 단계별 가이드를 따라하시면 누구나 쉽게 완성할 수 있습니다.
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="faq-item">
                    <div className="faq-question">
                      <span className="faq-q-icon">Q</span>
                      <span className="faq-q-text">오류가 발생하면 어떻게 해야 하나요?</span>
                    </div>
                    <div className="faq-answer">
                      <span className="faq-a-icon">A</span>
                      <div className="faq-a-content">
                        <span className="faq-a-text">
                          각 단계의 문제 해결 탭에서 상세한 해결 방법을 확인하실 수 있습니다.
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="faq-item">
                    <div className="faq-question">
                      <span className="faq-q-icon">Q</span>
                      <span className="faq-q-text">추가 비용이 발생하나요?</span>
                    </div>
                    <div className="faq-answer">
                      <span className="faq-a-icon">A</span>
                      <div className="faq-a-content">
                        <span className="faq-a-text">
                          대부분의 자동화는 무료 도구로 구현 가능하며, 유료 도구 사용 시 미리
                          안내해드립니다.
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
