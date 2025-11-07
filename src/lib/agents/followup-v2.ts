import OpenAI from 'openai';
import { BlueprintReader, estimateTokens, selectModel } from '../blueprints/reader';
import { parseJSON } from './utils';

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
 * 🎯 Purpose-First: WHY 중심 질문 생성 (Single-Pass)
 */
async function generatePurposeFirstQuestions(userInput: string): Promise<{
  questions: any[];
  tokens: number;
  latency: number;
}> {
  const startTime = Date.now();
  console.log('🎯 [Purpose-First] WHY 중심 질문 생성 시작...');

  try {
    const systemPrompt = `당신은 사용자의 진짜 문제를 파악하는 비즈니스 컨설턴트입니다.

# 핵심 임무
표면적 요청 뒤의 진짜 목적(WHY)을 파악하고, 목적 달성을 위한 핵심 정보만 수집하는 질문을 만드세요.

# 질문 설계 철학
❌ 나쁜 질문: "어디서 데이터를 가져오나요?" (HOW - 사용자가 말한 방법에 갇힘)
✅ 좋은 질문: "왜 이 자동화가 필요한가요?" (WHY - 더 나은 대안 탐색 가능)

# 핵심 원칙
1. 도구/방법이 아닌 목적/문제 중심으로 질문
2. "어떻게"보다 "왜" 우선
3. 제약사항 미리 파악 (예산, 시간, 정책)
4. 사용자가 제시한 방법에서 벗어나 본질 파악

# 질문 구조 (3가지 카테고리)
1. purpose (목적): 진짜 달성하고 싶은 것
2. pain (페인포인트): 현재 가장 불편한 점
3. constraints (제약사항): 예산, 시간, 정책 등 현실적 제약`;

    const userPrompt = `사용자 요청: "${userInput}"

# 분석 프로세스
1단계: 이 사람의 진짜 목적이 무엇인가?
   예시) "인스타그램 모니터링" 요청 → 진짜 목적: "브랜드 평판 관리"
   예시) "네이버 카페 크롤링" 요청 → 진짜 목적: "커뮤니티 신규 콘텐츠 놓치지 않기"

2단계: 왜 자동화가 필요한가?
   - 시간 절약 (반복 작업 제거)?
   - 정보 놓침 방지 (실시간 모니터링)?
   - 데이터 기반 의사결정 (분석/인사이트)?
   - 팀 협업 개선 (정보 공유)?

3단계: 현실적 제약은?
   - 무료만 가능?
   - 즉시 설정 필요?
   - 회사 정책 제약?

# 출력 형식
반드시 다음 JSON 배열로만 응답하세요 (마크다운 블록 없이):
[
  {
    "key": "purpose",
    "question": "이 자동화를 통해 달성하고 싶은 진짜 목표가 무엇인가요?",
    "type": "single",
    "options": [
      "시간 절약 (반복 작업 제거)",
      "정보 놓치지 않기 (실시간 모니터링)",
      "데이터 기반 의사결정 (분석/인사이트)",
      "팀 협업 개선 (정보 공유 자동화)",
      "기타 (직접 입력)"
    ],
    "category": "purpose",
    "importance": "critical",
    "description": "표면적 요청이 아닌 본질적 목적 파악"
  },
  {
    "key": "current_pain",
    "question": "현재 가장 불편하거나 해결하고 싶은 문제는 무엇인가요?",
    "type": "single",
    "options": [
      "매번 수동으로 확인/처리하는 시간 낭비",
      "중요한 정보나 기회를 자주 놓침",
      "데이터 정리/분석에 시간 소모",
      "팀원들에게 일일이 공유하는 수고",
      "기타 (직접 입력)"
    ],
    "category": "pain",
    "importance": "high",
    "description": "현재 페인포인트 명확화"
  },
  {
    "key": "constraints",
    "question": "고려해야 할 제약사항이 있나요? (여러 개 선택 가능)",
    "type": "multiple",
    "options": [
      "무료 도구만 사용 가능",
      "1시간 내 빠른 설정 필요",
      "회사 보안 정책/승인 필요",
      "특정 도구 사용 불가 (있다면 직접 입력)",
      "제약 없음"
    ],
    "category": "constraints",
    "importance": "high",
    "description": "현실적 제약사항 사전 파악"
  }
]`;

    console.log('📊 [Purpose-First] gpt-4o 호출 시작...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // 더 나은 추론 능력
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.4, // 창의성 + 정확성 균형
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error('❌ [Purpose-First] OpenAI 응답이 비어있습니다');
      throw new Error('Purpose-First 응답이 비어있습니다');
    }

    console.log('🔍 [Purpose-First] GPT 응답 길이:', content.length);
    console.log('🔍 [Purpose-First] 응답 첫 200자:', content.substring(0, 200));

    // JSON 파싱
    const questions = parseQuestionsJSON(content);
    const latency = Date.now() - startTime;
    const actualTokens = response.usage?.total_tokens || 800;

    console.log(`✅ [Purpose-First] 완료 - ${questions.length}개 질문, ${actualTokens} 토큰, ${latency}ms`);

    return {
      questions,
      tokens: actualTokens,
      latency,
    };
  } catch (error) {
    console.error('❌ [Purpose-First] 실패:', error);
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
    } else if (parsed.key && parsed.question) {
      // 🔧 단일 질문 객체인 경우 (Draft 단계에서 자주 발생)
      console.log('📋 [JSON] 1차 - 단일 질문 객체 감지, 배열로 변환');
      return [parsed];
    } else {
      // 기타 구조
      console.log('📋 [JSON] 1차 - 알 수 없는 구조, 빈 배열 반환');
      console.log('🔍 [JSON] 파싱된 구조:', Object.keys(parsed));
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
 * 🎯 WHY 중심 폴백 질문들 (JSON 파싱 실패 시)
 */
function getFallbackQuestions(): any[] {
  return [
    {
      key: 'purpose',
      question: '이 자동화를 통해 달성하고 싶은 진짜 목표가 무엇인가요?',
      type: 'single',
      options: [
        '시간 절약 (반복 작업 제거)',
        '정보 놓치지 않기 (실시간 모니터링)',
        '데이터 기반 의사결정 (분석/인사이트)',
        '팀 협업 개선 (정보 공유 자동화)',
        '기타 (직접 입력)',
      ],
      category: 'purpose',
      importance: 'critical',
      description: '표면적 요청이 아닌 본질적 목적 파악',
    },
    {
      key: 'current_pain',
      question: '현재 가장 불편하거나 해결하고 싶은 문제는 무엇인가요?',
      type: 'single',
      options: [
        '매번 수동으로 확인/처리하는 시간 낭비',
        '중요한 정보나 기회를 자주 놓침',
        '데이터 정리/분석에 시간 소모',
        '팀원들에게 일일이 공유하는 수고',
        '기타 (직접 입력)',
      ],
      category: 'pain',
      importance: 'high',
      description: '현재 페인포인트 명확화',
    },
    {
      key: 'constraints',
      question: '고려해야 할 제약사항이 있나요? (여러 개 선택 가능)',
      type: 'multiple',
      options: [
        '무료 도구만 사용 가능',
        '1시간 내 빠른 설정 필요',
        '회사 보안 정책/승인 필요',
        '특정 도구 사용 불가 (있다면 직접 입력)',
        '제약 없음',
      ],
      category: 'constraints',
      importance: 'high',
      description: '현실적 제약사항 사전 파악',
    },
  ];
}


/**
 * 🎯 메인 Purpose-First 후속질문 생성 함수 (WHY 중심, Single-Pass)
 */
export async function generate2StepFollowup(userInput: string): Promise<{
  questions: any[];
  metrics: FollowupMetrics;
}> {
  const overallStartTime = Date.now();
  const metrics: FollowupMetrics = {
    totalTokens: 0,
    latencyMs: 0,
    stepsUsed: ['purpose-first'],
    modelUsed: 'gpt-4o',
    success: false,
    errors: [],
  };

  try {
    console.log('🎯 [Purpose-First] WHY 중심 후속질문 생성 시작');

    // Purpose-First 질문 생성 (Single-Pass)
    const result = await generatePurposeFirstQuestions(userInput);

    metrics.totalTokens = result.tokens;
    metrics.latencyMs = Date.now() - overallStartTime;
    metrics.success = true;

    console.log(`✅ [Purpose-First] 완료 - 총 ${metrics.totalTokens} 토큰, ${metrics.latencyMs}ms`);
    console.log(`🎯 [Approach] WHY 중심 접근으로 더 나은 대안 탐색 가능`);

    return {
      questions: result.questions,
      metrics,
    };
  } catch (error) {
    metrics.success = false;
    metrics.errors = [error instanceof Error ? error.message : String(error)];
    metrics.latencyMs = Date.now() - overallStartTime;

    console.error('❌ [Purpose-First] 실패:', error);

    // 완전 실패 시에도 WHY 중심 폴백 질문 반환
    return {
      questions: getFallbackQuestions(),
      metrics,
    };
  }
}
