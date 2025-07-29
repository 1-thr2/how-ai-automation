import React, { useState } from 'react';
import { Card, GuideCard } from '@/lib/types/automation';

interface StepDetailModalProps {
  open: boolean;
  onClose: () => void;
  cards: Card[];
}

// 🎯 **굵은 텍스트** 렌더링 함수
const renderBoldText = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.replace(/^\*\*|\*\*$/g, '');
          return <strong key={index} className="font-bold text-gray-900">{boldText}</strong>;
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

// 🎯 친절한 가이드 텍스트를 HTML로 변환하는 컴포넌트
const FriendlyGuideRenderer: React.FC<{ content: string }> = ({ content }) => {
  // 마크다운 스타일 텍스트를 JSX로 변환
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentSection: JSX.Element[] = [];
    let sectionType = 'normal';
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // 빈 줄 처리
      if (!trimmed) {
        if (currentSection.length > 0) {
          elements.push(renderSection(currentSection, sectionType, elements.length));
          currentSection = [];
          sectionType = 'normal';
        }
        return;
      }
      
      // **제목** 처리
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        if (currentSection.length > 0) {
          elements.push(renderSection(currentSection, sectionType, elements.length));
          currentSection = [];
        }
        const title = trimmed.replace(/^\*\*|\*\*$/g, '');
        elements.push(
          <h3 key={elements.length} className="text-lg font-bold text-gray-800 mt-6 mb-3 border-b border-gray-200 pb-2">
            {title}
          </h3>
        );
        return;
      }
      
      // 번호 리스트 (1. 2. 3.) 처리
      if (/^\d+\.\s/.test(trimmed)) {
        if (sectionType !== 'numbered') {
          if (currentSection.length > 0) {
            elements.push(renderSection(currentSection, sectionType, elements.length));
            currentSection = [];
          }
          sectionType = 'numbered';
        }
        const content = trimmed.replace(/^\d+\.\s/, '');
        currentSection.push(
          <div key={currentSection.length} className="flex items-start gap-3 mb-3">
            <div className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
              {currentSection.length + 1}
            </div>
            <div className="text-gray-700 leading-relaxed">{renderBoldText(content)}</div>
          </div>
        );
        return;
      }
      
      // 불릿 포인트 (• 또는 -) 처리
      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        if (sectionType !== 'bullet') {
          if (currentSection.length > 0) {
            elements.push(renderSection(currentSection, sectionType, elements.length));
            currentSection = [];
          }
          sectionType = 'bullet';
        }
        const content = trimmed.replace(/^[•-]\s*/, '');
        currentSection.push(
          <div key={currentSection.length} className="flex items-start gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
            <div className="text-gray-600 text-sm">{renderBoldText(content)}</div>
          </div>
        );
        return;
      }
      
      // ⚠️ 경고 메시지 처리
      if (trimmed.startsWith('⚠️') || trimmed.includes('중요') || trimmed.includes('주의')) {
        elements.push(
          <div key={elements.length} className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-500 text-lg">⚠️</span>
              <span className="font-bold text-red-800">중요 안내</span>
            </div>
            <div className="text-red-700 text-sm">{trimmed.replace(/^⚠️\s*\*\*[^*]+\*\*:\s*/, '')}</div>
          </div>
        );
        return;
      }
      
      // 💡 팁 메시지 처리
      if (trimmed.startsWith('💡') || trimmed.includes('팁:')) {
        elements.push(
          <div key={elements.length} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-500 text-lg">💡</span>
              <span className="font-bold text-blue-800">팁</span>
            </div>
            <div className="text-blue-700 text-sm">{trimmed.replace(/^💡\s*\*\*[^*]+\*\*:\s*/, '')}</div>
          </div>
        );
        return;
      }
      
      // 일반 텍스트
      if (sectionType !== 'normal') {
        if (currentSection.length > 0) {
          elements.push(renderSection(currentSection, sectionType, elements.length));
          currentSection = [];
        }
        sectionType = 'normal';
      }
      currentSection.push(
        <p key={currentSection.length} className="text-gray-700 leading-relaxed mb-3">
          {renderBoldText(trimmed)}
        </p>
      );
    });
    
    // 마지막 섹션 처리
    if (currentSection.length > 0) {
      elements.push(renderSection(currentSection, sectionType, elements.length));
    }
    
    return elements;
  };
  
  const renderSection = (items: JSX.Element[], type: string, key: number) => {
    switch (type) {
      case 'numbered':
        return (
          <div key={key} className="bg-gray-50 rounded-lg p-4 mb-4">
            {items}
          </div>
        );
      case 'bullet':
        return (
          <div key={key} className="bg-blue-50 rounded-lg p-4 mb-4">
            {items}
          </div>
        );
      default:
        return <div key={key}>{items}</div>;
    }
  };
  
  return <div className="space-y-2">{renderContent(content)}</div>;
};

// 🎯 개선된 코드 블록 컴포넌트
const EnhancedCodeBlock: React.FC<{ code: string; title?: string }> = ({ code, title }) => {
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // 코드와 사용법 설명 분리
  const [instructions, actualCode] = code.includes('**') && code.includes('사용법') 
    ? code.split(/```[\s\S]*?```/).filter(part => part.trim())
    : ['', code];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
      {/* 헤더 */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            💻 {title || '실행 코드'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {instructions && (
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors"
            >
              {showInstructions ? '사용법 숨기기' : '사용법 보기'}
        </button>
          )}
          <button
            onClick={handleCopy}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              copied 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {copied ? '✅ 복사됨!' : '📋 복사'}
        </button>
        </div>
      </div>
      
      {/* 사용법 설명 */}
      {showInstructions && instructions && (
        <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
          <FriendlyGuideRenderer content={instructions} />
        </div>
      )}
      
      {/* 코드 */}
      <div className="bg-gray-900 text-green-400 p-4 overflow-x-auto">
        <pre className="text-sm leading-relaxed">
          <code>{actualCode.replace(/```[\w]*\n?|```/g, '').trim()}</code>
        </pre>
      </div>
    </div>
  );
};

const StepDetailModal: React.FC<StepDetailModalProps> = ({ open, onClose, cards }) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'faq' | 'troubleshoot'>('guide');
  
  if (!open || !cards.length) return null;

  const guideCard = cards.find(c => c.type === 'guide');
  const faqCard = cards.find(c => c.type === 'faq');
  const troubleshootCard = cards.find(c => c.type === 'tip');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <button 
            onClick={onClose}
            className="float-right bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
          <h2 className="text-xl font-bold mb-2">{guideCard?.title || '상세 가이드'}</h2>
          <p className="text-blue-100 text-sm">{guideCard?.subtitle || '단계별로 따라하시면 됩니다'}</p>
        </div>
        
        {/* 탭 메뉴 */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'guide'
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📖 실행 가이드
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'faq'
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ❓ 자주 묻는 질문
            </button>
            <button
              onClick={() => setActiveTab('troubleshoot')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'troubleshoot'
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🔧 문제 해결
            </button>
          </div>
        </div>
        
        {/* 내용 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'guide' && guideCard && (
        <div>
              {/* 단계별 가이드 */}
              {guideCard.content?.steps?.map((step: any, i: number) => (
                <div key={i} className="mb-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {step.number}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{step.title}</h3>
                      <FriendlyGuideRenderer content={step.description} />
                    </div>
              </div>
            </div>
          ))}
          
              {/* 코드 블록 */}
              {guideCard.content?.code && (
                <EnhancedCodeBlock 
                  code={guideCard.content.code} 
                  title="실행 코드"
                />
              )}
              
              {/* Import 블록들 */}
              {((guideCard.content as any)?.importBlocks || (guideCard as any).importBlocks) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-bold text-green-800 mb-3">📥 바로 복사해서 사용하기</h4>
                  <div className="space-y-3">
                    {((guideCard.content as any)?.importBlocks?.make_import_json || (guideCard as any).importBlocks?.make_import_json) && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-green-700">Make.com 시나리오 JSON</span>
                          <button
                            className="bg-green-600 text-white rounded px-3 py-1 text-xs hover:bg-green-700"
                            onClick={() => navigator.clipboard.writeText(
                              (guideCard.content as any)?.importBlocks?.make_import_json || (guideCard as any).importBlocks?.make_import_json || ''
                            )}
                          >
                            📋 복사
                          </button>
                        </div>
                        <pre className="bg-white border rounded p-2 text-xs text-green-800 overflow-x-auto">
                          {(guideCard.content as any)?.importBlocks?.make_import_json || (guideCard as any).importBlocks?.make_import_json}
                        </pre>
                      </div>
                    )}
                    {((guideCard.content as any)?.importBlocks?.sheet_header_csv || (guideCard as any).importBlocks?.sheet_header_csv) && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-green-700">Google Sheets 헤더</span>
                          <button
                            className="bg-green-600 text-white rounded px-3 py-1 text-xs hover:bg-green-700"
                            onClick={() => navigator.clipboard.writeText(
                              (guideCard.content as any)?.importBlocks?.sheet_header_csv || (guideCard as any).importBlocks?.sheet_header_csv || ''
                            )}
                          >
                            📋 복사
                          </button>
                        </div>
                        <pre className="bg-white border rounded p-2 text-xs text-green-800 overflow-x-auto">
                          {(guideCard.content as any)?.importBlocks?.sheet_header_csv || (guideCard as any).importBlocks?.sheet_header_csv}
                        </pre>
                      </div>
                    )}
                    {(guideCard as any).importBlocks?.zapier_template && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-green-700">Zapier 템플릿</span>
                          <button
                            className="bg-green-600 text-white rounded px-3 py-1 text-xs hover:bg-green-700"
                            onClick={() => navigator.clipboard.writeText((guideCard as any).importBlocks?.zapier_template || '')}
                          >
                            📋 복사
                          </button>
                        </div>
                        <pre className="bg-white border rounded p-2 text-xs text-green-800 overflow-x-auto">
                          {(guideCard as any).importBlocks.zapier_template}
                        </pre>
                      </div>
                    )}
                    {(guideCard as any).importBlocks?.apps_script_code && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-green-700">Apps Script 코드</span>
                          <button
                            className="bg-green-600 text-white rounded px-3 py-1 text-xs hover:bg-green-700"
                            onClick={() => navigator.clipboard.writeText((guideCard as any).importBlocks?.apps_script_code || '')}
                          >
                            📋 복사
                          </button>
                        </div>
                        <pre className="bg-white border rounded p-2 text-xs text-green-800 overflow-x-auto">
                          {(guideCard as any).importBlocks.apps_script_code}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* API 가이드 및 다운로드 링크 */}
              {(guideCard as any).apiGuide?.status === 'NO_OFFICIAL_API' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-bold text-yellow-800 mb-3">⚠️ 공식 API 없음 - 대안 방법</h4>
                  <div className="text-yellow-700 mb-2">
                    대안: {(guideCard as any).apiGuide?.fallback === 'csv_download' ? '📄 CSV 다운로드' : 
                           (guideCard as any).apiGuide?.fallback === 'browserless' ? '🤖 브라우저 자동화' :
                           (guideCard as any).apiGuide?.fallback === 'unofficial_api' ? '🔧 비공식 API' : '📱 RPA+OCR'}
                  </div>
                  {(guideCard as any).downloadGuide && (
                    <div className="mt-3">
                      <a 
                        href={(guideCard as any).downloadGuide.portalUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center bg-yellow-600 text-white rounded px-3 py-2 text-sm hover:bg-yellow-700"
                      >
                        ⬇️ 데이터 다운로드 페이지 열기
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* 자주 발생하는 에러 */}
              {((guideCard.content as any)?.commonErrors || (guideCard as any).commonErrors) && ((guideCard.content as any)?.commonErrors?.length > 0 || (guideCard as any).commonErrors?.length > 0) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-bold text-red-800 mb-3">⚠️ 자주 발생하는 에러와 해결법</h4>
                  <div className="space-y-3">
                    {((guideCard.content as any)?.commonErrors || (guideCard as any).commonErrors)?.map((error: any, i: number) => (
                      <div key={i} className="bg-white border border-red-200 rounded p-3">
                        <div className="text-red-700 font-medium text-sm mb-1">🚨 {error.code}</div>
                        <div className="text-red-600 text-sm mb-2">원인: {error.cause}</div>
                        <div className="text-red-800 text-sm">해결: {error.fix}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 팁 */}
              {guideCard.content?.tips && guideCard.content.tips.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-800 mb-3">💡 실전 팁</h4>
                  <div className="space-y-2">
                    {guideCard.content.tips.map((tip: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="text-blue-700 text-sm">{tip}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'faq' && faqCard && (
            <div className="space-y-6">
              {faqCard.items?.map((faq: any, i: number) => (
                <div key={i} className="faq-item-card">
                  <div className="faq-question-section">
                    <span className="faq-q-icon">
                      Q
                    </span>
                    <span className="faq-q-text">{faq.q}</span>
                  </div>
                  <div className="faq-answer-section">
                    <span className="faq-a-icon">A</span>
                    <div className="faq-a-content">
                      <span className="faq-a-text">{faq.a}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              <style jsx>{`
                .faq-item-card {
                  background: white;
                  border-radius: 16px;
                  padding: 24px;
                  margin-bottom: 16px;
                  border: 1px solid #e5e7eb;
                  transition: all 0.2s ease;
                }
                
                .faq-item-card:hover {
                  background: #f8fafc;
                  border-color: #d1d5db;
                  transform: translateY(-2px);
                  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
                }
                
                .faq-question-section {
                  display: flex;
                  align-items: flex-start;
                  gap: 12px;
                  margin-bottom: 16px;
                }
                
                .faq-q-icon {
                  width: 24px;
                  height: 24px;
                  background: #ff6b6b;
                  color: white;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  font-weight: 700;
                  flex-shrink: 0;
                  margin-top: 2px;
                }
                
                .faq-q-text {
                  font-size: 16px;
                  font-weight: 600;
                  color: #1f2937;
                  line-height: 1.5;
                }
                
                .faq-answer-section {
                  margin-left: 36px;
                  display: flex;
                  align-items: flex-start;
                  gap: 12px;
                }
                
                .faq-a-icon {
                  width: 24px;
                  height: 24px;
                  background: #10b981;
                  color: white;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  font-weight: 700;
                  flex-shrink: 0;
                  margin-top: 2px;
                }
                
                .faq-a-content {
                  background: #f0fdf4;
                  border-left: 3px solid #10b981;
                  padding: 16px 20px;
                  border-radius: 8px;
                  flex: 1;
                }
                
                .faq-a-text {
                  font-size: 14px;
                  color: #374151;
                  line-height: 1.6;
                }
              `}</style>
            </div>
          )}
          
          {activeTab === 'troubleshoot' && troubleshootCard && (
            <div>
              <FriendlyGuideRenderer content={(troubleshootCard as any)?.content || '문제 해결 가이드를 준비 중입니다.'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepDetailModal;
