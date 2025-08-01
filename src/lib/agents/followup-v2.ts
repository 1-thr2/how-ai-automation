import OpenAI from 'openai';
import { BlueprintReader, estimateTokens, selectModel } from '../blueprints/reader';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 메트릭 수집 인터페이스
 */
interface FollowupMetrics {
  totalTokens: number;
  latencyMs: number;
  stepsUsed: string[];
  modelUsed: string;
  success: boolean;
  errors?: string[];
}

/**
 * Draft 단계: 빠른 초기 질문 생성
 */
async function draftStepGen(userInput: string): Promise<{
  questions: any[];
  tokens: number;
  latency: number;
}> {
  const startTime = Date.now();
  console.log('📝 [Draft] 초기 질문 생성 시작...');

  try {
    console.log('📝 [Blueprint] Draft Blueprint 읽기 시작...');
    const { base, draft } = await BlueprintReader.getFollowupBlueprints();
    console.log('✅ [Blueprint] Draft Blueprint 읽기 완료');

    // 프롬프트 구성
    const systemPrompt = `${base}\n\n${draft}`;
    const userPrompt = `사용자 요청: "${userInput}"

위 요청을 분석하여 3-4개의 핵심 후속질문 초안을 생성하세요.
속도를 우선시하여 간단하고 명확한 질문만 만드세요.

중요: 반드시 JSON 배열 형식으로만 응답하세요. 
잘못된 형식: 마크다운 블록 사용하거나 객체로 감싸기
올바른 형식: [{"key": "...", "question": "...", ...}]
마크다운 블록이나 다른 텍스트는 절대 포함하지 마세요.`;

    // 토큰 수 추정 및 모델 선택
    const estimatedTokens = estimateTokens(systemPrompt + userPrompt);
    const model = selectModel(estimatedTokens);

    console.log(`📊 [Draft] 예상 토큰: ${estimatedTokens}, 선택된 모델: ${model}`);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.8, // Draft는 창의성 중시
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Draft 응답이 비어있습니다');
    }

    // 🔍 GPT 응답 디버깅
    console.log('🔍 [Draft] GPT 원시 응답 길이:', content.length);
    console.log('🔍 [Draft] GPT 원시 응답 첫 200자:', content.substring(0, 200));
    console.log('🔍 [Draft] GPT 원시 응답 마지막 200자:', content.substring(content.length - 200));

    // JSON 파싱 (개선된 로직)
    const questions = parseQuestionsJSON(content);
    const latency = Date.now() - startTime;
    const actualTokens = response.usage?.total_tokens || estimatedTokens;

    console.log(`✅ [Draft] 완료 - ${questions.length}개 질문, ${actualTokens} 토큰, ${latency}ms`);

    return {
      questions,
      tokens: actualTokens,
      latency,
    };
  } catch (error) {
    console.error('❌ [Draft] 실패:', error);
    throw error;
  }
}

/**
 * Refine 단계: 질문 품질 개선
 */
async function refineStepGen(
  draftQuestions: any[],
  userInput: string
): Promise<{
  questions: any[];
  tokens: number;
  latency: number;
}> {
  const startTime = Date.now();
  console.log('🔧 [Refine] 질문 품질 개선 시작...');

  try {
    console.log('🔧 [Blueprint] Refine Blueprint 읽기 시작...');
    const { base, refine } = await BlueprintReader.getFollowupBlueprints();
    console.log('✅ [Blueprint] Refine Blueprint 읽기 완료');

    // 프롬프트 구성
    const systemPrompt = `${base}\n\n${refine}`;
    const userPrompt = `원본 요청: "${userInput}"

Draft 단계에서 생성된 질문들:
${JSON.stringify(draftQuestions, null, 2)}

위 질문들을 더 명확하고 실용적으로 개선해주세요. 
질문의 개수는 유지하되, 표현과 옵션들을 더 구체적이고 사용자 친화적으로 만드세요.

중요: 반드시 JSON 배열 형식으로만 응답하세요. 
잘못된 형식: 마크다운 블록 사용하거나 객체로 감싸기
올바른 형식: [{"key": "...", "question": "...", ...}]
마크다운 블록이나 다른 텍스트는 절대 포함하지 마세요.`;

    // 토큰 수 추정 및 모델 선택
    const estimatedTokens = estimateTokens(systemPrompt + userPrompt);
    const model = selectModel(estimatedTokens);

    console.log(`📊 [Refine] 예상 토큰: ${estimatedTokens}, 선택된 모델: ${model}`);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.3, // Refine은 정확성 중시
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Refine 응답이 비어있습니다');
    }

    // 🔍 GPT 응답 디버깅
    console.log('🔍 [Refine] GPT 원시 응답 길이:', content.length);
    console.log('🔍 [Refine] GPT 원시 응답 첫 200자:', content.substring(0, 200));
    console.log('🔍 [Refine] GPT 원시 응답 마지막 200자:', content.substring(content.length - 200));

    // JSON 파싱
    const questions = parseQuestionsJSON(content);
    const latency = Date.now() - startTime;
    const actualTokens = response.usage?.total_tokens || estimatedTokens;

    console.log(
      `✅ [Refine] 완료 - ${questions.length}개 질문, ${actualTokens} 토큰, ${latency}ms`
    );

    return {
      questions,
      tokens: actualTokens,
      latency,
    };
  } catch (error) {
    console.error('❌ [Refine] 실패:', error);
    throw error;
  }
}

/**
 * 개선된 JSON 파싱 함수
 */
function parseQuestionsJSON(content: string): any[] {
  console.log('🔍 [JSON] 파싱 시작 - 원본 길이:', content.length);

  try {
    // 1차 시도: 직접 파싱
    const parsed = JSON.parse(content);
    console.log('✅ [JSON] 1차 파싱 성공');

    // 🔧 다양한 응답 구조 처리
    if (Array.isArray(parsed)) {
      // 배열이 직접 반환된 경우
      console.log('📋 [JSON] 1차 - 배열 형태 응답 감지');
      return parsed;
    } else if (parsed.questions && Array.isArray(parsed.questions)) {
      // questions 객체로 감싸진 경우
      console.log('📋 [JSON] 1차 - questions 객체 형태 응답 감지');
      return parsed.questions;
    } else {
      // 기타 구조
      console.log('📋 [JSON] 1차 - 알 수 없는 구조, 빈 배열 반환');
      return [];
    }
  } catch (firstError) {
    console.log('🔄 [JSON] 1차 파싱 실패, 정리 후 재시도...');
    console.log(
      '🔍 [JSON] 1차 에러:',
      firstError instanceof Error ? firstError.message : String(firstError)
    );

    try {
      // 2차 시도: 강화된 마크다운 코드 블록 제거
      let cleanContent = content;

      // 다양한 마크다운 블록 패턴 처리
      if (content.includes('```json')) {
        const jsonStart = content.indexOf('```json');
        const afterJsonTag = jsonStart + 7; // '```json' 길이

        // 첫 번째 줄바꿈까지 건너뛰기
        let startIndex = afterJsonTag;
        if (content.charAt(startIndex) === '\n') {
          startIndex++;
        }

        const endIndex = content.indexOf('```', afterJsonTag);
        if (endIndex !== -1) {
          cleanContent = content.substring(startIndex, endIndex).trim();
        } else {
          cleanContent = content.substring(startIndex).trim();
        }
        console.log('🔍 [JSON] 마크다운 블록 제거 후 길이:', cleanContent.length);
      } else if (content.includes('```')) {
        // 일반적인 코드 블록 처리
        const startIndex = content.indexOf('```') + 3;
        let actualStart = startIndex;
        if (content.charAt(actualStart) === '\n') {
          actualStart++;
        }
        const endIndex = content.indexOf('```', startIndex);
        if (endIndex !== -1) {
          cleanContent = content.substring(actualStart, endIndex).trim();
        }
      }

      // 3차 시도: 추가 정리
      cleanContent = cleanContent
        .replace(/[\u201C\u201D]/g, '"') // 스마트 따옴표
        .replace(/[\u2018\u2019]/g, "'") // 스마트 아포스트로피
        .replace(/,(\s*[}\]])/g, '$1') // trailing comma 제거
        .trim();

      console.log('🔍 [JSON] 정리 후 첫 100자:', cleanContent.substring(0, 100));
      console.log(
        '🔍 [JSON] 정리 후 마지막 100자:',
        cleanContent.substring(cleanContent.length - 100)
      );

      const parsed = JSON.parse(cleanContent);
      console.log('✅ [JSON] 2차 파싱 성공');

      // 🔧 다양한 응답 구조 처리
      if (Array.isArray(parsed)) {
        // 배열이 직접 반환된 경우
        console.log('📋 [JSON] 배열 형태 응답 감지');
        return parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        // questions 객체로 감싸진 경우
        console.log('📋 [JSON] questions 객체 형태 응답 감지');
        return parsed.questions;
      } else {
        // 기타 구조
        console.log('📋 [JSON] 알 수 없는 구조, 빈 배열 반환');
        return [];
      }
    } catch (secondError) {
      console.error('❌ [JSON] 2차 파싱도 실패, 폴백 질문 반환');
      console.log(
        '🔍 [JSON] 2차 에러:',
        secondError instanceof Error ? secondError.message : String(secondError)
      );

      // 폴백: 기본 질문 반환
      return getFallbackQuestions();
    }
  }
}

/**
 * 폴백 질문들 (JSON 파싱 실패 시)
 */
function getFallbackQuestions(): any[] {
  return [
    {
      key: 'data_source',
      question: '현재 처리하는 데이터는 주로 어디에서 오나요?',
      type: 'multiple',
      options: [
        '엑셀/구글시트',
        '데이터베이스',
        '웹사이트',
        '이메일',
        '기타 (직접입력)',
        '잘모름 (AI가 추천)',
      ],
      category: 'data',
      importance: 'high',
      description: '데이터 소스 파악',
    },
    {
      key: 'current_workflow',
      question: '현재는 이 작업을 어떻게 처리하고 계신가요?',
      type: 'multiple',
      options: [
        '수동으로 직접',
        '간단한 도구 사용',
        '복잡한 시스템 사용',
        '아직 시작 안함',
        '기타 (직접입력)',
        '잘모름 (AI가 추천)',
      ],
      category: 'workflow',
      importance: 'high',
      description: '현재 업무 방식 파악',
    },
    {
      key: 'success_criteria',
      question: '이 자동화를 통해 얻고 싶은 가장 중요한 결과는 무엇인가요?',
      type: 'multiple',
      options: [
        '시간 절약',
        '정확도 향상',
        '실시간 모니터링',
        '데이터 인사이트',
        '기타 (직접입력)',
        '잘모름 (AI가 추천)',
      ],
      category: 'goals',
      importance: 'high',
      description: '성공 기준 설정',
    },
  ];
}

/**
 * 메인 2-Step 후속질문 생성 함수
 */
export async function generate2StepFollowup(userInput: string): Promise<{
  questions: any[];
  metrics: FollowupMetrics;
}> {
  const overallStartTime = Date.now();
  const metrics: FollowupMetrics = {
    totalTokens: 0,
    latencyMs: 0,
    stepsUsed: [],
    modelUsed: 'gpt-4o-mini',
    success: false,
    errors: [],
  };

  try {
    console.log('🚀 [2-Step] 후속질문 생성 시작');

    // Step 1: Draft
    const draftResult = await draftStepGen(userInput);
    metrics.stepsUsed.push('draft');
    metrics.totalTokens += draftResult.tokens;

    // Step 2: Refine
    const refineResult = await refineStepGen(draftResult.questions, userInput);
    metrics.stepsUsed.push('refine');
    metrics.totalTokens += refineResult.tokens;

    // 메트릭 완성
    metrics.latencyMs = Date.now() - overallStartTime;
    metrics.success = true;

    console.log(`✅ [2-Step] 완료 - 총 ${metrics.totalTokens} 토큰, ${metrics.latencyMs}ms`);
    console.log(
      `💰 [비용] 예상 절약: ${(metrics.totalTokens * 0.00015 * 100).toFixed(2)}% (기존 4o 대비)`
    );

    return {
      questions: refineResult.questions,
      metrics,
    };
  } catch (error) {
    metrics.success = false;
    metrics.errors = [error instanceof Error ? error.message : String(error)];
    metrics.latencyMs = Date.now() - overallStartTime;

    console.error('❌ [2-Step] 실패:', error);

    // 완전 실패 시에도 폴백 질문 반환
    return {
      questions: getFallbackQuestions(),
      metrics,
    };
  }
}
