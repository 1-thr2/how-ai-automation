'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/lib/types/automation';
import type { AutomationAPIResponse } from '@/app/types/automation/index';
import WowAutomationResult from '@/app/components/WowAutomationResult';
import LoadingScreen from '../components/LoadingScreen';

interface AutomationData {
  flow: {
    title: string;
    subtitle: string;
    impact: {
      title: string;
      desc: string;
    };
  };
  steps: Array<{
    id: string;
    icon: string;
    title: string;
    subtitle: string;
    duration: string;
    tech: string[];
    guide: {
      steps: string[];
      code: string;
      tips: string[];
    };
  }>;
  results: {
    dashboard: {
      stats: {
        total: number;
        completed: number;
        pending: number;
      };
      distribution: Array<{
        category: string;
        percentage: number;
        color: string;
      }>;
    };
    faq: {
      items: Array<{
        q: string;
        a: string;
      }>;
    };
  };
  cards: Array<{
    type: string;
    title?: string;
    desc?: string;
    steps?: Array<{
      id: string;
      icon: string;
      title: string;
      subtitle: string;
      duration: string;
      preview: string;
      techTags: string[];
    }>;
    stepId?: string;
    content?: {
      steps: string[];
      code: string;
      tips: string[];
    };
    stats?: {
      total: number;
      completed: number;
      pending: number;
    };
    distribution?: Array<{
      category: string;
      percentage: number;
      color: string;
    }>;
    items?: Array<{
      q: string;
      a: string;
    }>;
  }>;
}

interface AgentProgress {
  flowDesign: boolean;
  guide: boolean;
  result: boolean;
  visualDesign: boolean;
  codeQuality: boolean;
}

export default function AutomationResultPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useSearchParams();
  const [result, setResult] = useState<AutomationAPIResponse | null>(null);

  useEffect(() => {
    console.log('🔍 [AutomationResult] 페이지 로드됨');
    try {
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
        setResult({
          context: data.context || { userInput: '' },
          cards,
          error: data.error || '',
          fallbackExample: data.fallbackExample || '',
          followupQuestions: data.followupQuestions || [],
          raw: data.raw || undefined,
        });
        
        sessionStorage.removeItem('automationResultData');
        console.log('🗑️ [AutomationResult] sessionStorage 클리어됨');
      } else {
        console.log('❌ [AutomationResult] sessionStorage에 데이터 없음');
        setError('결과 데이터가 없습니다. 다시 시도해 주세요.');
      }
    } catch (err) {
      console.error('❌ [AutomationResult] 처리 중 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  const flowCard = cards.find(c => c.type === 'flow');
  const stepsCount = flowCard?.steps?.length ?? 0;

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">오류 발생</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-500">결과 데이터를 생성하는 데 실패했거나, 데이터가 유효하지 않습니다. 다시 시도해 주세요.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {result && <WowAutomationResult result={result} />}
    </div>
  );
}
