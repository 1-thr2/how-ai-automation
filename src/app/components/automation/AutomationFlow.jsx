import React, { useState } from 'react';
import Image from 'next/image';

/**
 * 자동화 플로우 컴포넌트
 * 고맥락 UI로 각 자동화 단계를 시각적으로 표현
 */
const AutomationFlow = ({ steps }) => {
  const [selectedStep, setSelectedStep] = useState(null);

  // 단계 카드 클릭 시 상세 정보 표시
  const handleStepClick = step => {
    setSelectedStep(step.id === selectedStep ? null : step.id);
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
      <h2 className="text-2xl font-semibold flex items-center gap-2 mb-6">
        <span className="text-2xl">🔄</span>
        <span>자동화 플로우</span>
      </h2>

      <div className="flex items-stretch gap-6 overflow-x-auto py-4 pb-2 snap-x snap-mandatory">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* 단계 카드 */}
            <div
              className="min-w-[280px] max-w-[320px] bg-gray-50 border-2 border-gray-200 rounded-xl p-5 flex flex-col cursor-pointer transition-all hover:border-purple-600 hover:-translate-y-1 hover:shadow-lg snap-start"
              onClick={() => handleStepClick(step)}
            >
              <div className="w-16 h-16 bg-white rounded-lg shadow-sm flex items-center justify-center mx-auto mb-4">
                <Image
                  src={`/icons/${step.tool?.toLowerCase().replace(/ /g, '-') || 'default'}.svg`}
                  width={40}
                  height={40}
                  alt={step.tool || '자동화 도구'}
                  onError={e => {
                    e.target.onerror = null;
                    e.target.src = '/icons/default.svg';
                    if (typeof window !== 'undefined') {
                      window.__missingIcons = window.__missingIcons || [];
                      if (step.tool && !window.__missingIcons.includes(step.tool)) {
                        window.__missingIcons.push(step.tool);
                      }
                    }
                  }}
                />
              </div>

              <h3 className="text-lg font-semibold mb-2 text-gray-900">{step.title}</h3>
              <p className="text-sm text-gray-600 mb-4 flex-grow">{step.description}</p>

              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span className="flex items-center">⏱ {step.estimatedTime || '약 5분'}</span>
                <span>{'⭐'.repeat(step.difficulty || 1)}</span>
              </div>

              <button
                className="flex items-center justify-center gap-1 text-sm text-purple-600 border border-purple-600 rounded-md py-2 px-4 transition-all hover:bg-purple-50"
                onClick={e => {
                  e.stopPropagation(); // 이벤트 버블링 방지
                  handleStepClick(step);
                }}
              >
                <span>👁️</span>
                <span>자세히 보기</span>
              </button>
            </div>

            {/* 화살표 (마지막 항목 제외) */}
            {index < steps.length - 1 && (
              <div className="flex items-center text-purple-600 text-2xl relative">
                <div className="animate-slide-right">→</div>
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-300 to-transparent -z-10"></div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 선택된 단계의 상세 정보 */}
      {selectedStep && (
        <div className="mt-6 bg-purple-50 rounded-xl p-6 animate-fade-in">
          {steps.map(
            step =>
              step.id === selectedStep && (
                <div key={`detail-${step.id}`}>
                  <h3 className="text-xl font-semibold text-purple-700 mb-4">
                    {step.title} 단계 세부 정보
                  </h3>

                  <div className="bg-white rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                      <span>🔄</span>
                      <span>데이터 흐름</span>
                    </h4>
                    <div className="flex items-center overflow-x-auto py-2">
                      <div className="flex items-center bg-gray-100 rounded-md px-3 py-2 mr-3 whitespace-nowrap">
                        <span className="mr-2">📄</span>
                        <span>{step.source || '입력 데이터'}</span>
                      </div>
                      <span className="text-purple-600 mx-2">→</span>
                      <div className="flex items-center bg-gray-100 rounded-md px-3 py-2 mr-3 whitespace-nowrap">
                        <span className="mr-2">⚙️</span>
                        <span>{step.transform || '변환 과정'}</span>
                      </div>
                      <span className="text-purple-600 mx-2">→</span>
                      <div className="flex items-center bg-gray-100 rounded-md px-3 py-2 whitespace-nowrap">
                        <span className="mr-2">✅</span>
                        <span>{step.destination || '출력 결과'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded-sm p-4 mb-4">
                    <h5 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                      <span>💡</span>
                      <span>실무 팁</span>
                    </h5>
                    <p className="text-gray-700">
                      {step.tip ||
                        '이 단계에서 가장 중요한 점은 데이터 형식을 정확히 맞추는 것입니다.'}
                    </p>
                  </div>

                  <div className="bg-amber-50 border-l-4 border-amber-500 rounded-sm p-4">
                    <h5 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                      <span>🧠</span>
                      <span>이해를 돕는 비유</span>
                    </h5>
                    <p className="text-gray-700">
                      {step.analogy ||
                        '이 과정은 편지를 우체통에 넣고 배달부가 목적지까지 정확히 전달하는 것과 같습니다.'}
                    </p>
                  </div>
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
};

export default AutomationFlow;
