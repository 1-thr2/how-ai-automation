import React, { useState } from 'react';

/**
 * 단계별 구현 가이드 컴포넌트
 * 고맥락 설명과 스토리텔링 중심으로 구현
 */
const StepGuides = ({ steps }) => {
  const [openAdvanced, setOpenAdvanced] = useState({});

  const toggleAdvanced = stepId => {
    setOpenAdvanced({
      ...openAdvanced,
      [stepId]: !openAdvanced[stepId],
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
      <h2 className="text-2xl font-semibold flex items-center gap-2 mb-8">
        <span className="text-2xl">📚</span>
        <span>단계별 구현 가이드</span>
      </h2>

      <div className="space-y-8">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="bg-gray-50 rounded-xl p-6 lg:p-8 transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                {index + 1}
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <span className="ml-auto text-gray-500 text-sm flex items-center gap-1">
                ⏱ {step.estimatedTime || '약 5분'}
              </span>
            </div>

            <div className="ml-14">
              {/* 스토리 설명 */}
              <div className="bg-purple-50 rounded-lg p-5 mb-6">
                <h4 className="text-lg font-semibold text-purple-700 mb-3 flex items-center gap-2">
                  <span>💡</span>
                  <span>이 단계에서 실제로 일어나는 일</span>
                </h4>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {step.story || step.detailedDescription || step.description}
                </p>

                {/* 데이터 흐름 */}
                <div className="mb-4">
                  <div className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                    <span>🔄</span>
                    <span>데이터 흐름</span>
                  </div>
                  <div className="flex items-center overflow-x-auto bg-white p-3 rounded-lg">
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

                {/* 실무 팁 */}
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-sm p-4 mb-4">
                  <h5 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                    <span>💡</span>
                    <span>실무 팁</span>
                  </h5>
                  <p className="text-gray-700">
                    {step.tip ||
                      '가장 효율적인 방법은 미리 데이터 형식을 표준화하는 것입니다. 특히 날짜와 시간 형식을 통일하면 문제가 줄어듭니다.'}
                  </p>
                </div>

                {/* 이해를 돕는 비유 */}
                <div className="bg-amber-50 border-l-4 border-amber-500 rounded-sm p-4">
                  <h5 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                    <span>🧠</span>
                    <span>이해를 돕는 비유</span>
                  </h5>
                  <p className="text-gray-700">
                    {step.analogy ||
                      '이 과정은 공장의 조립 라인과 같습니다. 원재료(데이터)가 들어오면 필요한 부품만 선별하고 형태를 조정해 완제품으로 만듭니다.'}
                  </p>
                </div>
              </div>

              {/* 고급 정보 토글 버튼 */}
              <button
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-gray-600 border border-gray-300 rounded-lg transition-all hover:bg-gray-100 mb-4"
                onClick={() => toggleAdvanced(step.id)}
              >
                <span>{openAdvanced[step.id] ? '➖' : '➕'}</span>
                <span>{openAdvanced[step.id] ? '고급 정보 닫기' : '고급 정보 보기'}</span>
              </button>

              {/* 고급 정보 (코드, 스크린샷, 트러블슈팅) */}
              {openAdvanced[step.id] && (
                <div className="border-t border-dashed border-gray-300 pt-6 animate-fade-in">
                  {/* 코드 예시 */}
                  {step.code && (
                    <div className="mb-6">
                      <div className="bg-gray-900 rounded-lg overflow-hidden">
                        <div className="bg-gray-800 py-2 px-4 flex justify-between items-center">
                          <span className="text-gray-400 text-sm font-medium">
                            {step.language || 'JavaScript'}
                          </span>
                          <button
                            className="bg-gray-700 text-gray-300 text-xs py-1 px-2 rounded flex items-center gap-1 hover:bg-gray-600"
                            onClick={() => {
                              if (step.code) {
                                navigator.clipboard.writeText(step.code);
                                alert('코드가 클립보드에 복사되었습니다!');
                              }
                            }}
                          >
                            <span>📋</span>
                            <span>복사</span>
                          </button>
                        </div>
                        <div className="p-4 overflow-x-auto">
                          <pre className="text-gray-100 font-mono text-sm leading-relaxed">
                            <code>{step.code}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 스크린샷 */}
                  {step.screenshots && step.screenshots.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {step.screenshots.map((img, i) => (
                        <div
                          key={i}
                          className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all"
                        >
                          <img
                            src={img}
                            alt={`${step.title} 스크린샷 ${i + 1}`}
                            className="w-full h-auto"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 트러블슈팅 */}
                  {step.commonIssues && step.commonIssues.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                        <span>💡</span>
                        <span>자주 발생하는 문제</span>
                      </h4>

                      <div className="space-y-4">
                        {step.commonIssues.map((issue, i) => (
                          <div
                            key={i}
                            className={
                              i < step.commonIssues.length - 1
                                ? 'pb-4 border-b border-amber-200'
                                : ''
                            }
                          >
                            <strong className="block text-gray-800 mb-1">Q: {issue.problem}</strong>
                            <p className="text-gray-700 text-sm">A: {issue.solution}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepGuides;
