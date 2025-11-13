'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import ShareModal from './ShareModal';
import FlowDiagramSection from './FlowDiagram/FlowDiagramSection';
import WowCardRenderer from './WowCardRenderer';
import FeedbackSection from './FeedbackSection';

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
  // content에서 단계 추출하는 함수 (호이스팅 문제 해결을 위해 상단으로 이동)
  const extractStepsFromContent = (content: string): string[] => {
    const steps: string[] = [];
    
    // "Step 1:", "## Step 1", "1단계" 등의 패턴 찾기
    const stepPatterns = [
      /## \*\*Step \d+: ([^*]+)\*\*/g,
      /## Step \d+: ([^#\n]+)/g,
      /### Step \d+: ([^#\n]+)/g,
      /\d+단계[:\s]+([^#\n]+)/g,
      /Step \d+[:\s]+([^#\n]+)/g
    ];
    
    for (const pattern of stepPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const title = match[1].trim();
        if (title && title.length > 3) {
          steps.push(title);
        }
      }
      if (steps.length > 0) {
        break; // 첫 번째 성공한 패턴 사용
      }
    }
    
    console.log('🔍 [Content 파싱 결과]:', steps);
    return steps.slice(0, 5); // 최대 5개까지만
  };

  // 카드 데이터는 직접 전달받은 것 우선, 없으면 result에서 사용
  const cardData = cards || result.cards;
  
  console.log('🔍 [WowAutomationResult] cardData:', cardData);
  console.log('🔍 [WowAutomationResult] cardData 길이:', cardData?.length);
  console.log('🔍 [WowAutomationResult] FlowDiagramSection에 전달할 cardData:', cardData);
  
  const [showFAQ, setShowFAQ] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const router = useRouter();

  console.log('🎨 WowAutomationResult - 받은 카드들:', cardData?.length, '개');
  console.log('🔍 카드 타입들:', cardData?.map((card: any) => card.type).join(', '));

  // 카드 타입별 분류
  let flowCard = cardData.find((c: any) => c.type === 'flow');
  const faqCard = cardData.find((c: any) => c.type === 'faq');
  const shareCard = cardData.find((c: any) => c.type === 'share');
  const expansionCard = cardData.find((c: any) => c.type === 'expansion');

  // 🚨 긴급 복구: flow 카드가 없으면 더미 생성
  if (!flowCard && cardData.length > 0) {
    console.log('🚨 [긴급복구] flow 카드 없음 - 더미 생성');
    flowCard = {
      type: 'flow',
      title: '🚀 자동화 플로우',
      steps: ['1단계: 준비 작업', '2단계: 설정 및 연결', '3단계: 테스트 및 완료']
    };
  }

  // 플로우 단계 처리 - 강화된 아이콘 선택
  const getStepIcon = (index: number, title: string) => {
    // 제목 기반 아이콘 자동 선택 (더 많은 키워드 추가)
    const titleLower = title.toLowerCase();
    
    // 1단계: 계정/인증/로그인 관련
    if (titleLower.includes('계정') || titleLower.includes('로그인') || titleLower.includes('가입') || titleLower.includes('인증') || titleLower.includes('sign') || titleLower.includes('auth'))
      return '🔐';
    
    // 2단계: 연결/연동/웹훅/API 관련  
    if (titleLower.includes('연결') || titleLower.includes('연동') || titleLower.includes('api') || titleLower.includes('웹훅') || titleLower.includes('webhook') || titleLower.includes('url') || titleLower.includes('트리거'))
      return '🔗';
    
    // 3단계: 데이터/저장/스프레드시트 관련
    if (titleLower.includes('데이터') || titleLower.includes('수집') || titleLower.includes('입력') || titleLower.includes('저장') || titleLower.includes('sheet') || titleLower.includes('시트') || titleLower.includes('스프레드'))
      return '📊';
    
    // 4단계: 알림/전송/슬랙 관련
    if (titleLower.includes('알림') || titleLower.includes('전송') || titleLower.includes('메시지') || titleLower.includes('슬랙') || titleLower.includes('slack') || titleLower.includes('보고') || titleLower.includes('리포트'))
      return '📤';
    
    // 분석 관련
    if (titleLower.includes('분석') || titleLower.includes('분석해서') || titleLower.includes('보고서'))
      return '📈';
    
    // 설정/구성 관련 (우선순위 낮춤)
    if (titleLower.includes('설정') || titleLower.includes('구성') || titleLower.includes('설치') || titleLower.includes('config'))
      return '⚙️';
    
    // 테스트/확인 관련
    if (titleLower.includes('테스트') || titleLower.includes('확인') || titleLower.includes('검증') || titleLower.includes('test'))
      return '✅';

    // 순서 기반 다양한 기본 아이콘 (더 다양하게)
    const defaultIcons = ['🚀', '🔗', '📊', '📤', '✨', '💡', '🎯', '🔥'];
    return defaultIcons[index] || defaultIcons[index % defaultIcons.length];
  };

  // 🚨 강제 UI 복구: flow 카드가 있으면 무조건 플로우 다이어그램 생성
  let processedFlowSteps: any[] = [];
  
  if (flowCard) {
    console.log('🔍 [Flow 카드 분석] flowCard.steps:', flowCard.steps);
    console.log('🔍 [Flow 카드 분석] flowCard 전체:', flowCard);
    
    // 1. Flow 카드의 steps 배열 직접 사용 (우선순위 1)
    if (flowCard.steps && Array.isArray(flowCard.steps) && flowCard.steps.length > 0) {
      console.log('✅ [Flow 생성] Flow 카드의 steps 배열 사용:', flowCard.steps.length, '개');
      processedFlowSteps = flowCard.steps.map((step: any, index: number) => {
        // step이 문자열인 경우 처리
        if (typeof step === 'string') {
          const stepTitle = step.replace(/^\d+단계:\s*/, '').replace(/\.\.\.$/, '');
          console.log(`🔧 [Step ${index + 1}] 원본: "${step}" → 제목: "${stepTitle}"`);
          return {
            id: String(index + 1),
            icon: getStepIcon(index, stepTitle),
            title: stepTitle,
            subtitle: '상세 가이드에서 단계별 설명을 확인하세요',
            duration: '5-15분',
            preview: '',
            techTags: [],
          };
        }
        // step이 객체인 경우 처리
        else {
          const stepTitle = step.title?.replace(/^\d+단계:\s*/, '') || `단계 ${index + 1}`;
          return {
            id: String(step.number || index + 1),
            icon: getStepIcon(index, stepTitle),
            title: stepTitle,
            subtitle: step.description?.substring(0, 50) + '...' || '상세 가이드에서 단계별 설명을 확인하세요',
            duration: '5-15분',
            preview: '',
            techTags: [],
          };
        }
      });
      console.log('🎯 [Flow 생성 완료] processedFlowSteps 길이:', processedFlowSteps.length);
      console.log('🎯 [Flow 생성 완료] 첫 번째 단계:', processedFlowSteps[0]);
    }
        // 2. Guide 카드의 detailedSteps를 Flow steps로 활용 (fallback)
    else {
    const guideCard = cardData.find((c: any) => c.type === 'guide');
    if (guideCard?.detailedSteps && Array.isArray(guideCard.detailedSteps) && guideCard.detailedSteps.length > 0) {
      console.log('✅ [Flow 생성] Guide의 detailedSteps를 Flow로 변환:', guideCard.detailedSteps.length, '개');
      processedFlowSteps = guideCard.detailedSteps.map((step: any, index: number) => {
        const stepTitle = step.title?.replace(/^\d+단계:\s*/, '') || `단계 ${index + 1}`;
        return {
          id: String(step.number || index + 1),
          icon: getStepIcon(index, stepTitle),
          title: stepTitle,
          subtitle: step.description?.substring(0, 50) + '...' || '자세한 내용은 가이드를 확인하세요',
          duration: '5-15분',
          preview: '',
          techTags: [],
        };
      });
      }
    }  // ← else 블록을 닫아주는 중괄호
    // 3. content에서 단계 추출 시도 (최종 fallback)
    console.log('🔍 [Content 체크] processedFlowSteps.length:', processedFlowSteps.length);
    console.log('🔍 [Content 체크] flowCard.content 존재?', !!flowCard.content);
    if (!processedFlowSteps.length && flowCard.content) {
      // content에서 단계 추출 시도
      console.log('🚨 [Content 파싱] content에서 단계 추출 시도');
      const contentSteps = extractStepsFromContent(flowCard.content);
      if (contentSteps.length > 0) {
        processedFlowSteps = contentSteps.map((step, index) => ({
          id: String(index + 1),
          icon: getStepIcon(index, step),
          title: step,
          subtitle: '자세한 내용은 가이드를 확인하세요',
          duration: '5-10분',
          preview: '',
          techTags: [],
        }));
      } else {
        // content 파싱도 실패하면 기본 단계 생성
        console.log('🚨 [최종 복구] 기본 3단계 생성');
        processedFlowSteps = [
          {
            id: '1',
            icon: '🔗',
            title: 'Slack Webhook URL 생성',
            subtitle: '슬랙에서 Webhook 설정',
            duration: '5분',
            preview: '',
            techTags: ['Slack'],
          },
          {
            id: '2', 
            icon: '⚙️',
            title: 'Google Apps Script 설정',
            subtitle: '자동화 코드 작성 및 배포',
            duration: '15분',
            preview: '',
            techTags: ['Google Apps Script'],
          },
          {
            id: '3',
            icon: '✅', 
            title: '트리거 설정 및 테스트',
            subtitle: '자동 실행 설정 및 동작 확인',
            duration: '5분',
            preview: '',
            techTags: ['Testing'],
          }
        ];
      }
  }
  }  // ← if (flowCard) 블록을 닫아주는 중괄호
  
  // 마지막 fallback: flowCard가 없으면 기본 3단계 생성
  if (!processedFlowSteps.length) {
    console.log('🚨 [긴급복구] 모든 방법 실패 - 기본 단계 생성');
      processedFlowSteps = [
        {
          id: '1',
          icon: '🚀',
          title: '1단계: 준비 작업',
          subtitle: '필요한 도구 및 권한 설정',
          duration: '5분',
          preview: '',
          techTags: [],
        },
        {
          id: '2', 
          icon: '⚙️',
          title: '2단계: 설정 및 연결',
          subtitle: '자동화 워크플로우 구성',
          duration: '10분',
          preview: '',
          techTags: [],
        },
        {
          id: '3',
          icon: '✅', 
          title: '3단계: 테스트 및 완료',
          subtitle: '동작 확인 후 활성화',
          duration: '5분',
          preview: '',
          techTags: [],
        }
      ];
  }



  // 🔍 디버깅: 데이터 구조 확인
  console.log('🔍 [UI Debug] cardData:', cardData);
  console.log('🔍 [UI Debug] flowCard:', flowCard);
  console.log('🔍 [UI Debug] processedFlowSteps:', processedFlowSteps);
  
  // 🚨 각 카드 상세 구조 확인
  cardData.forEach((card: any, index: number) => {
    console.log(`🔍 [Card ${index + 1}] ${card.type}:`, {
      title: card.title,
      hasSteps: !!card.steps,
      stepsCount: card.steps?.length || 0,
      hasContent: !!card.content,
      contentLength: card.content?.length || 0,
      hasCodeBlocks: !!card.codeBlocks,
      codeBlocksCount: card.codeBlocks?.length || 0
    });
  });

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

  // 동적 헤더 제목 생성 (사용자 맞춤형)
  const getDynamicTitle = () => {
    const flowCard = cardData.find((c: any) => c.type === 'flow');
    const needsCard = cardData.find((c: any) => c.type === 'needs_analysis');
    const userInput = result.context?.userInput || '';
    
    console.log('🔍 [getDynamicTitle] userInput:', userInput);
    console.log('🔍 [getDynamicTitle] flowCard:', flowCard?.title);
    console.log('🔍 [getDynamicTitle] needsCard:', needsCard);

    // 1순위: needs_analysis 카드의 expandedSystem 활용 (가장 정확한 제목)
    if (needsCard?.expandedSystem && needsCard.expandedSystem !== '확장된 자동화 시스템') {
      return `🎯 ${needsCard.expandedSystem}`;
    }

    // 2순위: flow 카드의 제목 활용 (GPT가 생성한 정교한 제목)
    if (flowCard?.title && 
      flowCard.title !== '자동화 플로우' &&
        flowCard.title !== '🚀 자동화 플로우' &&
        !flowCard.title.includes('기본') &&
        !flowCard.title.includes('샘플')) {
      return flowCard.title;
    }

    // 3순위: 사용자 입력을 지능적으로 분석하여 맞춤형 제목 생성
    if (userInput) {
      const title = generateSmartTitle(userInput, needsCard, flowCard);
      if (title) return title;
    }

    // 4순위: needs_analysis의 기타 정보 활용
    if (needsCard?.realNeed) {
      return `🎯 ${needsCard.realNeed}`;
    }

    // 5순위: 기본 제목
      return '🚀 맞춤형 자동화';
  };

  // 지능적 제목 생성 함수
  const generateSmartTitle = (userInput: string, needsCard: any, flowCard: any): string | null => {
    try {
      // 입력값에서 핵심 요소 추출
      const input = userInput.toLowerCase();
      
      // 데이터 소스 파악
      const dataSources = [];
      if (input.includes('인스타그램') || input.includes('instagram')) dataSources.push('인스타그램');
      if (input.includes('페이스북') || input.includes('facebook')) dataSources.push('페이스북');
      if (input.includes('유튜브') || input.includes('youtube')) dataSources.push('유튜브');
      if (input.includes('구글') || input.includes('google')) dataSources.push('구글');
      if (input.includes('엑셀') || input.includes('excel')) dataSources.push('엑셀');
      if (input.includes('csv') || input.includes('스프레드시트')) dataSources.push('스프레드시트');
      if (input.includes('이메일') || input.includes('메일')) dataSources.push('이메일');
      if (input.includes('슬랙') || input.includes('slack')) dataSources.push('슬랙');
      if (input.includes('노션') || input.includes('notion')) dataSources.push('노션');
      
      // 작업 목적 파악
      let purpose = '';
      if (input.includes('분석') || input.includes('리포트') || input.includes('보고서')) purpose = '분석 리포트';
      else if (input.includes('모니터링') || input.includes('추적') || input.includes('감시')) purpose = '모니터링';
      else if (input.includes('알림') || input.includes('노티') || input.includes('notification')) purpose = '알림';
      else if (input.includes('수집') || input.includes('크롤링') || input.includes('수집')) purpose = '데이터 수집';
      else if (input.includes('정리') || input.includes('관리') || input.includes('조직')) purpose = '데이터 정리';
      else if (input.includes('차트') || input.includes('시각화') || input.includes('그래프')) purpose = '시각화';
      else if (input.includes('자동화') || input.includes('automation')) purpose = '자동화';
      else if (input.includes('통합') || input.includes('연동')) purpose = '통합';
      
      // 결과물 파악
      let output = '';
      if (input.includes('대시보드') || input.includes('dashboard')) output = '대시보드';
      else if (input.includes('pdf') || input.includes('보고서')) output = 'PDF 보고서';
      else if (input.includes('차트') || input.includes('그래프')) output = '차트';
      else if (input.includes('슬랙') && (input.includes('전송') || input.includes('알림'))) output = '슬랙 알림';
      else if (input.includes('이메일') && (input.includes('전송') || input.includes('발송'))) output = '이메일';
      
      // 제목 조합
      const sourceText = dataSources.length > 0 ? dataSources.slice(0, 2).join(' + ') : '';
      
      if (sourceText && purpose && output) {
        return `📊 ${sourceText} ${purpose} → ${output} 자동화`;
      } else if (sourceText && purpose) {
        return `📊 ${sourceText} ${purpose} 자동화`;
      } else if (purpose && output) {
        return `🚀 ${purpose} → ${output} 자동화`;
      } else if (sourceText) {
        return `📊 ${sourceText} 자동화`;
      }
      
      // 도메인 특화 제목
      if (input.includes('브랜드') && input.includes('언급')) {
        return `🔔 브랜드 언급 모니터링 자동화`;
      }
      if (input.includes('채용') || input.includes('hr') || input.includes('인사')) {
        return `👥 채용 데이터 자동화`;
      }
      if (input.includes('마케팅') || input.includes('광고')) {
        return `📈 마케팅 데이터 자동화`;
      }
      if (input.includes('매출') || input.includes('판매') || input.includes('sales')) {
        return `💰 매출 분석 자동화`;
      }
      
      return null;
    } catch (error) {
      console.warn('제목 생성 중 오류:', error);
      return null;
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
    <>
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

        {/* 상세 가이드 카드들 - guide 제외 (FlowDiagramSection에서 모달로 처리) */}
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
        title={title || getDynamicTitle() || '자동화 레시피'}
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
              {/* 🚫 FAQ content에 JSON이 들어있으면 숨김 처리 */}
              {faqCard?.content && 
               !faqCard.content.includes('"items"') && 
               !faqCard.content.includes('"question"') && 
               !faqCard.content.startsWith('{') && 
               !faqCard.content.startsWith('[') && (
                <div className="faq-content-text" style={{
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  color: '#666'
                }}>
                  {faqCard.content}
                </div>
              )}
              {/* 🔧 FAQ 데이터 추출 및 파싱 */}
              {(() => {
                console.log('🔍 [FAQ] 전체 구조:', faqCard);
                
                let faqItems: any[] = [];
                
                // 1순위: 직접 배열이 있는 경우
                if (faqCard?.faqs && Array.isArray(faqCard.faqs)) {
                  faqItems = faqCard.faqs;
                } else if (faqCard?.questions && Array.isArray(faqCard.questions)) {
                  faqItems = faqCard.questions;
                } else if (faqCard?.items && Array.isArray(faqCard.items)) {
                  faqItems = faqCard.items;
                }
                // 2순위: content 필드에서 JSON 파싱 시도
                else if (faqCard?.content && typeof faqCard.content === 'string') {
                  console.log('🔍 [FAQ] content 원본:', faqCard.content.substring(0, 200) + '...');
                  
                  try {
                    // 1) JSON 문자열에서 items 배열 추출 시도
                    if (faqCard.content.includes('"items"')) {
                      console.log('🔍 [FAQ] "items" 키워드 발견, 배열 추출 시도');
                      
                      // items 배열만 추출하는 더 강력한 정규식
                      const itemsMatch = faqCard.content.match(/"items"\s*:\s*(\[[\s\S]*?\](?:\s*,\s*\{[\s\S]*?\})*)/);
                      if (itemsMatch) {
                        console.log('🔍 [FAQ] items 배열 매칭:', itemsMatch[1].substring(0, 100) + '...');
                        try {
                          faqItems = JSON.parse(itemsMatch[1]);
                          console.log('✅ [FAQ] items 배열 파싱 성공:', faqItems.length, '개');
                        } catch (e) {
                          console.log('❌ [FAQ] items 배열 파싱 실패:', e);
                        }
                      }
                      
                      // items 배열 추출이 실패했으면 다른 방법 시도
                      if (!faqItems || faqItems.length === 0) {
                        // question/answer 쌍들을 직접 추출
                        const questionMatches = faqCard.content.match(/"question"\s*:\s*"([^"]+)"/g);
                        const answerMatches = faqCard.content.match(/"answer"\s*:\s*"([^"]+)"/g);
                        
                        if (questionMatches && answerMatches && questionMatches.length === answerMatches.length) {
                          faqItems = questionMatches.map((qMatch: string, index: number) => {
                            const question = qMatch.match(/"question"\s*:\s*"([^"]+)"/)?.[1] || '';
                            const answer = answerMatches[index]?.match(/"answer"\s*:\s*"([^"]+)"/)?.[1] || '';
                            return { question, answer };
                          });
                          console.log('✅ [FAQ] question/answer 직접 추출 성공:', faqItems.length, '개');
                        }
                      }
                    }
                    // 2) 전체 JSON 파싱 시도
                    else if (faqCard.content.startsWith('{') || faqCard.content.startsWith('[')) {
                      const parsed = JSON.parse(faqCard.content);
                      if (Array.isArray(parsed)) {
                        faqItems = parsed;
                      } else if (parsed.items && Array.isArray(parsed.items)) {
                        faqItems = parsed.items;
                      }
                      console.log('✅ [FAQ] content 전체 JSON 파싱 성공:', faqItems.length, '개');
                    }
                  } catch (error) {
                    console.log('📝 [FAQ] JSON 파싱 실패:', error);
                  }
                }
                
                console.log('🔍 [FAQ] 최종 추출된 items:', faqItems.length, '개');
                
                if (faqItems && Array.isArray(faqItems) && faqItems.length > 0) {
                  return faqItems.map((item: any, index: number) => {
                  if (!item) return null;
                    
                    // 다양한 프로퍼티명 지원
                    const question = item.question || item.q || item.title || '질문이 없습니다.';
                    const answer = item.answer || item.a || item.content || '답변이 없습니다.';
                    
                  return (
                    <div key={index} className="faq-item">
                      <div className="faq-question">
                        <span className="faq-q-icon">Q</span>
                          <span className="faq-q-text">{question.replace(/^["']|["']$/g, '')}</span>
                      </div>
                      <div className="faq-answer">
                        <span className="faq-a-icon">A</span>
                        <div className="faq-a-content">
                            <span className="faq-a-text">{answer.replace(/^["']|["']$/g, '')}</span>
                        </div>
                      </div>
                    </div>
                  );
                  });
                }
                
                console.log('⚠️ [FAQ] 구조화된 FAQ 없음 - 빈 상태 표시');
                return (
                  <div className="faq-item">
                    <div className="faq-question">
                      <span className="faq-q-icon">💡</span>
                      <span className="faq-q-text">FAQ 데이터를 생성 중입니다...</span>
                    </div>
                    <div className="faq-answer">
                      <span className="faq-a-icon">ℹ️</span>
                      <div className="faq-a-content">
                        <span className="faq-a-text">
                          더 자세한 질문이 있으시면 각 단계별 가이드를 참고해 주세요.
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 피드백 섹션 */}
      <div className="max-w-4xl mx-auto mt-12 px-4">
        <FeedbackSection />
      </div>
    </div>
    </>
  );
}
