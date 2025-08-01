import React, { useState, useEffect } from 'react';
import { FlowStep } from '@/app/types/automation';
import styles from './FlowDiagram/FlowDiagramSection.module.css';

interface FlowDiagramSectionProps {
  steps: FlowStep[];
  onStepClick?: (step: FlowStep) => void;
  cards?: any[];
  engine?: string;
  flowMap?: string[];
  fallback?: {
    method: string;
    reason: string;
  };
  flowTitle?: string;
  flowSubtitle?: string;
}

const FlowDiagramSection: React.FC<FlowDiagramSectionProps> = ({ steps, onStepClick, cards = [], engine, flowMap, fallback, flowTitle, flowSubtitle }) => {
  const [activeSteps, setActiveSteps] = useState<number[]>([]);
  const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);


  useEffect(() => {
    // 단계별로 순차적으로 애니메이션 적용
    steps.forEach((_, index) => {
      setTimeout(() => {
        setActiveSteps(prev => [...prev, index]);
      }, index * 150);
    });
  }, [steps]);

  const handleStepClick = (step: FlowStep) => {
    setSelectedStep(step);

    onStepClick?.(step);
  };

  // 각 단계별 세부단계 수 계산
  const getStepDetails = (stepId: string | number) => {
    const guideCard = cards.find((card: any) => 
      card.type === 'guide' && card.stepId === String(stepId)
    );
    
    const detailStepCount = guideCard?.content?.detailedSteps?.length || 3;
    return {
      stepCount: detailStepCount,
      isCore: true // 모든 단계를 핵심단계로 간주
    };
  };

  // 텍스트에서 링크와 특별한 요소들을 처리하는 함수
  const renderTextWithLinks = (text: string) => {
    // URL 패턴 매칭 - 더 정확하게
    const urlPattern = /(https?:\/\/[^\s\)]+)/g;
    // 따옴표로 감싸진 중요한 용어만 강조 (한 글자는 제외)
    const quotedPattern = /'([^']{2,})'/g;
    // 화살표 패턴 - 개선된 처리
    const arrowPattern = /→/g;
    
    let processedText = text;
    
    // 모호한 표현을 구체적으로 변경
    const clarifications = [
      { 
        pattern: /주소창 클릭/g, 
        replacement: '<span class="highlight-text">브라우저 주소창 클릭</span>' 
      },
      { 
        pattern: /주소창에/g, 
        replacement: '브라우저 주소창에' 
      },
      { 
        pattern: /cmd/g, 
        replacement: '<span class="highlight-text">명령 프롬프트(cmd)</span>' 
      },
      { 
        pattern: /터미널/g, 
        replacement: '<span class="highlight-text">터미널(명령 프롬프트)</span>' 
      }
    ];
    
    // 명확한 표현으로 변경
    clarifications.forEach(({ pattern, replacement }) => {
      processedText = processedText.replace(pattern, replacement);
    });
    
    // 링크 처리 - 실제 URL만
    processedText = processedText.replace(urlPattern, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-link">${url}</a>`;
    });
    
    // 굵은 텍스트 처리 (**텍스트** → <strong>텍스트</strong>)
    const boldPattern = /\*\*([^*]+)\*\*/g;
    processedText = processedText.replace(boldPattern, (match, content) => {
      return `<strong style="font-weight: bold; color: #1f2937;">${content}</strong>`;
    });
    
    // 따옴표 텍스트 강조 (2글자 이상만)
    processedText = processedText.replace(quotedPattern, (match, content) => {
      return `<span class="highlight-text">'${content}'</span>`;
    });
    
    // 화살표 처리를 개선 - 덜 시각적으로 눈에 띄게
    processedText = processedText.replace(arrowPattern, '<span class="arrow-subtle">→</span>');
    
    return <span dangerouslySetInnerHTML={{ __html: processedText }} />;
  };

  // 현재 선택된 단계의 가이드 데이터 가져오기
  const getCurrentStepData = () => {
    if (!selectedStep) return null;
    
    // 1순위: 전용 guide 카드 찾기 (실제 데이터 구조에 맞게 수정)
    const guideCard = cards.find((card: any) => 
      card.type === 'guide' && card.stepId === String(selectedStep.id)
    );
    
    console.log('🔍 [getCurrentStepData] guideCard:', guideCard);
    console.log('🔍 [getCurrentStepData] selectedStep.id:', selectedStep.id);
    
    if (guideCard) {
      // 실제 데이터 구조에 맞게 수정
      const detailedSteps = guideCard.detailedSteps || guideCard.content?.detailedSteps || [];
      const practicalTips = guideCard.practicalTips || guideCard.content?.practicalTips || [];
      const commonMistakes = guideCard.commonMistakes || guideCard.content?.commonMistakes || [];
      
      return {
        guide: {
          title: guideCard.title,
          subtitle: guideCard.subtitle,
          steps: detailedSteps,
          executableCode: guideCard.content?.executableCode || null,
          tips: practicalTips,
          errorSolutions: commonMistakes
        }
      };
    }
    
    // 2순위: flow 카드에서 현재 단계 정보 추출 (실제 GPT 데이터 사용)
    const flowCard = cards.find((card: any) => card.type === 'flow');
    if (flowCard && selectedStep) {
      // 🔥 실제 GPT가 생성한 단계별 데이터를 사용
      const currentStepIndex = parseInt(selectedStep.id) - 1;
      const actualStep = flowCard.steps?.[currentStepIndex];
      
      console.log('🔍 [getCurrentStepData] currentStepIndex:', currentStepIndex);
      console.log('🔍 [getCurrentStepData] actualStep:', actualStep);
      console.log('🔍 [getCurrentStepData] typeof actualStep:', typeof actualStep);
      
      if (actualStep) {
        // 🔧 문자열과 객체 모두 처리
        let stepTitle, stepDescription;
        
        if (typeof actualStep === 'string') {
          // 문자열인 경우
          stepTitle = actualStep.replace(/^\d+\.\s*/, '');
          stepDescription = actualStep;
        } else {
          // 객체인 경우
          stepTitle = actualStep.title || selectedStep.title;
          stepDescription = actualStep.description || actualStep.content || stepTitle;
        }
        
        if (stepDescription) {
          // 실제 단계 설명을 상세 가이드로 변환
          const detailedSteps = [{
            number: 1,
            title: stepTitle,
            description: stepDescription,
            expectedScreen: `${stepTitle} 관련 화면`,
            checkpoint: `${stepTitle} 완료`
          }];

          return {
            guide: {
              title: stepTitle,
              subtitle: selectedStep.subtitle || '실제 실행 가이드',
              steps: detailedSteps,
              executableCode: null,
              tips: [
                `💡 이 방법대로 하시면 100% 성공해요!`,
                "🔍 각 단계를 정확히 따라하시면 바로 작동합니다",
                "📝 문제가 생기면 이전 단계로 돌아가서 다시 확인해보세요"
              ],
              errorSolutions: []
            }
          };
        }
      }
    }
    
    return null;
  };

  const stepData = getCurrentStepData();

  // 플로우 개수에 따른 동적 스타일 계산
  const containerStyle = {
    minHeight: steps.length === 1 ? 'auto' : 'auto',
    paddingBottom: steps.length === 1 ? '20px' : '40px'
  };

  return (
    <div className={styles.container} style={containerStyle}>
      {/* 사용자 친화적 헤더 */}
      {engine && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900">
              🚀 {flowTitle || (engine === 'make' ? '자동화 시나리오 설정 가이드' : 
                   engine === 'zapier' ? '워크플로우 연결 가이드' :
                   engine === 'apps_script' ? 'Google 스크립트 가이드' : 
                   '자동화 플로우 가이드')}
            </h3>
            <div className="text-sm text-purple-700 bg-purple-100 px-2 py-1 rounded">
              단계별 진행
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {flowSubtitle || (engine === 'make' ? 'Make.com에서 자동화를 만들어보세요' :
             engine === 'zapier' ? 'Zapier로 연결 자동화를 구축하세요' :
             engine === 'apps_script' ? 'Google Apps Script로 맞춤 자동화를 만드세요' :
             '자동화 플랫폼에서 워크플로우를 구성하세요')}
          </p>
          {fallback && (
            <div className="mt-2 text-sm text-amber-700 bg-amber-100 rounded px-3 py-2 border-l-4 border-amber-400">
              💡 <strong>대안 방법:</strong> {
                fallback.method === 'csv_download' ? 'CSV 파일 다운로드로 데이터 수집' :
                fallback.method === 'browserless' ? '브라우저 자동화로 데이터 수집' :
                fallback.method === 'unofficial_api' ? '비공식 API 활용' : 'RPA 도구 활용'
              } (공식 API 미지원)
            </div>
          )}
        </div>
      )}
      
      {/* 플로우 컨테이너 */}
      <div className={styles['flow-container']}>
        <div className={styles['flow-steps']}>
          {steps.map((step, index) => {
            const stepDetails = getStepDetails(step.id || index + 1);
            
            return (
              <div
                key={step.id || index}
                className={`${styles['flow-step']} ${
                  activeSteps.includes(index) ? styles.active : ''
                }`}
                onClick={() => handleStepClick(step)}
              >
                <div className={styles['step-number']}>{index + 1}</div>
                
                <div className={styles['step-icon']}>
                  {step.icon || '🔧'}
                </div>
                
                <div className={styles['step-content']}>
                  <div className={styles['step-title']}>
                    {step.title}
                  </div>
                  
                  {step.subtitle && (
                    <div className={styles['step-subtitle']}>
                      {step.subtitle}
                    </div>
                  )}
                  
                  <div className={styles['step-info']}>
                    <span className={`${styles['step-tag']} ${styles.steps}`}>
                      📝 {stepDetails.stepCount}개 세부단계 포함
                    </span>
                    <div className={styles['step-duration']}>
                      {step.duration || '5분'}
                    </div>
                  </div>
                  
                  <button 
                    className={styles['step-action']}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStepClick(step);
                    }}
                  >
                    클릭해서 상세 가이드 보기
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 새로운 모달 */}
      {selectedStep && (
        <div className={styles['step-modal']}>
          <div className={styles['modal-backdrop']} onClick={() => setSelectedStep(null)} />
          <div className={styles['modal-content']}>
            {/* 새로운 모달 헤더 */}
            <div className={styles['new-modal-header']}>
              <button 
                className={styles['modal-close']}
                onClick={() => setSelectedStep(null)}
              >
                ✕
              </button>
              <div className={styles['header-content']}>
                <h2 className={styles['new-modal-title']}>
                  {stepData?.guide?.title || selectedStep.title}
                </h2>
                <p className={styles['new-modal-subtitle']}>
                  {stepData?.guide?.subtitle || selectedStep.subtitle}
                </p>
              </div>
            </div>

            {/* 모달 제목만 표시 - 탭 제거 */}
            <div className={styles['modal-header-only']}>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 상세 가이드</h4>
            </div>

            {/* 깔끔한 가이드 섹션 */}
            <div className={styles['clean-modal-body']}>
              {stepData?.guide ? (
                <>
                  {/* 헤더 */}
                  <div className={styles['clean-header']}>
                    <span className={styles['clean-icon']}>📋</span>
                    <h3>{stepData.guide.title}</h3>
                  </div>

                  {/* 기본 개념 (간단하게) */}
                  {cards.find((card: any) => card.type === 'guide' && card.stepId === String(selectedStep.id))?.basicConcept && (
                    <div className={styles['clean-concept']}>
                      💡 {cards.find((card: any) => card.type === 'guide' && card.stepId === String(selectedStep.id))?.basicConcept}
                    </div>
                  )}

                  {/* 단계별 가이드 (간단하게만 - 코드 제외) */}
                  {stepData.guide.steps?.map((step: any, i: number) => (
                    <div key={i} className={styles['clean-step']}>
                      <div className={styles['clean-step-header']}>
                        <span className={styles['clean-step-number']}>{step.number}</span>
                        <h4>{step.title}</h4>
                      </div>
                      
                      <div className={styles['clean-step-content']}>
                        {step.description.split('\n').map((line: string, lineIndex: number) => {
                          const trimmedLine = line.trim();
                          if (!trimmedLine) return null;
                          
                          // 코드 블록 처리 (각 단계에서 바로 표시)
                          if (/^```/.test(trimmedLine)) {
                            const codeLines: string[] = [];
                            let currentIndex = lineIndex + 1;
                            const allLines = step.description.split('\n');
                            
                            while (currentIndex < allLines.length) {
                              const nextLine = allLines[currentIndex].trim();
                              if (nextLine === '```') break;
                              if (nextLine) codeLines.push(nextLine);
                              currentIndex++;
                            }
                            
                            if (codeLines.length > 0) {
                              return (
                                <div key={lineIndex} className={styles['step-code-block']}>
                                  <div className={styles['step-code-header']}>
                                    💻 실행 코드
                                    <button
                                      className={styles['step-copy-btn']}
                                      onClick={() => navigator.clipboard.writeText(codeLines.join('\n'))}
                                    >
                                      복사
                                    </button>
                                  </div>
                                  <pre className={styles['step-code-content']}><code>{codeLines.join('\n')}</code></pre>
                                </div>
                              );
                            }
                            return null;
                          }
                          
                          // 번호 단계
                          if (/^\d+\.\s/.test(trimmedLine)) {
                            return (
                              <div key={lineIndex} className={styles['clean-numbered-step']}>
                                <span className={styles['clean-number']}>{trimmedLine.match(/^\d+/)?.[0]}</span>
                                <span>{renderTextWithLinks(trimmedLine.replace(/^\d+\.\s*/, ''))}</span>
                              </div>
                            );
                          }
                          
                          // 불릿 포인트
                          if (/^[-•]\s/.test(trimmedLine)) {
                            return (
                              <div key={lineIndex} className={styles['clean-bullet']}>
                                <span>•</span>
                                <span>{renderTextWithLinks(trimmedLine.replace(/^[-•]\s*/, ''))}</span>
                              </div>
                            );
                          }
                          
                          // 일반 텍스트
                          return (
                            <p key={lineIndex} className={styles['clean-text']}>
                              {renderTextWithLinks(trimmedLine)}
                            </p>
                          );
                        })}
                        
                        {/* 예상 결과 & 체크포인트 (간단하게) */}
                        {step.expectedScreen && (
                          <div className={styles['clean-info']}>
                            <strong>👀 예상 결과:</strong> {step.expectedScreen}
                          </div>
                        )}
                        
                        {step.checkpoint && (
                          <div className={styles['clean-success']}>
                            <strong>✅ 체크포인트:</strong> {step.checkpoint}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 완성코드 섹션 (깔끔하게) */}
                  {stepData.guide.executableCode && (
                    <div className={styles['final-code-section']}>
                      <div className={styles['final-code-header']}>
                        <span className={styles['final-code-icon']}>💻</span>
                        <h4>완성 코드</h4>
                        <button
                          className={styles['final-copy-btn']}
                          onClick={() => navigator.clipboard.writeText(stepData.guide.executableCode?.code || '')}
                        >
                          복사
                        </button>
                      </div>
                      
                      <div className={styles['final-code-container']}>
                        <pre className={styles['final-code-block']}><code>{stepData.guide.executableCode?.code}</code></pre>
                      </div>
                      
                      {/* 실행 방법 (단계별로 나누어서) */}
                      {stepData.guide.executableCode?.howToRun && (
                        <div className={styles['final-howto-section']}>
                          <h5 className={styles['final-section-title']}>
                            <span className={styles['final-section-icon']}>🚀</span>
                            실행 방법
                          </h5>
                          <div className={styles['final-howto-steps']}>
                            {stepData.guide.executableCode.howToRun.split(/\d+\.\s/).filter(Boolean).map((step: string, idx: number) => (
                              <div key={idx} className={styles['final-howto-step']}>
                                <span className={styles['final-step-number']}>{idx + 1}</span>
                                <span className={styles['final-step-text']}>{step.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 값 교체 (더 보기 쉽게) */}
                      {stepData.guide.executableCode?.valueReplacements && stepData.guide.executableCode.valueReplacements.length > 0 && (
                        <div className={styles['final-replacements-section']}>
                          <h5 className={styles['final-section-title']}>
                            <span className={styles['final-section-icon']}>🔄</span>
                            값 교체하기
                          </h5>
                          <div className={styles['final-replacements-list']}>
                            {stepData.guide.executableCode.valueReplacements.map((replacement: any, idx: number) => (
                              <div key={idx} className={styles['final-replacement-item']}>
                                <div className={styles['final-replacement-from']}>
                                  <code>{replacement.placeholder}</code>
                                </div>
                                <div className={styles['final-replacement-arrow']}>→</div>
                                <div className={styles['final-replacement-to']}>
                                  {replacement.howToReplace}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 팁 섹션 (간단하게) */}
                  {stepData.guide.tips && stepData.guide.tips.length > 0 && (
                    <div className={styles['clean-tips']}>
                      <strong>💡 유용한 팁:</strong>
                      {stepData.guide.tips.map((tip: string, i: number) => (
                        <div key={i} className={styles['clean-tip']}>• {tip}</div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // stepData가 없는 경우 대체 콘텐츠 표시
                <div className={styles['clean-fallback']}>
                  <div className={styles['clean-header']}>
                    <span className={styles['clean-icon']}>📋</span>
                    <h3>{selectedStep?.title || '단계별 가이드'}</h3>
                  </div>
                  
                  <div className={styles['clean-content']}>
                    <p className={styles['clean-description']}>
                      {selectedStep?.description || '이 단계에 대한 상세 가이드를 준비 중입니다.'}
                    </p>
                    
                    <div className={styles['clean-steps']}>
                      <h4>📝 기본 실행 단계:</h4>
                      <div className={styles['clean-step']}>
                        <span className={styles['clean-step-number']}>1</span>
                        <div className={styles['clean-step-content']}>
                          <h5>시작하기</h5>
                          <p>해당 도구나 플랫폼에 접속합니다.</p>
                        </div>
                      </div>
                      <div className={styles['clean-step']}>
                        <span className={styles['clean-step-number']}>2</span>
                        <div className={styles['clean-step-content']}>
                          <h5>설정하기</h5>
                          <p>필요한 설정을 진행합니다.</p>
                        </div>
                      </div>
                      <div className={styles['clean-step']}>
                        <span className={styles['clean-step-number']}>3</span>
                        <div className={styles['clean-step-content']}>
                          <h5>완료하기</h5>
                          <p>설정을 저장하고 테스트합니다.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowDiagramSection; 