import { analyzeIntent, IntentAnalysisResult } from './intent-analysis';
import { structureRequirements, RequirementsResult } from './requirements-structuring';
import { analyzeTrends, TrendAnalysisResult } from './trend-analysis';
import { designFlow, FlowDesignResult } from './flow-design';
import { processUX, UXResult } from './ux-processing';

/**
 * 전체 wow 자동화 에이전트 시나리오 실행
 * @param userInput 사용자의 자동화 요청 입력
 * @returns 최종 wow UX 카드 결과
 */
export async function runWowAgent(userInput: string): Promise<UXResult> {
  try {
    // 1단계: 인텐트 분석
    const intent: IntentAnalysisResult = await analyzeIntent(userInput);
    console.log('인텐트 분석 완료:', intent);

    // 2단계: 요구사항 구조화
    const requirements: RequirementsResult = await structureRequirements(userInput, intent);
    console.log('요구사항 구조화 완료:', requirements);

    // 3단계: 트렌드/도구/사례 분석
    const trends: TrendAnalysisResult = await analyzeTrends(requirements, intent.userGoal);
    console.log('트렌드 분석 완료:', trends);

    // 4단계: 맞춤형 자동화 플로우 설계
    const flows: FlowDesignResult = await designFlow(requirements, trends, intent.userGoal);
    console.log('플로우 설계 완료:', flows);

    // 5단계: 통합 UX 카드 가공
    const ux: UXResult = await processUX(flows, trends, intent.userGoal);
    console.log('UX 가공 완료:', ux);

    return ux;
  } catch (error) {
    console.error('wow 자동화 에이전트 실행 오류:', error);
    throw new Error('wow 자동화 에이전트 실행 중 오류가 발생했습니다.');
  }
}

/**
 * 에이전트 실행 결과 캐싱
 */
const agentCache = new Map<string, any>();

/**
 * 캐시된 에이전트 결과 조회
 */
export function getCachedAgentResult(key: string) {
  return agentCache.get(key);
}

/**
 * 에이전트 결과 캐싱
 */
export function setCachedAgentResult(key: string, value: any) {
  agentCache.set(key, value);
}

/**
 * 에이전트 입력 검증
 */
export function validateAgentInput(input: any, requiredFields: string[]) {
  const missingFields = requiredFields.filter(field => !input[field]);
  if (missingFields.length > 0) {
    throw new Error(`필수 입력값이 누락되었습니다: ${missingFields.join(', ')}`);
  }
  return true;
}

/**
 * 에이전트 오류 처리
 */
export function handleAgentError(error: unknown, agentName: string) {
  console.error(`${agentName} 에이전트 오류:`, error);
  return {
    error: {
      code: 'AGENT_ERROR',
      message: `${agentName} 에이전트 실행 중 오류가 발생했습니다.`,
      details: error instanceof Error ? error.message : '알 수 없는 오류',
    },
  };
}
