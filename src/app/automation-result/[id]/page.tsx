'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createAutomationFlow } from '@/lib/api';
import type { FlowData, PreviewData, FAQData, StepGuideData } from '@/types/automation-flow';
import type { ImpactBarCard, FlowCard, GuideCard, FAQCard, DashboardCard } from '@/lib/types/automation';
import ActionHero from '@/app/components/ActionHero';
import ResultShowcase from '@/app/components/ResultShowcase';
import { fetchResultPreview, fetchFAQ, fetchStepGuide } from '@/lib/api';
import FloatingFAQ from '@/app/components/FloatingFAQ';
import StepDetailModal from '@/app/components/StepDetailModal';
import LoadingScreen from '@/app/components/LoadingScreen';
import WowAutomationResult from '@/app/components/WowAutomationResult';

// 스텝별 그라데이션 색상
function getStepGradient(index: number): string {
  const gradients = [
    '#667eea 0%, #764ba2 100%',
    '#f093fb 0%, #f5576c 100%',
    '#4facfe 0%, #00f2fe 100%',
  ];
  return gradients[index % gradients.length];
}

function AutomationResultContent() {
  const params = useParams() || {};
  const searchParams = useSearchParams();
  
  // 쿼리에서 입력값 추출
  const goal = searchParams?.get('goal') || '';
  const answers = searchParams?.get('answers') || '';
  
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 현재 페이지가 설문/후속질문 페이지인지 확인
  const isSurveyOrFollowupPage = () => {
    if (typeof window === 'undefined') return false;
    const pathname = window.location.pathname;
    return pathname.includes('/survey') || 
           pathname.includes('/followup') || 
           pathname.includes('/loading') ||
           params.id === 'followup' ||
           params.id === 'survey';
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔄 자동화 결과 생성 시작:', { goal, answers });
        
        // 답변 파싱
        let parsedAnswers = {};
        if (answers) {
          try {
            parsedAnswers = JSON.parse(decodeURIComponent(answers));
          } catch (e) {
            console.error('답변 파싱 실패:', e);
          }
        }
        
        // API 호출 - agent-orchestrator 사용
        const response = await fetch('/api/agent-orchestrator', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userInput: goal,
            answers: parsedAnswers
          })
        });
        
        if (!response.ok) {
          throw new Error(`API 호출 실패: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ 자동화 결과 생성 완료:', data);
        console.log('🔑 automationId:', data.automationId);

        if (!data || !data.cards || !Array.isArray(data.cards)) {
          throw new Error('API 응답이 올바르지 않습니다.');
        }

        setApiResponse(data);
        
      } catch (e: any) {
        setError(e.message);
        console.error('❌ 자동화 결과 생성 실패:', e);
      } finally {
        setLoading(false);
      }
    }
    
    if (goal) {
      fetchData();
    } else {
      setError('목표(goal)가 없습니다.');
      setLoading(false);
    }
  }, [goal, answers]);

  if (loading) return <LoadingScreen />;
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-2xl w-full bg-white rounded-2xl p-8 shadow-lg text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            자동화 결과 생성 실패
          </h1>
          <p className="text-gray-600 mb-6 text-lg leading-relaxed">
            {error}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            홈으로 돌아가기 →
          </button>
        </div>
      </div>
    );
  }
  
  if (!apiResponse || !apiResponse.cards || apiResponse.cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-2xl w-full bg-white rounded-2xl p-8 shadow-lg text-center">
          <div className="text-6xl mb-4">🤔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            결과가 없습니다
          </h1>
          <p className="text-gray-600 mb-6 text-lg leading-relaxed">
            자동화 결과를 생성하지 못했습니다.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            홈으로 돌아가기 →
          </button>
        </div>
      </div>
    );
  }

  // WowAutomationResult 컴포넌트 사용
  return (
    <div className="max-w-4xl mx-auto p-8">
      <WowAutomationResult result={apiResponse} />
    </div>
  );
}

export default function AutomationResultPage() {
  return (
    <Suspense fallback={<LoadingScreen stage="first" />}>
      <AutomationResultContent />
    </Suspense>
  );
}
