'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LoadingScreen from '../components/LoadingScreen';
import WowAutomationResult from '../components/WowAutomationResult';
import { Card } from '@/lib/types/automation';
import type { AutomationAPIResponse } from '@/app/types/automation/index';

function AutomationResultContent() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useSearchParams();
  const [result, setResult] = useState<AutomationAPIResponse | null>(null);

  useEffect(() => {
    console.log('🔍 [AutomationResult] 페이지 로드됨');
    
    const handleData = async () => {
      try {
        // 1. 먼저 sessionStorage 확인 (직접 결과 페이지로 온 경우)
        const storedData = sessionStorage.getItem('automationResultData');
        console.log('🔍 [AutomationResult] sessionStorage 확인:', storedData ? '데이터 있음' : '데이터 없음');
        
        if (storedData) {
          const data = JSON.parse(storedData);
          console.log('📦 [AutomationResult] Session Storage Data:', data);
          
          let cards = (data.cards || []).map((c: any) => {
            if (!c.type) {
              if (c.title?.includes('플로우')) return { ...c, type: 'flow' };
              if (c.code) return { ...c, type: 'code' };
              if (c.title?.toLowerCase().includes('faq') || c.questions || c.items) return { ...c, type: 'faq' };
              return { ...c, type: 'guide' };
            }
            return c;
          });
          
          console.log('[Parsed cards]:', cards);
          setCards(cards);
          // 🔧 userInput 복구: sessionStorage에서 goal 파라미터나 URL에서 추출
          const storedGoal = sessionStorage.getItem('currentGoal') || '';
          const urlGoal = params?.get('goal') || '';
          const finalUserInput = storedGoal || urlGoal || decodeURIComponent(urlGoal) || '';
          
          setResult({
            context: { 
              userInput: finalUserInput,
              followupAnswers: data.followupAnswers || data.context?.followupAnswers || {}
            },
            cards,
            error: data.error || '',
            fallbackExample: data.fallbackExample || '',
            followupQuestions: data.followupQuestions || [],
            raw: data.raw || undefined,
          });
          
          sessionStorage.removeItem('automationResultData');
          console.log('🗑️ [AutomationResult] sessionStorage 클리어됨');
          
        } else {
          // 2. sessionStorage에 없으면 URL goal 파라미터 확인 (공유 링크로 온 경우)
          const goal = params?.get('goal');
          console.log('🔗 [AutomationResult] URL goal 파라미터:', goal);
          
          if (goal) {
            console.log('🚀 [AutomationResult] goal로 새 자동화 생성 시작');
            setLoading(true);
            
            // goal을 바탕으로 새로운 자동화 생성
            const response = await fetch('/api/agent-orchestrator', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userInput: decodeURIComponent(goal),
                followupAnswers: {} // 공유 링크에서는 후속 답변 없이 기본 생성
              })
            });
            
            if (response.ok) {
              const newData = await response.json();
              console.log('✅ [AutomationResult] 새 자동화 생성 완료:', newData);
              
              let cards = (newData.cards || []).map((c: any) => {
                if (!c.type) {
                  if (c.title?.includes('플로우')) return { ...c, type: 'flow' };
                  if (c.code) return { ...c, type: 'code' };
                  if (c.title?.toLowerCase().includes('faq') || c.questions || c.items) return { ...c, type: 'faq' };
                  return { ...c, type: 'guide' };
                }
                return c;
              });
              
              setCards(cards);
              setResult({
                context: { userInput: decodeURIComponent(goal) },
                cards,
                error: '',
                fallbackExample: '',
                followupQuestions: [],
                raw: newData,
              });
            } else {
              throw new Error('자동화 생성 실패');
            }
          } else {
            console.log('❌ [AutomationResult] sessionStorage와 goal 파라미터 모두 없음');
            setError('결과 데이터가 없습니다. 다시 시도해 주세요.');
          }
        }
      } catch (e) {
        console.error('❌ [AutomationResult] 데이터 처리 실패:', e);
        setError('데이터 로드 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    handleData();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingScreen />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">오류 발생</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">결과 없음</h1>
          <p className="text-gray-600 mb-4">생성된 결과가 없습니다.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return <WowAutomationResult result={result} />;
}

export default function AutomationResultPage() {
  return (
    <Suspense fallback={<LoadingScreen stage="first" />}>
      <AutomationResultContent />
    </Suspense>
  );
}
