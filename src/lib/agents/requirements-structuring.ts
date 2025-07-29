import { callOpenAI } from '@/lib/openai';
import { IntentAnalysisResult } from './intent-analysis';

export interface RequirementsResult {
  dataStructure: string; // 데이터 구조/포맷/예시
  mustAsk: string[]; // 꼭 추가로 물어봐야 할 질문
  constraints: string[]; // 제약/필수조건
  bestExample: string; // 실전 입력 예시
  copyPrompt: string; // 복붙/실행 프롬프트
  followupQuestions: { question: string; purpose: string; priority: string; example: string }[]; // 후속질문
}

const SYSTEM_PROMPT = `너는 자동화 요구/데이터 구조/입력값을 실전적으로 구조화하는 전문가다. 아래 규칙을 반드시 지켜라.

1. 유저의 데이터 구조/포맷/예시(스프레드시트, 컬럼명, 샘플 등)를 최대한 구체적으로 추출/가정한다.
   - 실제 업무에서 자주 사용하는 포맷/구조 참고
   - 유사한 실전 사례의 데이터 구조 반영
   - 실제 현업에서 통했던 최적화 방법 적용
   - 구체적인 데이터 타입/포맷/제약사항 포함

2. 반드시 추가로 물어봐야 할 질문(실행에 꼭 필요한 정보, followupQuestions)을 3~5개 제시한다.
   - 각 질문은 목적/우선순위/실전성/실행력 중심으로 작성
   - 실제 업무에서 자주 놓치는 정보/조건 고려
   - 유사한 실전 사례의 실패/성공 경험 참고
   - 실제 현업에서 통했던 체크리스트 반영
   - 구체적인 예시/케이스/시나리오 포함
   - 예시: { question, purpose, priority, example }

3. 제약/필수조건(환경, 포맷, 보안 등)을 명확히 뽑아낸다.
   - 실제 업무에서 자주 발생하는 제약/문제 고려
   - 유사한 실전 사례의 해결방법 참고
   - 실제 현업에서 통했던 우회/해결 방법 반영
   - 구체적인 우회/해결 방법과 예상 소요시간 포함

4. 실제 현업에서 통했던 실전 입력 예시를 1개 이상 제시한다.
   - 유저의 실제 업무/상황과 유사한 예시 선택
   - 실패사례/PlanB/해결방법까지 포함
   - 실제 현업에서 통했던 팁/노하우 반영
   - 구체적인 성과/지표/수치 포함

5. 위 내용을 바탕으로, 복붙/실행 가능한 프롬프트를 생성한다.
   - 실제 업무/상황에 맞게 최적화
   - 실패사례/PlanB를 고려한 방어 로직 포함
   - 실제 현업에서 통했던 팁/노하우 반영
   - 구체적인 실행 단계/코드/설정 포함

6. 반드시 JSON ONLY로 아래 형태로 답하라.
{
  "dataStructure": "",
  "mustAsk": [],
  "constraints": [],
  "bestExample": "",
  "copyPrompt": "",
  "followupQuestions": [ { "question": "", "purpose": "", "priority": "", "example": "" } ]
}`;

export async function structureRequirements(
  userInput: string,
  intent: IntentAnalysisResult
): Promise<RequirementsResult> {
  try {
    const response = await callOpenAI(SYSTEM_PROMPT);

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('API 응답이 비어있습니다.');
    }

    try {
      const result = JSON.parse(content);
      return {
        dataStructure: result.dataStructure || '',
        mustAsk: result.mustAsk || [],
        constraints: result.constraints || [],
        bestExample: result.bestExample || '',
        copyPrompt: result.copyPrompt || '',
        followupQuestions: result.followupQuestions || [],
      };
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      throw new Error('API 응답 형식이 올바르지 않습니다.');
    }
  } catch (error) {
    console.error('요구사항 구조화 오류:', error);
    throw new Error('요구사항 구조화 중 오류가 발생했습니다.');
  }
}
