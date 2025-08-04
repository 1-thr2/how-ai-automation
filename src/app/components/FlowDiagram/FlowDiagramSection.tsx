import React, { useState, useEffect } from 'react';
import { FlowStep } from '@/app/types/automation';
import styles from './FlowDiagramSection.module.css';

// URL을 자동으로 링크로 변환하고 마크다운 헤더를 처리하는 함수
const convertUrlsToLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  
  // 마크다운 헤더 처리 (**[텍스트]** → React 컴포넌트로 변환)
  const processedText = text.replace(/\*\*\[([^\]]+)\]\*\*/g, (match, content) => {
    // 임시 플레이스홀더로 변환 (나중에 React 컴포넌트로 교체)
    if (content.includes('이전 단계')) {
      return `__SECTION_HEADER_CONNECTION__`;
    } else if (content.includes('현재 단계') || content.includes('작업')) {
      return `__SECTION_HEADER_WORK__`;
    } else if (content.includes('다음 단계')) {
      return `__SECTION_HEADER_NEXT__`;
    } else {
      return `__SECTION_HEADER_DEFAULT__${content}__`;
    }
  });
  
  const parts = processedText.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer"
          className={styles['inline-link']}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

// 굵은 텍스트와 URL 링크를 함께 처리하는 함수
const renderBoldTextWithLinks = (text: string) => {
  // 먼저 굵은 텍스트를 처리
  const boldRegex = /(\*\*[^*]+\*\*)/g;
  const parts = text.split(boldRegex);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // 굵은 텍스트 처리
      const boldText = part.replace(/^\*\*|\*\*$/g, '');
      return <strong key={index} className="font-bold text-gray-900">{boldText}</strong>;
    } else {
      // 일반 텍스트에서 URL 링크 처리
      return <span key={index}>{convertUrlsToLinks(part)}</span>;
    }
  });
};

// 텍스트에서 값 교체 정보를 추출하는 함수
const extractValueReplacements = (text: string): Array<{placeholder: string, instruction: string}> => {
  const replacements: Array<{placeholder: string, instruction: string}> = [];
  
  // 다양한 값 교체 패턴들 감지
  const patterns = [
    /(\w+)\s*=\s*(\d+)\s*\/\/\s*(.+)/g,                    // views = 100 // 조회수 예시 값
    /(\w+)\s*=\s*(\d+)\s*;\s*\/\/\s*(.+)/g,               // applicants = 10; // 지원자 수 예시 값
    /(\[YOUR_[A-Z_]+\])\s*→\s*(.+)/g,                     // [YOUR_VALUE] → 설명
    /(\[.*?\])\s*→\s*(.+)/g,                              // [플레이스홀더] → 설명
    /(\w+)\s*:\s*"([^"]+)"\s*\/\/\s*(.+)/g,               // key: "value" // 설명
    /(\w+)\s*=\s*"([^"]+)"\s*\/\/\s*(.+)/g,               // var = "value" // 설명
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[3]) {
        replacements.push({
          placeholder: match[1],
          instruction: match[3]
        });
      }
    }
  });
  
  return replacements;
};

// 텍스트에서 코드 블록을 감지하고 렌더링하는 함수
const renderTextWithCodeBlocks = (text: string) => {
  // 코드 블록 패턴 감지 (더 정확한 패턴으로 개선)
  const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
  
  // 스프레드시트 데이터 패턴 감지 (더 정확한 패턴)
  const spreadsheetRegex = /([A-Z]\d+:\s*[^\n]+\n){2,}/g; // A1: 내용, B1: 내용 형태
  
  // 추가적인 스프레드시트 패턴들
  const spreadsheetPatterns = [
    /([A-Z]\d+:\s*[^\n]+\n){2,}/g,  // A1: 내용, B1: 내용
    /([A-Z]\d+[^\n]*\n){3,}/g,       // A1 내용, B1 내용 (콜론 없음)
    /(날짜|이름|이메일|전화번호|주소|상태|비고)[^\n]*\n([^\n]+\n){2,}/g, // 헤더가 있는 테이블
    /(\d{4}-\d{2}-\d{2}[^\n]*\n){2,}/g, // 날짜 데이터
  ];
  
  // 먼저 코드 블록을 처리
  let processedText = text;
  const codeBlocks: { [key: string]: string } = {};
  let codeBlockIndex = 0;
  
  processedText = processedText.replace(codeBlockRegex, (match, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlockIndex}__`;
    codeBlocks[placeholder] = code.trim();
    codeBlockIndex++;
    return placeholder;
  });
  
  // 추가적인 인라인 코드 패턴 처리 (중복 방지)
  const inlineCodePatterns = [
    /function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?}/g,  // function 정의
    /const\s+\w+\s*=[\s\S]*?;/g,                 // const 선언
    /let\s+\w+\s*=[\s\S]*?;/g,                   // let 선언
    /var\s+\w+\s*=[\s\S]*?;/g,                   // var 선언
    /if\s*\([^)]*\)\s*{[\s\S]*?}/g,              // if 문
    /for\s*\([^)]*\)\s*{[\s\S]*?}/g,             // for 문
    /while\s*\([^)]*\)\s*{[\s\S]*?}/g,           // while 문
  ];
  
  // 이미 코드 블록으로 처리된 부분은 인라인 코드로 중복 처리하지 않음
  inlineCodePatterns.forEach(pattern => {
    processedText = processedText.replace(pattern, (match) => {
      // 이미 플레이스홀더로 처리된 부분은 건드리지 않음
      if (match.includes('__CODE_BLOCK_') || match.includes('__SPREADSHEET_')) {
        return match;
      }
      
      // 너무 짧은 코드는 처리하지 않음
      if (match.length < 20) {
        return match;
      }
      
      const placeholder = `__CODE_BLOCK_${codeBlockIndex}__`;
      codeBlocks[placeholder] = match.trim();
      codeBlockIndex++;
      return placeholder;
    });
  });
  
  // 스프레드시트 데이터 처리 (여러 패턴 확인)
  const spreadsheetBlocks: { [key: string]: string } = {};
  let spreadsheetIndex = 0;
  
  // 모든 스프레드시트 패턴을 확인
  spreadsheetPatterns.forEach(pattern => {
    processedText = processedText.replace(pattern, (match) => {
      const placeholder = `__SPREADSHEET_${spreadsheetIndex}__`;
      spreadsheetBlocks[placeholder] = match.trim();
      spreadsheetIndex++;
      return placeholder;
    });
  });
  
  // 텍스트를 분할하여 처리 (섹션 헤더 플레이스홀더도 포함)
  const parts = processedText.split(/(__CODE_BLOCK_\d+__|__SPREADSHEET_\d+__|__SECTION_HEADER_\w+__.*?__)/);
  
  return parts.map((part, index) => {
    // 코드 블록 처리
    if (part.startsWith('__CODE_BLOCK_')) {
      const code = codeBlocks[part];
      if (code && code.length > 10) {
        // 다음 텍스트 부분에서 값 교체 정보 찾기
        const nextPart = parts[index + 1] || '';
        const valueReplacements = extractValueReplacements(nextPart);
        
        return (
          <div key={index} className={styles['inline-code-block']}>
            <div className={styles['inline-code-header']}>
              <span>💻 실행 코드</span>
              <button
                className={styles['inline-copy-btn']}
                onClick={() => navigator.clipboard.writeText(code)}
              >
                복사
              </button>
            </div>
            <pre className={styles['inline-code-content']}>
              <code>{code}</code>
            </pre>
            {valueReplacements.length > 0 && (
              <div className={styles['value-replacements']}>
                <h4>🔧 값 교체하기</h4>
                {valueReplacements.map((replacement, i) => (
                  <div key={i} className={styles['replacement-item']}>
                    <code className={styles['placeholder']}>{replacement.placeholder}</code>
                    <span className={styles['arrow']}>→</span>
                    <span className={styles['instruction']}>{replacement.instruction}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
    }
    
    // 스프레드시트 데이터 처리
    if (part.startsWith('__SPREADSHEET_')) {
      const data = spreadsheetBlocks[part];
      if (data && data.length > 10) {
        return (
          <div key={index} className={styles['inline-code-block']}>
            <div className={styles['inline-code-header']}>
              <span>📊 스프레드시트 데이터</span>
              <button
                className={styles['inline-copy-btn']}
                onClick={() => navigator.clipboard.writeText(data)}
              >
                복사
              </button>
            </div>
            <pre className={styles['inline-code-content']}>
              <code>{data}</code>
            </pre>
          </div>
        );
      }
    }
    
    // 섹션 헤더 처리
    if (part.startsWith('__SECTION_HEADER_')) {
      if (part === '__SECTION_HEADER_CONNECTION__') {
        return (
          <div key={index} className={`${styles['step-section-header']} ${styles['connection']}`}>
            🔗 이전 단계와 연결:
          </div>
        );
      } else if (part === '__SECTION_HEADER_WORK__') {
        return (
          <div key={index} className={`${styles['step-section-header']} ${styles['work']}`}>
            📋 현재 단계 작업:
          </div>
        );
      } else if (part === '__SECTION_HEADER_NEXT__') {
        return (
          <div key={index} className={`${styles['step-section-header']} ${styles['next']}`}>
            ➡️ 다음 단계 준비:
          </div>
        );
      } else if (part.startsWith('__SECTION_HEADER_DEFAULT__')) {
        const content = part.replace('__SECTION_HEADER_DEFAULT__', '').replace('__', '');
        return (
          <div key={index} className={`${styles['step-section-header']} ${styles['default']}`}>
            📌 {content}:
          </div>
        );
      }
    }
    
    // 일반 텍스트는 굵은 텍스트와 URL 링크 처리
    return <span key={index}>{renderBoldTextWithLinks(part)}</span>;
  });
};

interface FlowDiagramSectionProps {
  steps: FlowStep[];
  onStepClick?: (step: FlowStep) => void;
  cards?: any[]; // 전체 카드 데이터 (가이드 카드 포함)
  engine?: string;
  flowMap?: any;
  fallback?: any;
  flowTitle?: string;
  flowSubtitle?: string;
}

const FlowDiagramSection: React.FC<FlowDiagramSectionProps> = ({ 
  steps, 
  onStepClick, 
  cards = [],
  engine,
  flowMap,
  fallback,
  flowTitle,
  flowSubtitle
}) => {
  const [activeSteps, setActiveSteps] = useState<number[]>([]);
  const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);
  // 탭 제거 - 기존 0566bb9 UI로 복구
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 단계별로 순차적으로 애니메이션 적용
    steps.forEach((_, index) => {
      setTimeout(() => {
        setActiveSteps(prev => [...prev, index]);
      }, index * 200);
    });
  }, [steps]);

  const handleStepClick = (step: FlowStep) => {
    setSelectedStep(step);
    onStepClick?.(step);
  };

  // 코드가 실제 실행 가능한 코드인지 확인하는 함수
  const isValidCode = (code: string, filename: string): boolean => {
    if (!code || !filename) return false;
    
    // 너무 짧은 코드 (30자 미만) 제외
    if (code.length < 30) return false;
    
    // 가이드 텍스트 패턴들 제외 (간소화)
    const invalidPatterns = [
      /^다음 설문조사/,
      /^이 단계에서/,
      /브라우저를 열어주세요/,
      /주소창에.*입력하고/,
      /로그인.*계정으로/,
      /버튼을 클릭/,
      /복사해서 붙여넣기/,
      /설정.*완료/,
      /다음 단계/,
      /실행 방법/,
      /성공 확인/,
      /문제 해결/,
      /체크포인트/,
      /예상 화면/,
      /설명.*방법/,
      /단계별.*가이드/,
      /따라서.*진행/,
      /결과.*확인/,
      /완료.*되었는지/,
      /자세한.*내용/,
      /추가.*정보/,
      /도움.*필요/,
      /문의.*사항/,
      /궁금한.*점/,
      /클릭.*하시면/,
      /입력.*하시면/,
      /선택.*하시면/,
      /확인.*하시면/,
      /저장.*하시면/,
      /실행.*하시면/,
      /완료.*하시면/,
      /입력.*해주세요/,
      /선택.*해주세요/,
      /확인.*해주세요/,
      /저장.*해주세요/,
      /실행.*해주세요/,
      /완료.*해주세요/,
      /설정.*해주세요/
    ];
    
    // 가이드 텍스트 패턴이 포함된 경우 제외
    if (invalidPatterns.some(pattern => pattern.test(code))) {
      return false;
    }
    
    // 실제 코드 패턴들 확인 (간소화)
    const codePatterns = [
      /function\s+\w+\s*\(/,     // JavaScript 함수
      /const\s+\w+\s*=/,        // const 선언
      /let\s+\w+\s*=/,          // let 선언
      /var\s+\w+\s*=/,          // var 선언
      /\{\s*"[^"]+"\s*:/,       // JSON 구조
      /SELECT\s+.*FROM/i,       // SQL
      /INSERT\s+INTO/i,         // SQL
      /=\s*[A-Z_]+\(/,          // 함수 호출 (대문자)
      /SpreadsheetApp\./,       // Google Apps Script
      /Logger\./,               // Google Apps Script
      /\w+\.\w+\(.*\)/,         // 메서드 호출 패턴
      /if\s*\(/,                // if 문
      /for\s*\(/,               // for 문
      /while\s*\(/,             // while 문
      /return\s+/,              // return 문
      /console\./,              // console
      /document\./,             // DOM
      /window\./,               // window
      /fetch\(/,                // fetch
      /await\s+/,               // await
      /Promise\./,              // Promise
      /try\s*\{/,               // try 문
      /catch\s*\(/,             // catch 문
      /throw\s+/,               // throw 문
      /class\s+\w+/,            // class 선언
      /import\s+.*from/,        // import 문
      /export\s+(default\s+)?/, // export 문
      /\/\*.*\*\//,             // 블록 주석
      /\/\/.*$/m,               // 라인 주석
      /=\s*\[/,                 // 배열 할당
      /=\s*\{/,                 // 객체 할당
      /\.map\(/,                // array map
      /\.filter\(/,             // array filter
      /\.join\(/,               // array join
      /\.split\(/,              // string split
      /\.replace\(/,            // string replace
      /\.trim\(/,               // string trim
      /\.length/,               // length 속성
      /\.push\(/,               // array push
      /\.toString\(/,           // toString
      /\.parse\(/,              // JSON.parse
      /\.stringify\(/,          // JSON.stringify
      /=>/,                     // arrow function
      /\${/,                    // template literal
      /`[^`]*`/,                // template literal
      /null|undefined|true|false/, // literals
      /\d+\.\d+/,               // float numbers
      /\[.*\]/,                 // array literal
      /\{.*\}/,                 // object literal
      /new\s+\w+/,              // new 연산자
    ];
    
    // 실제 코드 패턴이 포함된 경우에만 true
    return codePatterns.some(pattern => pattern.test(code));
  };

  // 현재 선택된 단계의 가이드 데이터 가져오기
  const getCurrentStepData = () => {
    if (!selectedStep) return null;
    
    // 🚨 우선 stepId 조건 없이 guide 카드 찾기 (모든 단계에서 공통 가이드 표시)
    const guideCard = cards.find((card: any) => card.type === 'guide');
    
    console.log('🔍 [getCurrentStepData] guide 카드 찾음:', !!guideCard);
    if (guideCard) {
      console.log('🔍 [getCurrentStepData] content 길이:', guideCard.content?.length || 0);
    }
    
    if (guideCard) {
      // 새로운 guide 카드 구조 처리
      if (guideCard.content && typeof guideCard.content === 'string') {
        // Markdown content를 단계별로 파싱
        const steps = parseMarkdownSteps(guideCard.content);
        
        return {
          guide: {
            title: guideCard.title || '📋 상세 가이드',
            subtitle: '단계별 실행 가이드',
            basicConcept: '아래 단계를 순서대로 따라하시면 자동화를 완성할 수 있습니다.',
            steps: steps,
            tips: extractTipsFromContent(guideCard.content),
            executableCode: guideCard.codeBlocks?.[0]?.code || null,
            codeBlocks: guideCard.codeBlocks || []
          }
        };
      }
      
      // 기존 구조 지원 (호환성)
      if (guideCard.content?.detailedSteps) {
        return {
          guide: {
            title: guideCard.title,
            subtitle: guideCard.subtitle,
            basicConcept: guideCard.basicConcept,
            steps: guideCard.content.detailedSteps,
            tips: guideCard.content.practicalTips || [],
            executableCode: guideCard.content.executableCode || null
          }
        };
      }
    }
    
    return null;
  };

  // 실제 마크다운 content에서 단계 추출
  const parseMarkdownSteps = (content: string) => {
    console.log('🔍 [parseMarkdownSteps] 파싱 시작 - 길이:', content.length);
    
    const steps = [];
    
    // ## 📌 X단계: 제목 형태 찾기
    const stepPattern = /## 📌 (\d+)단계: ([^#\n]+)([\s\S]*?)(?=## 📌|\n## |$)/g;
    let match;
    let stepNumber = 1;
    
    while ((match = stepPattern.exec(content)) !== null) {
      let title = match[2]?.trim() || '';
      let description = match[3]?.trim() || '';
      
      // 제목에서도 마크다운 제거
      title = title.replace(/\*\*([^*]+)\*\*/g, '$1'); // **텍스트** → 텍스트
      
      // 설명에서 불필요한 마크다운 제거
      description = description
        .replace(/\*\*([^*]+)\*\*/g, '$1') // **텍스트** → 텍스트
        .replace(/### ([^#\n]+)/g, '$1') // ### 제목 → 제목
        .replace(/\n\n+/g, '\n') // 연속 줄바꿈 정리
        .substring(0, 300); // 길이 제한
      
      if (title) {
        steps.push({
          number: stepNumber,
          title: `${stepNumber}단계: ${title}`,
          description: description || `${title}에 대한 상세 설명입니다.`,
          expectedScreen: `${title} 완료 후 확인할 수 있는 화면`,
          checkpoint: `${title}이 정상적으로 완료되었는지 확인`
        });
        stepNumber++;
      }
    }
    
    // 단계를 찾지 못한 경우 기본 단계 생성
    if (steps.length === 0) {
      console.log('🚨 [parseMarkdownSteps] 패턴 매칭 실패 - 기본 단계 생성');
      steps.push(
        {
          number: 1,
          title: '1단계: Slack Webhook URL 생성',
          description: 'Slack에서 Webhook URL을 생성하여 알림을 받을 수 있도록 설정합니다.',
          expectedScreen: 'Slack Webhook URL이 생성된 화면',
          checkpoint: 'Webhook URL을 성공적으로 복사했는지 확인'
        },
        {
          number: 2,
          title: '2단계: 자동화 설정',
          description: 'Zapier 또는 Google Apps Script를 사용하여 SNS 모니터링을 설정합니다.',
          expectedScreen: '자동화 도구에서 설정이 완료된 화면',
          checkpoint: '설정이 저장되고 활성화되었는지 확인'
        },
        {
          number: 3,
          title: '3단계: 테스트 및 완료',
          description: '설정한 자동화가 제대로 작동하는지 테스트합니다.',
          expectedScreen: 'Slack에 테스트 알림이 도착한 화면',
          checkpoint: '자동화가 정상적으로 작동하는지 확인'
        }
      );
    }
    
    console.log('✅ [parseMarkdownSteps] 완료 -', steps.length, '개 단계 생성');
    
    return steps;
  };

  // 내용에서 팁 추출
  const extractTipsFromContent = (content: string): string[] => {
    const tips = [];
    
    // "💡", "팁:", "주의:" 등의 패턴 찾기
    const tipPatterns = [
      /💡[^\n]*/g,
      /\*\*팁[:\s]*\*\*[^\n]*/g,
      /\*\*주의[:\s]*\*\*[^\n]*/g
    ];
    
    for (const pattern of tipPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        tips.push(...matches.map(tip => tip.trim()));
      }
    }
    
    return tips.slice(0, 5); // 최대 5개
  };

  const stepData = getCurrentStepData();

  // 전체 플로우 완성 상태 확인 함수
  const isFlowCompleted = (flowSteps: any[], completedSteps: Set<string>) => {
    return flowSteps.every(step => completedSteps.has(step.id.toString()));
  };

  // 최종 결과물 표시 컴포넌트
  const FinalResultDisplay = ({ flowCard, completedSteps }: { flowCard: any, completedSteps: Set<string> }) => {
    const isCompleted = isFlowCompleted(flowCard.steps, completedSteps);
    
    if (!isCompleted) return null;
    
    return (
      <div className={styles['final-result-section']}>
        <div className={styles['final-result-header']}>
          <h3>🎉 자동화 완성!</h3>
          <p>모든 단계를 완료하셨습니다. 이제 다음과 같은 결과를 얻으실 수 있습니다:</p>
        </div>
        
        <div className={styles['final-result-benefits']}>
          <div className={styles['benefit-item']}>
            <span className={styles['benefit-icon']}>⏰</span>
            <div>
              <h4>시간 절약</h4>
              <p>매주 반복되는 작업이 자동으로 처리됩니다</p>
            </div>
          </div>
          
          <div className={styles['benefit-item']}>
            <span className={styles['benefit-icon']}>📊</span>
            <div>
              <h4>정확성 향상</h4>
              <p>수동 작업으로 인한 실수가 없어집니다</p>
            </div>
          </div>
          
          <div className={styles['benefit-item']}>
            <span className={styles['benefit-icon']}>🔄</span>
            <div>
              <h4>일관성 보장</h4>
              <p>매번 동일한 품질의 결과물을 얻을 수 있습니다</p>
            </div>
          </div>
        </div>
        
        <div className={styles['final-result-actions']}>
          <button className={styles['action-btn-primary']}>
            📋 체크리스트 다운로드
          </button>
          <button className={styles['action-btn-secondary']}>
            🔗 자동화 공유하기
          </button>
        </div>
      </div>
    );
  };

  // 단계별 연결성 표시 컴포넌트  
  const StepConnectionIndicator = ({ currentStep, previousStep, isCompleted }: { 
    currentStep: any, 
    previousStep: any | null, 
    isCompleted: boolean 
  }) => {
    if (!previousStep) return null;
    
    return (
      <div className={styles['step-connection']}>
        <div className={styles['connection-line']}>
          <div className={styles['connection-dot']}></div>
          <div className={styles['connection-arrow']}>→</div>
        </div>
        <div className={styles['connection-info']}>
          <span className={styles['connection-text']}>
            {previousStep.title}에서 만든 결과물을 활용
          </span>
          {isCompleted && (
            <span className={styles['connection-status']}>✅ 연결됨</span>
          )}
        </div>
      </div>
    );
  };

  // 단계 완료 처리 함수
  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add(stepId);
      return newSet;
    });
    
    // 모달 닫기
    setSelectedStep(null);
    
    // 성공 메시지 표시 (선택적)
    console.log(`단계 ${stepId} 완료!`);
  };

  // 단계 완료 상태 초기화
  const resetProgress = () => {
    setCompletedSteps(new Set());
  };

  // 모달에서 단계 완료 버튼 추가
  const StepDetailModal = ({ step, isOpen, onClose }: { step: any, isOpen: boolean, onClose: () => void }) => {
    if (!isOpen || !step) return null;
    
    const stepData = getCurrentStepData();
    const isCompleted = completedSteps.has(step.id.toString());
    
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>{step.title}</h2>
            <button className={styles.closeButton} onClick={onClose}>×</button>
          </div>
          
          <div className={styles.modalBody}>
            {/* 이전 단계 연결 정보 표시 */}
            {step.id > 1 && (
              <div className={styles['previous-step-info']}>
                <h4>🔗 이전 단계와의 연결</h4>
                <p>이전 단계에서 만든 결과물을 활용하여 진행합니다.</p>
              </div>
            )}
            
                         {/* 기존 가이드 내용 */}
             {stepData && (
               <div>
                 <h3>{stepData.guide?.title || step.title}</h3>
                 <p>{stepData.guide?.subtitle || step.subtitle}</p>
                 
                 {/* 단계별 가이드 */}
                 {stepData.guide?.steps?.map((guideStep: any, i: number) => (
                   <div key={i} className={styles['guide-step']}>
                     <div className={styles['guide-number']}>{guideStep.number}</div>
                     <div className={styles['guide-content']}>
                       <h3>{guideStep.title}</h3>
                       <div>{renderTextWithCodeBlocks(guideStep.description)}</div>
                       
                       {guideStep.expectedScreen && (
                         <div className={styles['expected-screen']}>
                           <strong>예상 화면:</strong> {renderTextWithCodeBlocks(guideStep.expectedScreen)}
                         </div>
                       )}
                       {guideStep.checkpoint && (
                         <div className={styles['checkpoint']}>
                           <strong>확인 방법:</strong> {renderTextWithCodeBlocks(guideStep.checkpoint)}
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
                 
                                   {/* 코드는 가이드 설명 안에서만 처리 - 별도 섹션 제거 */}
               </div>
             )}
          </div>
          
          {/* 단계 완료 버튼 */}
          <div className={styles.modalFooter}>
            {!isCompleted ? (
              <button 
                className={styles['complete-step-btn']}
                onClick={() => handleStepComplete(step.id.toString())}
              >
                ✅ 이 단계 완료하기
              </button>
            ) : (
              <div className={styles['completed-indicator']}>
                <span>✅ 완료됨</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* 중복 제목 제거 - 상위 컴포넌트에서 이미 렌더링됨 */}
      
      <div className={styles['impact-bar']}>
        <strong>🚀 {steps.length}단계로 완성되는 자동화 시스템</strong>
      </div>

      <div className={styles['flow-container']}>
        <div className={styles['progress-line']}>
          <div 
            className={styles['progress-fill']}
            style={{ width: `${(completedSteps.size / steps.length) * 100}%` }}
          />
        </div>

        <div className={styles['flow-steps']}>
          {steps.map((step, index) => (
            <div
              key={step.id || index}
              className={`${styles['flow-step']} ${
                activeSteps.includes(index) ? styles.active : ''
              }`}
              onClick={() => handleStepClick(step)}
            >
              <div className={styles['step-number']}>{index + 1}</div>
              <div className={styles['step-icon']}>{step.icon || '✨'}</div>
              <div className={styles['step-title']}>
                {step.title?.replace(/\*\*([^*]+)\*\*/g, '$1') || ''}
              </div>
              <div className={styles['step-subtitle']}>
                {step.subtitle?.replace(/\*\*([^*]+)\*\*/g, '$1') || ''}
              </div>
              <div className={styles['step-duration']}>{step.duration || '5분'}</div>
              {step.preview && (
                <div className={styles['step-preview']}>{step.preview}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedStep && (
        <div className={styles['step-modal']}>
          <div className={styles['modal-backdrop']} onClick={() => setSelectedStep(null)} />
          <div className={styles['modal-content']}>
            {/* 헤더 */}
            <div className={styles['modal-header']}>
              <button 
                className={styles['modal-close']}
                onClick={() => setSelectedStep(null)}
              >
                ✕
              </button>
              <h2 className={styles['modal-title']}>
                {selectedStep.title?.replace(/\*\*([^*]+)\*\*/g, '$1') || ''}
              </h2>
              <p className={styles['modal-subtitle']}>
                단계별 실행 가이드
              </p>
            </div>
            
            {/* 깔끔한 가이드 섹션 */}
            <div className={styles['clean-modal-body']}>
              {stepData?.guide && (
                <div>
                  {/* 기본 개념 설명 */}
                  {stepData.guide.basicConcept && (
                    <div className={styles['basic-concept']}>
                      <p>{stepData.guide.basicConcept}</p>
                    </div>
                  )}

                  {/* 단계별 가이드 */}
                  {stepData.guide.steps?.map((step: any, i: number) => (
                    <div key={i} className={styles['guide-step']}>
                      <div className={styles['guide-number']}>{step.number}</div>
                      <div className={styles['guide-content']}>
                        <h3>{step.title?.replace(/\*\*([^*]+)\*\*/g, '$1') || ''}</h3>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                          {step.description}
                        </div>
                        
                        {step.expectedScreen && (
                          <div className={styles['expected-screen']}>
                            <strong>👀 예상 결과:</strong> {step.expectedScreen}
                          </div>
                        )}
                        {step.checkpoint && (
                          <div className={styles['checkpoint']}>
                            <strong>✅ 체크포인트:</strong> {step.checkpoint}
                          </div>
                        )}

                        {/* 각 단계별 코드 블록 포함 */}
                        {stepData.guide.codeBlocks && 
                         stepData.guide.codeBlocks.length > 0 && 
                         step.number <= stepData.guide.codeBlocks.length && (
                          <div className={styles['code-section']}>
                            <h4>💻 실행 코드</h4>
                            {(() => {
                              const codeBlock = stepData.guide.codeBlocks[step.number - 1];
                              if (!codeBlock) return null;
                              return (
                                <div key={step.number} className={styles['code-block']}>
                                  <div className={styles['code-header']}>
                                    <span className={styles['code-title']}>
                                      {codeBlock.title || `코드 ${step.number}`}
                                    </span>
                                    <button
                                      className={styles['code-copy-btn']}
                                      onClick={() => navigator.clipboard.writeText(codeBlock.code)}
                                    >
                                      📋 복사
                                    </button>
                                  </div>
                                  <pre className={styles['code-content']}>
                                    <code>{codeBlock.code}</code>
                                  </pre>
                                  {codeBlock.copyInstructions && (
                                    <div className={styles['code-instructions']}>
                                      💡 {codeBlock.copyInstructions}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 팁 */}
                  {stepData.guide.tips && stepData.guide.tips.length > 0 && (
                    <div className={styles['tips-section']}>
                      <h4>💡 실전 팁</h4>
                      <div className={styles['tips-list']}>
                        {stepData.guide.tips.map((tip: string, i: number) => (
                          <div key={i} className={styles['tip-item']}>
                            <div className={styles['tip-bullet']}></div>
                            <div>{tip}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}



                  {/* 기존 executableCode 지원 (호환성) */}
                  {stepData.guide.executableCode && !stepData.guide.codeBlocks && (
                    <div className={styles['code-section']}>
                      <h4>💻 실행 코드</h4>
                      <div className={styles['code-block']}>
                        <div className={styles['code-header']}>
                          <span className={styles['code-title']}>실행 코드</span>
                          <button
                            className={styles['copy-code-btn']}
                            onClick={() => navigator.clipboard.writeText(stepData.guide.executableCode || '')}
                          >
                            📋 복사
                          </button>
                        </div>
                        <pre className={styles['code-content']}>
                          <code>{stepData.guide.executableCode}</code>
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 진행 상황 표시 */}
      {selectedStep && (
        <div className={styles['progress-section']}>
          <h3>📊 진행 상황</h3>
          <div className={styles['progress-bar']}>
            <div 
              className={styles['progress-fill']}
              style={{ 
                width: `${(completedSteps.size / steps.length) * 100}%` 
              }}
            ></div>
          </div>
          <p>{completedSteps.size} / {steps.length} 단계 완료</p>
          
          {completedSteps.size > 0 && (
            <button 
              className={styles['reset-progress-btn']}
              onClick={resetProgress}
            >
              🔄 진행 상황 초기화
            </button>
          )}
        </div>
      )}

      {/* 모달은 위에서 이미 렌더링됨 - 중복 제거 */}
    </div>
  );
};

export default FlowDiagramSection;
