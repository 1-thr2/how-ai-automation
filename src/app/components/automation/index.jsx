import React from 'react';
import AutomationFlow from './AutomationFlow';
import ImplementationOptions from './ImplementationOptions';
import StepGuides from './StepGuides';

/**
 * 자동화 페이지 메인 컴포넌트
 * 고맥락 자동화 플로우와 실리콘밸리식 UX를 통합
 */
const AutomationPage = ({ automationSteps }) => {
  // 반드시 실제 API/AI/백엔드 응답 기반으로만 렌더링
  return (
    <div className="container mx-auto px-4 py-10">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center text-xl">
            🔄
          </div>
          <h1 className="text-3xl font-bold">자동화 플로우</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl">
          이 자동화 플로우를 통해 기존에 수작업으로 처리하던 영업 리포트 생성 과정을 완전 자동화할
          수 있습니다. 데이터 수집부터 분석, 보고서 작성 및 공유까지 전체 과정이 자동으로
          처리됩니다.
        </p>
      </header>

      <div className="bg-white rounded-3xl shadow-lg p-8 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="flex items-center justify-center text-center p-4">
            <div>
              <div className="text-3xl mb-2">⏰</div>
              <div className="text-3xl font-bold text-purple-600 mb-1">주 8시간</div>
              <div className="text-sm text-gray-600">절약 시간</div>
            </div>
          </div>
          <div className="flex items-center justify-center text-center p-4">
            <div>
              <div className="text-3xl mb-2">💰</div>
              <div className="text-3xl font-bold text-purple-600 mb-1">월 150만원</div>
              <div className="text-sm text-gray-600">월간 절약</div>
            </div>
          </div>
          <div className="flex items-center justify-center text-center p-4">
            <div>
              <div className="text-3xl mb-2">⚡</div>
              <div className="text-3xl font-bold text-purple-600 mb-1">보통</div>
              <div className="text-sm text-gray-600">난이도</div>
            </div>
          </div>
        </div>
      </div>

      {/* 자동화 플로우 컴포넌트 */}
      <AutomationFlow steps={automationSteps} />

      {/* 난이도별 구현 방법 컴포넌트 */}
      <ImplementationOptions />

      {/* 단계별 구현 가이드 컴포넌트 */}
      <StepGuides steps={automationSteps} />
    </div>
  );
};

export default AutomationPage;
