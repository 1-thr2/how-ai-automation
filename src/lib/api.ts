// 신버전 agent-orchestrator 기반 API 경로/유틸 함수 (프론트/백엔드 공통)
import type { FlowData, StepGuideData, PreviewData, FAQData } from '@/types/automation-flow';
import { Card } from '@/lib/types/automation';

export const API_ENDPOINTS = {
  // 신버전 API 엔드포인트
  agentOrchestrator: '/api/agent-orchestrator',
  agentFollowup: '/api/agent-followup',
  searchLatest: '/api/search-latest',
  gptPrompt: '/api/gpt-prompt',
  validateCode: '/api/validate-code',
  trendingAutomations: '/api/trending-automations',
};

export async function fetchFromApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error || 'API 요청 실패');
  }
  const result = await res.json();
  if (!result.success && !result.cards) {
    throw new Error(result.error || 'API 실패');
  }
  // agent-orchestrator는 cards 배열을 직접 반환
  return result.cards ? result : result.data as T;
}

// 🚀 신버전: 자동화 플로우 생성 (agent-orchestrator 사용)
export function createAutomationFlow(input: {
  category: string;
  tools: string;
  description: string;
  userLevel: string;
}): Promise<{ cards: Card[] }> {
  return fetchFromApi<{ cards: Card[] }>(API_ENDPOINTS.agentOrchestrator, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userInput: `${input.category} - ${input.description}`,
      followupAnswers: {
        tools: input.tools,
        userLevel: input.userLevel,
        category: input.category
      }
    }),
  });
}

// 🚀 신버전: 단계별 가이드 생성 (agent-orchestrator 내장)
export function fetchStepGuide(input: {
  stepId: string;
  automationType: string;
  userContext?: any;
}): Promise<StepGuideData> {
  return fetchFromApi<StepGuideData>(API_ENDPOINTS.agentOrchestrator, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent: 'detail-guide',
      params: {
        stepId: input.stepId,
        automationType: input.automationType,
        userGoals: input.userContext?.userGoals || '',
        stepTitle: input.userContext?.stepTitle || '',
        stepSubtitle: input.userContext?.stepSubtitle || '',
        followupAnswers: input.userContext?.followupAnswers || {}
      }
    }),
  });
}

// 🚀 신버전: 결과 미리보기 (agent-orchestrator 통합)
export function fetchResultPreview(input: {
  automationType: string;
  userGoals?: any;
  followupAnswers?: any;
}): Promise<PreviewData> {
  return fetchFromApi<PreviewData>(API_ENDPOINTS.agentOrchestrator, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent: 'result-agent',
      params: {
        automationType: input.automationType,
        userGoals: input.userGoals || '',
        followupAnswers: input.followupAnswers || {}
      }
    }),
  });
}

// 🚀 신버전: FAQ (agent-orchestrator 통합)
export function fetchFAQ(input: { automationType: string }): Promise<FAQData> {
  return fetchFromApi<FAQData>(API_ENDPOINTS.agentOrchestrator, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent: 'trend-analysis',
      params: {
        automationType: input.automationType
      }
    }),
  });
}

// 🚀 신버전: 후속질문 생성
export function fetchFollowupQuestions(userInput: string): Promise<any> {
  return fetchFromApi<any>(API_ENDPOINTS.agentFollowup, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInput }),
  });
}

// 🚀 신버전: GPT 프롬프트 생성
export function generateGptPrompt(input: { userInput: string; recipe: any }): Promise<any> {
  return fetchFromApi<any>(API_ENDPOINTS.gptPrompt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

// 🚀 신버전: 인기 자동화 키워드
export function fetchTrendingAutomations(): Promise<any> {
  return fetch(API_ENDPOINTS.trendingAutomations).then(res => res.json());
}
