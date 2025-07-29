import React from 'react';
import FlowVisualization from './FlowVisualization';

// 정식 컴포넌트들
const Metric = ({ icon, value, label }: { icon: string; value: string; label: string }) => (
  <div className="metric text-center p-4 bg-gray-50 rounded-lg hover:bg-[#F8F6FF] transition-all">
    <span className="metric-icon text-2xl mb-1 block">{icon}</span>
    <span className="metric-value text-xl font-bold text-primary block mb-1">{value}</span>
    <span className="metric-label text-xs text-gray-600">{label}</span>
  </div>
);

const OptionCard = ({ level, title, tools, time, cost, pros, cons, recommended }: any) => (
  <div
    className={`option-card border-2 rounded-xl p-6 relative transition-all ${recommended ? 'border-primary bg-[#F8F6FF]' : 'border-gray-200 bg-white'}`}
  >
    <div className="option-header flex items-center gap-2 mb-2">
      <span className="level-icon text-2xl">{level}</span>
      <h3 className="option-title font-bold text-base">{title}</h3>
      {recommended && (
        <span className="badge absolute top-2 right-2 bg-primary text-white px-2 py-0.5 rounded-full text-xs font-semibold">
          추천
        </span>
      )}
    </div>
    <ul className="option-details list-none mb-2">
      <li>도구: {tools?.join(', ')}</li>
      <li>설정 시간: {time}</li>
      <li>비용: {cost}</li>
    </ul>
    <div className="mb-1 text-green-700 text-xs">장점: {pros?.join(', ')}</div>
    <div className="mb-1 text-red-600 text-xs">단점: {cons?.join(', ')}</div>
    <button
      className={`option-button mt-2 w-full py-2 border-2 rounded-lg font-semibold ${recommended ? 'primary' : ''}`}
    >
      이 방법으로 시작
    </button>
  </div>
);

const CodeSection = ({ code, language }: { code: string; language?: string }) => (
  <div className="code-section bg-gray-900 rounded-lg overflow-hidden my-4">
    <div className="code-header bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
      <span className="code-language text-xs text-gray-400 font-medium">{language || '코드'}</span>
      <button
        className="copy-button bg-gray-700 text-gray-300 rounded px-2 py-1 text-xs hover:bg-gray-600 hover:text-white"
        onClick={() => navigator.clipboard.writeText(code)}
      >
        📋 복사
      </button>
    </div>
    <pre className="p-4 overflow-x-auto text-xs text-gray-100">
      <code>{code}</code>
    </pre>
  </div>
);

const StepGuide = ({ step, index }: any) => (
  <div className="guide-step bg-gray-50 rounded-xl p-6 mb-6 hover:shadow-md transition-all">
    <div className="step-header flex items-center gap-3 mb-2">
      <span className="step-number w-10 h-10 bg-gradient-to-r from-primary to-primary-light text-white rounded-full flex items-center justify-center font-bold text-lg">
        {index + 1}
      </span>
      <h3 className="font-bold text-base">{step.title}</h3>
      <span className="step-time text-xs text-gray-500 ml-auto">⏱ {step.estimatedTime}</span>
    </div>
    <div className="step-content ml-12">
      <div className="step-description text-xs text-gray-700 mb-2">
        {step.detailedDescription || step.description}
      </div>
      {step.code && <CodeSection code={step.code} language={step.language} />}
      {step.screenshots && (
        <div className="screenshots grid grid-cols-2 gap-2 my-2">
          {step.screenshots.map((img: string, i: number) => (
            <div
              key={i}
              className="screenshot border rounded-lg overflow-hidden shadow-sm hover:scale-105 transition-all"
            >
              <img
                src={img}
                alt={`Step ${index + 1} - Screenshot ${i + 1}`}
                className="w-full h-auto"
              />
            </div>
          ))}
        </div>
      )}
      {step.commonIssues && (
        <div className="troubleshooting bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
          <h4 className="font-semibold text-xs mb-1 flex items-center gap-1">
            💡 자주 발생하는 문제
          </h4>
          {step.commonIssues.map((issue: any, i: number) => (
            <div key={i} className="issue text-xs mb-1">
              <strong>Q: {issue.problem}</strong>
              <p>A: {issue.solution}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const ImprovedResultPage = ({ gptAnalysis, userContext }: any) => {
  const {
    title,
    totalTimeSaved,
    monthlyROI,
    difficulty,
    steps = [],
    implementationOptions = [],
  } = gptAnalysis || {};

  return (
    <div className="results-container max-w-5xl mx-auto px-4 py-8">
      {/* 헤더 섹션 */}
      <div className="results-header bg-white rounded-3xl shadow-lg p-8 mb-8">
        <h1 className="recipe-title text-2xl md:text-3xl font-bold mb-4 text-gray-900">{title}</h1>
        <div className="metrics-bar grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <Metric icon="⏰" value={totalTimeSaved} label="절약 시간" />
          <Metric icon="💰" value={monthlyROI} label="월간 절약" />
          <Metric icon="⚡" value={difficulty} label="난이도" />
        </div>
      </div>

      {/* 플로우 다이어그램 */}
      <div className="flow-section bg-white rounded-3xl shadow-lg p-8 mb-8">
        <h2 className="flow-title text-xl font-semibold mb-6 flex items-center gap-2">
          🔄 자동화 플로우
        </h2>
        <FlowVisualization steps={steps} />
      </div>

      {/* 구현 옵션 */}
      <div className="options-section bg-white rounded-3xl shadow-lg p-8 mb-8">
        <h2 className="options-title text-xl font-semibold mb-6 flex items-center gap-2">
          🎮 난이도별 구현 방법
        </h2>
        <div className="options-grid grid grid-cols-1 md:grid-cols-3 gap-6">
          {implementationOptions.map((opt: any, idx: number) => (
            <OptionCard key={idx} {...opt} />
          ))}
        </div>
      </div>

      {/* 단계별 가이드 */}
      <div className="guide-section bg-white rounded-3xl shadow-lg p-8 mb-8">
        <h2 className="guide-title text-xl font-semibold mb-6 flex items-center gap-2">
          📚 단계별 구현 가이드
        </h2>
        {steps.map((step: any, index: number) => (
          <StepGuide key={index} step={step} index={index} />
        ))}
      </div>

      {/* CTA 섹션 */}
      <div className="cta-section text-center py-12">
        <div className="cta-primary mb-8">
          <h3 className="text-2xl font-bold mb-4 text-gray-900">준비되셨나요?</h3>
          <button className="start-button bg-gradient-to-r from-primary to-primary-light text-white px-8 py-3 rounded-full text-lg font-bold shadow-lg hover:scale-105 transition-all">
            🚀 지금 시작하기
          </button>
        </div>
        <div className="cta-secondary flex flex-wrap gap-4 justify-center">
          <button className="secondary-button bg-white border-2 border-gray-200 text-gray-700 px-6 py-2 rounded-full font-semibold flex items-center gap-2 hover:border-primary hover:text-primary transition-all">
            📹 동영상 가이드
          </button>
          <button className="secondary-button bg-white border-2 border-gray-200 text-gray-700 px-6 py-2 rounded-full font-semibold flex items-center gap-2 hover:border-primary hover:text-primary transition-all">
            💬 커뮤니티 도움받기
          </button>
          <button className="secondary-button bg-white border-2 border-gray-200 text-gray-700 px-6 py-2 rounded-full font-semibold flex items-center gap-2 hover:border-primary hover:text-primary transition-all">
            👨‍💻 전문가 상담
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImprovedResultPage;
