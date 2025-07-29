import React, { useState, useEffect } from 'react';

// 1. 표준 타입 정의
export interface AutomationFlow {
  steps: FlowStep[];
  estimatedTimeSaved: string;
  difficulty: number;
}

export interface FlowStep {
  id: string;
  type: 'trigger' | 'action' | 'transform' | 'output';
  tool: string;
  action: string;
  config: {
    displayName: string;
    description: string;
    dynamicData?: any;
  };
}

// 2. 아이콘 매핑
const getStepIcon = (tool: string): string => {
  const iconMap: Record<string, string> = {
    'google-sheets': '📊',
    slack: '💬',
    gmail: '📧',
    notion: '📔',
    ai: '🤖',
    scheduler: '⏰',
    webhook: '🔗',
    database: '🗄️',
    api: '🌐',
  };
  return iconMap[tool] || '⚙️';
};

// 3. 기본 시뮬레이션 컴포넌트
const DefaultSimulation = ({ step }: { step: FlowStep }) => (
  <div className="default-sim flex flex-col items-center p-4">
    <div className="text-3xl mb-2">⚙️</div>
    <h4 className="font-semibold mb-1">{step.config.displayName}</h4>
    <div className="text-xs text-gray-500 mb-2">{step.config.description}</div>
    <div className="flex gap-1 animate-pulse text-lg">
      <span>•</span>
      <span>•</span>
      <span>•</span>
    </div>
    <p className="text-xs mt-2">작업 수행 중...</p>
  </div>
);

// 4. 도구별 시뮬레이션 컴포넌트 라이브러리
function getSimulationComponents(today: string) {
  return {
    'google-sheets': {
      read: () => (
        <div className="sheets-sim p-2">
          <div className="flex items-center gap-2 mb-2">
            <img src="/icons/sheets.svg" alt="Sheets" className="w-6 h-6" />
            <span className="font-semibold">스프레드시트 읽기</span>
          </div>
          <table className="data-table text-xs border mb-2">
            <tbody>
              <tr>
                <td className="border px-2">A1</td>
                <td className="border px-2">날짜</td>
                <td className="border px-2">데이터</td>
              </tr>
              <tr>
                <td className="border px-2">A2</td>
                <td className="border px-2">{today}</td>
                <td className="border px-2">실시간 데이터</td>
              </tr>
            </tbody>
          </table>
          <div className="loading-bar text-blue-500 animate-pulse">데이터 로딩 중...</div>
        </div>
      ),
      write: () => (
        <div className="sheets-sim p-2">
          <div className="flex items-center gap-2 mb-2">
            <img src="/icons/sheets.svg" alt="Sheets" className="w-6 h-6" />
            <span className="font-semibold">데이터 기록 중...</span>
          </div>
          <div className="progress-bar w-full h-2 bg-blue-100 rounded mt-2">
            <div className="h-2 bg-blue-500 animate-pulse rounded w-1/2"></div>
          </div>
        </div>
      ),
    },
    slack: {
      send: () => (
        <div className="slack-sim p-2">
          <div className="flex items-center gap-2 mb-2">
            <img src="/icons/slack.svg" alt="Slack" className="w-6 h-6" />
            <span className="font-semibold">#general</span>
          </div>
          <div className="message-preview flex items-center gap-2">
            <div className="bot-avatar text-2xl">🤖</div>
            <div className="message-bubble bg-blue-100 px-3 py-1 rounded">
              자동화 메시지 전송 중...
            </div>
          </div>
        </div>
      ),
      read: () => (
        <div className="slack-sim p-2">
          <div className="font-semibold mb-1">채널 목록</div>
          <div className="channel-list text-xs">
            <div>📢 #general (15 새 메시지)</div>
            <div>💬 #random (3 새 메시지)</div>
          </div>
        </div>
      ),
    },
    gmail: {
      send: () => (
        <div className="gmail-sim p-2">
          <div className="compose-window border rounded p-2 mb-2">
            <div className="to text-xs">받는사람: team@company.com</div>
            <div className="subject text-xs">제목: 일일 리포트</div>
            <div className="body text-xs">이메일 작성 중...</div>
          </div>
        </div>
      ),
      filter: () => (
        <div className="gmail-sim p-2">
          <div className="inbox text-xs mb-1">
            <div className="email-item unread">📧 중요 이메일 1</div>
            <div className="email-item">📧 일반 이메일 2</div>
          </div>
          <div className="filter-info text-blue-500 animate-pulse">🔍 필터링 적용 중...</div>
        </div>
      ),
    },
    ai: {
      summarize: () => (
        <div className="ai-sim p-2 flex flex-col items-center">
          <div className="brain-icon text-3xl mb-2">🧠</div>
          <div className="text-xs animate-pulse">
            데이터를 분석하여 핵심 내용을 요약하고 있습니다...
          </div>
        </div>
      ),
      analyze: () => (
        <div className="ai-sim p-2 flex flex-col items-center">
          <div className="chart text-2xl mb-1">📊</div>
          <div className="insights text-xs">
            • 주요 패턴 발견
            <br />• 이상 징후 감지
            <br />• 추천 사항 생성
          </div>
        </div>
      ),
    },
  };
}

// 5. 동적 시뮬레이션 컴포넌트
export default function DynamicSimulation({ flow }: { flow: AutomationFlow }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(new Date().toLocaleDateString());
  }, []);

  useEffect(() => {
    if (isPlaying && currentStep < flow.steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 2200);
      return () => clearTimeout(timer);
    }
    if (currentStep === flow.steps.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep, flow.steps.length]);

  // simulationComponents의 타입을 any로 명시
  const simulationComponents: any = getSimulationComponents(today);

  const getSimulationComponent = (step: FlowStep) => {
    const toolComponents = simulationComponents[step.tool];
    if (!toolComponents) return <DefaultSimulation step={step} />;
    const actionComponent = toolComponents[step.action];
    if (!actionComponent) return <DefaultSimulation step={step} />;
    return actionComponent();
  };

  return (
    <div className="dynamic-simulation bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto">
      <div className="simulation-header mb-6">
        <h3 className="text-lg font-bold mb-1">🎬 자동화 미리보기</h3>
        <p className="text-sm text-gray-500">
          {flow.steps[0]?.config.displayName}부터 시작되는 자동화 흐름
        </p>
      </div>
      <div className="flow-visualization flex flex-col gap-0.5">
        {flow.steps.map((step, index) => (
          <div
            key={step.id}
            className={`flow-step flex items-center gap-4 py-3 px-2 rounded transition-all ${index === currentStep ? 'bg-blue-50 ring-2 ring-blue-200' : index < currentStep ? 'opacity-60' : ''}`}
          >
            <div className="step-number w-7 h-7 rounded-full flex items-center justify-center font-bold text-white bg-blue-500 mr-2">
              {index + 1}
            </div>
            <div className="step-icon text-2xl mr-2">{getStepIcon(step.tool)}</div>
            <div className="step-info flex-1">
              <div className="font-semibold">{step.config.displayName}</div>
              <div className="text-xs text-gray-500">{step.config.description}</div>
            </div>
            {index === currentStep && isPlaying && (
              <div className="simulation-preview ml-4">{getSimulationComponent(step)}</div>
            )}
            {index < flow.steps.length - 1 && (
              <div
                className={`connector text-2xl mx-2 ${index < currentStep ? 'text-blue-400' : 'text-gray-300'}`}
              >
                →
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="simulation-controls flex items-center gap-4 mt-6">
        <button
          onClick={() => {
            setCurrentStep(0);
            setIsPlaying(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-semibold"
          disabled={isPlaying}
        >
          ▶ 시뮬레이션 시작
        </button>
        <div className="time-saved text-sm text-gray-500">
          ⏰ 예상 절감 시간:{' '}
          <span className="font-bold text-blue-700">{flow.estimatedTimeSaved}</span>
        </div>
      </div>
    </div>
  );
}
