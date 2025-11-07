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

# 토스 스타일 UX 원칙 (필수 준수!)
1. **짧게**: 질문은 10자 이내, 설명은 20자 이내
2. **쉽게**: 초등학생도 이해 가능한 쉬운 말
3. **밝게**: 모든 선택지에 이모지 필수
4. **명확하게**: 구체적이고 직관적인 표현
5. **친절하게**: 사용자 입장에서 공감하는 말투

# 질문 구조 (3가지 카테고리)
1. purpose (목적): 진짜 달성하고 싶은 것
2. pain (페인포인트): 현재 가장 불편한 점
3. constraints (제약사항): 예산, 시간, 정책 등 현실적 제약`;

    const userPrompt = `사용자 요청: "${userInput}"

# 분석 프로세스
1단계: 이 사람의 진짜 목적이 무엇인가?
   예시) "인스타그램 모니터링" → 진짜 목적: "브랜드 평판 관리"
   예시) "네이버 카페 크롤링" → 진짜 목적: "커뮤니티 신규 콘텐츠 놓치지 않기"

2단계: 왜 자동화가 필요한가?
   - 시간 절약? 정보 놓침 방지? 데이터 분석? 팀 협업?

3단계: 현실적 제약은?
   - 무료만? 급함? 회사 승인?

# 질문 생성 가이드라인

🎯 **기본 3개 카테고리 (모든 케이스에 포함):**
1. **purpose** (목적): type="single" - 핵심 목적은 하나
2. **pain** (문제): type="single" - 가장 큰 문제 하나
3. **constraints** (제약): type="multiple" - 여러 제약 동시 가능

📋 **추가 질문 (케이스에 따라 1-2개 반드시 추가):**

⚠️ **중요: 정보 부족 시 잘못된 추천 발생! 필요한 질문은 반드시 추가하세요!**

다음 상황에서는 **반드시** context 질문 추가:
- **SNS/웹 모니터링** → 플랫폼, 키워드, 알림 방식 (최소 1개 추가)
- **데이터 수집/파싱** → 추출 필드, 파일 형식, 저장 위치 (최소 2개 추가)
- **복잡한 워크플로우** → 단계별 세부 정보 (최소 1-2개 추가)
- **단순한 요청** → 추가 질문 불필요 (3개만)

📊 **질문 개수 결정 기준:**
- 단순 (날씨 알림): 3개
- 보통 (SNS 모니터링): 4개 (context 1개 추가)
- 복잡 (이력서 파싱): 5개 (context 2개 추가)
- **6개 이상은 금지** (너무 길면 이탈)

🎨 **토스 스타일 작성법:**
- 질문: 10자 이내, 초등학생 언어 (예: "왜 필요한가요?")
- 설명: 20자 이내, 공감 톤 (예: "상황에 맞게 추천해드릴게요")
- 선택지: 모두 이모지 시작 + 구체적 상황 + "✏️ 직접 입력할게요" 필수 마지막

# Few-Shot 예시 (토스 스타일)

⚠️ **주의: 각 예시가 왜 그 개수인지 이해하고, 비슷한 케이스에 적용하세요!**

## 예시 1: SNS 모니터링 (보통 복잡도 → 4개)
사용자: "인스타그램에서 우리 브랜드 언급 모니터링하고 싶어요"

**왜 4개?**
- 기본 3개 필요 (목적, 불편함, 제약)
- SNS 모니터링은 "어떤 키워드를", "어느 플랫폼에서" 추적할지 필수!
- 정보 없으면 잘못된 추천 → 추가 1개 필수

→ 총 4개 질문 (기본 3개 + 모니터링 범위 1개)
[
  {
    "key": "purpose",
    "question": "왜 필요한가요?",
    "type": "single",
    "options": ["⏰ 시간 절약", "🔔 놓치지 않기", "📊 데이터 분석", "👥 팀 공유", "✏️ 직접 입력할게요"],
    "category": "purpose",
    "importance": "critical",
    "description": "딱 맞는 방법을 찾아드릴게요"
  },
  {
    "key": "current_pain",
    "question": "뭐가 불편한가요?",
    "type": "single",
    "options": ["⏱️ 매번 확인 힘들어요", "😰 중요한 거 놓쳐요", "📁 정리가 안돼요", "💬 공유가 번거로워요", "✏️ 직접 입력할게요"],
    "category": "pain",
    "importance": "high",
    "description": "가장 큰 고민을 알려주세요"
  },
  {
    "key": "constraints",
    "question": "특별한 상황 있나요?",
    "type": "multiple",
    "options": ["💸 무료만 써야 해요", "⚡ 오늘 바로 필요해요", "🏢 회사 승인 받아야 해요", "🎯 없어요", "✏️ 직접 입력할게요"],
    "category": "constraints",
    "importance": "high",
    "description": "있다면 알려주세요"
  },
  {
    "key": "monitoring_scope",
    "question": "어떻게 추적할까요?",
    "type": "single",
    "options": ["🎯 특정 키워드만", "🏷️ 브랜드명 전체", "🔍 경쟁사도 포함", "✏️ 직접 입력할게요"],
    "category": "context",
    "importance": "medium",
    "description": "범위를 알려주세요"
  }
]

## 예시 2: 이력서 파싱 (복잡 → 5개)
사용자: "이메일로 받은 이력서를 스프레드시트에 정리하고 싶어요"

**왜 5개?**
- 기본 3개 필요 (목적, 불편함, 제약)
- 데이터 파싱은 "어떤 정보를 추출"하고, "어떤 파일 형식"인지 필수!
- 정보 없으면 파싱 불가능 → 추가 2개 필수

→ 총 5개 질문 (기본 3개 + 추출 정보 + 파일 형식 2개)
[
  {
    "key": "purpose",
    "question": "왜 필요한가요?",
    "type": "single",
    "options": ["⏰ 시간 절약", "📊 데이터 분석", "👥 팀 공유", "✏️ 직접 입력할게요"],
    "category": "purpose",
    "importance": "critical",
    "description": "목적에 맞게 추천해드릴게요"
  },
  {
    "key": "current_pain",
    "question": "뭐가 불편한가요?",
    "type": "single",
    "options": ["⏱️ 손으로 옮기기 힘들어요", "😰 실수가 많아요", "📁 관리가 안돼요", "✏️ 직접 입력할게요"],
    "category": "pain",
    "importance": "high",
    "description": "가장 힘든 부분을 알려주세요"
  },
  {
    "key": "data_scope",
    "question": "뭘 추출할까요?",
    "type": "multiple",
    "options": ["👤 이름/연락처", "💼 경력", "🎓 학력", "🛠️ 기술", "💰 연봉", "📋 전부", "✏️ 직접 입력할게요"],
    "category": "context",
    "importance": "high",
    "description": "여러 개 선택 가능해요"
  },
  {
    "key": "file_format",
    "question": "파일 형식은요?",
    "type": "single",
    "options": ["📄 PDF", "📝 워드", "📃 한글", "📑 다양해요", "✏️ 직접 입력할게요"],
    "category": "context",
    "importance": "medium",
    "description": "주로 받는 형식을 알려주세요"
  },
  {
    "key": "constraints",
    "question": "특별한 상황 있나요?",
    "type": "multiple",
    "options": ["💸 무료만", "⚡ 급해요", "🏢 승인 필요", "🎯 없어요", "✏️ 직접 입력할게요"],
    "category": "constraints",
    "importance": "high",
    "description": "여러 개 OK"
  }
]

## 예시 3: 단순 알림 (단순 → 3개만)
사용자: "매일 아침 날씨를 카카오톡으로 받고 싶어요"

**왜 3개만?**
- 기본 3개로 충분 (목적, 불편함, 제약)
- 날씨 알림은 추가 정보 불필요 (API 하나, 메시지 형식 정해짐)
- 불필요한 질문은 사용자 이탈 유발 → 3개만

→ 총 3개 질문 (기본 3개만, context 질문 추가 안 함)
[
  {
    "key": "purpose",
    "question": "왜 필요한가요?",
    "type": "single",
    "options": ["⏰ 시간 절약", "🔔 놓치지 않기", "✏️ 직접 입력할게요"],
    "category": "purpose",
    "importance": "critical",
    "description": "상황에 맞게 추천해드릴게요"
  },
  {
    "key": "current_pain",
    "question": "뭐가 불편한가요?",
    "type": "single",
    "options": ["⏱️ 매번 확인 귀찮아요", "😰 깜빡해요", "✏️ 직접 입력할게요"],
    "category": "pain",
    "importance": "high",
    "description": "편하게 알려주세요"
  },
  {
    "key": "constraints",
    "question": "특별한 상황 있나요?",
    "type": "multiple",
    "options": ["💸 무료만", "⚡ 급해요", "🎯 없어요", "✏️ 직접 입력할게요"],
    "category": "constraints",
    "importance": "high",
    "description": "여러 개 선택 가능"
  }
]

# 출력 형식

⚠️ **중요한 결정:**
1. **사용자 요청 복잡도 판단** (단순/보통/복잡)
2. **질문 개수 결정** (3개/4개/5개)
3. **추가 질문 필요성 판단** (어떤 정보가 추가로 필요한가?)

JSON 배열로 응답 (마크다운 블록 없이).

필수 필드:
- key: 질문 식별자
- question: 질문 (10자 이내, 쉬운 말)
- type: "single" | "multiple"
- options: 선택지 배열 (이모지 필수, 마지막은 반드시 "✏️ 직접 입력할게요")
- category: "purpose" | "pain" | "constraints" | "context"
- importance: "critical" | "high" | "medium"
- description: 설명 (20자 이내, 공감 톤)

🎯 **체크리스트:**
- [ ] 기본 3개 카테고리 포함? (purpose, pain, constraints)
- [ ] 추가 정보 필요한 케이스? (SNS, 데이터, 워크플로우)
- [ ] 모든 선택지에 이모지?
- [ ] 마지막 선택지 "✏️ 직접 입력할게요"?
- [ ] 질문/설명 토스 스타일? (짧고, 쉽고, 밝게)
- [ ] 총 질문 개수 3-5개? (6개 이상 금지!)`;

    console.log('📊 [Purpose-First] gpt-4o 호출 시작 (동적 3-5개 질문 생성)...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // 더 나은 추론 능력
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1500, // 최대 5개 질문을 위한 충분한 토큰
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
    const actualTokens = response.usage?.total_tokens || 1500;

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
 * 🎯 토스 스타일 폴백 질문들 (JSON 파싱 실패 시)
 */
function getFallbackQuestions(): any[] {
  return [
    {
      key: 'purpose',
      question: '왜 필요한가요?',
      type: 'single',
      options: [
        '⏰ 시간 절약',
        '🔔 놓치지 않기',
        '📊 데이터 분석',
        '👥 팀 공유',
        '✏️ 직접 입력할게요',
      ],
      category: 'purpose',
      importance: 'critical',
      description: '딱 맞는 방법을 찾아드릴게요',
    },
    {
      key: 'current_pain',
      question: '뭐가 불편한가요?',
      type: 'single',
      options: [
        '⏱️ 매번 확인 힘들어요',
        '😰 중요한 거 놓쳐요',
        '📁 정리가 안돼요',
        '💬 공유가 번거로워요',
        '✏️ 직접 입력할게요',
      ],
      category: 'pain',
      importance: 'high',
      description: '가장 큰 고민을 알려주세요',
    },
    {
      key: 'constraints',
      question: '특별한 상황 있나요?',
      type: 'multiple',
      options: [
        '💸 무료만 써야 해요',
        '⚡ 오늘 바로 필요해요',
        '🏢 회사 승인 받아야 해요',
        '🎯 없어요',
        '✏️ 직접 입력할게요',
      ],
      category: 'constraints',
      importance: 'high',
      description: '여러 개 선택 가능',
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
