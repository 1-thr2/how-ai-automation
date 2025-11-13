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
 * 🎯 WHY 기반 의도 파악 질문 생성 (Single-Pass, 3-4개)
 */
async function generateWhyBasedQuestions(userInput: string): Promise<{
  questions: any[];
  tokens: number;
  latency: number;
}> {
  const startTime = Date.now();
  console.log('🎯 [WHY-based] 의도 파악 질문 생성 시작...');

  try {
    const systemPrompt = `당신은 사용자의 진짜 의도를 파악하는 전문가입니다.

# 핵심 임무
표면적 요청 뒤의 진짜 목적(WHY)을 파악하여, 최적의 솔루션을 제공하기 위한 최소한의 질문을 만드세요.

# 토스 PO 철학
1. **최소 질문 원칙**: 3-4개로 충분 (5개는 예외, 6개 이상 금지)
2. **의도 파악 > 기능 나열**: "분석도 하실 건가요?" (X) → "왜 필요하신가요?" (O)
3. **확장은 금지**: 질문은 의도 파악용. 추가 기능 제안은 솔루션 단계에서
4. **빠르게**: 사용자는 기다리기 싫어함. 간결하고 명확하게

# 토스 스타일 UX
- 질문: 10자 이내, 쉬운 말
- 설명: 20자 이내, 공감 톤
- 선택지: 텍스트만 (이모지 금지), 마지막은 "✏️ 직접 입력할게요"
- 친근하고 밝게

# 질문 생성 프로세스
1. Use Case 추론: 사용자가 진짜 원하는 것은?
2. 구분 질문: 어떤 질문으로 use case를 구분할 수 있는가?
3. 제약 파악: 무료/유료, 급한지, 기술 수준은?`;

    const userPrompt = `사용자 요청: "${userInput}"

# 분석 단계

**Step 1: Use Case 추론**
이 사람의 진짜 목적은? 가능한 시나리오들을 생각하세요.

예시:
- "트위터 모니터링" → [브랜드 평판 관리 / 고객 피드백 수집 / 경쟁사 추적]
- "엑셀 → 구글시트" → [1회 이동 / 반복 자동화 / 팀 협업 / 시각화/대시보드]
- "이력서 정리" → [채용 프로세스 / 데이터 분석 / 보관]

**Step 2: 구분 질문 생성**
각 use case를 구분할 수 있는 질문은?

❌ 나쁜 예: "분석도 하실 건가요?" (확장 제안)
✅ 좋은 예: "정리한 데이터로 뭘 하실 건가요?" (의도 파악)

**Step 3: 질문 개수 결정**
- 단순 (날씨 알림): 3개 (WHY + 제약만)
- 보통 (모니터링): 4개 (WHY + 제약 + use case 구분 1개)
- 복잡 (데이터 파싱): 4-5개 (WHY + 제약 + use case 구분 2개)

⚠️ 6개 이상 금지! 사용자 이탈!

---

# Few-Shot 예시

## 예시 1: 트위터 모니터링 (3개)
요청: "트위터에서 우리 브랜드 언급 모니터링하고 싶어요"
Use Cases: [평판 관리 / 피드백 수집 / 경쟁사 추적 / 그냥 보기]
이유: 모니터링 목적을 알아야 최적 도구 선택 가능. 빈도로 자동화 수준 결정. 예산은 필수 제약.
[
  {
    "key": "monitoring_purpose",
    "question": "왜 모니터링하시나요?",
    "type": "single",
    "options": ["브랜드 평판 관리", "고객 피드백 수집", "경쟁사 추적", "그냥 언급만 보기", "✏️ 직접 입력할게요"],
    "category": "purpose",
    "importance": "critical",
    "description": "목적에 맞게 추천해드릴게요"
  },
  {
    "key": "alert_frequency",
    "question": "얼마나 자주 확인하시나요?",
    "type": "single",
    "options": ["실시간으로", "하루 한 번", "일주일 한 번", "✏️ 직접 입력할게요"],
    "category": "context",
    "importance": "high",
    "description": "자동화 수준을 결정할게요"
  },
  {
    "key": "budget",
    "question": "예산은 어떠신가요?",
    "type": "single",
    "options": ["무료만", "월 1-5만원", "상관없어요", "✏️ 직접 입력할게요"],
    "category": "constraints",
    "importance": "critical",
    "description": "조건에 맞게 찾아드릴게요"
  }
]

## 예시 2: 데이터 정리 (3개)
요청: "엑셀 데이터를 정리하고 싶어요"
Use Cases: [1회 정리 / 반복 업데이트 / 팀 공유 / 시각화]
이유: 데이터 용도에 따라 도구 선택. 업데이트 빈도로 자동화 필요성 판단. 예산은 필수 제약.
[
  {
    "key": "data_goal",
    "question": "정리한 데이터로 뭘 하실 건가요?",
    "type": "single",
    "options": ["팀과 공유", "대시보드/보고", "분석", "그냥 보관", "✏️ 직접 입력할게요"],
    "category": "purpose",
    "importance": "critical",
    "description": "진짜 목적을 알려주세요"
  },
  {
    "key": "update_frequency",
    "question": "얼마나 자주 업데이트되나요?",
    "type": "single",
    "options": ["실시간", "매일", "한 번만", "가끔", "✏️ 직접 입력할게요"],
    "category": "context",
    "importance": "high",
    "description": "자동화 필요성을 판단할게요"
  },
  {
    "key": "budget",
    "question": "예산은 어떠신가요?",
    "type": "single",
    "options": ["무료만", "조금 가능", "상관없어요", "✏️ 직접 입력할게요"],
    "category": "constraints",
    "importance": "critical",
    "description": "조건에 맞게 찾아드릴게요"
  }
]

## 예시 3: 단순 알림 (3개)
요청: "매일 아침 날씨 알림 받고 싶어요"
Use Cases: [간단 알림] (추가 정보 불필요)
이유: 왜 필요한지(맥락), 긴급도, 예산만으로 충분. 단순한 요청은 3개만!
[
  {
    "key": "why_need",
    "question": "왜 필요하신가요?",
    "type": "single",
    "options": ["매번 확인 귀찮아서", "자주 깜빡해서", "일정 계획 위해", "✏️ 직접 입력할게요"],
    "category": "purpose",
    "importance": "high",
    "description": "상황에 맞게 추천할게요"
  },
  {
    "key": "urgency",
    "question": "언제까지 필요하신가요?",
    "type": "single",
    "options": ["오늘 바로", "이번 주 안에", "여유있어요", "✏️ 직접 입력할게요"],
    "category": "constraints",
    "importance": "medium",
    "description": "시간에 맞춰 제안할게요"
  },
  {
    "key": "budget",
    "question": "예산은 어떠신가요?",
    "type": "single",
    "options": ["무료만", "조금 가능", "상관없어요", "✏️ 직접 입력할게요"],
    "category": "constraints",
    "importance": "critical",
    "description": "조건에 맞게 찾아드릴게요"
  }
]

---

# 출력 형식
JSON 배열로 응답 (마크다운 블록 없이).

필수 필드:
- key: 질문 식별자 (snake_case)
- question: 질문 (10자 이내)
- type: "single" | "multiple"
- options: 선택지 배열 (마지막은 "✏️ 직접 입력할게요")
- category: "purpose" | "context" | "constraints"
- importance: "critical" | "high" | "medium"
- description: 설명 (20자 이내)

체크리스트:
✅ 3개 질문 기본 (복잡한 경우만 4개, 5개는 극히 예외)
✅ WHY 기반 의도 파악 질문
✅ 확장 제안 금지 (의도 명확화만)
✅ 토스 스타일 (짧고, 쉽고, 밝게)
✅ 이모지 금지 (텍스트만)
✅ 마지막 선택지 "✏️ 직접 입력할게요"
❌ 기술 수준 질문 금지 (서비스가 모든 가이드 제공, 진입장벽 유발)`;

    console.log('📊 [WHY-based] gpt-4o-mini 호출 시작 (Use Case 추론 → 구분 질문 생성)...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 빠르고 저렴하면서 충분한 추론 능력
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1200, // 3-4개 질문 (최대 5개)
      temperature: 0.3, // 일관성 중심 (사용자 대기 시간 최소화)
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error('❌ [WHY-based] OpenAI 응답이 비어있습니다');
      throw new Error('WHY 기반 질문 생성 실패');
    }

    console.log('🔍 [WHY-based] GPT 응답 길이:', content.length);
    console.log('🔍 [WHY-based] 응답 첫 200자:', content.substring(0, 200));

    // JSON 파싱
    const questions = parseQuestionsJSON(content);
    const latency = Date.now() - startTime;
    const actualTokens = response.usage?.total_tokens || 800;

    console.log(`✅ [WHY-based] 완료 - ${questions.length}개 질문, ${actualTokens} 토큰, ${latency}ms`);
    console.log(`💡 [토스 철학] 빠르게(4o-mini) + 최소 질문 + 의도 파악 → 최적 솔루션`);

    return {
      questions,
      tokens: actualTokens,
      latency,
    };
  } catch (error) {
    console.error('❌ [WHY-based] 실패:', error);
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
 * 🎯 WHY 기반 폴백 질문들 (JSON 파싱 실패 시)
 */
function getFallbackQuestions(): any[] {
  return [
    {
      key: 'automation_goal',
      question: '왜 자동화가 필요하신가요?',
      type: 'single',
      options: [
        '시간 절약',
        '놓치지 않기 위해',
        '데이터 분석',
        '팀과 공유',
        '✏️ 직접 입력할게요',
      ],
      category: 'purpose',
      importance: 'critical',
      description: '목적에 맞게 추천해드릴게요',
    },
    {
      key: 'urgency',
      question: '언제까지 필요하신가요?',
      type: 'single',
      options: [
        '오늘 바로',
        '이번 주 안에',
        '여유있어요',
        '✏️ 직접 입력할게요',
      ],
      category: 'constraints',
      importance: 'medium',
      description: '시간에 맞춰 제안할게요',
    },
    {
      key: 'budget',
      question: '예산은 어떠신가요?',
      type: 'single',
      options: [
        '무료만',
        '조금 가능',
        '상관없어요',
        '✏️ 직접 입력할게요',
      ],
      category: 'constraints',
      importance: 'critical',
      description: '조건에 맞게 찾아드릴게요',
    },
  ];
}


/**
 * 🎯 메인 WHY 기반 후속질문 생성 함수 (의도 파악 중심)
 */
export async function generate2StepFollowup(userInput: string): Promise<{
  questions: any[];
  metrics: FollowupMetrics;
}> {
  const overallStartTime = Date.now();
  const metrics: FollowupMetrics = {
    totalTokens: 0,
    latencyMs: 0,
    stepsUsed: ['why-based-intent'],
    modelUsed: 'gpt-4o-mini',
    success: false,
    errors: [],
  };

  try {
    console.log('🎯 [WHY-based] 의도 파악 중심 후속질문 생성 시작');

    // WHY 기반 질문 생성 (Single-Pass, 3-4개)
    const result = await generateWhyBasedQuestions(userInput);

    metrics.totalTokens = result.tokens;
    metrics.latencyMs = Date.now() - overallStartTime;
    metrics.success = true;

    console.log(`✅ [WHY-based] 완료 - 총 ${metrics.totalTokens} 토큰, ${metrics.latencyMs}ms`);
    console.log(`💡 [토스 철학] 최소 질문(${result.questions.length}개) + 의도 명확화 → 최적 솔루션`);

    return {
      questions: result.questions,
      metrics,
    };
  } catch (error) {
    metrics.success = false;
    metrics.errors = [error instanceof Error ? error.message : String(error)];
    metrics.latencyMs = Date.now() - overallStartTime;

    console.error('❌ [WHY-based] 실패:', error);

    // 완전 실패 시에도 WHY 중심 폴백 질문 반환
    return {
      questions: getFallbackQuestions(),
      metrics,
    };
  }
}
