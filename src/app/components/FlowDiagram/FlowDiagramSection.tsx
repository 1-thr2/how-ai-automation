import React, { useState, useEffect } from 'react';
import { FlowStep } from '@/app/types/automation';
import styles from './FlowDiagramSection.module.css';

// 3사진처럼 깔끔한 구조화된 설명 렌더링
const renderStructuredDescription = (description: string) => {
  if (!description) return null;
  
  // 텍스트를 줄 단위로 분할
  const lines = description.split('\n').filter(line => line.trim());
  
  return (
    <div className={styles['structured-description']}>
      {lines.map((line, index) => {
        const trimmedLine = line.trim();
        
        // 번호 매기기 패턴 감지 (1. 2. 3. 등)
        const numberedMatch = trimmedLine.match(/^(\d+)\.\s*(.+)$/);
        if (numberedMatch) {
          return (
            <div key={index} className={styles['numbered-item']}>
              <span className={styles['number-badge']}>{numberedMatch[1]}</span>
              <span className={styles['item-text']}>
                {convertUrlsToLinks(numberedMatch[2])}
              </span>
            </div>
          );
        }
        
        // 빈 줄이 아닌 일반 텍스트
        if (trimmedLine) {
          return (
            <div key={index} className={styles['description-paragraph']}>
              {convertUrlsToLinks(trimmedLine)}
            </div>
          );
        }
        
        return null;
      })}
    </div>
  );
};

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

// 각 스텝의 세부 단계 수를 계산하는 함수
const getStepSubStepsCount = (stepIndex: number, cards: any[]): number => {
  try {
    const guideCard = cards.find((card: any) => card.type === 'guide');
    if (!guideCard) {
      console.log(`🔍 [세부단계] stepIndex ${stepIndex}: guide 카드 없음, 기본값 3 사용`);
      return 3;
    }
    
    // detailedSteps 또는 content.detailedSteps에서 찾기
    const detailedSteps = guideCard.detailedSteps || guideCard.content?.detailedSteps;
    if (!detailedSteps || !Array.isArray(detailedSteps)) {
      console.log(`🔍 [세부단계] stepIndex ${stepIndex}: detailedSteps 없음, 기본값 3 사용`);
      return 3;
    }
    
    // 전체 단계 수를 flow steps 수로 나누어 평균 계산
    const totalSteps = detailedSteps.length;
    const flowStepsCount = cards.filter((card: any) => card.type === 'flow')?.[0]?.steps?.length || 1;
    const avgStepsPerFlow = Math.ceil(totalSteps / flowStepsCount);
    
    // 특정 stepIndex의 단계들을 찾기 (1-based number)
    const stepNumber = stepIndex + 1;
    const stepsForThisFlow = detailedSteps.filter((step: any) => {
      // step.number가 현재 플로우 단계와 매칭되는지 확인
      if (step.number === stepNumber) return true;
      
      // 또는 title에서 단계 번호 찾기
      if (step.title && typeof step.title === 'string') {
        const titleMatch = step.title.match(/^(\d+)/);
        if (titleMatch && parseInt(titleMatch[1]) === stepNumber) return true;
      }
      
      return false;
    });
    
    const result = stepsForThisFlow.length > 0 ? stepsForThisFlow.length : avgStepsPerFlow;
    console.log(`🔍 [세부단계] stepIndex ${stepIndex}: 총 ${totalSteps}개 중 ${result}개 계산됨`);
    
    // 해당 단계의 세부 단계가 있으면 그 수를, 없으면 평균값 사용
    return result;
  } catch (error) {
    console.warn('세부 단계 수 계산 중 오류:', error);
    return 3; // 오류 시 기본값
  }
};

// duration 값을 포맷팅하는 함수
const formatDuration = (duration?: string): string => {
  if (!duration) return '5-15분';
  
  // 이미 한국어 형식이면 그대로 반환
  if (duration.includes('분') || duration.includes('시간')) {
    return duration;
  }
  
  // 영어나 숫자만 있으면 분 단위로 가정
  const numMatch = duration.match(/(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num < 60) {
      return `${num}분`;
    } else {
      const hours = Math.floor(num / 60);
      const minutes = num % 60;
      return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
    }
  }
  
  return duration;
};

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

  // 콘솔에 단계별 세부 가이드 정리해서 출력하는 함수
  const logStepGuideStructure = () => {
    try {
      console.log('\n🎯 ===== 단계별 세부 가이드 구조 =====');
      
      const flowCard = cards.find((card: any) => card.type === 'flow');
      const guideCard = cards.find((card: any) => card.type === 'guide');
      
      if (flowCard?.steps) {
        console.log('\n📊 1. Flow 카드 정보:');
        console.log(`   제목: ${flowCard.title || '제목 없음'}`);
        console.log(`   단계 수: ${flowCard.steps.length}개`);
        
        flowCard.steps.forEach((step: any, index: number) => {
          console.log(`\n   ${index + 1}단계:`);
          console.log(`     🏷️  제목: ${step.title || 'N/A'}`);
          console.log(`     📝 설명: ${step.description || step.subtitle || 'N/A'}`);
          console.log(`     🛠️  도구: ${step.tool || step.techTags?.join(', ') || 'N/A'}`);
          console.log(`     ⏰ 소요시간: ${step.duration || formatDuration(step.duration)}`);
        });
      }
      
      if (guideCard?.detailedSteps || guideCard?.content?.detailedSteps) {
        const detailedSteps = guideCard.detailedSteps || guideCard.content.detailedSteps;
        console.log('\n📋 2. Guide 카드 정보:');
        console.log(`   제목: ${guideCard.title || '제목 없음'}`);
        console.log(`   세부 단계 수: ${detailedSteps.length}개`);
        
        // 단계별로 그룹화
        const stepGroups: { [key: number]: any[] } = {};
        detailedSteps.forEach((detail: any) => {
          const stepNum = detail.number || 1;
          if (!stepGroups[stepNum]) stepGroups[stepNum] = [];
          stepGroups[stepNum].push(detail);
        });
        
        Object.keys(stepGroups).forEach(stepNum => {
          const stepDetails = stepGroups[parseInt(stepNum)];
          console.log(`\n   ${stepNum}단계 세부 가이드 (${stepDetails.length}개):`);
          
          stepDetails.forEach((detail: any, idx: number) => {
            console.log(`     ${idx + 1}. ${detail.title || 'N/A'}`);
            if (detail.description) {
              const shortDesc = detail.description.length > 100 
                ? detail.description.substring(0, 100) + '...' 
                : detail.description;
              console.log(`        📄 내용: ${shortDesc}`);
            }
            if (detail.expectedScreen) {
              console.log(`        🖥️  화면: ${detail.expectedScreen}`);
            }
            if (detail.checkpoint) {
              console.log(`        ✅ 체크포인트: ${detail.checkpoint}`);
            }
          });
        });
        
        // 추가 정보
        if (guideCard.content) {
          console.log('\n📁 3. 추가 가이드 정보:');
          if (guideCard.content.executableCode) {
            console.log(`   💻 실행 코드: ${guideCard.content.executableCode.filename || 'N/A'}`);
            console.log(`   📂 저장 위치: ${guideCard.content.executableCode.saveLocation || 'N/A'}`);
          }
          if (guideCard.content.commonMistakes?.length) {
            console.log(`   ⚠️  일반적 실수: ${guideCard.content.commonMistakes.length}개`);
          }
          if (guideCard.content.errorSolutions?.length) {
            console.log(`   🔧 에러 해결책: ${guideCard.content.errorSolutions.length}개`);
          }
        }
      }
      
      // 기타 카드 정보
      const otherCards = cards.filter((card: any) => !['flow', 'guide'].includes(card.type));
      if (otherCards.length > 0) {
        console.log('\n🎁 4. 기타 카드 정보:');
        otherCards.forEach((card: any) => {
          console.log(`   ${card.type}: ${card.title || 'N/A'}`);
        });
      }
      
      console.log('\n🎯 ===== 구조 정리 완료 =====\n');
      
    } catch (error) {
      console.warn('단계별 가이드 구조 출력 중 오류:', error);
    }
  };
  // 탭 제거 - 기존 0566bb9 UI로 복구
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // 카드 데이터가 로드되면 콘솔에 구조 출력
  useEffect(() => {
    if (cards && cards.length > 0) {
      // 약간의 지연을 두고 실행 (렌더링 완료 후)
      setTimeout(() => {
        logStepGuideStructure();
      }, 500);
    }
  }, [cards]);

  // 개발자가 브라우저 콘솔에서 언제든 호출할 수 있도록 window 객체에 등록
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).logStepGuide = () => {
        console.log('🔧 [수동 호출] 단계별 가이드 구조를 다시 출력합니다...');
        logStepGuideStructure();
      };
      
      // 컴포넌트 언마운트 시 정리
      return () => {
        if ((window as any).logStepGuide) {
          delete (window as any).logStepGuide;
        }
      };
    }
  }, [cards]);

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
      console.log('🛡️ [getCurrentStepData] 3단계 방어막 시작');
      
      // 🛡️ 1순위: 백엔드에서 구조화된 detailedSteps 사용 (가장 안정적)
      if (guideCard.detailedSteps && Array.isArray(guideCard.detailedSteps) && guideCard.detailedSteps.length > 0) {
        console.log('✅ [방어막 1] 구조화된 detailedSteps 사용 -', guideCard.detailedSteps.length, '개 단계');
        console.log('🔍 [방어막 1] 실제 받은 단계들:');
        guideCard.detailedSteps.forEach((step: any, index: number) => {
          console.log(`  단계 ${index + 1}:`, {
            title: step.title,
            descriptionLength: step.description?.length || 0,
            descriptionPreview: step.description?.substring(0, 100) + '...' || 'NO_DESCRIPTION'
          });
        });
        console.log('🔍 [getCurrentStepData] codeBlocks 확인:', guideCard.codeBlocks?.length || 0, '개');
        return {
          guide: {
            title: guideCard.title || '📋 상세 가이드',
            subtitle: '단계별 실행 가이드',
            basicConcept: '아래 단계를 순서대로 따라하시면 자동화를 완성할 수 있습니다.',
            steps: guideCard.detailedSteps,
            tips: extractTipsFromContent(guideCard.content || ''),
            executableCode: guideCard.codeBlocks?.[0]?.code || null,
            codeBlocks: guideCard.codeBlocks || []
          }
        };
      }
      
      // 🛡️ 2순위: 마크다운 content 파싱 시도
      if (guideCard.content && typeof guideCard.content === 'string') {
        console.log('⚡ [방어막 2] 마크다운 파싱 시도');
        const steps = parseMarkdownSteps(guideCard.content);
        
        if (steps.length > 0) {
          console.log('✅ [방어막 2] 마크다운 파싱 성공 -', steps.length, '개 단계');
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
      }
      
      // 🛡️ 3순위: 기존 구조 지원 (호환성)
      if (guideCard.content?.detailedSteps) {
        console.log('✅ [방어막 3] 기존 구조 사용');
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
      
      // 🛡️ 최종 안전망: 모든 방법이 실패해도 기본 가이드 제공
      console.log('🚨 [최종 안전망] 모든 파싱 실패 - 기본 가이드 생성');
      return {
        guide: {
          title: guideCard.title || '📋 자동화 가이드',
          subtitle: '단계별 실행 가이드',
          basicConcept: '아래 단계를 순서대로 따라하시면 자동화를 완성할 수 있습니다.',
          steps: [
            {
              number: 1,
              title: '1단계: 계정 생성 및 로그인',
              description: '자동화에 필요한 도구들의 계정을 생성하고 로그인합니다.',
              expectedScreen: '계정 생성이 완료되고 대시보드가 표시된 화면',
              checkpoint: '계정에 정상적으로 로그인되는지 확인'
            },
            {
              number: 2,
              title: '2단계: 자동화 플로우 설정',
              description: '단계별 가이드에 따라 트리거와 액션을 설정하여 자동화를 구성합니다.',
              expectedScreen: '자동화 설정이 완료되고 활성화된 화면',
              checkpoint: '설정이 저장되고 자동화가 활성화되었는지 확인'
            },
            {
              number: 3,
              title: '3단계: 테스트 및 검증',
              description: '설정한 자동화가 제대로 작동하는지 테스트하고 완료합니다.',
              expectedScreen: '테스트 알림이 정상적으로 전송된 화면',
              checkpoint: '자동화가 예상대로 작동하는지 확인'
            }
          ],
          tips: ['💡 각 단계를 차근차근 따라하시면 성공할 수 있어요!'],
          executableCode: null,
          codeBlocks: []
        }
      };
    }
    
    return null;
  };

  // 실제 마크다운 content에서 단계 추출
  const parseMarkdownSteps = (content: string) => {
    console.log('🔍 [parseMarkdownSteps] 파싱 시작 - 길이:', content.length);
    console.log('🔍 [parseMarkdownSteps] Content 전체 구조:');
    console.log(content);
    
    // 여러 패턴 시도 - 실제 content 구조에 맞게 유연하게 파싱
    let patterns = [
      // 패턴 1: ## 1️⃣ **제목** 형태 (실제 구조!) - 더 안전한 버전
      /## (\d+)️⃣ \*\*([^*]+)\*\*([\s\S]*?)(?=\n## \d+️⃣|\n---|\n## 📂|\n## 🎉|$)/g,
      // 패턴 2: ## 1️⃣ **제목** 형태 (단순 버전)
      /## (\d+)️⃣ \*\*([^*]+)\*\*([\s\S]*?)(?=\n## |\n---|\n#{1,3} |$)/g,
      // 패턴 3: ### **1️⃣ 형태
      /### \*\*(\d+)️⃣\s*\*?\*?\s*([^#\n]+)([\s\S]*?)(?=### \*\*\d+️⃣|\n---|\n## |$)/g,
      // 패턴 4: ## ✅ **방법 1: 형태  
      /## ✅ \*\*방법 (\d+): ([^#\n]+)([\s\S]*?)(?=## ✅|\n---|\n## |$)/g,
      // 패턴 5: ### 1️⃣ **제목** 형태
      /### (\d+)️⃣ \*\*([^*]+)\*\*([\s\S]*?)(?=### \d+️⃣|\n---|\n## |$)/g
    ];
    
    let steps = [];
    let stepNumber = 1;
    
    // 각 패턴을 순서대로 시도
    for (let i = 0; i < patterns.length; i++) {
      let pattern = patterns[i];
      pattern.lastIndex = 0; // regex 상태 초기화
      let match;
      
      console.log(`🔍 [parseMarkdownSteps] 패턴 ${i + 1} 시도 중...`);
      
      while ((match = pattern.exec(content)) !== null) {
        console.log(`✅ [parseMarkdownSteps] 패턴 ${i + 1} 매칭 성공!`, {
          rawMatch: match[0].substring(0, 100),
          stepNum: match[1],
          title: match[2],
          contentLength: match[3]?.length || 0
        });
        
        let title = match[2]?.trim() || '';
        let description = match[3]?.trim() || '';
        
        // 제목에서 마크다운 제거
        title = title.replace(/\*\*([^*]+)\*\*/g, '$1');
        
        // 설명에서 불필요한 마크다운 제거  
        description = description
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/### ([^#\n]+)/g, '$1')
          .replace(/\n\n+/g, '\n')
          .substring(0, 300);
        
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
      
      // 하나의 패턴에서 단계를 찾았으면 중단
      if (steps.length > 0) {
        console.log(`✅ [parseMarkdownSteps] 패턴 ${i + 1} 성공 - ${steps.length}개 단계`);
        break;
      } else {
        console.log(`❌ [parseMarkdownSteps] 패턴 ${i + 1} 실패`);
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
      {/* 제목 섹션 제거 - 상위 컴포넌트에서 이미 렌더링됨 */}

      {/* 기존 디자인 복원 (두 번째 사진 스타일) */}
      <div className={styles['restored-flow-container']}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id || index}>
            {/* 카드 */}
            <div
              className={`${styles['restored-step-card']} ${
                activeSteps.includes(index) ? styles.active : ''
              }`}
              onClick={() => handleStepClick(step)}
            >
              {/* 단계 번호 */}
              <div className={styles['restored-step-number']}>
                {index + 1}
              </div>
              
              {/* 카드 내용 */}
              <div className={styles['restored-card-content']}>
                {/* 왼쪽: 그라데이션 아이콘 박스 */}
                <div className={styles['restored-icon-box']} data-step-index={index}>
                  <div className={styles['restored-icon']}>
                    {step.icon || (index === 0 ? '🚀' : index === 1 ? '⚡' : '📊')}
                  </div>
                </div>
                
                {/* 오른쪽: 콘텐츠 영역 */}
                <div className={styles['restored-content-area']}>
                  <h3 className={styles['restored-title']}>
                    {step.title?.replace(/\*\*([^*]+)\*\*/g, '$1') || ''}
                  </h3>
                  
                  <div className={styles['restored-meta-info']}>
                    <span className={styles['restored-meta-item']}>
                      📊 {getStepSubStepsCount(index, cards)}개 세부단계 포함
                    </span>
                    <span className={styles['restored-meta-item']}>
                      ⏰ {formatDuration(step.duration)}
                    </span>
                  </div>
                  
                  <button className={styles['restored-guide-btn']}>
                    클릭해서 상세 가이드 보기
                  </button>
                </div>
              </div>
            </div>
            
            {/* 카드 외부 연결선 (화살표 없음) */}
            {index < steps.length - 1 && (
              <div className={styles['external-connector']}>
                <div className={styles['external-connector-line']}></div>
              </div>
            )}
          </React.Fragment>
        ))}
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

                  {/* 단계별 가이드 - selectedStep에 맞는 단계만 표시 */}
                  {(() => {
                    // 🎯 순서 기반 매칭 (확장성 있는 방식)
                    const getRelevantSteps = () => {
                      if (!stepData.guide.steps || !selectedStep) return [];
                      
                      const selectedStepId = parseInt(selectedStep.id);
                      console.log('🔍 [Modal Filter] selectedStep.id:', selectedStepId);
                      console.log('🔍 [Modal Filter] 전체 guide steps:', stepData.guide.steps.length, '개');
                      
                      // 직접 매칭: Flow step id = Guide step number
                      const directMatch = stepData.guide.steps.find((step: any) => step.number === selectedStepId);
                      
                      if (directMatch) {
                        console.log('✅ [Modal Filter] 직접 매칭 성공:', directMatch.title);
                        return [directMatch];
                      }
                      
                      // Fallback: 해당 인덱스의 단계 (0-based)
                      const fallbackStep = stepData.guide.steps[selectedStepId - 1];
                      if (fallbackStep) {
                        console.log('🔄 [Modal Filter] 인덱스 기반 매칭:', fallbackStep.title);
                        return [fallbackStep];
                      }
                      
                      // 최종 Fallback: 첫 번째 단계
                      console.log('🚨 [Modal Filter] 매칭 실패 - 첫 번째 단계 사용');
                      return stepData.guide.steps.slice(0, 1);
                    };
                    
                    const relevantSteps = getRelevantSteps();
                    
                    return relevantSteps.map((step: any, i: number) => (
                      <div key={i} className={styles['guide-step']}>
                        <div className={styles['guide-number']}>{step.number}</div>
                        <div className={styles['guide-content']}>
                          <h3>{step.title?.replace(/\*\*([^*]+)\*\*/g, '$1') || ''}</h3>
                          <div className={styles['step-description']}>
                            {renderStructuredDescription(step.description)}
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

                        {/* 각 단계별 코드 블록 포함 - 조건 완화 */}
                        {(() => {
                          console.log('🔍 [코드블록] stepData.guide.codeBlocks:', stepData.guide.codeBlocks?.length || 0);
                          console.log('🔍 [코드블록] step.number:', step.number);
                          
                          // 조건 완화: codeBlocks가 있으면 표시 시도
                          if (stepData.guide.codeBlocks && stepData.guide.codeBlocks.length > 0) {
                            // 해당 단계의 코드 블록 또는 첫 번째 코드 블록 사용
                            const codeBlock = stepData.guide.codeBlocks[step.number - 1] || stepData.guide.codeBlocks[0];
                            
                            if (codeBlock && codeBlock.code) {
                              return (
                                <div className={styles['code-section']}>
                                  <h4>💻 실행 코드</h4>
                                  <div className={styles['code-block']}>
                                    <div className={styles['code-header']}>
                                      <span className={styles['code-title']}>
                                        {codeBlock.title || `${step.title} 코드`}
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
                                </div>
                              );
                            }
                          }
                          
                          // description에서 코드 블록 추출 시도
                          if (step.description && step.description.includes('```')) {
                            const codeMatch = step.description.match(/```(\w+)?\n([\s\S]*?)```/);
                            if (codeMatch && codeMatch[2]) {
                              return (
                                <div className={styles['code-section']}>
                                  <h4>💻 실행 코드</h4>
                                  <div className={styles['code-block']}>
                                    <div className={styles['code-header']}>
                                      <span className={styles['code-title']}>
                                        {step.title} 코드
                                      </span>
                                      <button
                                        className={styles['code-copy-btn']}
                                        onClick={() => navigator.clipboard.writeText(codeMatch[2].trim())}
                                      >
                                        📋 복사
                                      </button>
                                    </div>
                                    <pre className={styles['code-content']}>
                                      <code>{codeMatch[2].trim()}</code>
                                    </pre>
                                  </div>
                                </div>
                              );
                            }
                          }
                          
                          return null;
                        })()}
                        </div>
                      </div>
                    ));
                  })()}
                  
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
