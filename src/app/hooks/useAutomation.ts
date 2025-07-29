import { useState, useCallback } from 'react';
import { AutomationData, ApiResponse } from '@/app/types/automation';
import { handleError } from '@/lib/error-handler';
import { Card } from '@/lib/types/automation';

const API_BASE = '/api/agent-orchestrator';

const ENDPOINTS = {
  tips: (stepId: string) => `${API_BASE}/tips/${stepId}`,
  troubleshooting: (stepId: string) => `${API_BASE}/troubleshooting/${stepId}`,
  expansion: (stepId: string) => `${API_BASE}/expansion/${stepId}`,
  future: (stepId: string) => `${API_BASE}/future/${stepId}`,
  main: () => API_BASE,
};

async function fetchFromApi<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error('API 요청 실패');
    const result = await response.json();
    if (!result.success) throw new Error(result.error?.message || 'API 실패');
    return result.data;
  } catch (err) {
    return null;
  }
}

export function useAutomation() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAutomation = async (input: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agent-orchestrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          automationType: 'default',
          userGoals: input,
        }),
      });

      if (!response.ok) {
        throw new Error('API 호출 실패');
      }

      const data = await response.json();
      if (!data.cards || !Array.isArray(data.cards)) {
        throw new Error('API 응답이 올바르지 않습니다');
      }

      setCards(data.cards);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 자동화 데이터 가져오기
  const fetchAutomationData = useCallback(async (input: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFromApi<AutomationData>(ENDPOINTS.main(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      if (!result) throw new Error('데이터를 불러오지 못했습니다.');
      setCards(result.cards);
    } catch (err) {
      setError(new Error('알 수 없는 오류가 발생했습니다.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // 단계 선택 처리
  const selectStep = useCallback(
    (stepId: number) => {
      if (!cards.length) return;
      const updatedCards = cards.map(card => {
        if (card.type === 'flow') {
          return {
            ...card,
            steps: card.steps.map(step => ({
              ...step,
              selected: step.id === stepId,
          })),
          };
        }
        return card;
      });
      setCards(updatedCards);
    },
    [cards]
  );

  // 코드 복사 처리
  const copyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      return true;
    } catch (err) {
      setError(new Error('코드 복사 중 오류가 발생했습니다.'));
      return false;
    }
  }, []);

  // 가이드 다운로드 처리
  const downloadGuide = useCallback(async (guide: string) => {
    try {
      const blob = new Blob([guide], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '자동화_가이드.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      setError(new Error('가이드 다운로드 중 오류가 발생했습니다.'));
      return false;
    }
  }, []);

  // 실전 팁 가져오기
  const fetchTips = useCallback(async (stepId: string) => {
    return await fetchFromApi(ENDPOINTS.tips(stepId));
  }, []);

  // 문제해결 가이드 가져오기
  const fetchTroubleshooting = useCallback(async (stepId: string) => {
    return await fetchFromApi(ENDPOINTS.troubleshooting(stepId));
  }, []);

  // 확장 가능성 가져오기
  const fetchExpansion = useCallback(async (stepId: string) => {
    return await fetchFromApi(ENDPOINTS.expansion(stepId));
  }, []);

  // 미래 시나리오 가져오기
  const fetchFutureScenarios = useCallback(async (stepId: string) => {
    return await fetchFromApi(ENDPOINTS.future(stepId));
  }, []);

  return {
    cards,
    loading,
    error,
    fetchAutomation,
    fetchAutomationData,
    selectStep,
    copyCode,
    downloadGuide,
    fetchTips,
    fetchTroubleshooting,
    fetchExpansion,
    fetchFutureScenarios,
  };
}
