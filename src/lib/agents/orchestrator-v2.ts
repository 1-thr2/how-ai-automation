import OpenAI from 'openai';
import pMap from 'p-map';
import { z } from 'zod';
import { BlueprintReader, estimateTokens, selectModel } from '../blueprints/reader';
// 🗑️ Phase 1: 레거시 import 제거 (failure-patterns, intent-analyzer)
import {
  generateRAGContext,
  searchToolInfo,
  validateURL,
  checkToolIntegration,
  searchWithRAG,
} from '../services/rag';
import { detectDomainEnhanced, getOptimalAITools, performPeerToolSearch } from '../services/ai-tools-registry';
import { checkSystematicFeasibility, quickFeasibilityCheck } from '../services/feasibility-checker';
import { getCodeTemplate, personalizeCodeTemplate } from '../code-templates';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Orchestrator 메트릭 인터페이스
 */
interface OrchestratorMetrics {
  totalTokens: number;
  totalLatencyMs: number;
  stagesCompleted: string[];
  modelsUsed: string[];
  ragSearches: number;
  ragSources: number;
  urlsVerified: number;
  success: boolean;
  errors?: string[];
  costBreakdown: {
    stepA: { tokens: number; model: string; cost: number };
    stepB: { tokens: number; ragCalls: number; cost: number };
    stepC: { tokens: number; model: string; cost: number };
  };
}

/**
 * 🆕 Step AB: RAG 기반 최적 플로우 생성 (Step A + B 통합)
 * - Step AB-1: gpt-4o-mini-search-preview로 최신 도구 웹 검색
 * - Step AB-2: o3-mini로 최적 도구 선택 및 플로우 생성
 * - Step C에서 상세 가이드 작성
 */
async function executeStepAB(
  userInput: string,
  followupAnswers: any
): Promise<{
  flow: { steps: string[]; title: string; subtitle: string };
  tokens: number;
  latency: number;
  model: string;
  ragMetadata: any;
  selectedTool: string;
  reasoning: string;
}> {
  const startTime = Date.now();
  console.log('🔍 [Step AB] RAG 기반 최적 플로우 생성 시작...');
  console.log(`📝 [Step AB] 사용자 요청: ${userInput}`);
  console.log(`📋 [Step AB] 후속 답변: ${JSON.stringify(followupAnswers || {})}`);

  try {
    // 1. 블루프린트 읽기
    const stepABBlueprint = await BlueprintReader.read('orchestrator/step_ab_research.md');
    console.log('✅ [Step AB] 블루프린트 로드 완료');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step AB-1: 웹 검색으로 최신 도구 조사
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🔍 [Step AB-1] gpt-4o-mini-search-preview로 웹 검색 시작...');

    const searchPrompt = `🎯 **사용자 요청**: "${userInput}"

📋 **후속 답변**: ${JSON.stringify(followupAnswers || {}, null, 2)}

**검색 미션**: 2025년 최신 도구/방법을 웹 검색으로 조사하고 **반드시 검증**하세요.

🔍 **2단계 검증 검색 프로세스 (필수 - 모든 요청에 적용):**

### Phase 1: 도구 발견 검색 (3가지 각도)

1️⃣ **일반 도구 검색**
   쿼리: "{핵심 키워드} automation tools 2025"
   예시: "instagram dm automation tools 2025"

2️⃣ **대안 비교 검색**
   쿼리: "{핵심 키워드} alternatives reddit 2025"
   예시: "instagram dm automation alternatives reddit 2025"

3️⃣ **베스트 프랙티스**
   쿼리: "best way to {동사구} 2025"
   예시: "best way to automate customer inquiries 2025"

### Phase 2: 검증 검색 (필수! - 도구 발견 후 반드시 수행)

발견한 각 도구에 대해 **반드시** 다음 3가지 검증 검색을 수행하세요:

1️⃣ **API 제한 검색**
   쿼리: "{플랫폼/서비스명} {기능} API limitations 2025"
   쿼리: "{플랫폼/서비스명} {기능} API restrictions"
   예시: "instagram dm api limitations 2025"
   예시: "zapier instagram dm api access"

   🚫 불가능 신호 찾기:
   - "API deprecated", "no longer supported", "discontinued"
   - "API 제한", "접근 불가", "제공하지 않음"
   - "against terms of service", "restricted access"

2️⃣ **실사용자 검증**
   쿼리: "does {도구명} actually work {연도} reddit"
   쿼리: "{도구명} not working {연도}"
   예시: "does zapier instagram dm actually work 2025 reddit"

   🚫 불가능 신호 찾기:
   - "doesn't work", "stopped working", "no longer works"
   - "작동 안 함", "사용 불가"

3️⃣ **공식 문서 확인**
   쿼리: "{플랫폼명} official API documentation {기능}"
   예시: "instagram official api documentation dm access"

   🚫 불가능 신호 찾기:
   - 공식 문서에 해당 기능 없음
   - "enterprise only", "paid tier only" (무료 요청 시)

### Phase 3: 불가능 판단 시 → 대안 검색

검증 결과 불가능하면 **목적**을 추출하여 대안을 검색하세요:

1️⃣ **목적 추출**
   사용자가 원하는 핵심 목적이 뭔가? (도구가 아니라 목적)
   예: "Instagram DM 자동화" → 목적: "문의 수집 + 저장 + 알림"

2️⃣ **대안 검색**
   쿼리: "{목적} alternative methods 2025"
   쿼리: "how to achieve {목적} without {불가능한 방법}"
   예시: "customer inquiry collection alternative methods 2025"
   예시: "how to collect inquiries without instagram dm"

3️⃣ **대안 평가**
   - 동일한 목적 달성 가능한가?
   - 사용자 제약조건 충족하는가?
   - 더 나은 장점이 있는가?

**필수 수집 정보** (각 도구마다):
- toolName: 도구 이름 (명확하게)
- pricing: 무료/유료/프리미엄/무료플랜 (구체적으로)
- coverage: 기능 범위/커버리지 (구체적 %나 설명)
- difficulty: 쉬움/보통/어려움 (초보자 기준)
- lastUpdated: 2024 or 2025 (최신성 확인)
- pros: 장점 2-3개 (구체적으로)
- cons: 단점 1-2개 (솔직하게)
- url: 공식 웹사이트 (optional, 있으면 좋음)

**품질 기준** (반드시 충족):
✅ 최소 3개 이상 도구 발견 (더 많으면 더 좋음)
✅ 각 도구마다 위 정보 모두 수집 (빈 항목 최소화)
✅ 2024-2025년 정보 우선 (오래된 정보 제외)
✅ 실사용자 후기 포함 (reddit, 블로그 등)

**출력 형식** (필수 - 반드시 유효한 JSON만 반환):

📌 **검증 성공 시 (도구 작동 확인됨):**
{
  "impossibleCase": false,
  "impossibleReason": "",
  "verificationPerformed": true,
  "verificationDetails": "Zapier Twitter 연동 검증 완료: 공식 API 지원, Reddit 실사용자 확인, 2025년 활발히 업데이트 중",
  "searchResults": [
    {
      "toolName": "도구명",
      "pricing": "무료/유료/프리미엄",
      "coverage": "기능 커버리지 설명",
      "difficulty": "쉬움/보통/어려움",
      "lastUpdated": "2024 or 2025",
      "pros": ["장점1", "장점2"],
      "cons": ["단점1"],
      "url": "https://..."
    }
  ],
  "searchQuality": { "toolsFound": 3, "infoCompleteness": "high", "latestYear": "2025" },
  "searchSummary": "3개 도구 발견 및 검증 완료"
}

📌 **검증 실패 시 (불가능 + 대안 제시):**
{
  "impossibleCase": true,
  "impossibleReason": "Instagram DM API는 Meta의 제한으로 자동화 불가능 (검증: API 문서 확인, Reddit 사용자 불가능 보고, Zapier 미지원)",
  "verificationPerformed": true,
  "verificationDetails": "Phase 2 검증 수행: instagram dm api limitations 2025 → 접근 불가 확인, zapier instagram dm reddit → 작동 안 함 확인, Meta 공식 문서 → DM endpoints restricted 확인",
  "searchResults": [
    {
      "toolName": "Google Forms + Zapier + Slack (대안)",
      "pricing": "무료",
      "coverage": "문의 수집 + DB 저장 + 알림 100% 달성",
      "difficulty": "쉬움",
      "lastUpdated": "2025",
      "pros": ["무료", "안정적", "DM보다 체계적"],
      "cons": ["DM이 아닌 별도 폼 사용"],
      "url": "https://forms.google.com"
    }
  ],
  "searchQuality": { "toolsFound": 1, "infoCompleteness": "high", "latestYear": "2025" },
  "searchSummary": "원래 요청(Instagram DM 자동화)은 불가능. 대안(웹폼)으로 동일 목적 달성 가능"
}

🚨 **중요 규칙**:
1. 웹 검색으로 실제 2025년 정보를 찾으세요 (내부 지식만 사용 금지)
2. **반드시 유효한 JSON만 반환하세요** (다른 텍스트, 설명, 마크다운 금지)
3. JSON 외 다른 내용 절대 포함 금지
4. 응답은 { 로 시작해서 } 로 끝나야 함`;

    const searchResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini-search-preview', // 🔍 검색 가능 모델
      messages: [
        {
          role: 'system',
          content: '당신은 최신 도구를 조사하는 리서처입니다. 웹 검색으로 2025년 정보를 찾으세요. 반드시 유효한 JSON만 반환하세요 (다른 텍스트 절대 금지).'
        },
        { role: 'user', content: searchPrompt },
      ],
      max_completion_tokens: 2000, // 검색 결과 충분히 담기
      // Note: gpt-4o-mini-search-preview는 temperature, response_format 미지원
    });

    const searchContent = searchResponse.choices[0]?.message?.content;
    if (!searchContent) {
      throw new Error('웹 검색 결과가 비어있습니다');
    }

    // 마크다운 코드 블록 제거 (```json ... ``` or ``` ... ```)
    let jsonContent = searchContent.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '')
        .trim();
    }

    // JSON 파싱 시도 (robust 처리)
    let searchData: any;
    let searchTokens = searchResponse.usage?.total_tokens || 0;

    try {
      searchData = JSON.parse(jsonContent);
      console.log(`✅ [Step AB-1] 웹 검색 완료 - ${searchData.searchResults?.length || 0}개 도구 발견, ${searchTokens} 토큰`);
      console.log(`📊 [Step AB-1] 검색 요약: ${searchData.searchSummary || '조사 완료'}`);
    } catch (parseError) {
      console.error('❌ [Step AB-1] JSON 파싱 실패:', parseError);
      console.log('📄 [Step AB-1] 원본 응답 (처음 200자):', searchContent.substring(0, 200));

      // JSON 파싱 실패 시 기본 구조 생성
      console.log('🔄 [Step AB-1] 기본 검색 데이터 구조로 대체');
      searchData = {
        searchResults: [],
        searchQuality: {
          toolsFound: 0,
          infoCompleteness: 'low',
          latestYear: '2025',
        },
        searchSummary: '웹 검색 결과 파싱 실패 - Fallback 검색으로 진행',
      };
    }
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step AB-1.5: 검색 결과 품질 검증 + Fallback
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // 불가능 케이스 체크
    const isImpossible = searchData.impossibleCase === true;
    if (isImpossible) {
      console.log(`🚫 [Step AB-1.5] 불가능 케이스 감지: ${searchData.impossibleReason || '사유 없음'}`);
      console.log('🔄 [Step AB-1.5] 대안 도구 검색으로 진행...');
      // impossibleCase여도 대안 도구를 찾았다면 계속 진행
    }

    const toolsFound = searchData.searchResults?.length || 0;
    const infoQuality = searchData.searchQuality?.infoCompleteness || 'low';
    const isQualityGood = toolsFound >= 3 && (infoQuality === 'high' || infoQuality === 'medium');

    console.log(`🔍 [Step AB-1.5] 검색 품질 체크: 도구 ${toolsFound}개, 완성도 ${infoQuality}`);

    if (!isQualityGood) {
      console.log('⚠️ [Step AB-1.5] 검색 품질 부족 - Fallback 검색 시도...');

      try {
        // Fallback: 명시적 RAG 호출 (searchToolInfo 사용)
        console.log('🔄 [Fallback] searchToolInfo로 직접 검색 시작...');

        // 불가능 케이스면 목적 기반 검색어로 변환
        let searchQuery = userInput;
        if (isImpossible && searchData.impossibleReason) {
          console.log('🎯 [Fallback] 불가능 케이스 감지 - 목적 기반 검색어 생성...');

          // 플랫폼 추출 (instagram, twitter, naver 등)
          const platformMatch = userInput.match(/(인스타그램|인스타|트위터|네이버|카카오톡|페이스북|유튜브|instagram|twitter|naver|kakao|facebook|youtube)/i);
          const platform = platformMatch ? platformMatch[0] : '';

          // 목적 추출 (followupAnswers.purpose 활용)
          const purposeMap: Record<string, string> = {
            '홍보': 'marketing brand awareness',
            '마케팅': 'marketing engagement',
            '분석': 'analytics monitoring',
            '수집': 'data collection monitoring',
            '알림': 'notification alert',
            '효율': 'productivity efficiency',
            '자동화': 'automation workflow',
          };

          let purposeKeywords = 'tools automation';
          if (followupAnswers?.purpose) {
            const purposeText = String(followupAnswers.purpose);
            for (const [key, value] of Object.entries(purposeMap)) {
              if (purposeText.includes(key)) {
                purposeKeywords = value;
                break;
              }
            }
          }

          searchQuery = `${platform} ${purposeKeywords}`.trim();
          console.log(`🔍 [Fallback] 변환된 검색어: "${userInput}" → "${searchQuery}"`);
        }

        const fallbackPromises = [
          searchToolInfo(`${searchQuery} free tools 2025`),
          searchToolInfo(`${searchQuery} alternatives best 2025`),
        ];

        const fallbackResults = await Promise.all(fallbackPromises);

        // Fallback 결과 통합 (RAGResult[] 타입)
        const mergedResults: any[] = [];
        fallbackResults.forEach((results) => {
          // searchToolInfo 결과를 파싱 (RAGResult[] 반환)
          if (results && results.length > 0) {
            results.forEach(ragResult => {
              if (ragResult.title || ragResult.content) {
                mergedResults.push({
                  toolName: ragResult.title || ragResult.content?.substring(0, 50) || '도구명 미상',
                  pricing: '확인 필요',
                  coverage: ragResult.content?.substring(0, 100) || 'Fallback 검색 결과',
                  difficulty: '보통',
                  lastUpdated: '2024-2025',
                  pros: ['웹 검색 결과'],
                  cons: ['상세 정보 부족'],
                  url: ragResult.url || '',
                });
              }
            });
          }
        });

        if (mergedResults.length > 0) {
          console.log(`✅ [Fallback] ${mergedResults.length}개 추가 도구 발견`);
          searchData.searchResults = [
            ...(searchData.searchResults || []),
            ...mergedResults.slice(0, 3), // 최대 3개까지만 추가
          ];
          searchData.searchQuality = {
            toolsFound: searchData.searchResults.length,
            infoCompleteness: 'medium',
            latestYear: '2024-2025',
          };
        } else {
          console.log('⚠️ [Fallback] 추가 도구 발견 실패 - 기존 결과로 진행');
        }
      } catch (fallbackError) {
        console.error('❌ [Fallback] 검색 실패:', fallbackError);
        console.log('🔄 [Fallback] 기존 검색 결과로 진행');
      }
    } else {
      console.log('✅ [Step AB-1.5] 검색 품질 양호 - 바로 진행');
    }

    console.log(`📊 [Step AB-1 최종] 총 ${searchData.searchResults?.length || 0}개 도구로 분석 진행`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step AB-2: o3-mini로 최적 도구 선택 및 플로우 생성
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('🧠 [Step AB-2] o3-mini로 최적 도구 선택 시작...');

    const selectionPrompt = `🎯 **사용자 요청**: "${userInput}"

📋 **후속 답변**: ${JSON.stringify(followupAnswers || {}, null, 2)}

🔍 **웹 검색 결과** (Step AB-1):
${JSON.stringify(searchData, null, 2)}

🚫 **불가능 케이스 감지 여부**: ${searchData.impossibleCase === true ? `YES - ${searchData.impossibleReason}` : 'NO'}

---

${stepABBlueprint}

---

**임무**: 검색 결과를 분석하여 **최적의 도구 하나**를 선택하고 플로우를 생성하세요.

⚠️ **불가능 케이스 처리 (중요!):**
- 만약 searchData.impossibleCase가 true라면:
  1. searchResults에서 **대안 도구**를 선택하세요 (원래 방법이 아닌 대안)
  2. title에 "⚠️ 원래 방법 불가 - 대안 제시" 포함
  3. reasoning에 왜 불가능하고 왜 이 대안을 선택했는지 명시
  4. **반드시 유효한 JSON 반환** (빈 응답 금지!)

예시 (불가능 케이스):
{
  "title": "⚠️ Instagram 자동 좋아요 불가 - 수동 관리 도구 추천",
  "subtitle": "API 제한으로 자동화 불가, 효율적인 수동 관리 방법 제시",
  "steps": [
    "1단계: Hootsuite로 해시태그 모니터링 대시보드 설정",
    "2단계: 관련 게시물 필터링 및 저장",
    "3단계: 일괄 관리 기능으로 효율적으로 좋아요",
    "4단계: 분석 리포트로 효과 측정"
  ],
  "selectedTool": "Hootsuite (수동 관리 도구)",
  "reasoning": "Instagram API는 자동 좋아요를 제한합니다. Hootsuite는 해시태그 모니터링 + 효율적인 수동 관리를 지원하여 동일 목적 달성 가능합니다."
}

**선택 기준 우선순위**:
1. 사용자 제약조건 충족 (필수) - 무료/유료, 난이도 등
2. 기능 커버리지 최대 (중요)
3. 난이도 최소 (중요)
4. 최신성 (보통) - 2024-2025 업데이트

⚠️ **절대 금지**: 여러 옵션 나열! 최적 **하나만** 선택해서 단일 레시피 생성

**출력 형식** (JSON):
{
  "title": "자동화 플로우 제목",
  "subtitle": "간단한 설명",
  "steps": [
    "1단계: [선택한 도구명] 계정 생성 및 설정",
    "2단계: [선택한 도구명] 키워드/조건 설정",
    "3단계: 알림 연동 및 테스트",
    "4단계: 최적화 및 모니터링"
  ],
  "selectedTool": "선택한 도구명 (예: Talkwalker Alerts)",
  "reasoning": "이 도구를 선택한 구체적 이유: 무료이면서 X 커버리지가 80%로 Y보다 2배 우수"
}

**중요**:
- steps 배열은 정확히 3-5개
- 각 단계는 선택한 도구명과 구체적 작업 포함
- 반드시 유효한 JSON만 반환 (빈 응답 절대 금지!)`;

    const selectionResponse = await openai.chat.completions.create({
      model: 'o3-mini', // 🧠 추론 모델로 최적 선택
      messages: [
        { role: 'user', content: selectionPrompt },
      ],
      max_completion_tokens: 1500, // o3-mini는 max_completion_tokens 사용
      // 🚨 o3-mini는 temperature, response_format 지원 안 함
    });

    const selectionContent = selectionResponse.choices[0]?.message?.content;
    if (!selectionContent) {
      throw new Error('o3-mini 응답이 비어있습니다');
    }

    // JSON 파싱 (o3-mini는 response_format 지원 안 하므로 수동 추출)
    let flowData;
    try {
      // JSON 코드블록 제거 시도
      let cleanContent = selectionContent.trim();
      if (cleanContent.includes('```json')) {
        const jsonStart = cleanContent.indexOf('```json') + 7;
        const jsonEnd = cleanContent.indexOf('```', jsonStart);
        cleanContent = cleanContent.substring(jsonStart, jsonEnd).trim();
      } else if (cleanContent.includes('```')) {
        cleanContent = cleanContent.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
      }
      flowData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('❌ [Step AB-2] JSON 파싱 실패, 원본 응답:', selectionContent);
      throw new Error('o3-mini JSON 파싱 실패');
    }

    const selectionTokens = selectionResponse.usage?.total_tokens || 0;
    console.log(`✅ [Step AB-2] 도구 선택 완료 - ${selectionTokens} 토큰`);
    console.log(`🎯 [Step AB-2] 선택된 도구: ${flowData.selectedTool || '미지정'}`);
    console.log(`📊 [Step AB-2] 선택 이유: ${flowData.reasoning || '미지정'}`);

    // 검증
    if (!flowData.steps || !Array.isArray(flowData.steps) || flowData.steps.length === 0) {
      throw new Error('플로우 단계가 없습니다');
    }

    const latency = Date.now() - startTime;
    const totalTokens = searchTokens + selectionTokens;

    const flow = {
      steps: flowData.steps,
      title: flowData.title || '자동화 플로우',
      subtitle: flowData.subtitle || '단계별 자동화 계획',
    };

    // RAG 메타데이터 생성 (Step C에서 사용)
    const ragMetadata = {
      searchPerformed: true,
      selectedTool: flowData.selectedTool || '미지정',
      reasoning: flowData.reasoning || '최적의 도구 선택됨',
      ragSearches: 1, // gpt-4o-mini-search-preview 1회
      ragSources: searchData.searchResults?.length || 0,
      searchSummary: searchData.searchSummary || '',
      methodValidation: {
        originalMethods: flow.steps.length,
        viableMethods: flow.steps.length,
        problematicMethods: 0,
        alternativesFound: 0,
        finalMethods: flow.steps.length,
      },
    };

    console.log(`✅ [Step AB] 플로우 생성 완료 - ${flow.steps.length}개 단계, ${totalTokens} 토큰 (검색:${searchTokens} + 선택:${selectionTokens}), ${latency}ms`);
    console.log(`📋 [Step AB] 생성된 단계들: ${flow.steps.map((s: string, i: number) => `${i + 1}. ${s.substring(0, 30)}...`).join(' | ')}`);

    return {
      flow,
      tokens: totalTokens,
      latency,
      model: 'gpt-4o-mini-search-preview + o3-mini', // 두 모델 조합
      ragMetadata,
      selectedTool: flowData.selectedTool || '미지정',
      reasoning: flowData.reasoning || '최적의 도구 선택됨',
    };
  } catch (error) {
    console.error('❌ [Step AB] 플로우 생성 실패:', error);

    // Fallback: 기본 플로우 생성
    console.log('🔄 [Step AB] Fallback 플로우 생성 중...');
    const fallbackFlow = createFallbackFlow(userInput, followupAnswers);
    const latency = Date.now() - startTime;

    console.log(`🛡️ [Step AB] Fallback 완료 - ${fallbackFlow.steps.length}개 기본 단계, ${latency}ms`);

    return {
      flow: fallbackFlow,
      tokens: 0,
      latency,
      model: 'fallback',
      ragMetadata: {
        searchPerformed: false,
        error: '플로우 생성 실패',
        methodValidation: {
          originalMethods: 0,
          viableMethods: 0,
          problematicMethods: 0,
          alternativesFound: 0,
          finalMethods: 0,
        },
      },
      selectedTool: 'fallback',
      reasoning: '기본 플로우 생성',
    };
  }
}

/**
 * 🗑️ LEGACY: Step A (기존 빠른 플로우 생성)
 * executeStepAB로 대체됨 - 삭제 예정
 */
async function executeStepA_LEGACY(
  userInput: string,
  followupAnswers: any,
  intentAnalysis?: any
): Promise<{
  flow: {
    steps: string[];
    title: string;
    subtitle: string;
  };
  tokens: number;
  latency: number;
  model: string;
  feasibilityAnalysis: any;
}> {
  const startTime = Date.now();
  console.log('📝 [Step A] 카드 뼈대 초안 생성 시작...');

  // 🧠 시스템적 현실성 분석 - AI 도구 레지스트리 기반 동적 체크!
  console.log('🧠 [Step A] 시스템적 현실성 분석 시작...');
  let feasibilityAnalysis;
  try {
    feasibilityAnalysis = await checkSystematicFeasibility(userInput, followupAnswers);
  } catch (error) {
    console.error('🚨 [Step A] 시스템적 현실성 체크 실패:', error);
    feasibilityAnalysis = await fallbackFeasibilityAnalysis(userInput, followupAnswers);
  }
  
  console.log(`🎯 [Step A] 현실성: ${feasibilityAnalysis.isRealistic ? '가능' : '제한적'}`);
  console.log(`📊 [Step A] 실행 가능성 점수: ${feasibilityAnalysis.feasibilityScore}/10`);
  console.log(`⚠️ [Step A] 불가능한 요소: ${feasibilityAnalysis.impossibleElements?.join(', ') || '없음'}`);
  console.log(`💰 [Step A] 비용 경고: ${feasibilityAnalysis.costWarnings?.join(', ') || '없음'}`);
  console.log(`✅ [Step A] 실행 가능한 대안: ${feasibilityAnalysis.viableAlternatives?.join(', ') || '없음'}`);

  // 🎯 AI 도구 레지스트리 기반 현실적 도구 추천
  const detectedDomain = detectDomainEnhanced(userInput, followupAnswers);
  const domainTools = getOptimalAITools(detectedDomain, 'automation', true);
  const optimalTools = [...domainTools.primary, ...domainTools.secondary];
  
  console.log(`🎯 [Step A] 감지된 도메인: ${detectedDomain}`);
  console.log(`🛠️ [Step A] 추천 도구들: ${optimalTools.map(t => t.toolSlug).join(', ')}`);

    // Blueprint 읽기
    const stepABlueprint = await BlueprintReader.read('orchestrator/step_a_draft.md');

    // 🔧 AI 도구 레지스트리 기반 현실적 프롬프트 구성
    const optimalToolsList = optimalTools.map(tool => 
      `- ${tool.toolSlug}: ${tool.capabilityTags.join(', ')} (${tool.pricingHint})`
    ).join('\n');

    const systemPrompt = stepABlueprint;
    const userPrompt = `🎯 **사용자 요청**: "${userInput}"
후속 답변: ${JSON.stringify(followupAnswers || {})}

🧠 **시스템적 현실성 분석 결과**:
📊 실행 가능성 점수: ${feasibilityAnalysis.feasibilityScore}/10 (${feasibilityAnalysis.isRealistic ? '현실적' : '제한적'})
⚠️ 불가능한 요소들: ${feasibilityAnalysis.impossibleElements?.join(', ') || '없음'}
💰 비용 경고: ${feasibilityAnalysis.costWarnings?.join(', ') || '없음'}
🔧 복잡성 경고: ${feasibilityAnalysis.difficultyWarnings?.join(', ') || '없음'}
✅ 현실적 대안들: ${feasibilityAnalysis.viableAlternatives?.join(', ') || '기본 자동화'}

🛠️ **2025년 현실적 도구 추천 (AI 레지스트리 기반)**:
감지된 도메인: ${detectedDomain}
추천 도구들:
${optimalToolsList}

🚨 **핵심 원칙: 시스템적 현실성 기반 플로우 생성**:
1. **현실성 우선**: 점수 ${feasibilityAnalysis.feasibilityScore}/10 기준으로 실현 가능한 방법만 제시
2. **비용 고려**: ${feasibilityAnalysis.costWarnings?.length > 0 ? '비용 경고 있음 - 무료/저비용 대안 우선' : '비용 제약 없음'}
3. **복잡성 배제**: ${feasibilityAnalysis.impossibleElements?.join(', ') || '없음'} 요소는 완전히 배제
4. **권장 접근법**: ${feasibilityAnalysis.recommendedApproach}

**실제로 구현 가능한** 자동화 플로우만 생성하세요:
- 불가능한 요소는 아예 언급하지 마세요
- LLM이 도움될 부분은 적극 활용하세요
- 현실적 대안들로만 플로우를 구성하세요

JSON 형식으로 응답하세요:
{
  "title": "자동화 플로우 제목",
  "subtitle": "간단한 설명", 
  "steps": [
    "1단계: 핵심 작업 1",
    "2단계: 핵심 작업 2", 
    "3단계: 핵심 작업 3"
  ]
}

단계는 3-7개, 각 단계는 구체적이고 **현실적으로 실행 가능하게** 작성하세요.`;

    const estimatedTokens = estimateTokens(systemPrompt + userPrompt);

  // 🛡️ 백업 모델 시퀀스: gpt-4o-mini → gpt-3.5-turbo → fallback
  // 🔧 비용 최적화: 간단한 요청은 mini만 사용
  const isSimpleRequest = userInput.length < 100 && Object.keys(followupAnswers || {}).length < 3;
  const modelSequence = isSimpleRequest ? ['gpt-4o-mini'] : ['gpt-4o-mini', 'gpt-3.5-turbo']; // 🔧 안정성 우선: mini 모델이 JSON 생성에 더 안정적
  let lastError: Error | null = null;
  let totalTokens = 0;

  for (let index = 0; index < modelSequence.length; index++) {
    const model = modelSequence[index];
    try {
      console.log(`🔄 [Step A] 시도 ${index + 1}/${modelSequence.length} - 모델: ${model}`);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
        max_tokens: 300, // ⚡ Step A 더욱 축소
        temperature: 0.1, // 🔥 JSON 안정성을 위해 더 낮은 온도
        response_format: { type: 'json_object' }, // 🎯 JSON 전용 모드
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error(`${model} 응답이 비어있습니다`);
      }

      // JSON 파싱 시도
      const flowData = JSON.parse(content);
      
      // ✅ 파싱 성공 및 플로우 검증
      if (flowData.steps && Array.isArray(flowData.steps) && flowData.steps.length > 0) {
    const latency = Date.now() - startTime;
        totalTokens = response.usage?.total_tokens || estimatedTokens;

        const flow = {
          steps: flowData.steps,
          title: flowData.title || '자동화 플로우',
          subtitle: flowData.subtitle || '단계별 자동화 계획'
        };

        console.log(`✅ [Step A] 플로우 생성 성공 - ${flow.steps.length}개 단계, ${totalTokens} 토큰, ${latency}ms (${model})`);
        console.log(`📋 [Step A] 생성된 단계들: ${flow.steps.map((s: string, i: number) => `${i+1}. ${s.substring(0, 30)}...`).join(' | ')}`);

    return {
          flow,
          tokens: totalTokens,
      latency,
      model,
      feasibilityAnalysis,
    };
      } else {
        throw new Error(`${model}에서 유효한 플로우 생성 실패 (단계 없음)`);
      }

  } catch (error) {
      console.warn(`⚠️ [Step A] ${model} 실패:`, error);
      lastError = error as Error;
      
      // 다음 모델이 있으면 계속, 없으면 중단
      if (index < modelSequence.length - 1) {
        console.log(`🔄 [Step A] ${model} 실패, 다음 모델로 시도...`);
        continue;
      }
    }
  }

  // 🚨 모든 모델 실패 시 Fallback 플로우 생성
  console.warn('🚨 [Step A] 모든 모델 실패, Fallback 플로우 생성...');
  
  const fallbackFlow = createFallbackFlow(userInput, followupAnswers);
  const latency = Date.now() - startTime;

  console.log(`🛡️ [Step A] Fallback 완료 - ${fallbackFlow.steps.length}개 기본 단계, ${latency}ms`);

  return {
    flow: fallbackFlow,
    tokens: estimatedTokens, // 추정값 사용
    latency,
    model: 'fallback',
    feasibilityAnalysis, // fallback에서도 현실성 분석 포함
  };
}

/**
 * 🛡️ Fallback 플로우 생성 (모든 모델 실패 시)
 */
function createFallbackFlow(userInput: string, followupAnswers: any): {
  steps: string[];
  title: string;
  subtitle: string;
} {
  // 사용자 입력에서 키워드 추출하여 적절한 기본 플로우 생성
  const inputLower = userInput.toLowerCase();
  
  let steps: string[] = [];
  let title = '자동화 플로우';
  let subtitle = '기본 단계별 계획';
  
  if (inputLower.includes('분석') || inputLower.includes('데이터')) {
    title = '데이터 분석 자동화';
    subtitle = '데이터 수집부터 분석까지';
    steps = [
      '1단계: 데이터 소스 연결',
      '2단계: 데이터 수집 자동화',
      '3단계: 데이터 분석 및 처리',
      '4단계: 결과 리포트 생성'
    ];
  } else if (inputLower.includes('알림') || inputLower.includes('모니터링')) {
    title = '모니터링 및 알림 자동화';
    subtitle = '실시간 감시 및 알림 시스템';
    steps = [
      '1단계: 모니터링 대상 설정',
      '2단계: 알림 조건 구성',
      '3단계: 알림 채널 연결',
      '4단계: 테스트 및 활성화'
    ];
  } else {
    // 기본 범용 플로우
    title = '업무 자동화 플로우';
    subtitle = '반복 작업 자동화';
    steps = [
      '1단계: 작업 대상 설정',
      '2단계: 자동화 도구 연결',
      '3단계: 워크플로우 구성',
      '4단계: 테스트 및 실행'
    ];
  }
  
  return {
    steps,
    title,
    subtitle
  };
}

/**
 * 🎯 Step A에서 제안된 구체적 방법론 추출 (플로우 기반)
 */
function extractProposedMethodsFromFlow(flow: {steps: string[], title: string, subtitle: string}): Array<{tool: string, action: string, details: string}> {
  const methods: Array<{tool: string, action: string, details: string}> = [];
  
  console.log(`🔍 [방법추출] 플로우 분석 시작: ${flow.steps.length}개 단계`);
  
  // 플로우의 각 단계에서 도구 및 방법론 추출 (AI 수준 정교함)
  flow.steps.forEach((step: string, index: number) => {
    if (step && typeof step === 'string') {
      console.log(`🔍 [방법추출] ${index+1}단계 분석: "${step}"`);
      
      // 🚨 1순위: 크롤링/스크래핑 (가장 문제가 되는 방법)
      const crawlingMatches = step.match(/(크롤링|crawling|스크래핑|scraping|매물.*가져오기|데이터.*수집|HTML.*추출)/gi);
      if (crawlingMatches) {
        const platformMatch = step.match(/(네이버.*부동산|직방|다방|부동산.*사이트|부동산.*플랫폼)/gi);
        const platform = platformMatch ? platformMatch[0] : '웹사이트';
        methods.push({
          tool: `${platform} 크롤링`,
          action: step,
          details: flow.title + ' (웹 크롤링은 법적/기술적 제약 있음 - 검증 필요)'
        });
        console.log(`🚨 [방법추출] 크롤링 방법 발견: ${platform}`);
      }
      
      // 🚨 2순위: 구체적 서비스/API 검증이 필요한 도구들
      const criticalServicesMatches = step.match(/(네이버.*부동산|직방|다방|잡코리아|jobkorea|사람인|saramin|링크드인|linkedin|Facebook API|Instagram API|카카오톡|kakao|유튜브 API|youtube api)/gi);
      if (criticalServicesMatches) {
        methods.push({
          tool: criticalServicesMatches[0],
          action: step,
          details: flow.title + ' (개인 사용자 API 지원 여부 검증 필요)'
        });
        console.log(`🔍 [방법추출] 중요 서비스 발견: ${criticalServicesMatches[0]}`);
      }
      
      // 🚨 3순위: 알림 방법 (카카오톡 등)
      const notificationMatches = step.match(/(카카오톡.*알림|카톡.*전송|kakao.*message|텔레그램|telegram|슬랙.*알림|slack.*webhook)/gi);
      if (notificationMatches) {
        methods.push({
          tool: notificationMatches[0],
          action: step, 
          details: flow.title + ' (개인 알림 서비스 API 제약 검증 필요)'
        });
        console.log(`🔔 [방법추출] 알림 방법 발견: ${notificationMatches[0]}`);
      }
      
      // 4순위: 일반적인 도구들 (보통 지원됨)
      const generalToolMatches = step.match(/(Google Apps Script|Apps Script|Zapier|Make\.com|Slack|Gmail|Drive|Sheets|Forms|IFTTT|Airtable|Notion)/gi);
      if (generalToolMatches && !crawlingMatches && !criticalServicesMatches) {
        methods.push({
          tool: generalToolMatches[0],
          action: step,
          details: flow.title || ''
        });
        console.log(`✅ [방법추출] 일반 도구 발견: ${generalToolMatches[0]}`);
      }
      
      // 5순위: 웹훅/API 관련
      const webhookMatches = step.match(/(웹훅|webhook|API.*연결|직접.*연동)/gi);
      if (webhookMatches && !crawlingMatches && !criticalServicesMatches) {
        methods.push({
          tool: 'Custom API Integration',
          action: step,
          details: flow.title + ' (API 개인 지원 여부 및 개발 복잡도 검증 필요)'
        });
        console.log(`🔗 [방법추출] API 연동 발견`);
      }
      
      // 6순위: 액션 키워드 기반 (최종 폴백)
      if (!crawlingMatches && !criticalServicesMatches && !notificationMatches && !generalToolMatches && !webhookMatches) {
        const actionKeywords = step.match(/(연결|설정|구성|모니터링|수집|분석|전송|알림|저장|생성)/gi);
        if (actionKeywords) {
          methods.push({
            tool: 'Manual Process',
            action: step,
            details: flow.title + ' (수동/반자동 대안 검토 필요)'
          });
        }
      }
    }
  });
  
  return methods;
}

/**
 * 🔧 검증 결과를 바탕으로 플로우 단계들을 수정하는 함수
 */
async function generateVerifiedSteps(
  originalSteps: string[],
  validMethods: any[],
  problematicMethods: any[]
): Promise<string[]> {
  
  if (problematicMethods.length === 0) {
    // 문제 없으면 원본 그대로 반환
    console.log('✅ [단계 검증] 모든 단계가 실행 가능 - 원본 유지');
    return originalSteps;
  }
  
  console.log(`🔧 [단계 수정] ${problematicMethods.length}개 문제 단계 수정 필요`);
  
  // 문제 있는 단계들을 현실적 대안으로 교체
  const verifiedSteps: string[] = [];
  
  for (let i = 0; i < originalSteps.length; i++) {
    const originalStep = originalSteps[i];
    
    // 이 단계가 문제 있는 방법을 포함하는지 확인
    const isProblematic = problematicMethods.some(pm => {
      const stepLower = originalStep.toLowerCase();
      const toolLower = pm.tool.toLowerCase();
      
      // 🔍 다양한 매칭 방식으로 문제 단계 감지
      if (toolLower === 'manual process') {
        // Manual Process는 특별 처리: 주요 키워드로 감지
        return stepLower.includes('인스타그램') || 
               stepLower.includes('카카오톡') || 
               stepLower.includes('네이버') ||
               stepLower.includes('페이스북') ||
               stepLower.includes('api') ||
               stepLower.includes('dm') ||
               stepLower.includes('메시지');
      }
      
      // 일반적인 도구명 매칭
      return stepLower.includes(toolLower);
    });
    
    if (isProblematic) {
      // 문제 있는 단계를 현실적 대안으로 교체
      const alternativeStep = await generateAlternativeStep(originalStep, problematicMethods);
      verifiedSteps.push(alternativeStep);
      console.log(`🔄 [단계 수정] "${originalStep.substring(0, 40)}..." → "${alternativeStep.substring(0, 40)}..."`);
    } else {
      // 문제 없는 단계는 그대로 유지
      verifiedSteps.push(originalStep);
    }
  }
  
  return verifiedSteps;
}

/**
 * 🛡️ Fallback 현실성 분석 (시스템적 체크 실패 시)
 * 🎯 AI 기반 동적 분석으로 업그레이드
 */
async function fallbackFeasibilityAnalysis(userInput: string, followupAnswers: any) {
  console.warn('⚠️ [Fallback] 시스템적 현실성 체크 실패, AI 기반 목적 분석 시작');

  // 🎯 AI 기반 상세 목적 분석 (어떤 플랫폼이든 동적으로 처리)
  const purposeAnalysis = await analyzePurposeFromInput(userInput, followupAnswers);

  // 🔍 quick check도 병행 (추가 정보)
  const quickCheck = quickFeasibilityCheck(userInput);

  // 기본 구조로 변환 (AI 분석 결과 우선 사용)
  return {
    isRealistic: purposeAnalysis.viableAlternatives.length > 0,
    feasibilityScore: purposeAnalysis.viableAlternatives.length > 0
      ? (purposeAnalysis.impossibleElements.length > 0 ? 6 : 8)
      : 3,
    impossibleElements: purposeAnalysis.impossibleElements,
    viableAlternatives: purposeAnalysis.viableAlternatives.length > 0
      ? purposeAnalysis.viableAlternatives
      : quickCheck.viableAlternatives ?? ['Google Apps Script', 'IFTTT'],
    costWarnings: [],
    difficultyWarnings: purposeAnalysis.impossibleElements.length > 0
      ? [`원래 요청의 일부 기능은 불가능합니다: ${purposeAnalysis.impossibleElements.join(', ')}`]
      : [],
    recommendedApproach: purposeAnalysis.impossibleElements.length > 0
      ? `${purposeAnalysis.mainGoal}를 위한 창의적 우회 방법 활용`
      : '추천 도구로 직접 구현',
    mainGoal: purposeAnalysis.mainGoal,  // 추가 정보
    currentWorkflow: purposeAnalysis.currentWorkflow  // 🎯 현재 워크플로우 정보 추가
  };
}

/**
 * 🎯 불가능한 요소 빠른 체크 (복잡도 판단용)
 */
function quickCheckImpossible(userInput: string, followupAnswers: any): boolean {
  const inputLower = userInput.toLowerCase();
  const answersStr = JSON.stringify(followupAnswers || {}).toLowerCase();
  const combined = inputLower + ' ' + answersStr;

  // 🚨 알려진 불가능/어려운 플랫폼/요청 패턴들
  const impossiblePatterns = [
    // 한국 플랫폼
    '카카오톡', 'kakao', '카톡',
    '인스타그램', 'instagram', '인스타',
    '네이버 카페', '네이버카페',
    '페이스북', 'facebook',
    '틱톡', 'tiktok',
    '잡코리아', '사람인', 'saramin',

    // 어려운 작업들
    'dm 자동', '메시지 자동', 'api 연동',
    '크롤링', 'crawling', '스크래핑', 'scraping',
    '실시간 모니터링', 'real-time',

    // 제한적 API
    'twitter api', 'x api',
    'linkedin api'
  ];

  const hasImpossibleElement = impossiblePatterns.some(pattern =>
    combined.includes(pattern)
  );

  if (hasImpossibleElement) {
    console.log('🚨 [복잡도 판단] 불가능 요소 감지 → o3-mini 깊은 추론 모드');
  } else {
    console.log('✅ [복잡도 판단] 일반 요청 → gpt-4o 빠른 처리 모드');
  }

  return hasImpossibleElement;
}

/**
 * 🧠 AI 기반 사용자 목적 및 현실적 대안 분석 (시스템적 접근)
 * 🎯 하드코딩 제거: 어떤 플랫폼/요청이든 동적으로 분석
 * 🎯 창의적 접근: 사용자 워크플로우 내에서 비슷한 효과를 내는 대안 제시
 * 🎯 복잡도 기반 모델 선택: 어려운 케이스는 o3-mini, 쉬운 케이스는 gpt-4o
 */
async function analyzePurposeFromInput(userInput: string, followupAnswers: any) {
  console.log('🧠 [AI 목적분석] 시스템적 분석 시작...');

  // 🎯 복잡도 판단: 불가능한 요소가 있는지 체크
  const needsDeepReasoning = quickCheckImpossible(userInput, followupAnswers);

  // 복잡한 케이스: o3-mini (깊은 추론 + 창의적 문제 해결)
  // 간단한 케이스: gpt-4o (빠르고 저렴)
  const selectedModel = needsDeepReasoning ? 'o3-mini' : 'gpt-4o-2024-11-20';

  console.log(`🎯 [모델 선택] ${selectedModel} (복잡도: ${needsDeepReasoning ? '높음' : '낮음'})`);

  const analysisPrompt = `당신은 사용자의 진짜 의도를 파악하고 현실적 대안을 제시하는 전문가입니다.

🎯 **핵심 원칙**:
1. **진짜 목적 파악**: 표면적 요청 너머의 실제 달성하고자 하는 목표
2. **워크플로우 존중**: 사용자가 현재 사용 중인 플랫폼/도구를 바꾸라고 하지 말 것
3. **창의적 우회**: 직접 불가능하면, 간접적으로 비슷한 효과를 내는 방법 찾기
4. **실행 가능성**: 2025년 현재 개인이 실제로 구현 가능한 방법만 제시

🚫 **금지사항**:
- "다른 플랫폼 사용하세요" (예: 카카오톡 → Google Forms)
- "불가능합니다" 만 말하고 끝내기
- 단순한 도구 교체 제안

✅ **올바른 접근**:
- "카카오톡을 그대로 사용하되, X 방식으로 우회하면 비슷한 효과"
- "인스타 DM 자동화는 불가능하지만, Y 방법으로 같은 목표 달성 가능"
- 사용자의 현재 워크플로우를 최대한 유지하면서 자동화 추가

📋 **분석 대상**:
사용자 요청: "${userInput}"
후속 답변: ${JSON.stringify(followupAnswers || {})}

🎯 **분석 항목**:
1. **mainGoal**: 사용자가 진짜로 달성하고 싶은 목표 (구체적으로)
2. **currentWorkflow**: 사용자가 현재 사용 중인 플랫폼/도구 (바꾸면 안됨)
3. **impossibleElements**: 기술적/법적으로 직접 불가능한 요소들
4. **impossibleReasons**: 각 불가능 요소의 구체적인 이유 (2025년 기준)
5. **creativeWorkarounds**: 현재 워크플로우 내에서 비슷한 효과를 내는 창의적 우회 방법들
   - 형식: "구체적 방법 + 왜 비슷한 효과인지 설명"
   - 예시: "카카오톡 알림톡 → 이메일 전환 설정 + Gmail 자동 응답 (고객은 카카오톡으로 받지만 내부는 자동화)"

🎯 **창의적 우회 예시**:
- 카카오톡 DM 자동화 (불가능) → 카카오톡 알림 → 이메일 전환 + Gmail 필터 자동화
- 인스타 DM 감지 (불가능) → 인스타 DM → 특정 이메일 자동전송 + IFTTT 연동
- 네이버 카페 API (불가능) → RSS 피드 + Google Apps Script 주기적 크롤링

다음 JSON 형식으로 응답하세요:
{
  "mainGoal": "사용자의 진짜 목표 (구체적으로)",
  "currentWorkflow": "현재 사용 중인 플랫폼/도구 (바꾸면 안됨)",
  "impossibleElements": [
    {
      "element": "불가능한 요소",
      "reason": "왜 불가능한지 (2025년 기준)"
    }
  ],
  "creativeWorkarounds": [
    {
      "method": "구체적인 우회 방법",
      "effect": "어떻게 비슷한 효과를 내는지",
      "maintains_workflow": true/false,
      "difficulty": "쉬움|보통|어려움"
    }
  ],
  "fallbackAlternatives": [
    "최후의 수단으로 다른 도구 사용 (워크플로우 변경 필요)"
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: selectedModel, // 🔥 복잡도 기반 동적 모델 선택 (o3-mini or gpt-4o)
      messages: [
        {
          role: 'system',
          content: `당신은 자동화 전문가입니다. 사용자의 진짜 의도를 파악하고,
불가능해 보이는 요청도 창의적으로 우회하여 비슷한 효과를 낼 수 있는 방법을 찾습니다.
중요: 사용자의 현재 워크플로우를 최대한 유지하면서 자동화를 추가하는 방식으로 접근하세요.

특히 중요:
- 단순히 "다른 도구 사용하세요"가 아닌, 현재 도구를 유지하면서 우회하는 창의적 방법
- 2025년 현재 실제로 작동하는 방법만 제시
- 초보자도 30분 내 설정 가능한 난이도

${needsDeepReasoning ? '🧠 깊은 추론 모드: 불가능해 보이는 요청도 창의적으로 우회하는 방법을 단계별로 추론하세요.' : ''}`
        },
        { role: 'user', content: analysisPrompt }
      ],
      max_tokens: needsDeepReasoning ? 3000 : 2000, // o3-mini는 더 많은 토큰 허용
      temperature: needsDeepReasoning ? 0.5 : 0.4, // 복잡한 케이스는 더 창의적으로
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('AI 목적분석 응답 없음');
    }

    const analysis = JSON.parse(content);
    console.log(`✅ [AI 목적분석] ${selectedModel} 완료:`, {
      mainGoal: analysis.mainGoal,
      impossibleCount: analysis.impossibleElements?.length || 0,
      workaroundCount: analysis.creativeWorkarounds?.length || 0,
      usedDeepReasoning: needsDeepReasoning
    });

    // 🔄 기존 인터페이스와 호환되도록 변환
    return {
      mainGoal: analysis.mainGoal || '사용자 목적 자동화',
      currentWorkflow: analysis.currentWorkflow || '',
      impossibleElements: (analysis.impossibleElements || []).map((item: any) =>
        typeof item === 'string' ? item : `${item.element} (${item.reason})`
      ),
      viableAlternatives: [
        // 1순위: 창의적 우회 방법들 (워크플로우 유지)
        ...(analysis.creativeWorkarounds || [])
          .filter((w: any) => w.maintains_workflow)
          .map((w: any) => `${w.method} - ${w.effect}`),
        // 2순위: 창의적 우회 방법들 (워크플로우 일부 변경)
        ...(analysis.creativeWorkarounds || [])
          .filter((w: any) => !w.maintains_workflow)
          .map((w: any) => `${w.method} - ${w.effect}`),
        // 3순위: 최후의 수단 (다른 도구)
        ...(analysis.fallbackAlternatives || [])
      ].slice(0, 5) // 최대 5개
    };

  } catch (error) {
    console.error('❌ [AI 목적분석] 실패:', error);

    // 🛡️ Fallback: 매우 기본적인 분석만 수행
    return {
      mainGoal: '반복 업무 자동화',
      currentWorkflow: '',
      impossibleElements: ['일부 기능 직접 구현 불가능'],
      viableAlternatives: [
        'Google Apps Script + 스프레드시트 자동화',
        'IFTTT 또는 Zapier 연동',
        '반자동화 (일부 수동 + 일부 자동)'
      ]
    };
  }
}

/**
 * 🔄 문제 있는 단계를 현실적 대안으로 교체하는 함수
 * 🎯 핵심 변화: 도구 중심 → 목적 중심 사고로 전환
 */
async function generateAlternativeStep(
  problematicStep: string,
  problematicMethods: any[]
): Promise<string> {
  
  const stepLower = problematicStep.toLowerCase();
  
  // 🧠 목적 중심 대안 생성 (작업 자체를 재구성)
  for (const pm of problematicMethods) {
    const toolLower = pm.tool.toLowerCase();
    
    // 🚨 카카오톡 특별 처리 (가장 흔한 불가능 케이스)
    if (toolLower.includes('카카오톡')) {
      if (stepLower.includes('메시지') && stepLower.includes('감지')) {
        return problematicStep.replace(/카카오톡.*?감지/gi, '이메일 알림 감지 (카카오톡 → 이메일 설정 활용)');
      }
      if (stepLower.includes('채널')) {
        return problematicStep.replace(/카카오톡.*?채널/gi, '채널톡 또는 이메일 기반');
      }
      // 기본 카카오톡 대안
      return problematicStep.replace(/카카오톡.*?([가-힣\s]+)/gi, '이메일 알림 + Google Forms $1');
    }
    
    // 🚨 인스타그램 특별 처리 (DM 자동화 불가능)
    if (toolLower.includes('instagram') || stepLower.includes('인스타그램')) {
      if (stepLower.includes('dm') || stepLower.includes('메시지') || stepLower.includes('감지')) {
        return problematicStep.replace(/인스타그램.*?(dm|메시지|감지)/gi, '이메일 기반 고객 문의 시스템 (인스타그램 DM 자동화 불가능)');
      }
      if (stepLower.includes('자동')) {
        return problematicStep.replace(/인스타그램.*?자동/gi, '수동 처리 + 자동 알림 조합 (인스타그램 API 제한)');
      }
      // 일반적인 인스타그램 대안
      return problematicStep.replace(/인스타그램/gi, '이메일 또는 웹사이트 기반 대안');
    }
    
    // 🚨 네이버 카페 특별 처리
    if (toolLower.includes('네이버') && stepLower.includes('카페')) {
      if (stepLower.includes('새 글') || stepLower.includes('모니터링')) {
        return problematicStep.replace(/네이버.*?카페.*?([가-힣\s]+)/gi, 'RSS 피드 모니터링 (공식 피드 활용) $1');
      }
    }
    
    // 🚨 API 불가능 케이스 처리
    if (stepLower.includes('api') && (toolLower.includes('facebook') || toolLower.includes('instagram'))) {
      return problematicStep.replace(/API.*?([가-힣\s]+)/gi, '수동 수집 + Google Forms 자동화 $1');
    }
    
    // 🚨 웹 스크래핑 불가능 케이스
    if (stepLower.includes('스크래핑') || stepLower.includes('크롤링')) {
      return problematicStep.replace(/(스크래핑|크롤링).*?([가-힣\s]+)/gi, 'RSS 피드 또는 공식 알림 활용 $2');
    }
  }
  
  // 🎯 일반적인 목적 기반 대안 패턴들
  if (stepLower.includes('실시간') && stepLower.includes('모니터링')) {
    return problematicStep.replace(/실시간.*?모니터링/gi, '주기적 체크 + 즉시 알림 (Google Apps Script)');
  }
  
  if (stepLower.includes('자동') && stepLower.includes('분류')) {
    return problematicStep.replace(/자동.*?분류/gi, 'Gmail 필터 + 키워드 기반 자동 분류');
  }
  
  // 📋 최종 폴백: 목적은 유지하되 실행 방법을 현실적으로
  let alternativeStep = problematicStep;
  problematicMethods.forEach(pm => {
    const toolPattern = new RegExp(pm.tool, 'gi');
    // 🔧 단순 도구 교체가 아닌, 실행 가능한 방법으로 재구성
    if (pm.tool.toLowerCase().includes('카카오톡')) {
      alternativeStep = alternativeStep.replace(toolPattern, '이메일 기반 대안');
    } else if (pm.tool.toLowerCase().includes('api')) {
      alternativeStep = alternativeStep.replace(toolPattern, 'Google Apps Script + 공식 도구');
    } else {
      alternativeStep = alternativeStep.replace(toolPattern, 'Google Apps Script');
    }
  });
  
  return alternativeStep;
}

/**
 * 🔍 특정 방법의 2025년 현재 실제 작동 여부 검증 (AI처럼 동적 판단)
 */
async function validateMethodCurrentStatus(
  method: {tool: string, action: string, details: string}, 
  userInput: string
): Promise<{
  tool: string;
  isViable: boolean;
  issues: string[];
  currentStatus: string;
  uiChanges: string[];
  recommendations: string[];
}> {
  try {
    console.log(`🧠 [AI 판단] ${method.tool} 방법을 AI처럼 종합 검증 시작...`);
    
    // 🔍 Step 1: 구체적이고 현실적인 검증 쿼리 생성
    const searchQueries = [];
    
    // 🧠 Claude 스타일 최신 정보 검색: 정책 변경 중심
    if (method.tool.toLowerCase().includes('api') || 
        method.action.toLowerCase().includes('api') ||
        method.action.toLowerCase().includes('자동화') ||
        method.action.toLowerCase().includes('연동')) {
      searchQueries.push(
        // 2024-2025 정책 변경 중심 검색
        `"${method.tool}" policy changes 2024 2025 personal developer restrictions`,
        `"${method.tool}" deprecated discontinued enterprise only 2024`,
        `"${method.tool}" API 정책 변경 2024년 이후 개인 개발자`,
        // 대안 방법 검색 (Claude처럼)
        `"${method.tool}" alternative methods 2025 without API access`,
        `"${method.tool}" 대안 서비스 2025년 추천`
      );
    }
    // Custom API Integration 검증
    else if (method.tool === 'Custom API Integration') {
      searchQueries.push(
        `"${userInput.slice(0, 30)}" API 개인 지원 여부 2025`,
        `"${userInput.slice(0, 30)}" 웹훅 개인 사용자 제한 2025`,
        `"${userInput.slice(0, 30)}" no-code automation alternative 2025`,
        `"${userInput.slice(0, 30)}" 반자동화 방법 Google Forms 2025`
      );
    }
    // Manual Process: 반자동화 대안 검색
    else if (method.tool === 'Manual Process') {
      searchQueries.push(
        `"${userInput.slice(0, 30)}" Google Forms automation 2025`,
        `"${userInput.slice(0, 30)}" Airtable semi-automation 2025`,
        `"${userInput.slice(0, 30)}" 반자동화 실용적 방법 2025`,
        `"${userInput.slice(0, 30)}" no-code tools realistic 2025`
      );
    }
    // 일반 도구들: 기본 검증
    else {
      searchQueries.push(
        `"${method.tool}" 2025 current status working tutorial`,
        `"${method.tool}" "${userInput.slice(0, 30)}" step by step guide 2025`,
        `"${method.tool}" limitations problems 2025`,
        `"${userInput.slice(0, 30)}" alternative to "${method.tool}" 2025`
      );
    }
    
    // 🧠 지능형 검색 최적화: 단계별 조건부 검색
    let allResults: any[] = [];
    let searchCount = 0;
    const maxSearches = 2; // 각 method당 최대 2회로 제한
    
    for (const query of searchQueries) {
      if (searchCount >= maxSearches) {
        console.log(`🔧 [RAG 최적화] ${method.tool} 검색 제한 (${maxSearches}회) 적용`);
        break;
      }
      
      const results = await searchWithRAG(query, { 
        maxResults: 2,
        useCache: true // 캐싱 강제 활성화
      });
      
      if (results && results.length > 0) {
        allResults.push(...results);
        searchCount++;
        
        // 🎯 조기 종료: 고품질 결과 3개 이상 확보시 추가 검색 중단
        if (allResults.length >= 3) {
          console.log(`✅ [RAG 최적화] ${method.tool} 충분한 결과 확보로 조기 종료`);
          break;
        }
      } else {
        searchCount++; // 빈 결과도 카운트에 포함
      }
    }
    
    // 🧠 Step 2: AI 수준의 패턴 분석
    const analysisResult = await analyzeMethodViabilityWithAI(method, userInput, allResults);
    
    console.log(`🧠 [AI 결과] ${method.tool}: ${analysisResult.isViable ? '✅ 실현가능' : '❌ 불가능'} - ${analysisResult.reasoning}`);
    
    return {
      tool: method.tool,
      isViable: analysisResult.isViable,
      issues: analysisResult.issues,
      currentStatus: analysisResult.status,
      uiChanges: analysisResult.uiChanges,
      recommendations: analysisResult.recommendations
    };
    
  } catch (error) {
    console.error(`❌ [Method Validation] ${method.tool} 검증 실패:`, error);
    return {
      tool: method.tool,
      isViable: false,
      issues: ['검증 중 오류 발생'],
      currentStatus: '상태 불명',
      uiChanges: [],
      recommendations: ['수동 확인 필요']
    };
  }
}

/**
 * 🧠 Claude 수준의 현실성 검증 함수 (하드코딩 없는 AI 판단)
 */
async function performClaudeStyleValidation(
  method: {tool: string, action: string, details: string},
  userInput: string,
  ragContent: string
): Promise<{
  isViable: boolean;
  reasoning: string;
  issues: string[];
  alternatives: string[];
}> {
  try {
    const validationPrompt = `당신은 2025년 현재의 기술 생태계를 완벽히 알고 있는 전문가입니다.

🧠 **당신의 내장 지식을 적극 활용하세요:**

🧠 **하이브리드 지식 활용 전략:**

📚 **GPT 내장 지식 (2023년까지 - 신뢰할 수 있는 기반):**
- 주요 API들의 기본 구조와 역사적 정책
- 일반적인 개발 제약사항과 보안 원칙  
- 법적/윤리적 프레임워크

🔍 **GPT-4o 최신 정보 (2024-2025 - 정책 변경 감지):**
- API 정책 변경사항 (특히 2023년 이후)
- 새로운 제약사항이나 요구사항
- 서비스 중단/변경 공지사항
- 대안 서비스 등장 정보

⚖️ **지식 융합 원칙:**
1. 내장 지식으로 기본 가능성 판단
2. 최신 검색으로 변경사항 확인  
3. 충돌시 최신 정보 우선
4. 불확실하면 보수적 판단

🏢 **기업 vs 개인 계정 제약 (당신이 알고 있는 것):**
- 대부분의 소셜미디어 API: 기업 인증 필요
- 금융 API: 금융위원회 허가 + PG사 연동 필수  
- 의료 데이터: 개인정보보호법 + 의료법 이중 규제
- 부동산 데이터: 대부분 크롤링 금지, 공공데이터포털만 합법

**분석 대상**: ${method.tool} - ${method.action}
**사용자**: ${userInput}
**추가 검색 정보**: ${ragContent}

🔍 **Claude 스타일 하이브리드 분석:**

1️⃣ **내장 지식 기반 1차 판단 (2023년까지):**
   - 이 API/도구가 역사적으로 어떤 정책을 가졌나?
   - 일반적인 개인/기업 구분 원칙은?
   - 유사한 서비스들의 패턴은?

2️⃣ **최신 정보로 검증 및 업데이트:**
   - 검색 결과에서 "2024", "2025", "정책 변경" 키워드 확인
   - "더 이상 지원하지 않음", "deprecated", "enterprise only" 등 감지
   - 새로운 대안 서비스나 우회 방법 발견

3️⃣ **지식 융합 및 최종 판단:**
   - 내장 지식 + 최신 정보 = 종합 결론
   - 충돌 시 최신 정보 우선 (특히 정책 변경)
   - 불확실한 경우 → 보수적 판단 + 대안 제시

4️⃣ **Claude 수준 추론:**
   - 단순 기술적 가능성 ≠ 실제 사용자 도움
   - 사용자 의도 파악 + 현실적 제약 + 윤리적 고려
   - 완전한 솔루션만 제안 (불완전한 것은 명시적 거부)

다음 기준으로 실현가능성을 엄격하게 판단하세요:

1. **API 접근성**: 개인 사용자가 해당 서비스의 API나 데이터에 접근할 수 있는가?
2. **정책 제약**: 서비스 이용약관이나 개발자 정책상 허용되는가?
3. **기술적 실현**: 웹스크래핑, 데이터 수집 등이 기술적으로 실제 가능한가?
4. **초보자 실행**: 비개발자가 실제로 따라할 수 있는 수준인가?
5. **2025년 현재**: 최신 정보 기준으로 여전히 유효한가?

**동적 현실성 체크 (2025년 기준):**
- API 정책 변경사항 반영
- 개인/기업 계정 구분 및 제약사항
- 실제 데이터 접근 가능성
- 법적/윤리적 제약사항
- 기술적 실현 가능성

**동적 검증 질문들:**
1. 이 조합이 2025년에도 실제로 작동하는가?
2. 검색 결과에서 "deprecated", "discontinued", "enterprise only" 키워드가 있는가?
3. 개인 사용자 vs 비즈니스 계정 제약이 있는가?
4. 실제 튜토리얼이나 성공 사례가 최근에 있는가?
5. 법적/윤리적 문제가 없는가?

**특별 주의 조합들:**
- "카카오톡" + "자동화" → 비즈니스 계정 필요성 체크
- "크롤링" + "부동산사이트" → 이용약관 위반 가능성
- "개인 SNS" + "데이터 수집" → API 정책 변경 확인
- "투자" + "자동화" → 금융 규제 고려
- "의료/개인정보" + "수집" → 법적 제약 강화

**🔥 핵심: Claude 수준 지식 융합**

💡 **정보 우선순위:**
1. **최신 검색 정보** (2024-2025 정책 변경) → 최우선
2. **내장 지식** (2023년까지 기본 원칙) → 기반 지식
3. **충돌 시** → 최신 정보가 내장 지식을 덮어씀

🧠 **융합 추론 예시:**
- 내장 지식: "카카오톡 API 존재함" 
- 검색 정보: "2024년 비즈니스 계정만 허용"
- 융합 결론: ❌ 개인 사용자 불가능

🚫 **절대 허용 금지:**
- Math.random() 같은 가짜 데이터
- "여기에 로직 추가" 같은 빈 구현부  
- 불완전한 솔루션을 완전한 것처럼 포장

JSON 형태로 응답:
{
  "isViable": boolean,
  "confidence": 0-100,
  "reasoning": "구체적인 판단 이유 (의미적 가치 포함)",
  "issues": ["문제점1", "문제점2"],
  "alternatives": ["현실적인 대안1", "현실적인 대안2"],
  "dataSourceIssues": ["데이터 소스 관련 문제들"],
  "implementationGaps": ["초보자가 막힐 수 있는 부분들"]
}`;

    // 🔧 자동 모델 호환성 시스템 적용
    const { generateOptimalParams, executeWithAutoRecovery } = await import('../utils/model-compatibility');
    
    const optimalParams = generateOptimalParams('o3-mini', {
      maxTokens: 1500,
      temperature: 0.1, // 원하는 값 (자동으로 필터링됨)
      jsonMode: false
    });
    
    const requestParams = {
      model: 'o3-mini',
      messages: [{ role: 'user', content: validationPrompt }],
      ...optimalParams
    };
    
    const response = await executeWithAutoRecovery('o3-mini', requestParams, 
      (params) => openai.chat.completions.create(params)
    );

    const content = response.choices[0].message.content || '{}';
    
    // 🔧 자동 JSON 복구 시스템 사용
    const { parseJSONWithRecovery } = await import('../utils/json-sanitizer');
    const result = parseJSONWithRecovery(content) || {
      isViable: false,
      reasoning: 'JSON 파싱 실패',
      issues: ['파싱 오류'],
      alternatives: []
    };
    
    return {
      isViable: result.isViable || false,
      reasoning: result.reasoning || 'AI 판단 결과 없음',
      issues: result.issues || [],
      alternatives: result.alternatives || []
    };

  } catch (error) {
    console.error('❌ [AI Validation] 검증 실패:', error);
    // 에러 시 보수적으로 불가능 판정
    return {
      isViable: false,
      reasoning: 'AI 검증 중 오류 발생 - 보수적 판정',
      issues: ['검증 프로세스 오류'],
      alternatives: ['수동 확인 필요']
    };
  }
}

/**
 * 🧠 AI처럼 방법론의 실현가능성을 종합 분석하는 함수 (Claude 수준 엄격함)
 */
async function analyzeMethodViabilityWithAI(
  method: {tool: string, action: string, details: string},
  userInput: string,
  ragResults: any[]
): Promise<{
  isViable: boolean;
  reasoning: string;
  issues: string[];
  status: string;
  uiChanges: string[];
  recommendations: string[];
}> {
  const combinedContent = ragResults.map(r => r.content || '').join(' ').toLowerCase();
  const userGoal = userInput.toLowerCase();
  
  // 🧠 1단계: Claude 수준 AI 판단으로 현실성 검증
  const aiValidationResult = await performClaudeStyleValidation(method, userInput, combinedContent);
  
  if (!aiValidationResult.isViable) {
    return {
      isViable: false,
      reasoning: aiValidationResult.reasoning,
      issues: aiValidationResult.issues,
      status: 'AI Validated - Impossible',
      uiChanges: [],
      recommendations: aiValidationResult.alternatives
    };
  }
  
  // 🔍 2단계: RAG 결과 키워드 분석
  const negativeSignals = [
    'deprecated', 'discontinued', 'no longer available', 'not supported',
    'violates terms', 'against policy', 'requires business verification',
    'enterprise only', 'subscription required'
  ];
  
  const limitationSignals = [
    'rate limit', 'quota restriction', 'paid plan only', 'premium feature',
    'manual approval', 'review process', 'limited access'
  ];
  
  const positiveSignals = [
    'officially supported', 'public api', 'documented', 'tutorial available',
    'free tier', 'open source', 'community', 'actively maintained',
    '2024', '2025', 'recent update', 'current', 'working'
  ];
  
  const negativeCount = negativeSignals.filter(signal => combinedContent.includes(signal)).length;
  const limitationCount = limitationSignals.filter(signal => combinedContent.includes(signal)).length;
  const positiveCount = positiveSignals.filter(signal => combinedContent.includes(signal)).length;
  
  // 🎯 3단계: 종합 판단 (가중치 적용)
  const viabilityScore = positiveCount * 2 - negativeCount * 3 - limitationCount * 1;
  
  if (negativeCount > 0) {
    const detectedIssues = negativeSignals.filter(signal => combinedContent.includes(signal));
    return {
      isViable: false,
      reasoning: `부정적 신호 감지: ${detectedIssues.join(', ')}`,
      issues: detectedIssues,
      status: 'Not Viable',
      uiChanges: [],
      recommendations: await generateSmartAlternatives(method, userInput)
    };
  } else if (viabilityScore >= 2) {
    return {
      isViable: true,
      reasoning: `충분한 긍정적 신호 확인됨 (점수: ${viabilityScore})`,
      issues: [],
      status: 'Highly Viable',
      uiChanges: [],
      recommendations: []
    };
  } else if (viabilityScore >= 0 && limitationCount <= 1) {
    const detectedLimitations = limitationSignals.filter(signal => combinedContent.includes(signal));
    return {
      isViable: true,
      reasoning: `제한적이지만 실현 가능 (점수: ${viabilityScore})`,
      issues: detectedLimitations,
      status: 'Viable with Limitations',
      uiChanges: [],
      recommendations: detectedLimitations.map(limit => `${limit} 확인 필요`)
    };
  } else {
    return {
      isViable: false,
      reasoning: `신뢰할 만한 정보 부족 또는 부정적 신호 (점수: ${viabilityScore})`,
      issues: ['정보 부족', '검증 필요'],
      status: 'Uncertain',
      uiChanges: [],
      recommendations: await generateSmartAlternatives(method, userInput)
    };
  }
}



/**
 * 🎯 현실적 반자동화 대안 생성 (Claude 수준 엄격함)
 */
async function generateSmartAlternatives(
  method: {tool: string, action: string, details: string}, 
  userInput: string
): Promise<string[]> {
  
  console.log('🧠 [2025 도구 검색] RAG + AI 도구 레지스트리 통합 검색...');
  
  try {
    // 🎯 1단계: 도메인 기반 AI 도구 피어 서치
    const detectedDomain = detectDomainEnhanced(userInput);
    const peerTools = await performPeerToolSearch(detectedDomain, method.tool, userInput);
    
    console.log(`🔍 [피어 서치] ${peerTools.length}개 도구 발견: ${peerTools.slice(0, 3).join(', ')}`);
    
    // 🔎 2단계: GPT-4o RAG 폴백 검색 (피어 서치가 부족한 경우)
    const { searchWithRAG } = await import('../services/rag');
    const ragResults = await searchWithRAG(`"${method.tool}" alternative tools 2025 realistic legal free options korean`, { maxResults: 3 });
    const ragContent = ragResults.map(r => `${r.title}: ${r.content.substring(0, 200)}`).join('\n');
    
    console.log(`📊 [RAG 검색] ${ragResults.length}개 핵심 소스에서 정보 수집`);
    
    // 🧠 2단계: 젠스파크 수준 컨텍스트 인식 + 추론
    
    const alternativePrompt = `당신은 AI 도구 레지스트리를 활용하는 2025년 자동화 전문가입니다. 현실성과 법적 안전성을 최우선으로 합니다.

🚨 **한국 플랫폼 현실성 체크 (필수)**:
- ❌ 네이버 카페 API: 공식 지원 없음, 크롤링 시 이용약관 위반
- ❌ 카카오톡 개인 API: 2022년부터 비즈니스 계정만 허용  
- ❌ 웹 스크래핑: 대부분 이용약관 위반, 법적 위험
- ✅ 대안: RSS 피드, 이메일 알림, Google Forms, 공식 API만

🧠 **컨텍스트 분석:**
- **실패한 방법**: ${method.tool} - ${method.action}
- **사용자 실제 목표**: ${userInput}
- **AI 레지스트리 추천**: ${peerTools.join(', ')}
- **최신 검색 결과**: ${ragContent}

🎯 **2025년 현실적 대안 원칙:**
1. **법적 안전성**: 이용약관 준수, 공식 API 우선
2. **개인 접근성**: 개발자 인증 없이 가능한 방법
3. **비용 효율성**: 무료 > 저비용 > 유료 순서
4. **실행 가능성**: 초보자도 30분 내 설정 가능

**현실적 대안 패턴**:
- 🆓 Google Apps Script: 완전 무료, 강력한 자동화
- 📧 이메일 기반: Gmail + 필터 + 스프레드시트 연동
- 📋 RSS 활용: 공식 피드 + IFTTT/Zapier
- 🤖 AI 도우미: ChatGPT/Claude 프롬프트 + 수동 실행
- 📊 반자동화: 사람 판단 + 도구 처리

사용자의 **진짜 목표**를 달성할 수 있는 3-5개의 구체적이고 현실적인 대안을 JSON 배열로 반환하세요:
["대안1: 구체적 도구 + 방법", "대안2: 구체적 도구 + 방법", "대안3: 구체적 도구 + 방법"]`;

    // 💰 저비용 최적화: 단일 호출로 고품질 결과 달성
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20',
      messages: [{ role: 'user', content: alternativePrompt }],
      temperature: 0.2, // 더 결정적으로 (품질 향상)
      max_tokens: 1000 // 더 상세한 답변 허용
    });

    const content = response.choices[0].message.content || '[]';
    
    // 🔧 Robust JSON 파싱 사용
    const { parseRobustJSON } = await import('../utils/robust-json-parser');
    const generatedAlternatives = parseRobustJSON(content, ['수동 프로세스 + 부분 자동화', 'IFTTT 연동', '이메일 기반 워크플로우']);
    console.log(`🎯 [AI 대안생성] ${generatedAlternatives.length}개 현실적 대안 생성 완료`);
    
    return Array.isArray(generatedAlternatives) ? generatedAlternatives : ['수동 프로세스 + 부분 자동화', 'IFTTT 연동', '이메일 기반 워크플로우'];
    
  } catch (error) {
    console.error('❌ [AI 대안생성] 실패:', error);
    // 폴백: 기본적인 현실적 대안들
  return [
      '공공 API + 스프레드시트 자동화',
      'RSS 피드 + IFTTT 연동', 
      '이메일 알림 + ChatGPT 분석',
      'Telegram Bot + 수동 입력',
      '스프레드시트 + Google Apps Script'
    ];
  }
  console.log('🧠 [스마트 대안] GPT에게 동적 대안 생성 요청...');
  
  // 사용자 요청에서 도메인 파악
  const isDomainHR = userInput.includes('채용') || userInput.includes('지원서') || userInput.includes('스크리닝');
  const isDomainSocial = userInput.includes('sns') || userInput.includes('소셜') || userInput.includes('댓글');
  const isDomainMarketing = userInput.includes('광고') || userInput.includes('마케팅') || userInput.includes('홍보');
  
  let specificAlternatives = [];
  
  // 🏢 채용 도메인 전용 대안
  if (isDomainHR) {
    specificAlternatives = [
      "Google Forms + Google Apps Script (지원서 폼 + 자동 분석 스크립트)",
      "Airtable Forms + Zapier (구조화된 지원서 데이터 + 자동 workflow)",  
      "Notion 데이터베이스 + ChatGPT API (지원서 저장 + AI 스크리닝)",
      "Google Sheets + GPT 함수 (간단한 스프레드시트 + AI 평가 추가)"
    ];
  }
  // 📱 소셜미디어 도메인 대안  
  else if (isDomainSocial) {
    specificAlternatives = [
      "Google Alerts + IFTTT (키워드 알림 + 자동 액션)",
      "Mention.com 모니터링 도구 (전문 SNS 모니터링 서비스)",
      "Buffer + 예약 포스팅 (소셜미디어 관리 플랫폼)",
      "반자동화: ChatGPT + 수동 복사붙여넣기 (AI 분석 + 사람 실행)"
    ];
  }
  // 📈 마케팅 도메인 대안
  else if (isDomainMarketing) {
    specificAlternatives = [
      "Google Analytics + 자동 리포트 (웹분석 + 정기 이메일)",
      "Mailchimp 자동화 (이메일 마케팅 + 고객 세그먼트)",
      "Google Ads 스크립트 (광고 자동화 + 성과 모니터링)",
      "Google Data Studio + 실시간 대시보드 (데이터 시각화)"
    ];
  }
  // 기본 대안들
  else {
    specificAlternatives = [
      "Google Apps Script 활용 (무료, 다양한 Google 서비스 연동)",
      "IFTTT 간단 자동화 (무료 플랜, 트리거-액션 방식)",
      "Zapier 워크플로우 (유료, 강력한 연동 기능)",
      "반자동화 방식 (AI 도구 + 사람의 판단 결합)"
    ];
  }

  const alternativePrompt = `실행 불가능한 방법에 대한 현실적 대안을 제안해주세요.

문제가 된 방법:
- 도구: ${method.tool}
- 액션: ${method.action}  
- 문제: ${method.tool}는 개인 사용자에게 API/웹훅을 지원하지 않음

사용자 원래 요청: "${userInput}"

🎯 **Claude 수준 현실성 체크:**
1. ✅ 2025년 현재 실제 작동하는 방법
2. ✅ 개인/소규모팀이 무료 또는 저비용으로 구현 가능
3. ✅ 초보자도 따라할 수 있는 구체적 단계
4. ✅ 법적/윤리적 문제 없음

🧠 **동적 제약 검증 (Claude 방식):**
- 제안된 방법의 현재 정책 상태 실시간 확인
- 개인 vs 기업 계정 제약사항 동적 판별
- 법적/윤리적 문제 컨텍스트 기반 검토
- 사용자 의도와 실현 가능성 종합 평가

✅ **추천 현실적 대안들:**
${specificAlternatives.map((alt, i) => `${i+1}. ${alt}`).join('\n')}

위 추천 대안들을 참고하여 사용자 요청에 가장 적합한 4개 대안을 JSON 형식으로 응답하세요:
{"alternatives": ["대안1", "대안2", "대안3", "대안4"]}`;

  try {
    // 🔧 자동 모델 호환성 시스템 적용
    const { generateOptimalParams, executeWithAutoRecovery } = await import('../utils/model-compatibility');
    
    const messages = [
      { 
        role: 'system', 
        content: `당신은 Claude처럼 창의적이고 현실적인 대안을 찾는 전문가입니다.

🧠 Claude의 창의적 문제해결:
1. 문제의 근본 원인 파악
2. 다양한 관점에서 접근  
3. 예상치 못한 해결책 고려
4. 실용성과 안전성 균형
5. 단계적 구현 가능성 검토` 
      },
      { role: 'user', content: alternativePrompt }
    ];
    
    const optimalParams = generateOptimalParams('o3-mini', {
      maxTokens: 500,
      temperature: 0.4, // 원하는 값 (자동으로 필터링됨)
      jsonMode: true
    });
    
    const requestParams = {
      model: 'o3-mini',
      messages: messages,
      ...optimalParams
    };
    
    const response = await executeWithAutoRecovery('o3-mini', requestParams,
      (params: any) => openai.chat.completions.create(params)
    );

    const result = JSON.parse(response.choices[0]?.message?.content || '{"alternatives": []}');
    const alternatives = result.alternatives || [];
    
    console.log(`✅ [스마트 대안] ${alternatives.length}개 동적 대안 생성 완료`);
    return alternatives;
    
  } catch (error) {
    console.error('❌ [스마트 대안] GPT 대안 생성 실패:', error);
    
    // 🛡️ 도메인별 안전한 폴백
    if (isDomainHR) {
      return [
        "Google Forms + Apps Script (지원서 폼 + AI 스크리닝)",
        "Airtable Forms + Zapier (구조화된 데이터 관리)",
        "Notion + ChatGPT API (데이터베이스 + AI 분석)",
        "반자동화: Excel + ChatGPT (수동 입력 + AI 평가)"
      ];
    } else {
      return specificAlternatives.length > 0 ? specificAlternatives : [
        "Google Apps Script 활용 (무료, 다양한 연동 가능)",
        "IFTTT 간단 자동화 (무료, 트리거-액션 방식)",
        "Zapier 워크플로우 (유료, 강력한 연동 기능)",
        "반자동화 방식 (AI 도구 + 사람의 판단 결합)"
      ];
    }
  }
}

/**
 * 🔄 문제 발견된 방법들에 대한 방법론적 대안 탐색 (강화)
 */
async function findAlternativeMethods(
  problematicMethods: any[], 
  userInput: string
): Promise<Array<{tool: string, action: string, reason: string}>> {
  const alternatives: Array<{tool: string, action: string, reason: string}> = [];
  
  console.log(`🔄 [Alternative Search] ${problematicMethods.length}개 문제 방법에 대한 현실적 대안 탐색...`);
  
  // 🎯 방법론별 현실적 대안 매핑 (도구 레벨이 아닌 해결책 레벨)
  const methodologicalAlternatives = getMethodologicalAlternatives(userInput, problematicMethods);
  
  for (const alternative of methodologicalAlternatives) {
    console.log(`🔍 [Alternative] ${alternative.approach} 방법론 검증 중...`);
    
    // RAG로 실제 가능성 검증
    const validationQuery = `"${alternative.approach}" "${userInput.slice(0, 50)}" tutorial 2025 step by step guide free`;
    const validationResults = await searchWithRAG(validationQuery, { maxResults: 3 });
    
    if (validationResults && validationResults.length > 0) {
      // 관련성 점수 확인
      const avgScore = validationResults.reduce((sum, r) => sum + (r.relevanceScore || 0), 0) / validationResults.length;
      
      if (avgScore > 0.1) { // 더 낮은 임계값으로 현실적 방법 허용
        alternatives.push({
          tool: alternative.primaryTool,
          action: alternative.action,
          reason: `${alternative.approach} (${alternative.viabilityReason})`
        });
        console.log(`✅ [Alternative] ${alternative.approach} 방법 채택 (점수: ${avgScore.toFixed(2)})`);
        } else {
        console.log(`❌ [Alternative] ${alternative.approach} 관련성 부족 (점수: ${avgScore.toFixed(2)})`);
      }
    }
  }
  
  console.log(`✅ [Alternative Search] 총 ${alternatives.length}개 현실적 대안 발견`);
  return alternatives;
}

/**
 * 🎯 사용자 요청과 문제점에 따른 방법론적 대안 생성
 */
function getMethodologicalAlternatives(
  userInput: string,
  problematicMethods: any[]
): Array<{
  approach: string;
  primaryTool: string;
  action: string;
  viabilityReason: string;
}> {
  const alternatives = [];
  const requestLower = userInput.toLowerCase();
  
  // 🔍 요청 분석
  const isAnalytics = requestLower.includes('분석') || requestLower.includes('성과') || requestLower.includes('보고서');
  const isMarketing = requestLower.includes('마케팅') || requestLower.includes('광고') || requestLower.includes('캠페인');
  const isMonitoring = requestLower.includes('모니터링') || requestLower.includes('알림') || requestLower.includes('확인');
  const isSocialMedia = requestLower.includes('sns') || requestLower.includes('소셜') || requestLower.includes('브랜드');
  const isCustomerService = requestLower.includes('고객') || requestLower.includes('문의') || requestLower.includes('cs');
  const isDataProcessing = requestLower.includes('리뷰') || requestLower.includes('설문') || requestLower.includes('피드백');
  const isSalesAnalysis = requestLower.includes('영업') || requestLower.includes('세일즈') || requestLower.includes('이메일');
  const isPresentationNeeded = requestLower.includes('ppt') || requestLower.includes('발표') || requestLower.includes('프레젠테이션') || requestLower.includes('보고서');
  const isReportGeneration = requestLower.includes('보고서') || requestLower.includes('리포트') || requestLower.includes('정리');
  
  // 🎯 퍼포먼스 마케팅 분석 케이스
  if (isAnalytics && isMarketing) {
    alternatives.push(
      {
        approach: "ChatGPT API + 자동 마케팅 분석 시스템",
        primaryTool: "Google Apps Script",
        action: "CSV 업로드 → ChatGPT 분석 → 인사이트 도출 → 슬랙 보고서",
        viabilityReason: "LLM 기반 고급 분석으로 전문가 수준 인사이트 제공 가능"
      },
      {
        approach: "Claude API + 성과 최적화 제안 시스템",
        primaryTool: "Google Apps Script",
        action: "광고 데이터 → Claude 분석 → 개선안 생성 → 자동 리포트",
        viabilityReason: "AI가 데이터 패턴 분석 후 구체적 개선 방향 제시"
      },
      {
        approach: "Google Data Studio + 수동 데이터 업로드",
        primaryTool: "Google Data Studio",
        action: "수동 CSV 업로드 후 자동 대시보드 생성",
        viabilityReason: "Facebook Ads Manager에서 CSV 다운로드 가능, 완전 무료"
      },
      {
        approach: "Google Sheets + Apps Script 분석",
        primaryTool: "Google Apps Script",
        action: "스프레드시트 기반 자동 분석 및 보고서 생성",
        viabilityReason: "API 없이도 업로드된 데이터 자동 처리 가능"
      }
    );
  }
  
  // 🎯 소셜 미디어 모니터링 케이스
  if (isSocialMedia && isMonitoring) {
    alternatives.push(
      {
        approach: "Claude API + 브랜드 감정분석 시스템",
        primaryTool: "Google Apps Script",
        action: "멘션 수집 → Claude 감정분석 → 위기도 판단 → 맞춤 대응안",
        viabilityReason: "AI 감정분석으로 단순 키워드를 넘어선 브랜드 인텔리전스"
      },
      {
        approach: "ChatGPT API + 소셜 트렌드 분석",
        primaryTool: "Google Apps Script", 
        action: "소셜 데이터 → GPT 트렌드 분석 → 인사이트 → 전략 제안",
        viabilityReason: "AI가 소셜 트렌드 패턴을 분석해 마케팅 인사이트 제공"
      },
      {
        approach: "Google Alert + RSS 피드 수집",
        primaryTool: "Google Alert",
        action: "키워드 알림 + IFTTT RSS 연동으로 모니터링",
        viabilityReason: "소셜미디어 직접 API 없이도 멘션 감지 가능"
      },
      {
        approach: "수동 체크 + 자동 알림 스케줄",
        primaryTool: "Google Apps Script",
        action: "정기적 수동 확인 후 자동 정리 및 슬랙 알림",
        viabilityReason: "완전 자동화 불가능시 반자동화 방식"
      }
    );
  }
  
  // 🎯 고객 서비스 & 문의 분석 케이스 (스프레드시트 LLM 혁신)
  if (isCustomerService || isDataProcessing) {
    alternatives.push(
      {
        approach: "Google Sheets + GPT 함수로 고객 문의 대량 분석",
        primaryTool: "Google Sheets",
        action: "=GPT_ANALYZE(A1, '다음 고객 리뷰의 감정(긍정/부정/중립)과 주요 키워드를 분석해줘') 수식으로 즉시 분석",
        viabilityReason: "복잡한 설정 없이 스프레드시트에서 바로 AI 분석 가능, 실무진이 즉시 활용"
      },
      {
        approach: "Excel + Power Query + Azure OpenAI 대량 처리",
        primaryTool: "Microsoft Excel",
        action: "파워쿼리로 데이터 정제 → Azure OpenAI API 호출 → 감정분석 결과 자동 정리",
        viabilityReason: "기업환경에서 안전하고 대량 데이터 처리 가능"
      },
      {
        approach: "Claude 프롬프트 복붙 솔루션 (비개발자용)",
        primaryTool: "Claude/ChatGPT",
        action: "고객 리뷰 복사 → 제공된 프롬프트에 붙여넣기 → 즉시 감정분석 + 대응방안 추천",
        viabilityReason: "기술 지식 전혀 없어도 즉시 활용 가능, 정교한 분석 결과"
      },
      {
        approach: "엑셀 + Azure OpenAI로 리뷰/피드백 키워드 추출",
        primaryTool: "Microsoft Excel",
        action: "Power Query + Azure OpenAI로 대량 텍스트 데이터 자동 분석",
        viabilityReason: "기업 환경에서 엑셀 + Azure 조합으로 안전한 AI 활용"
      },
      {
        approach: "Airtable + Claude API 자동 분류 시스템",
        primaryTool: "Airtable",
        action: "데이터베이스 + AI 분류로 실시간 고객 문의 처리",
        viabilityReason: "데이터베이스 기능 + AI 분석을 한번에 처리"
      }
    );
  }
  
  // 🎯 영업 & 이메일 효과성 분석 케이스
  if (isSalesAnalysis) {
    alternatives.push(
      {
        approach: "Google Sheets + ChatGPT API 영업 이메일 스코어링",
        primaryTool: "Google Sheets",
        action: "이메일 제목/내용 → AI 효과성 점수 → 개선안 자동 생성",
        viabilityReason: "영업팀이 쉽게 사용할 수 있는 스프레드시트 기반 AI 분석"
      },
      {
        approach: "엑셀 + Gemini API 영업 패턴 분석",
        primaryTool: "Microsoft Excel",
        action: "영업 데이터 → Gemini 패턴 분석 → 성공 템플릿 도출",
        viabilityReason: "구글 Gemini로 영업 성과 패턴 분석 및 예측"
      }
    );
  }
  
  // 🎯 일반적인 데이터 처리 케이스
  if (isAnalytics && !isMarketing) {
    alternatives.push(
      {
        approach: "Gemini API + 데이터 인사이트 시스템",
        primaryTool: "Google Apps Script",
        action: "데이터 업로드 → Gemini 분석 → 패턴 발견 → 예측 리포트",
        viabilityReason: "구글 Gemini로 데이터 패턴 분석 및 예측 가능"
      },
      {
        approach: "ChatGPT API + 자동 요약 시스템",
        primaryTool: "Google Apps Script",
        action: "원본 데이터 → GPT 요약 → 핵심 인사이트 추출 → 간편 리포트",
        viabilityReason: "대량 데이터를 AI가 자동으로 요약 및 핵심 포인트 도출"
      },
      {
        approach: "Google Sheets 기반 자동화",
        primaryTool: "Google Apps Script",
        action: "스프레드시트 트리거 기반 데이터 처리 및 알림",
        viabilityReason: "외부 API 없이도 업로드 기반 자동화 가능"
      }
    );
  }
  
  // 🎯 PPT/보고서 생성 케이스 (구체적 솔루션)
  if (isPresentationNeeded || isReportGeneration) {
    alternatives.push(
      {
        approach: "Gamma (젠스파크) AI PPT 자동 생성",
        primaryTool: "Gamma",
        action: "데이터 입력 → AI가 완성된 PPT 생성 → PDF 다운로드",
        viabilityReason: "초딩도 5분만에 전문가급 PPT 생성 가능, 완전 무료"
      },
      {
        approach: "Claude HTML PPT → Chrome PDF 저장",
        primaryTool: "Claude",
        action: "데이터 → Claude HTML 코드 생성 → 크롬에서 PDF 저장",
        viabilityReason: "완전 무료, 맞춤형 디자인 가능, 구체적 저장 방법 제공"
      },
      {
        approach: "ChatGPT 보고서 + 엑셀 차트 조합",
        primaryTool: "ChatGPT",
        action: "GPT 텍스트 생성 + 엑셀 자동 차트 → 완전한 보고서",
        viabilityReason: "텍스트와 시각화를 모두 AI가 처리, 매우 구체적 방법"
      },
      {
        approach: "Google Sheets + 차트 자동 생성",
        primaryTool: "Google Sheets",
        action: "정확한 셀 주소 + 함수로 차트 생성 → 복사 붙여넣기",
        viabilityReason: "A1, B1 셀 정확한 값까지 모두 제공, 초딩도 가능"
      }
    );
  }
  
  // 🎯 기본 대안 (모든 케이스에 적용)
  if (alternatives.length === 0) {
    alternatives.push(
      {
        approach: "ChatGPT API + 범용 자동화 시스템",
        primaryTool: "Google Apps Script",
        action: "사용자 데이터 → GPT 처리 → 맞춤 결과 → 자동 알림",
        viabilityReason: "LLM을 활용한 지능형 반자동화로 거의 모든 업무에 적용 가능"
      },
      {
        approach: "수동 프로세스 + 자동 알림",
        primaryTool: "Google Apps Script",
        action: "수동 작업 후 자동 정리 및 알림 시스템",
        viabilityReason: "가장 현실적이고 안정적인 방법"
      },
      {
        approach: "스프레드시트 기반 워크플로우",
        primaryTool: "Google Sheets",
        action: "스프레드시트 중심의 데이터 관리 및 자동화",
        viabilityReason: "무료이고 접근성이 높음"
      }
    );
  }
  
  console.log(`🎯 [방법론 분석] ${alternatives.length}개 현실적 대안 생성 (분석: ${isAnalytics}, 마케팅: ${isMarketing}, 모니터링: ${isMonitoring})`);
  return alternatives;
}

/**
 * 🎯 검증된 방법론 기반의 목표 지향 RAG 검색
 */
async function generateTargetedRAGContext(
  userInput: string, 
  verifiedTools: string[], 
  finalMethods: any[]
): Promise<string> {
  // 검증된 도구들을 중심으로 한 정확한 검색
  const targetedQuery = `${verifiedTools.join(' ')} "${userInput.slice(0, 60)}" step by step tutorial 2025 current guide`;
  
  console.log(`🎯 [Targeted RAG] 검증된 도구 기반 검색: "${targetedQuery}"`);
  
  const results = await searchWithRAG(targetedQuery, { maxResults: 4 });
  
  let context = `## 🎯 검증된 방법론 기반 최신 정보\n\n`;
  
  finalMethods.forEach((method, index) => {
    context += `### ${index + 1}. ${method.tool}\n`;
    context += `- 상태: ${method.currentStatus || '정상 작동'}\n`;
    if (method.uiChanges && method.uiChanges.length > 0) {
      context += `- UI 변경: ${method.uiChanges.join(', ')}\n`;
    }
    if (method.recommendations && method.recommendations.length > 0) {
      context += `- 권장사항: ${method.recommendations.join(', ')}\n`;
    }
    context += '\n';
  });
  
  if (results && results.length > 0) {
    context += `## 📚 관련 최신 가이드\n`;
    results.forEach((result, index) => {
      context += `${index + 1}. **${result.title}**\n`;
      context += `   - 링크: ${result.url}\n`;
      context += `   - 요약: ${result.content.substring(0, 100)}...\n\n`;
    });
  }
  
  return context;
}

/**
 * 📋 검증 결과 요약 생성
 */
function generateValidationSummary(
  validationResults: any[], 
  alternativeMethods: any[]
): string {
  let summary = '';
  
  const viableMethods = validationResults.filter(r => r.isViable);
  const problematicMethods = validationResults.filter(r => !r.isViable);
  
  summary += `✅ 검증 완료된 실행 가능 방법: ${viableMethods.length}개\n`;
  viableMethods.forEach(method => {
    summary += `  • ${method.tool}: ${method.currentStatus}\n`;
    if (method.uiChanges && method.uiChanges.length > 0) {
      summary += `    - UI 변경사항: ${method.uiChanges.join(', ')}\n`;
    }
  });
  
  if (problematicMethods.length > 0) {
    summary += `\n⚠️ 문제 발견된 방법: ${problematicMethods.length}개\n`;
    problematicMethods.forEach(method => {
      summary += `  • ${method.tool}: ${method.issues.join(', ')}\n`;
    });
  }
  
  if (alternativeMethods.length > 0) {
    summary += `\n🔄 제안된 대안 방법: ${alternativeMethods.length}개\n`;
    alternativeMethods.forEach(alt => {
      summary += `  • ${alt.tool}: ${alt.reason}\n`;
    });
  }
  
  return summary;
}

/**
 * Step B: 플로우 검증 및 수정 (논리적 구조)
 * - Step A의 플로우를 받아서 실현 가능성 검증
 * - 문제가 있는 단계는 현실적 대안으로 수정
 * - 검증된 플로우를 Step C로 전달
 */
/**
 * 🗑️ LEGACY: Step B (기존 플로우 검증)
 * executeStepAB로 통합됨 - 삭제 예정
 */
async function executeStepB_LEGACY(
  flow: {steps: string[], title: string, subtitle: string},
  userInput: string,
  feasibilityAnalysis: any
): Promise<{
  verifiedFlow: {steps: string[], title: string, subtitle: string};
  tokens: number;
  latency: number;
  ragMetadata: any;
  model: string;
}> {
  const startTime = Date.now();
  console.log('🔍 [Step B] 구체적 방법론 실시간 검증 시작...');

  try {
    console.log(`📋 [Step B] 검증할 플로우: ${flow.title} (${flow.steps.length}개 단계)`);
    console.log(`🔍 [Step B] 단계들: ${flow.steps.map((s, i) => `${i+1}. ${s.substring(0, 40)}...`).join(' | ')}`);
    
    // 🚨 현실성 분석 결과 활용
    console.log(`🧠 [Step B] 현실성 분석 적용: 불가능 요소 ${feasibilityAnalysis.impossibleElements?.length || 0}개 제거`);
    console.log(`✅ [Step B] 권장 접근법: ${feasibilityAnalysis.recommendedApproach}`);

    // 1. 플로우 단계들에서 구체적 방법론 추출
    const proposedMethods = extractProposedMethodsFromFlow(flow);
    console.log(`🎯 [Step B] 추출된 방법: ${proposedMethods.map(m => m.tool + ':' + m.action.substring(0, 30)).join(', ')}`);

    // 🔧 중복 도구 제거 (같은 도구를 여러 번 검증하지 않음)
    const uniqueTools = new Map<string, typeof proposedMethods[0]>();
    proposedMethods.forEach(method => {
      if (!uniqueTools.has(method.tool)) {
        uniqueTools.set(method.tool, method);
      }
    });
    const uniqueMethods = Array.from(uniqueTools.values());
    console.log(`🔧 [Step B] 중복 제거: ${proposedMethods.length}개 → ${uniqueMethods.length}개 (${proposedMethods.length - uniqueMethods.length}개 중복 제거)`);

    // 2. 🔍 각 단계의 2025년 현재 실제 작동 여부 검증 (유니크한 도구만)
    const methodValidationResults = await Promise.all(
      uniqueMethods.map(method => validateMethodCurrentStatus(method, userInput))
    );

    // 3. 🚨 문제 발견된 단계들에 대한 즉시 대안 탐색
    const problematicMethods = methodValidationResults.filter(result => !result.isViable);
    let alternativeMethods: any[] = [];
    
    if (problematicMethods.length > 0) {
      console.log(`⚠️ [Step B] ${problematicMethods.length}개 단계에 문제 발견 - 플로우 수정 시작`);
      alternativeMethods = await findAlternativeMethods(problematicMethods, userInput);
      console.log(`🔄 [Step B] ${alternativeMethods.length}개 대안 방법 발견`);
    }

    // 4. 📋 검증된 최종 방법론 확정 및 플로우 수정
    const validatedMethods = methodValidationResults.filter(result => result.isViable);
    const finalMethods = [...validatedMethods, ...alternativeMethods];
    
    // 5. 🔧 문제 있는 단계들을 현실적 대안으로 수정
    const verifiedSteps = await generateVerifiedSteps(flow.steps, finalMethods, problematicMethods);
    const verifiedFlow = {
      steps: verifiedSteps,
      title: flow.title,
      subtitle: flow.subtitle
    };
    
    console.log(`✅ [Step B] 플로우 검증 완료: ${verifiedSteps.length}개 단계 (${problematicMethods.length}개 수정됨)`);

    // 6. 🎯 실시간 RAG 검색 (검증된 방법론 기반)
    const verifiedToolNames = finalMethods.map(m => m.tool);
    const targetedRagContext = await generateTargetedRAGContext(userInput, verifiedToolNames, finalMethods);

    // 7. RAG 메타데이터 생성 (Step C에서 사용)
    const ragMetadata = {
      methodValidation: {
        originalMethods: proposedMethods.length,
        viableMethods: validatedMethods.length,
        problematicMethods: problematicMethods.length,
        alternativesFound: alternativeMethods.length,
        finalMethods: finalMethods.length
      },
      ragSearches: 1, // targetedRagContext 생성 시 1회 검색
      ragSources: targetedRagContext.length > 0 ? 1 : 0,
      validationSummary: generateValidationSummary(methodValidationResults, alternativeMethods),
      targetedRagContext: targetedRagContext,
      verifiedTools: verifiedToolNames
    };

    const latency = Date.now() - startTime;
    const totalTokens = 100; // Step B는 이제 간단한 검증만 수행

    console.log(`✅ [Step B] 플로우 검증 완료 - ${latency}ms, 토큰: ${totalTokens}`);
    console.log(`📊 [Step B] 수정된 플로우: ${verifiedFlow.steps.map((s, i) => `${i+1}. ${s.substring(0, 30)}...`).join(' | ')}`);

    return {
      verifiedFlow,
      tokens: totalTokens,
      latency,
      ragMetadata,
      model: 'flow-verification' // 플로우 검증 전용
    };
  } catch (error) {
    console.error('❌ [Step B] 플로우 검증 실패:', error);

    // 검증 실패 시 원본 플로우 유지
    console.log('🔄 [Step B] 실패 시 원본 플로우 유지');
    const latency = Date.now() - startTime;
    
    return {
      verifiedFlow: flow, // 원본 플로우 그대로 반환
      tokens: 0,
      latency,
      ragMetadata: { 
        error: '플로우 검증 실패',
        methodValidation: {
          originalMethods: 0,
          viableMethods: 0,
          problematicMethods: 0,
          alternativesFound: 0,
          finalMethods: 0
        }
      },
      model: 'flow-verification-error'
    };
  }
}

/**
 * 🔧 Step C JSON 응답에서 cards 배열 추출하는 helper 함수
 */
function extractCardsFromParsedResult(parsedResult: any, verifiedFlow: any): any[] {
  console.log('🔍 [Step C] JSON 구조 분석:', typeof parsedResult, parsedResult ? Object.keys(parsedResult) : 'null');
  
  // 🛡️ null/undefined 체크
  if (!parsedResult) {
    console.log('❌ [Step C] parsedResult가 null/undefined');
    return createFallbackCards(verifiedFlow);
  }
  
  // 🔍 파싱 결과 구조 확인 및 정규화
  if (parsedResult.cards && Array.isArray(parsedResult.cards)) {
    console.log(`🔍 [Step C] cards 배열 형식 감지 - ${parsedResult.cards.length}개 카드`);
    console.log('🔍 [Step C] 카드 타입들:', parsedResult.cards.map((c: any) => c.type));
    
    // 🚨 CRITICAL: 단일 guide 카드를 단계별로 분리
    const processedCards = [];
    let flowCard = null;
    
    for (const card of parsedResult.cards) {
      if (card.type === 'flow') {
        flowCard = {
          ...card,
          id: card.id || `flow_${Date.now()}_0`,
          status: card.status || 'completed'
        };
        processedCards.push(flowCard);
      } else if (card.type === 'guide') {
        // 🔍 이미 stepId가 있으면 분리된 guide이므로 그대로 사용
        if (card.stepId) {
          console.log(`✅ [Guide 유지] 이미 분리된 guide (stepId: ${card.stepId}) 그대로 사용`);
          processedCards.push({
            ...card,
            id: card.id || `guide_${Date.now()}_${card.stepId}`,
            status: card.status || 'completed'
          });
        } else {
          // 🔧 단일 guide를 단계별로 분리 (stepId가 없는 경우만)
          const separatedGuides = separateGuideBySteps(card, flowCard);
          processedCards.push(...separatedGuides);
          console.log(`🔧 [Guide 분리] 1개 guide → ${separatedGuides.length}개 step-specific guides`);
        }
      } else {
        // faq, expansion 등 기타 카드는 그대로 추가
        processedCards.push({
          ...card,
          id: card.id || `${card.type}_${Date.now()}_${processedCards.length}`,
          status: card.status || 'completed'
        });
      }
    }
    
    console.log(`✅ [Step C] ${processedCards.length}개 카드 처리 완료`);
    return processedCards;
    
  } else if (parsedResult.type) {
    // 단일 객체 형식인 경우 cards 배열로 감싸기
    console.log('✅ [Step C] 단일 객체 형식을 cards 배열로 변환');
    return [{
      ...parsedResult,
      id: parsedResult.id || `${parsedResult.type}_${Date.now()}`,
      status: parsedResult.status || 'completed'
    }];
    } else {
    // 예상치 못한 형식 - fallback cards 생성
    console.log('⚠️ [Step C] 예상치 못한 JSON 형식 - fallback cards 생성');
    return createFallbackCards(verifiedFlow);
  }
}

/**
 * 🔧 단일 guide 카드를 단계별로 분리하는 함수
 */
function separateGuideBySteps(guideCard: any, flowCard: any): any[] {
  if (!guideCard || !flowCard || !flowCard.steps) {
    console.log('⚠️ [Guide 분리] flowCard.steps가 없어서 분리 불가');
    return [guideCard]; // 분리 실패 시 원본 그대로 반환
  }

  const stepCount = flowCard.steps.length;
  console.log(`🔧 [Guide 분리] ${stepCount}개 단계로 guide 분리 시작`);

  const separatedGuides = [];
  
  // 각 단계별로 개별 guide 카드 생성
  for (let i = 0; i < stepCount; i++) {
    const stepId = (i + 1).toString(); // "1", "2", "3", ...
    const stepTitle = flowCard.steps[i] || `${stepId}단계`;
    
    // 기존 detailedSteps에서 해당 단계 정보 추출
    let stepDetailedSteps: any[] = [];
    if (guideCard.detailedSteps && Array.isArray(guideCard.detailedSteps)) {
      // detailedSteps가 배열인 경우, 인덱스로 접근
      if (guideCard.detailedSteps[i]) {
        stepDetailedSteps = [guideCard.detailedSteps[i]];
      }
    }

    // 코드 블록 분할 (있는 경우)
    let stepCodeBlock = null;
    if (guideCard.codeBlocks && Array.isArray(guideCard.codeBlocks)) {
      stepCodeBlock = guideCard.codeBlocks[i] || null;
    } else if (guideCard.codeBlock && i === 0) {
      // 단일 코드블록이 있고 첫 번째 단계라면 할당
      stepCodeBlock = guideCard.codeBlock;
    }

    const stepGuide: any = {
      type: 'guide',
      stepId: stepId,
      title: `${stepId}단계: ${stepTitle.replace(/^\d+단계:\s*/, '')}`,
      subtitle: `${stepTitle} 상세 가이드`,
      basicConcept: `${stepTitle}를 구현하는 방법`,
      automationLevel: guideCard.automationLevel || '반자동',
      detailedSteps: stepDetailedSteps.length > 0 ? stepDetailedSteps : [
        {
          number: 1,
          title: stepTitle.replace(/^\d+단계:\s*/, ''),
          description: `${stepTitle} 작업을 수행합니다.`,
          expectedScreen: '작업 완료 화면',
          checkpoint: '작업이 정상적으로 완료되었는지 확인하세요.'
        }
      ],
      commonMistakes: guideCard.commonMistakes || [],
      practicalTips: guideCard.practicalTips || [],
      id: `guide_${Date.now()}_${i + 1}`,
      status: 'completed'
    };

    // 코드 블록이 있으면 추가
    if (stepCodeBlock) {
      stepGuide.codeBlock = stepCodeBlock;
    }

    separatedGuides.push(stepGuide);
  }

  console.log(`✅ [Guide 분리] ${separatedGuides.length}개 단계별 guide 카드 생성 완료`);
  return separatedGuides;
}

/**
 * 🧠 실시간 현실성 검증 시스템 (Claude-Level Reasoning)
 */
async function validateRealismInRealTime(userInput: string, stepContent: string): Promise<{isRealistic: boolean, issues: string[], alternatives: string[]}> {
  const realisticCheck = `
당신은 2025년 현실성 검증 전문가입니다. 다음 자동화 단계가 실제로 가능한지 판단하세요.

사용자 요청: "${userInput}"
제안된 단계: "${stepContent}"

🔍 검증 항목:
1. 기술적 실현 가능성 (API 제약, CORS 정책 등)
2. 초보자 설정 가능성 (복잡도, 비용)
3. 2025년 현재 서비스 상태 (deprecated API 등)
4. 보안 및 개인정보 보호
5. 실제 ROI (비용 대비 효과)

JSON 형식으로 응답:
{
  "isRealistic": true/false,
  "realismScore": 1-10,
  "issues": ["구체적인 문제점들"],
  "alternatives": ["현실적인 대안들"],
  "reasoning": "판단 근거"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '당신은 기술 현실성 검증 전문가입니다. 반드시 JSON 형식으로만 응답하세요.' },
        { role: 'user', content: realisticCheck }
      ],
      max_tokens: 500,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log(`🧠 [현실성 검증] 점수: ${result.realismScore}/10, 실현가능: ${result.isRealistic}`);
    
    return {
      isRealistic: result.isRealistic || false,
      issues: result.issues || [],
      alternatives: result.alternatives || []
    };
  } catch (error) {
    console.error('🚨 [현실성 검증] 실패:', error);
    return {
      isRealistic: false,
      issues: ["현실성 검증 시스템 오류"],
      alternatives: ["대안 생성 불가"]
    };
  }
}

/**
 * 🛡️ Step C 실패 시 기본 cards 생성
 */
function createFallbackCards(verifiedFlow: any): any[] {
  return [
    {
      type: 'flow',
      title: verifiedFlow.title || '🚀 자동화 플로우',
      subtitle: verifiedFlow.subtitle || '단계별 자동화 계획',
      steps: verifiedFlow.steps || [],
      status: 'completed',
      id: `flow_${Date.now()}`
    },
    {
      type: 'guide',
      title: '📋 상세 실행 가이드',
      subtitle: '단계별 자동화 구현',
      detailedSteps: verifiedFlow.steps.map((step: string, index: number) => ({
        title: step,
        description: `${step}에 대한 상세 실행 가이드입니다.`,
        content: '구체적인 실행 방법은 각 도구의 공식 문서를 참조하시기 바랍니다.',
        screen: '해당 도구의 웹사이트 또는 앱',
        checkpoint: '단계 완료 후 다음 단계로 진행'
      })),
      status: 'completed',
      id: `guide_${Date.now()}`
    },
    {
      type: 'needs_analysis',
      title: '🎯 자동화 분석',
      surfaceRequest: '사용자 요청 분석',
      realNeed: '검증된 플로우 기반 자동화',
      recommendedLevel: '실행 가능',
      status: 'completed',
      id: `needs_${Date.now()}`
    }
  ];
}

/**
 * 🧮 솔루션 복잡도 계산 (Step C 전략 선택용)
 * 복잡도 점수 0.0 ~ 1.0 반환
 */
function calculateSolutionComplexity(
  verifiedFlow: {steps: string[], title: string, subtitle: string},
  ragMetadata: any,
  feasibilityAnalysis: any,
  userInput: string,
  followupAnswers: any
): number {
  let complexityScore = 0;
  let factors = 0;

  // 1️⃣ 단계 수 복잡도 (0.0 ~ 0.3)
  const stepCount = verifiedFlow.steps.length;
  if (stepCount <= 3) {
    complexityScore += 0.0;  // 간단
  } else if (stepCount <= 5) {
    complexityScore += 0.15;  // 보통
  } else {
    complexityScore += 0.3;   // 복잡
  }
  factors++;

  // 2️⃣ 불가능한 요소 복잡도 (0.0 ~ 0.25)
  const impossibleCount = feasibilityAnalysis.impossibleElements?.length || 0;
  if (impossibleCount > 0) {
    complexityScore += Math.min(impossibleCount * 0.1, 0.25);  // 대안 찾기 어려움
  }
  factors++;

  // 3️⃣ RAG 검증 복잡도 (0.0 ~ 0.2)
  const ragIssues = ragMetadata.methodValidation?.problematicMethods || 0;
  if (ragIssues > 0) {
    complexityScore += Math.min(ragIssues * 0.1, 0.2);  // 검증 실패 많음 = 복잡
  }
  factors++;

  // 4️⃣ 사용자 요청 길이 복잡도 (0.0 ~ 0.15)
  const requestLength = userInput.length + JSON.stringify(followupAnswers || {}).length;
  if (requestLength > 500) {
    complexityScore += 0.15;  // 상세한 요구사항
  } else if (requestLength > 200) {
    complexityScore += 0.075;  // 보통
  }
  factors++;

  // 5️⃣ RAG 참조 자료 복잡도 (0.0 ~ 0.1)
  const ragContextLength = ragMetadata.ragContext?.length || 0;
  if (ragContextLength > 3000) {
    complexityScore += 0.1;  // 많은 참조 자료 = 상세 가이드 필요
  } else if (ragContextLength > 1000) {
    complexityScore += 0.05;
  }
  factors++;

  // 정규화 (최대 1.0)
  const normalizedScore = Math.min(complexityScore, 1.0);

  console.log(`🧮 [복잡도 계산] 점수: ${(normalizedScore * 100).toFixed(1)}% (단계:${stepCount}, 불가능:${impossibleCount}, RAG이슈:${ragIssues})`);

  return normalizedScore;
}
/**
 * 🛡️ Fallback 가이드 생성 (Step C 실패 시)
 */
function createFallbackGuide(verifiedFlow: {steps: string[], title: string, subtitle: string}): any {
  return {
    type: 'guide',
    title: '📋 기본 실행 가이드',
    subtitle: '단계별 기본 안내',
    detailedSteps: verifiedFlow.steps.map((step, index) => ({
      title: step,
      description: '상세 내용을 확인하여 단계를 진행하세요.',
      content: '구체적인 실행 방법은 각 도구의 공식 문서를 참조하시기 바랍니다.',
      screen: '해당 도구의 웹사이트 또는 앱',
      checkpoint: '단계 완료 후 다음 단계로 진행'
    }))
  };
}

/**
 * 메인 3단계 Orchestrator 함수
 */
export async function generate3StepAutomation(
  userInput: string,
  followupAnswers: any
): Promise<{
  cards: any[];
  metrics: OrchestratorMetrics;
}> {
  const overallStartTime = Date.now();

  const metrics: OrchestratorMetrics = {
    totalTokens: 0,
    totalLatencyMs: 0,
    stagesCompleted: [],
    modelsUsed: [],
    ragSearches: 0,
    ragSources: 0,
    urlsVerified: 0,
    success: false,
    costBreakdown: {
      stepA: { tokens: 0, model: '', cost: 0 },
      stepB: { tokens: 0, ragCalls: 0, cost: 0 },
      stepC: { tokens: 0, model: '', cost: 0 },
    },
  };

  try {
    console.log('🚀 [3-Step] 자동화 생성 시작');
    console.log(`📝 [3-Step] 사용자 입력: ${userInput}`);
    console.log(`📋 [3-Step] 후속 답변: ${JSON.stringify(followupAnswers)}`);

    // 🗑️ Phase 1: 레거시 Step 0 (인텐트 분석, 위험 패턴 감지) 제거
    // - analyzeUserIntent, generateContextualCreativity, generateDynamicTemplate 미사용
    // - quickDangerCheck 미사용

    // 🆕 Step AB: RAG 기반 최적 플로우 생성 (Step A + B 통합)
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 [PROGRESS] Step AB 시작: RAG로 최신 도구 조사 + 플로우 생성 중...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const stepABResult = await executeStepAB(userInput, followupAnswers);
    metrics.stagesCompleted.push('AB-research-and-flow');
    metrics.modelsUsed.push(stepABResult.model);
    metrics.totalTokens += stepABResult.tokens;
    metrics.ragSearches = stepABResult.ragMetadata.ragSearches || 0;
    metrics.ragSources = stepABResult.ragMetadata.ragSources || 0;
    metrics.costBreakdown.stepA = {
      tokens: stepABResult.tokens,
      model: stepABResult.model,
      cost: calculateCost(stepABResult.tokens, stepABResult.model),
    };
    metrics.costBreakdown.stepB = {
      tokens: 0, // Step AB에 통합됨
      ragCalls: metrics.ragSearches,
      cost: metrics.ragSearches * 0.001,
    };
    console.log(`✅ [Step AB] 플로우 생성 완료: ${stepABResult.flow.title} (${stepABResult.flow.steps.length}개 단계)`);
    console.log(`🎯 [Step AB] 선택된 도구: ${stepABResult.selectedTool}`);
    console.log(`📊 [Step AB] 선택 이유: ${stepABResult.reasoning}`);

    // 🧮 Step C 전략 선택: 복잡도 계산 (메트릭용)
    const complexity = calculateSolutionComplexity(
      stepABResult.flow,
      stepABResult.ragMetadata,
      {}, // feasibilityAnalysis는 executeStepAB 내부에서 처리
      userInput,
      followupAnswers
    );

    // 🎨 Step C: 단순 상세 가이드 작성 (Skeleton 제거)
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎨 [PROGRESS] Step C 시작: 상세 실행 가이드 작성 중...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // 🆕 Skeleton 제거, Detail만 (gpt-4.1-mini)
    console.log(`✨ [Step C] Direct Detail 전략 (복잡도: ${(complexity * 100).toFixed(1)}% - 참고용)`);
    console.log(`🎯 [모델] gpt-4.1-mini (상세 가이드 작성 - Skeleton 불필요, 비용 효율)`);

    const stepCResult = await executeStepC_SimpleDetail(
      stepABResult.flow, // flow 객체 직접 전달 (Step AB-2에서 생성한 것)
      userInput,
      followupAnswers,
      stepABResult.ragMetadata,
      overallStartTime  // startTime 전달
    );
    metrics.stagesCompleted.push('C-guide');
    metrics.modelsUsed.push(stepCResult.model);
    metrics.totalTokens += stepCResult.tokens;
    metrics.costBreakdown.stepC = {
      tokens: stepCResult.tokens,
      model: stepCResult.model,
      cost: calculateCost(stepCResult.tokens, stepCResult.model),
    };
    console.log(`✅ [Step C] 카드 생성 완료: ${stepCResult.cards?.length || 0}개 카드`);

    // 🔍 결과 검증 시스템
    console.log('🔍 [품질 검증] 결과 검증 시작...');
    const validationResult = await validateAutomationResult(stepCResult.cards, userInput, followupAnswers);

    // 🗑️ Phase 1: 레거시 패턴 매칭 및 실시간 학습 제거
    // - findContextualPatterns, saveFailureCase, getLearningStats 미사용

    if (!validationResult.isValid) {
      console.warn(`⚠️ [품질 검증] 검증 실패: ${validationResult.issues.join(', ')}`);
      // 검증 실패 시 개선된 결과 생성 시도
      if (validationResult.canRetry) {
        console.log('🔄 [품질 검증] 결과 개선 시도...');
        // TODO: 개선 로직 추가
      }
    }
    console.log(`✅ [품질 검증] 검증 완료 - 점수: ${validationResult.qualityScore}/100`);

    // 메트릭 완성
    metrics.totalLatencyMs = Date.now() - overallStartTime;
    metrics.success = true;

    // 비용 계산 및 로깅
    const totalCost =
      metrics.costBreakdown.stepA.cost +
      metrics.costBreakdown.stepB.cost +
      metrics.costBreakdown.stepC.cost;

    // 🎯 최종 결과 조합: Step C에서 생성된 cards만 사용 (Flow는 내부 처리용)
    const finalCards = stepCResult.cards || [
      // ❌ Flow 카드는 프론트엔드로 전달하지 않음 (내부 검증용만)
      // Flow는 Step A→Step B→Step C 내부 처리에서만 사용
      // Fallback: Guide 카드 (Frontend에서 상세 가이드 표시용)
      {
        type: 'guide',
        title: '📋 상세 실행 가이드',
        subtitle: '단계별 자동화 구현',
        detailedSteps: stepABResult.flow.steps.map((step: string, index: number) => ({
          title: step,
          description: `${step}에 대한 상세 실행 가이드입니다.`,
          content: '구체적인 실행 방법은 각 도구의 공식 문서를 참조하시기 바랍니다.',
          screen: '해당 도구의 웹사이트 또는 앱',
          checkpoint: '단계 완료 후 다음 단계로 진행'
        })),
        id: `guide_${Date.now()}`
      },
      // Fallback: 기타 메타 카드들
      {
        type: 'needs_analysis',
        title: '🎯 자동화 분석',
        surfaceRequest: userInput,
        realNeed: '검증된 플로우 기반 자동화',
        recommendedLevel: '실행 가능',
        status: 'completed',
        id: `needs_${Date.now()}`
      }
    ];

    // 🧪 Phase 1: complexity를 metrics에 추가 (데이터 수집용)
    (metrics as any).complexity = complexity;

    console.log(`✅ [3-Step] 논리적 구조 완료 - 총 ${metrics.totalTokens} 토큰, ${metrics.totalLatencyMs}ms`);
    console.log(`📊 [3-Step] 플로우: ${stepABResult.flow.steps.length}개 단계, 카드: ${finalCards.length}개`);
    console.log(`🔍 [3-Step] 생성된 카드 타입들: ${finalCards.map(c => c.type).join(', ')}`);
    console.log(`💰 [3-Step] 총 비용: $${totalCost.toFixed(4)}`);
    console.log(`🎯 [3-Step] 완료된 단계: ${metrics.stagesCompleted.join(' → ')}`);
    console.log(`🤖 [3-Step] 사용된 모델: ${Array.from(new Set(metrics.modelsUsed)).join(', ')}`);
    console.log(`🧪 [Phase 1] 복잡도: ${(complexity * 100).toFixed(1)}% (데이터 수집)`);

    return {
      cards: finalCards,
      metrics,
    };
  } catch (error) {
    metrics.success = false;
    metrics.errors = [error instanceof Error ? error.message : String(error)];
    metrics.totalLatencyMs = Date.now() - overallStartTime;

    console.error('❌ [3-Step] 실패:', error);

    // 완전 실패 시 기본 카드 반환
    const fallbackFlow = createFallbackFlow(userInput, followupAnswers);
    const fallbackGuide = createFallbackGuide(fallbackFlow);
    
    const fallbackCards = [
      {
        type: 'flow',
        title: fallbackFlow.title,
        subtitle: fallbackFlow.subtitle,
        steps: fallbackFlow.steps,
        status: 'fallback',
        id: `flow_fallback_${Date.now()}`
      },
      fallbackGuide,
      {
        type: 'needs_analysis',
        title: '🎯 기본 분석',
        surfaceRequest: userInput,
        realNeed: '시스템 오류로 기본 결과 제공',
        recommendedLevel: '수동 확인 필요',
        status: 'error',
        id: `needs_fallback_${Date.now()}`
      }
    ];

    return {
      cards: fallbackCards,
      metrics,
    };
  }
}

// 🔧 Zod 스키마 정의
const CardSchema = z.object({
  type: z.string(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  content: z.any().optional(),
  status: z.string().optional(),
});

const CardsResponseSchema = z.object({
  cards: z.array(CardSchema).min(1).max(8), // 최소 1개, 최대 8개 카드
});

// 🔧 Self-heal JSON 복구 함수
async function selfHealJSON(brokenContent: string, context: string): Promise<any[]> {
  console.log('🚑 [Self-Heal] JSON 복구 시도...');
  
  const healPrompt = `다음 JSON이 깨져있습니다. 올바른 JSON으로 복구해주세요:

${brokenContent.substring(0, 2000)}...

원래 의도: ${context}

올바른 JSON 형식으로 복구하되, cards 배열만 포함하고 최대 4개 카드로 제한하세요.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'JSON 복구 전문가입니다. 깨진 JSON을 올바른 형식으로 복구하세요.' },
        { role: 'user', content: healPrompt },
      ],
      max_tokens: 800,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const healedContent = response.choices[0]?.message?.content;
    if (healedContent) {
      const parsed = JSON.parse(healedContent);
      const validated = CardsResponseSchema.parse(parsed);
      console.log(`✅ [Self-Heal] JSON 복구 성공 - ${validated.cards.length}개 카드`);
      return validated.cards;
    }
  } catch (error) {
    console.error('❌ [Self-Heal] JSON 복구 실패:', error);
  }
  
  return getFallbackCards('복구 실패');
}

/**
 * 🆕 Step C: 단순 상세 가이드 생성 (Skeleton 제거)
 * - Step AB-2에서 이미 플로우 생성 완료
 * - gpt-4o 한 번만 호출하여 상세 가이드 작성
 * - Skeleton 단계 불필요 (중복 제거)
 */
async function executeStepC_SimpleDetail(
  flow: { steps: string[]; title: string; subtitle: string },
  userInput: string,
  followupAnswers: any,
  ragMetadata: any,
  startTime: number
): Promise<{
  cards: any[];
  tokens: number;
  latency: number;
  model: string;
  wowMetadata: any;
}> {
  console.log('✨ [Step C] 상세 가이드 생성 시작 (Skeleton 없이 Direct Detail)...');

  try {
    // 1. 블루프린트 읽기
    const stepCBlueprint = await BlueprintReader.read('orchestrator/step_c_wow.md');
    console.log('✅ [Step C] 블루프린트 로드 완료');

    // 2. 프롬프트 구성
    const detailPrompt = `🎯 **사용자 요청**: "${userInput}"

📋 **후속 답변**: ${JSON.stringify(followupAnswers || {}, null, 2)}

🔍 **선택된 도구** (Step AB-2):
- 도구: ${ragMetadata.selectedTool || '미지정'}
- 선택 이유: ${ragMetadata.reasoning || '최적 도구 선택'}

📋 **생성된 플로우** (Step AB-2):
제목: ${flow.title}
${flow.steps.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n')}

---

${stepCBlueprint}

---

**임무**: 위 플로우의 각 단계별 상세 가이드를 작성하세요.

**생성할 카드**:
1. **guide 카드** (각 단계마다 1개씩, 총 ${flow.steps.length}개)
   - stepId: "1", "2", "3", ... (문자열)
   - detailedSteps: 해당 단계의 구체적 실행 방법 (3-5개 하위 단계)
   - commonMistakes: 자주 하는 실수 2-3개
   - tips: 실용적인 팁 2-3개

2. **faq 카드** (1개)
   - 실전 궁금증 3-4개 (도구 설명 X, 실제 사용 팁 O)

3. **needs_analysis 카드** (1개)
   - surfaceRequest: 사용자 표면 요청
   - realNeed: 진짜 니즈
   - recommendedLevel: 자동화 수준

**출력 형식** (JSON):
{
  "cards": [
    {
      "type": "guide",
      "stepId": "1",
      "title": "${flow.steps[0]?.substring(0, 50) || '1단계'}",
      "subtitle": "상세 실행 가이드",
      "detailedSteps": [
        {
          "number": 1,
          "title": "구체적 작업",
          "description": "상세 설명",
          "expectedScreen": "예상 화면",
          "checkpoint": "확인 포인트"
        }
      ],
      "commonMistakes": ["실수1", "실수2"],
      "tips": ["팁1", "팁2"]
    },
    ... (${flow.steps.length}개의 guide 카드)
    {
      "type": "faq",
      "title": "❓ 자주 묻는 질문",
      "items": [
        {"question": "질문", "answer": "답변"}
      ]
    },
    {
      "type": "needs_analysis",
      "title": "🎯 자동화 분석",
      "surfaceRequest": "${userInput}",
      "realNeed": "실제 니즈 분석",
      "recommendedLevel": "자동화 수준"
    }
  ]
}

**중요**:
- guide 카드는 정확히 ${flow.steps.length}개 생성
- 각 guide의 stepId는 "1", "2", "3", ... (숫자 아님, 문자열!)
- FAQ는 도구 설명이 아닌 실용적 팁`;

    // 3. gpt-4.1-mini 한 번만 호출
    console.log('🎨 [Step C] gpt-4.1-mini로 상세 가이드 생성 중...');
    const detailResponse = await openai.chat.completions.create({
      model: 'gpt-4.1-mini', // 🧪 Phase 1: 비용 효율 + 고성능 (gpt-4.1의 ~99% 성능, 1/5 가격)
      messages: [
        { role: 'system', content: '당신은 초보자도 따라할 수 있는 상세 가이드를 작성하는 전문가입니다.' },
        { role: 'user', content: detailPrompt },
      ],
      max_tokens: 4000, // 충분한 토큰 (모든 단계 + FAQ + needs)
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const detailContent = detailResponse.choices[0]?.message?.content;
    if (!detailContent) {
      throw new Error('gpt-4.1-mini 응답이 비어있습니다');
    }

    const detailData = JSON.parse(detailContent);
    const detailTokens = detailResponse.usage?.total_tokens || 0;
    const latency = Date.now() - startTime;

    console.log(`✅ [Step C] 상세 가이드 생성 완료 - ${detailData.cards?.length || 0}개 카드, ${detailTokens} 토큰, ${latency}ms`);

    // Flow 카드 추가 (프론트엔드용)
    const finalCards = [
      {
        type: 'flow',
        title: flow.title,
        subtitle: flow.subtitle,
        steps: flow.steps,
        id: `flow_${Date.now()}`,
        status: 'completed',
      },
      ...(detailData.cards || []),
    ];

    return {
      cards: finalCards,
      tokens: detailTokens,
      latency,
      model: 'gpt-4.1-mini',
      wowMetadata: {
        strategy: 'simple-detail',
        selectedTool: ragMetadata.selectedTool,
        reasoning: ragMetadata.reasoning,
      },
    };
  } catch (error) {
    console.error('❌ [Step C] 상세 가이드 생성 실패:', error);

    // Fallback: 기본 가이드 생성
    const fallbackCards = [
      {
        type: 'flow',
        title: flow.title,
        subtitle: flow.subtitle,
        steps: flow.steps,
        id: `flow_${Date.now()}`,
      },
      {
        type: 'guide',
        stepId: "1",
        title: flow.steps[0] || '1단계',
        subtitle: '기본 가이드',
        detailedSteps: [
          {
            number: 1,
            title: flow.steps[0] || '작업 수행',
            description: '단계별로 진행하세요.',
            expectedScreen: '작업 화면',
            checkpoint: '완료 확인',
          },
        ],
        id: `guide_${Date.now()}`,
      },
    ];

    const latency = Date.now() - startTime;

    return {
      cards: fallbackCards,
      tokens: 0,
      latency,
      model: 'fallback',
      wowMetadata: { strategy: 'fallback', error: String(error) },
    };
  }
}

// 🔧 🗑️ LEGACY: 2-Pass Step C 전략 (Skeleton + Detail)
// executeStepC_SimpleDetail로 대체됨 - 삭제 예정
async function execute2PassStepC_LEGACY(
  verifiedCards: any[],
  userInput: string,
  followupAnswers: any,
  ragMetadata: any,
  startTime: number
): Promise<{
  cards: any[];
  tokens: number;
  latency: number;
  model: string;
  wowMetadata: any;
}> {
  console.log('📋 [Step C-1] Pass 1: Skeleton 카드 구조 생성...');
  
  // 🎯 도메인 감지 및 최적 AI 도구 선택 (2025년 버전)
  const detectedDomain = detectDomainEnhanced(userInput, followupAnswers);
  const domainTools = getOptimalAITools(detectedDomain, 'automation', true);
  const optimalTools = [...domainTools.primary, ...domainTools.secondary].map(tool => tool.name);
  
  // 1️⃣ Pass 1: Skeleton JSON만 생성 (JSON 안정성 우선)
  const skeletonPrompt = `사용자 요청에 대한 카드 구조만 생성하세요.

사용자 요청: ${userInput}
검증된 카드들: ${JSON.stringify(verifiedCards)}
후속답변: ${JSON.stringify(followupAnswers || {})}

🚨🚨🚨 **절대 필수**: Flow 카드의 steps 배열은 반드시 구체적인 단계들로 채워야 합니다!

🎯 **복잡성 분석 및 단계 수 결정**:
현재 요청: "${userInput}"

이 작업의 복잡성을 분석하세요:
- 간단 (3-4단계): 단순 데이터 입력, 기본 연동
- 중간 (4-5단계): API 연동 + 알림, 스케줄링  
- 복잡 (5-7단계): 다중 플랫폼 + 분석 + 자동화

🚨 **Flow 카드 steps 배열 작성 - 절대 준수 규칙**:

**현재 요청**: "${userInput}"

**필수 형식**: "X단계: [실제 도구명] [구체적 작업명]"

**현재 요청 분석**: "${userInput}"을 실제로 구현하는 구체적 단계들을 작성하세요.

**절대 금지 예시**:
❌ "1단계: 도구 설정" 
❌ "2단계: 자동화 설정"
❌ "3단계: 계정 생성"
❌ "4단계: 연동 및 테스트"

**반드시 포함해야 할 요소**:
- Google Apps Script, Zapier, Make.com 등 실제 도구명
- Drive API, Webhook, 트리거 등 구체적 기능명
- 현재 요청에서 언급된 구글 드라이브, 계약서, 요약, 슬랙 키워드 활용

🚨🚨🚨 **CRITICAL: Flow-Guide 완전 매핑 규칙 (절대 필수!)**
IF (flow.steps.length == N) THEN generate EXACTLY N guide cards with stepId="1", "2", ..., "N"

예시: Flow에 4단계 → 반드시 4개 guide 카드 (stepId: "1", "2", "3", "4")
예시: Flow에 5단계 → 반드시 5개 guide 카드 (stepId: "1", "2", "3", "4", "5")

🚨 **Skeleton JSON 필수 형식**:

{
  "cards": [
    {
      "type": "flow",
      "title": "🚀 자동화 플로우",
      "steps": [
        "1단계: [실제 도구명] [구체적 작업]",
        "2단계: [실제 도구명] [구체적 작업]",
        "3단계: [실제 도구명] [구체적 작업]"
      ],
      "contentId": "flow_1",
      "status": "skeleton"
    },
    {
      "type": "guide",
      "stepId": "1",
      "title": "1단계 상세 가이드",
      "contentId": "guide_1",
      "status": "skeleton"
    },
    {
      "type": "guide",
      "stepId": "2",
      "title": "2단계 상세 가이드",
      "contentId": "guide_2",
      "status": "skeleton"
    },
    {
      "type": "guide",
      "stepId": "3",
      "title": "3단계 상세 가이드",
      "contentId": "guide_3",
      "status": "skeleton"
    },
    {
      "type": "needs_analysis",
      "title": "🎯 확장된 가치 분석",
      "contentId": "needs_1",
      "status": "skeleton"
    },
    {
      "type": "faq",
      "title": "❓ 자주 묻는 질문",
      "contentId": "faq_1",
      "status": "skeleton"
    }
  ]
}

⚠️ **중요**: 위 예시는 3단계 Flow입니다. 실제로 생성하는 Flow 단계 수에 맞춰 정확히 그 개수만큼 guide 카드를 생성하세요!`;

  const skeletonResponse = await openai.chat.completions.create({
    model: 'o1-mini', // 🧪 Phase 1: 추론 모델로 플로우 설계 품질 향상
    messages: [
      { role: 'user', content: `당신은 자동화 레시피 설계 전문가입니다. 사용자의 요청을 분석하여 실제 완성 가능한 구체적 단계들을 설계하세요.

Flow와 Guide 카드의 steps 배열에는 "1단계: [도구명] [구체적 작업]" 형식으로 실제 도구명과 구체적 작업이 포함된 단계를 반드시 작성하세요. 추상적 제목(도구 설정, 자동화 설정 등) 절대 금지!

${skeletonPrompt}` },
    ],
    max_completion_tokens: 2500, // 🔥 o1-mini는 max_completion_tokens 사용 (max_tokens 아님!)
    // 🚨 o1-mini는 temperature, response_format 지원 안 함
  });

  const skeletonContent = skeletonResponse.choices[0]?.message?.content;
  if (!skeletonContent) {
    throw new Error('Skeleton 생성 실패');
  }

  const skeletonCards = await parseCardsJSON(skeletonContent);
  
  // 🚨 Flow & Guide 카드의 steps 배열 검증 및 동기화
  const flowCard = skeletonCards.find(card => card.type === 'flow');
  const guideCard = skeletonCards.find(card => card.type === 'guide');
  
  let finalSteps: string[] = [];
  
  // 1️⃣ Flow 카드에서 단계 추출 시도
  if (flowCard?.steps && Array.isArray(flowCard.steps) && flowCard.steps.length > 0 && 
      !flowCard.steps.some((step: string) => step.includes('반드시 여기에') || step.includes('예:') || step.includes('현재 작업에 맞는'))) {
    finalSteps = flowCard.steps;
    console.log(`✅ [Skeleton 검증] Flow 카드에서 ${finalSteps.length}개 단계 추출 성공`);
  } 
  // 2️⃣ Flow 카드가 비어있거나 예제 텍스트인 경우 Step B 검증 결과 기반 동적 생성
  else {
    console.log('🚨 [Skeleton 검증] Flow 카드 steps가 비어있음 - Step B 검증 결과 기반 동적 생성');
    
    // 🎯 Step B 검증 결과 분석
    const stepBValidationSummary = ragMetadata?.methodValidation || {};
    const hasViableMethods = stepBValidationSummary.viableMethods > 0;
    const hasAlternatives = stepBValidationSummary.alternativesFound > 0;
    
    if (hasViableMethods || hasAlternatives) {
      console.log(`✅ [Step B 활용] ${stepBValidationSummary.viableMethods}개 검증된 방법 + ${stepBValidationSummary.alternativesFound}개 대안 발견`);
      // Step B에서 검증된 방법들이 있으면 이를 활용한 동적 생성
      finalSteps = await generateDynamicStepsFromValidation(userInput, followupAnswers, ragMetadata);
    } else {
      console.log('⚠️ [Step B 결과] 검증된 방법 없음 - 현실적 대안 동적 생성');
      // 검증된 방법이 없으면 현실적 대안을 동적으로 생성
      finalSteps = await generateRealisticAlternativeSteps(userInput, followupAnswers);
    }
    
    console.log(`✅ [동적 생성] ${finalSteps.length}단계 완성: ${finalSteps.map((s, i) => `${i+1}. ${s.substring(0, 30)}...`).join(' | ')}`);
  }
  
  // 3️⃣ Flow와 Guide 카드 동기화
  if (flowCard) {
    flowCard.steps = finalSteps;
  }
  if (guideCard) {
    guideCard.steps = finalSteps; // 🎯 핵심: Guide도 동일한 steps 보유
    console.log(`✅ [동기화] Guide 카드에 ${finalSteps.length}개 단계 동기화 완료`);
  }

  // 🚨 4️⃣ Guide 카드들에 stepId 강제 추가 (GPT가 빼먹는 경우 대비)
  let stepIdCounter = 1;
  skeletonCards.forEach((card, idx) => {
    if (card.type === 'guide') {
      if (!card.stepId) {
        card.stepId = stepIdCounter.toString();
        console.log(`🔧 [stepId 보정] Guide 카드 ${idx + 1}에 stepId="${stepIdCounter}" 추가`);
      }
      stepIdCounter++;
    }
  });

  console.log(`✅ [Step C-1] Skeleton 완료 - ${skeletonCards.length}개 카드`);

  // 2️⃣ Pass 2: 각 카드별 상세 내용 생성 (품질 우선, 제한 없음)
  console.log('🎨 [Step C-2] Pass 2: 상세 내용 생성...');

  // 🚨 Blueprint 로드 (근본 해결!)
  const blueprint = await BlueprintReader.read('orchestrator/step_c_wow.md');

  // 🎯 순차 카드 생성 함수 (맥락 연결)
  async function enrichCardWithDetails(skeletonCard: any, previousSteps: any[] = []) {
    // 🔗 이전 단계들의 구체적 내용 추출 (맥락 연결)
    const previousContext = previousSteps.length > 0
      ? `\n\n📋 **이전 단계들의 구체적 결과** (반드시 참조!):\n${previousSteps.map((step, idx) => {
          const stepNum = idx + 1;
          const stepTitle = step.title || `${stepNum}단계`;

          // 🎯 이전 단계의 전체 상세 내용을 그대로 전달 (GPT가 맥락 파악)
          let stepFullContent = '';

          if (step.detailedSteps && Array.isArray(step.detailedSteps)) {
            stepFullContent = step.detailedSteps.map((d: any, i: number) => {
              const parts = [];
              parts.push(`  ${i + 1}) ${d.title || d.stepTitle || '제목 없음'}`);
              if (d.description) parts.push(`     내용: ${d.description}`);
              if (d.expectedScreen) parts.push(`     결과: ${d.expectedScreen}`);
              if (d.checkpoint) parts.push(`     확인: ${d.checkpoint}`);
              return parts.join('\n');
            }).join('\n\n');
          } else if (step.description) {
            stepFullContent = `  ${step.description}`;
          } else {
            stepFullContent = '  (상세 내용 없음)';
          }

          return `[${stepNum}단계] ${stepTitle}\n${stepFullContent}`;
        }).join('\n\n')}\n\n⚠️ **중요**: 위 이전 단계들에서 생성/설정된 모든 구체적인 값들(이름, URL, 설정값, 구조 등)을 정확히 참조하여 이어지는 가이드를 작성하세요!
예: 이전 단계에서 "매출분석_2025" 파일을 만들었다면, 이번 단계에서도 정확히 "매출분석_2025"를 참조
예: 이전 단계에서 "Zapier 워크플로우: 주문알림봇"을 만들었다면, 이번 단계에서도 정확히 "주문알림봇" 워크플로우를 참조`
      : '';

    const detailPrompt = `${blueprint}

=== 현재 작업 ===
카드 타입: ${skeletonCard.type}
카드 제목: ${skeletonCard.title}
사용자 요청: ${userInput}
후속답변: ${JSON.stringify(followupAnswers || {})}
최적 도구들: ${optimalTools.join(', ')}

🚨🚨🚨 절대 원칙 재확인:
- 방법론 비교 절대 금지 (예: "Zapier 방법 vs Google Apps Script 방법")
- 단 하나의 최적 솔루션만 제시
- 선택한 도구로 처음부터 끝까지 일관된 가이드 (적절한 단계 수로)

🎯 **Pass 1에서 확정된 단계들**:
${skeletonCard.steps ? skeletonCard.steps.map((step: any, i: number) => `${i+1}. ${step}`).join('\n') : '단계 정보 없음'}

⚠️ **중요**: 위 단계들과 100% 일치하는 솔루션으로만 상세 내용을 생성하세요!${previousContext}

${skeletonCard.type === 'guide' ? `
🎯 **GUIDE 카드 JSON 응답 형식 (필수 준수!):**

${skeletonCard.stepId ? `
⚠️ 이 가이드는 stepId="${skeletonCard.stepId}"인 단일 단계 가이드입니다.
전체 플로우가 아닌, 이 단계에 대한 상세 설명만 작성하세요.

다음 JSON 형식으로만 응답하세요:
{
  "basicConcept": "이 단계가 필요한 이유와 목표를 간단히 설명",
  "automationLevel": "자동/반자동/수동",
  "detailedSteps": [
    {
      "number": 1,
      "title": "${skeletonCard.title} 시작하기",
      "description": "이 단계를 수행하기 위한 구체적인 첫 번째 작업 (정확한 사이트 주소, 버튼명, 입력값 포함)",
      "expectedScreen": "이 작업 후 화면에 나타날 구체적 요소들",
      "checkpoint": "이 단계가 성공했는지 확인하는 방법"
    },
    {
      "number": 2,
      "title": "${skeletonCard.title} 완료하기",
      "description": "앞 작업에서 이어지는 다음 구체적 실행 방법",
      "expectedScreen": "다음에 나타날 화면 요소들",
      "checkpoint": "이 단계 완료 확인 방법"
    }
  ],
  "commonMistakes": ["이 단계에서 흔히 발생하는 실수들"],
  "practicalTips": ["이 단계 실행 시 유용한 팁들"]
}
` : `
⚠️ 이 가이드는 전체 플로우 가이드입니다 (stepId 없음).

다음 JSON 형식으로만 응답하세요:
{
  "detailedSteps": [
    {
      "number": 1,
      "title": "1단계: [구체적 도구명] [구체적 작업명]",
      "description": "이 단계에서 수행할 구체적인 작업 내용을 상세히 설명합니다.",
      "expectedScreen": "이 단계 완료 후 사용자가 확인할 수 있는 구체적인 화면이나 결과물",
      "checkpoint": "이 단계가 정상적으로 완료되었는지 확인하는 방법"
    }
  ]
}
`}

⚠️ 절대 금지: "도구 설정", "자동화 설정" 같은 추상적 제목
⚠️ 필수: 실제 도구명과 구체적 작업명 포함
⚠️ 현재 요청 "${userInput}"에 맞는 실제 실행 가능한 단계들만 작성
` : `
🎯 **${optimalTools[0] || 'Google Apps Script'}를 사용한 완전한 단일 솔루션** 생성:
- 1단계: 계정 생성/준비
- 2단계: API/연결 설정
- 3단계: 코드 작성/배포
- 4단계: 테스트 및 검증
- 5단계: 자동화 활성화
`}

초보자도 따라할 수 있는 완벽한 품질로 작성하세요.`;

    const detailResponse = await openai.chat.completions.create({
      model: 'gpt-4.1-mini', // 🧪 Phase 1: 비용 효율 + 고성능 (gpt-4.1의 1/5 가격, ~99% 성능)
      messages: [
        { role: 'system', content: skeletonCard.type === 'guide'
          ? `당신은 실행 가이드 전문가입니다. 반드시 JSON 형식으로만 응답하세요.

다음 JSON 형식을 정확히 따라 응답하세요:

{
  "detailedSteps": [
    {
      "number": 1,
      "title": "1단계: [구체적 도구명] [구체적 작업명]",
      "description": "이 단계에서 수행할 구체적인 작업을 상세히 설명하세요. 초보자도 따라할 수 있도록 단계별로 설명하세요.",
      "expectedScreen": "이 단계 완료 후 사용자가 확인할 수 있는 구체적인 화면이나 결과물을 설명하세요.",
      "checkpoint": "이 단계가 정상적으로 완료되었는지 확인하는 방법을 설명하세요."
    }
  ]
}

🚨 절대 규칙:
1. "도구 설정", "자동화 설정" 같은 추상적 제목 절대 금지
2. "Google Apps Script 프로젝트 생성", "Slack Webhook 설정" 같이 구체적으로 작성
3. 실제 도구명과 기능명을 반드시 포함
4. 작업 복잡성에 따라 적절한 단계 수로 구성 (간단: 3-4단계, 복잡: 5-7단계)`
          : `${skeletonCard.type} 카드 전문가입니다. 초보자도 따라할 수 있는 완벽한 가이드를 작성하세요.` },
        { role: 'user', content: detailPrompt },
      ],
      max_tokens: skeletonCard.type === 'guide' ? 8000 : 4000, // 🔥 토큰 대폭 증가: Guide 8K, 기타 4K
      temperature: 0.4,
      ...(skeletonCard.type === 'guide' ? { response_format: { type: 'json_object' } } : {}),
    });

    const detailContent = detailResponse.choices[0]?.message?.content;
    const tokens = detailResponse.usage?.total_tokens || 0;

    // 카드에 상세 내용 추가
    const enrichedCard = {
      ...skeletonCard,
      content: detailContent,
      status: 'complete'
    };

    // 카드 타입별 특별 처리 (패턴 매칭 한계 인정 → JSON 응답 강제)
    if (skeletonCard.type === 'guide' && detailContent) {
      enrichedCard.codeBlocks = extractCodeBlocks(detailContent);

      // 🎯 GPT가 생성한 실제 상세 내용을 우선 사용
      console.log(`🔍 [Guide Content] GPT 생성 내용 길이: ${detailContent?.length || 0}자`);

      if (detailContent && detailContent.length > 1000) {
        // GPT가 실제로 상세 내용을 생성했으면 이를 파싱해서 사용
        console.log('🎯 [Guide 처리] GPT 생성 상세 내용 파싱 시도');

        // 🎯 JSON 응답 우선 시도
        try {
          const jsonMatch = detailContent.match(/\{[\s\S]*"detailedSteps"[\s\S]*\}/);
          if (jsonMatch) {
            console.log('🔍 [JSON 파싱] JSON 형식 응답 감지');
            const jsonContent = JSON.parse(jsonMatch[0]);
            if (jsonContent.detailedSteps && Array.isArray(jsonContent.detailedSteps)) {
              enrichedCard.detailedSteps = jsonContent.detailedSteps;

              // stepId가 있는 가이드의 경우 추가 필드도 추출
              if (skeletonCard.stepId) {
                if (jsonContent.basicConcept) enrichedCard.basicConcept = jsonContent.basicConcept;
                if (jsonContent.automationLevel) enrichedCard.automationLevel = jsonContent.automationLevel;
                if (jsonContent.commonMistakes) enrichedCard.commonMistakes = jsonContent.commonMistakes;
                if (jsonContent.practicalTips) enrichedCard.practicalTips = jsonContent.practicalTips;
                console.log(`✅ [JSON 파싱] stepId="${skeletonCard.stepId}" 가이드에서 추가 필드 추출 완료`);
              }

              console.log(`✅ [JSON 파싱] JSON에서 ${enrichedCard.detailedSteps.length}개 단계 추출 성공`);
            } else {
              throw new Error('detailedSteps 배열이 없음');
            }
          } else {
            throw new Error('JSON 형식이 아님');
          }
        } catch (jsonError) {
          console.log('⚠️ [JSON 파싱] 실패 - 마크다운 파싱으로 fallback:', jsonError instanceof Error ? jsonError.message : String(jsonError));
          enrichedCard.detailedSteps = extractDetailedSteps(detailContent);
        }

        // JSON 파싱이 실패했을 경우에만 Skeleton 사용
        if (!enrichedCard.detailedSteps || enrichedCard.detailedSteps.length === 0) {
          console.log('⚠️ [Guide 처리] JSON 파싱 실패 - Skeleton 사용');
          enrichedCard.detailedSteps = skeletonCard.steps.map((step: string, index: number) => ({
            number: index + 1,
            title: step,
            description: `${step}에 대한 상세 실행 가이드입니다.`,
            expectedScreen: `${step} 완료 후 확인할 수 있는 화면`,
            checkpoint: `✅ ${step} 완료 확인사항`
          }));
        } else {
          console.log(`✅ [Guide 처리] JSON 파싱 성공 - GPT 생성 ${enrichedCard.detailedSteps.length}개 단계 사용`);
        }

        console.log(`✅ [Guide 처리] 최종 ${enrichedCard.detailedSteps.length}개 단계 완성`);
      } else {
        // detailContent가 부족하면 Skeleton 단계 사용
        console.log('⚠️ [Guide 처리] GPT 내용 부족 - Skeleton 단계 사용');
        if (skeletonCard.steps && Array.isArray(skeletonCard.steps) && skeletonCard.steps.length > 0) {
          enrichedCard.detailedSteps = skeletonCard.steps.map((step: string, index: number) => ({
            number: index + 1,
            title: step,
            description: `${step}에 대한 상세 실행 가이드입니다.`,
            expectedScreen: `${step} 완료 후 확인할 수 있는 화면`,
            checkpoint: `✅ ${step} 완료 확인사항`
          }));
          console.log(`✅ [Fallback] Skeleton 기반 ${enrichedCard.detailedSteps.length}개 단계 생성`);
        } else {
          console.log('🚨 [최종 Fallback] 기본 단계 생성');
          enrichedCard.detailedSteps = extractDetailedSteps('');
        }
      }
    } else if (skeletonCard.type === 'faq' && detailContent) {
      // 🔍 FAQ 처리 디버그 로그
      console.log('🔍 [FAQ 처리] detailContent 길이:', detailContent.length);
      enrichedCard.items = extractFAQItems(detailContent);
      console.log('🔍 [FAQ 처리] enrichedCard.items:', enrichedCard.items?.length || 0, '개');

      // 🛡️ Safety Net: FAQ 추출 실패 시 skeletonCard.content에서 재시도
      if (!enrichedCard.items || enrichedCard.items.length === 0) {
        console.log('⚠️ [FAQ Safety Net] detailContent에서 추출 실패, skeletonCard.content에서 재시도');
        if (skeletonCard.content) {
          enrichedCard.items = extractFAQItems(skeletonCard.content);
          console.log('🔍 [FAQ Safety Net] 재추출 결과:', enrichedCard.items?.length || 0, '개');
        }
      }
    }

    return { enrichedCard, tokens };
  }

  // 🔄 순차적으로 모든 카드 enrichment 실행 (맥락 연결)
  console.log(`🔄 [순차 생성] ${skeletonCards.length}개 카드를 순차적으로 생성합니다 (이전 단계 맥락 전달)...`);
  let enrichedCards: any[] = [];
  let totalPass2Tokens = 0;
  const completedGuideSteps: any[] = []; // guide 카드만 저장 (맥락 전달용)

  for (let index = 0; index < skeletonCards.length; index++) {
    const card = skeletonCards[index];
    console.log(`📤 [순차 ${index + 1}/${skeletonCards.length}] ${card.type} 카드 생성 시작${completedGuideSteps.length > 0 ? ` (${completedGuideSteps.length}개 이전 단계 참조)` : ''}`);

    // 이전에 완성된 guide 카드들을 컨텍스트로 전달
    const result = await enrichCardWithDetails(card, completedGuideSteps);

    enrichedCards.push(result.enrichedCard);
    totalPass2Tokens += result.tokens;

    // guide 카드인 경우에만 completedGuideSteps에 추가
    if (result.enrichedCard.type === 'guide' && result.enrichedCard.detailedSteps) {
      completedGuideSteps.push(result.enrichedCard);
      console.log(`✅ [맥락 저장] ${result.enrichedCard.title || 'Guide'} 카드 완료 → 다음 단계 생성 시 참조됨`);
    }
  }

  console.log(`✅ [순차 생성] 완료! ${enrichedCards.length}개 카드가 맥락을 이어받아 완성되었습니다`);

  // 🧹 카드 타입별로 불필요한 content 필드 제거 (인터페이스 정합성 유지)
  enrichedCards = enrichedCards.map(card => {
    // flow, faq, expansion, dashboard, guide 등은 content 필드가 인터페이스에 없음
    const noContentTypes = ['flow', 'faq', 'expansion', 'dashboard', 'impact-bar', 'code', 'share', 'guide'];

    if (noContentTypes.includes(card.type)) {
      const { content, ...cleanCard } = card;
      if (content) {
        console.log(`🧹 [정리] ${card.type} 카드에서 불필요한 content 필드 제거`);
      }
      return cleanCard;
    }

    return card;
  });

  // 🔍 프론트엔드 파싱을 위한 데이터 구조 검증
  console.log('🔍 [데이터 검증] 프론트엔드 파싱 가능 여부 확인...');
  enrichedCards.forEach((card, idx) => {
    if (card.type === 'guide') {
      // guide 카드는 detailedSteps가 필수
      if (!card.detailedSteps || !Array.isArray(card.detailedSteps)) {
        console.warn(`⚠️ [검증 실패] Guide 카드 ${idx + 1}: detailedSteps가 없거나 배열이 아님`);
        card.detailedSteps = [];
      } else {
        // 각 step이 객체인지, 필수 필드가 있는지 확인
        card.detailedSteps = card.detailedSteps.map((step: any, stepIdx: number) => {
          if (!step || typeof step !== 'object') {
            console.warn(`⚠️ [검증 실패] Guide 카드 ${idx + 1}, Step ${stepIdx + 1}: step이 객체가 아님`);
            return {
              number: stepIdx + 1,
              title: `${stepIdx + 1}단계`,
              description: '상세 내용을 확인할 수 없습니다.',
            };
          }

          // 필수 필드 검증 및 보정
          const validatedStep = {
            number: step.number || stepIdx + 1,
            title: step.title || step.stepTitle || `${stepIdx + 1}단계`,
            description: step.description || step.details || '상세 내용이 누락되었습니다.',
            expectedScreen: step.expectedScreen || step.expected || '',
            checkpoint: step.checkpoint || step.checkPoint || '',
          };

          // 빈 description 처리
          if (!validatedStep.description || validatedStep.description.trim() === '') {
            console.warn(`⚠️ [검증 경고] Guide 카드 ${idx + 1}, Step ${stepIdx + 1}: description이 비어있음`);
            validatedStep.description = `${validatedStep.title}에 대한 상세 안내를 확인하세요.`;
          }

          return validatedStep;
        });

        console.log(`✅ [검증 완료] Guide 카드 ${idx + 1}: ${card.detailedSteps.length}개 단계 검증 완료`);

        // 🔍 실제 데이터 구조 샘플 로깅 (디버깅용)
        if (card.detailedSteps.length > 0) {
          const sampleStep = card.detailedSteps[0];
          console.log(`📋 [샘플 데이터] Guide 카드 ${idx + 1}, 첫 번째 단계:`, {
            number: sampleStep.number,
            title: sampleStep.title?.substring(0, 50),
            description: sampleStep.description?.substring(0, 100),
            hasExpectedScreen: !!sampleStep.expectedScreen,
            hasCheckpoint: !!sampleStep.checkpoint,
          });
        }
      }
    }
  });

  const totalTokens = (skeletonResponse.usage?.total_tokens || 0) + totalPass2Tokens;
  const latency = Date.now() - startTime;

  console.log(`✅ [Step C-2] 2-Pass 완료 - ${enrichedCards.length}개 카드, ${totalTokens} 토큰, ${latency}ms`);

  return {
    cards: enrichedCards,
    tokens: totalTokens,
    latency,
    model: 'gpt-4o-2024-11-20',
    wowMetadata: {
      strategy: '2-Pass',
      domain: detectedDomain,
      optimalTools: optimalTools.slice(0, 3),
    },
  };
}

// 🛡️ 구조화된 단계 추출 헬퍼 (안정성 극대화)
function extractDetailedSteps(content: string): any[] {
  console.log('🔧 [extractDetailedSteps] 단계 추출 시작');
  console.log('🔍 [extractDetailedSteps] Content 길이:', content.length);
  console.log('🔍 [extractDetailedSteps] Content 샘플 (첫 500자):');
  console.log(content.substring(0, 500));
  
  const steps = [];
  
  // 여러 패턴 시도 (실제 GPT 출력에 맞게 수정)
  const patterns = [
    // 패턴 1: ## 📝 **1단계: 제목** 형태 (새로운 강제 형식!) 
    /## 📝 \*\*(\d+)단계: ([^*\n]+)\*\*([\s\S]*?)(?=\n## 📝 \*\*\d+단계|\n## |\n---|$)/g,
    // 패턴 2: ### **Step 1: 제목** 형태 (세부 단계)
    /### \*\*Step (\d+): ([^*\n]+)\*\*([\s\S]*?)(?=### \*\*Step \d+:|\n---|\n## |$)/g,
    // 패턴 3: ## 📝 **1단계: 제목** 형태 (기존 버전)
    /## 📝 \*\*(\d+)단계: ([^*]+)\*\*([\s\S]*?)(?=\n## 📝|\n---|\n## |$)/g,
    // 패턴 4: ## **1단계: 제목** 형태 (더 유연한 버전)
    /## \*\*(\d+)단계: ([^*]+)\*\*([\s\S]*?)(?=\n## \*\*\d+단계|\n---|\n## |$)/g,
    // 패턴 5: ## 1️⃣ **제목** 형태
    /## (\d+)️⃣ \*\*([^*]+)\*\*([\s\S]*?)(?=\n## \d+️⃣|\n---|\n## 📂|\n## 🎉|$)/g,
    // 패턴 6: ### **1️⃣ **제목** 형태  
    /### \*\*(\d+)️⃣ \*\*([^*]+)\*\*([\s\S]*?)(?=### \*\*\d+️⃣|\n---|\n## |$)/g,
    // 패턴 7: ## ✅ **방법 1: 형태
    /## ✅ \*\*방법 (\d+): ([^#\n]+)([\s\S]*?)(?=## ✅|\n---|\n## |$)/g,
    // 패턴 8: ### 1. **제목** 형태 (번호 기반)
    /### (\d+)\. \*\*([^*\n]+)\*\*([\s\S]*?)(?=### \d+\.|\n---|\n## |$)/g
  ];

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    pattern.lastIndex = 0;
    let match;
    let stepNumber = 1;

    console.log(`🔍 [extractDetailedSteps] 패턴 ${i + 1} 시도...`);
    console.log(`🔍 [패턴 ${i + 1}] 정규식:`, pattern.toString().substring(0, 100) + '...');

    while ((match = pattern.exec(content)) !== null) {
      const actualStepNumber = parseInt(match[1]) || stepNumber;
      let title = match[2]?.trim() || '';
      let description = match[3]?.trim() || '';

      // 마크다운 정리
      title = title.replace(/\*\*([^*]+)\*\*/g, '$1');
      description = description
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/### ([^#\n]+)/g, '$1')
        .replace(/\n\n+/g, '\n')
        .substring(0, 500); // 더 긴 설명 허용

      if (title) {
        const step = {
          number: actualStepNumber,
          title: `${actualStepNumber}단계: ${title}`,
          description: description || `${title}에 대한 상세 설명입니다.`,
          expectedScreen: `${title} 완료 후 확인할 수 있는 화면`,
          checkpoint: `${title}이 정상적으로 완료되었는지 확인`
        };
        
        console.log(`✅ [extractDetailedSteps] 단계 ${actualStepNumber} 파싱됨:`, {
          pattern: i + 1,
          rawMatch: match[0].substring(0, 50) + '...',
          title: step.title,
          descriptionLength: step.description.length,
          descriptionPreview: step.description.substring(0, 100) + '...'
        });
        
        steps.push(step);
        stepNumber++;
      }
    }

    if (steps.length > 0) {
      console.log(`✅ [extractDetailedSteps] 패턴 ${i + 1} 성공 - ${steps.length}개 단계`);
      break;
    }
  }

  // 🛡️ 완전 fallback: 기본 단계 생성
  if (steps.length === 0) {
    console.log('🚨 [extractDetailedSteps] 패턴 매칭 실패 - 기본 단계 생성');
    steps.push(
      {
        number: 1,
        title: '1단계: 도구 계정 생성',
        description: '자동화에 필요한 도구들의 계정을 생성합니다.',
        expectedScreen: '계정 생성이 완료된 화면',
        checkpoint: '계정에 정상적으로 로그인되는지 확인'
      },
      {
        number: 2,
        title: '2단계: 자동화 설정',
        description: '단계별 가이드에 따라 자동화를 설정합니다.',
        expectedScreen: '자동화 설정이 완료된 화면',
        checkpoint: '설정이 저장되고 활성화되었는지 확인'
      },
      {
        number: 3,
        title: '3단계: 테스트 및 완료',
        description: '설정한 자동화가 제대로 작동하는지 테스트합니다.',
        expectedScreen: '테스트 알림이 정상적으로 도착한 화면',
        checkpoint: '자동화가 정상적으로 작동하는지 확인'
      }
    );
  }

  console.log(`✅ [extractDetailedSteps] 완료 - ${steps.length}개 단계 반환`);
  return steps;
}

// 🔧 코드 블록 추출 헬퍼
function extractCodeBlocks(content: string): any[] {
  const codeBlocks = [];
  const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  let index = 1;

  while ((match = codeRegex.exec(content)) !== null) {
    codeBlocks.push({
      title: `코드 ${index}`,
      language: match[1] || 'text',
      code: match[2].trim(),
      copyInstructions: `이 코드를 복사해서 사용하세요`,
      saveLocation: match[1] === 'javascript' ? 'code.gs' : '설정 파일'
    });
    index++;
  }

  return codeBlocks;
}

// 🔧 FAQ 아이템 추출 헬퍼 (강화된 파싱)
function extractFAQItems(content: string): any[] {
  console.log('🔍 [FAQ 추출] 시작 - 내용 길이:', content.length);
  console.log('🔍 [FAQ 추출] 내용 미리보기:', content.substring(0, 300) + '...');
  
  const faqItems = [];
  
  // 1️⃣ 다양한 JSON 형태 처리 (기존 + 강화)
  try {
    // a) ```json 코드 블록
    const jsonCodeMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonCodeMatch) {
      const jsonContent = JSON.parse(jsonCodeMatch[1]);
      if (jsonContent.items && Array.isArray(jsonContent.items)) {
        console.log('✅ [FAQ 추출] JSON 코드블록 FAQ 발견:', jsonContent.items.length, '개');
        return jsonContent.items.map((item: any) => ({
          question: item.question || item.q,
          answer: item.answer || item.a
        }));
      }
    }
    
    // b) "items": [...] 형태 직접 추출
    if (content.includes('"items"')) {
      console.log('🔍 [FAQ 추출] "items" 키워드 발견, 배열 추출 시도');
      const itemsMatch = content.match(/"items"\s*:\s*(\[[\s\S]*?\])/);
      if (itemsMatch) {
        console.log('🔍 [FAQ 추출] items 배열 매칭 성공');
        const itemsArray = JSON.parse(itemsMatch[1]);
        if (Array.isArray(itemsArray)) {
          console.log('✅ [FAQ 추출] items 배열 파싱 성공:', itemsArray.length, '개');
          return itemsArray.map((item: any) => ({
            question: item.question || item.q,
            answer: item.answer || item.a
          }));
        }
      }
    }
    
    // c) 전체 content가 JSON인 경우
    if ((content.trim().startsWith('{') && content.trim().endsWith('}')) ||
        (content.trim().startsWith('[') && content.trim().endsWith(']'))) {
      console.log('🔍 [FAQ 추출] 전체 JSON 파싱 시도');
      const parsed = JSON.parse(content.trim());
      if (Array.isArray(parsed)) {
        console.log('✅ [FAQ 추출] 배열 형태 JSON 파싱 성공:', parsed.length, '개');
        return parsed.map((item: any) => ({
          question: item.question || item.q,
          answer: item.answer || item.a
        }));
      } else if (parsed.items && Array.isArray(parsed.items)) {
        console.log('✅ [FAQ 추출] 객체.items 형태 JSON 파싱 성공:', parsed.items.length, '개');
        return parsed.items.map((item: any) => ({
          question: item.question || item.q,
          answer: item.answer || item.a
        }));
      }
    }
    
    // d) question/answer 패턴 직접 추출
    const questionMatches = content.match(/"question"\s*:\s*"([^"]+)"/g);
    const answerMatches = content.match(/"answer"\s*:\s*"([^"]+)"/g);
    
    if (questionMatches && answerMatches && questionMatches.length === answerMatches.length) {
      console.log('✅ [FAQ 추출] question/answer 패턴 직접 추출 성공:', questionMatches.length, '개');
      return questionMatches.map((qMatch, index) => {
        const question = qMatch.match(/"question"\s*:\s*"([^"]+)"/)?.[1] || '';
        const answer = answerMatches[index]?.match(/"answer"\s*:\s*"([^"]+)"/)?.[1] || '';
        return { question, answer };
      });
    }
    
  } catch (e) {
    console.log('⚠️ [FAQ 추출] JSON 파싱 실패:', e, '- 마크다운 파싱 시도');
  }

  // 2️⃣ 마크다운 형태 파싱 (기존 로직 강화)
  const lines = content.split('\n');
  let currentQ = '';
  let currentA = '';
  let isAnswer = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 다양한 질문 패턴 인식
    if (trimmedLine.match(/^(Q\d*[:.)]|질문\d*[:.)]|❓|🤔)/i) || 
        trimmedLine.match(/^\d+\.\s*.*\?/) ||
        trimmedLine.includes('질문')) {
      
      if (currentQ && currentA) {
        faqItems.push({ 
          question: currentQ.trim(), 
          answer: currentA.trim() 
        });
      }
      
      currentQ = trimmedLine
        .replace(/^(Q\d*[:.)]|질문\d*[:.)]|❓|🤔|\d+\.)\s*/i, '')
        .replace(/^\*\*([^*]+)\*\*/, '$1'); // 볼드 제거
      currentA = '';
      isAnswer = false;
      
    } else if (trimmedLine.match(/^(A\d*[:.)]|답변\d*[:.)]|💡|✅)/i) ||
               (currentQ && !isAnswer && trimmedLine.length > 5)) {
      
      isAnswer = true;
      currentA = trimmedLine
        .replace(/^(A\d*[:.)]|답변\d*[:.)]|💡|✅)\s*/i, '')
        .replace(/^\*\*([^*]+)\*\*/, '$1'); // 볼드 제거
      
    } else if (isAnswer && trimmedLine) {
      currentA += (currentA ? '\n' : '') + trimmedLine;
    }
  }

  // 마지막 Q&A 추가
  if (currentQ && currentA) {
    faqItems.push({ 
      question: currentQ.trim(), 
      answer: currentA.trim() 
    });
  }

  console.log('📊 [FAQ 추출] 결과:', faqItems.length, '개 FAQ 추출됨');
  
  // 3️⃣ 결과가 없으면 도메인별 기본 FAQ 제공
  if (faqItems.length === 0) {
    console.log('⚠️ [FAQ 추출] 추출 실패 - 기본 FAQ 사용');
    return [
      { question: '이 자동화가 실패할 수 있나요?', answer: '네트워크 연결이나 API 한도 초과시 실패할 수 있습니다. 각 도구의 상태를 정기적으로 확인하세요.' },
      { question: '비용이 발생하나요?', answer: '사용하는 서비스의 요금제에 따라 비용이 발생할 수 있습니다. 무료 플랜을 우선 활용해보세요.' },
      { question: '설정이 복잡한가요?', answer: '단계별 가이드를 따라하시면 15-30분 내에 설정 가능합니다. 기술적 지식이 없어도 괜찮습니다.' }
    ];
  }

  return faqItems;
}

// 유틸리티 함수들
async function parseCardsJSON(content: string): Promise<any[]> {
  console.log(`🔍 [Cards JSON] 파싱 시작 - 원본 길이: ${content.length}`);

  try {
    const parsed = JSON.parse(content);

    // 🔧 Zod 스키마 검증 시도
    try {
      const validated = CardsResponseSchema.parse(parsed);
      console.log(`✅ [Cards JSON] Zod 검증 성공 - ${validated.cards.length}개 카드`);
      return validated.cards;
    } catch (zodError) {
      console.log('⚠️ [Cards JSON] Zod 검증 실패, 호환성 파싱 시도...');
    }

    // 다양한 JSON 구조 지원 (기존 로직 유지)
    let cards: any[] = [];

    if (parsed.cards && Array.isArray(parsed.cards)) {
      cards = parsed.cards;
      console.log(`✅ [Cards JSON] 1차 파싱 성공 (cards 구조) - ${cards.length}개 카드`);
    } else if (parsed.solution && parsed.solution.cards && Array.isArray(parsed.solution.cards)) {
      cards = parsed.solution.cards;
      console.log(`✅ [Cards JSON] 1차 파싱 성공 (solution.cards 구조) - ${cards.length}개 카드`);
    } else if (parsed.result && parsed.result.cards && Array.isArray(parsed.result.cards)) {
      cards = parsed.result.cards;
      console.log(`✅ [Cards JSON] 1차 파싱 성공 (result.cards 구조) - ${cards.length}개 카드`);
    } else if (parsed.data && parsed.data.cards && Array.isArray(parsed.data.cards)) {
      cards = parsed.data.cards;
      console.log(`✅ [Cards JSON] 1차 파싱 성공 (data.cards 구조) - ${cards.length}개 카드`);
    } else if (Array.isArray(parsed)) {
      cards = parsed;
      console.log(`✅ [Cards JSON] 1차 파싱 성공 (배열 구조) - ${cards.length}개 카드`);
    } else {
      // 최후의 수단: solution.steps를 cards로 변환 시도
      if (parsed.solution && parsed.solution.steps && Array.isArray(parsed.solution.steps)) {
        console.log(`🔄 [Cards JSON] solution.steps를 cards로 변환 시도`);
        cards = [
          {
            type: 'flow',
            title: parsed.solution.title || '자동화 가이드',
            content: parsed.solution.description || '',
            description: parsed.solution.description || '',
            steps: parsed.solution.steps,
            status: 'converted',
          },
        ];
        console.log(`✅ [Cards JSON] solution.steps 변환 성공 - ${cards.length}개 카드`);
      } else {
        console.log(`⚠️ [Cards JSON] 1차 파싱 성공하지만 cards 배열 없음`);
        console.log(`🔍 [Cards JSON] JSON 구조:`, Object.keys(parsed));
        console.log(
          `🔍 [Cards JSON] 전체 내용 (첫 500자):`,
          JSON.stringify(parsed).substring(0, 500)
        );
      }
    }

    return cards;
  } catch (firstError) {
    console.log('🔄 [Cards JSON] 1차 파싱 실패, Self-Heal 시도...');
    console.log(
      `🔍 [Cards JSON] 1차 에러: ${firstError instanceof Error ? firstError.message : String(firstError)}`
    );

    // 🚑 Self-Heal 시도
    const healedCards = await selfHealJSON(content, '자동화 카드 생성');
    if (healedCards.length > 0) {
      return healedCards;
    }

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
        console.log('🔧 [Cards JSON] 마크다운 블록 제거 완료');
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

      cleanContent = cleanContent
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,(\s*[}\]])/g, '$1')
        .trim();

      console.log(`🔍 [Cards JSON] 정리 후 첫 100자: ${cleanContent.substring(0, 100)}`);
      console.log(
        `🔍 [Cards JSON] 정리 후 마지막 100자: ${cleanContent.substring(cleanContent.length - 100)}`
      );

      const parsed = JSON.parse(cleanContent);

      // 2차 파싱에서도 다양한 구조 지원 (강화된 버전)
      let cards: any[] = [];

      if (parsed.cards && Array.isArray(parsed.cards)) {
        cards = parsed.cards;
        console.log(`✅ [Cards JSON] 2차 파싱 성공 (cards 구조) - ${cards.length}개 카드`);
      } else if (parsed.solution && parsed.solution.cards && Array.isArray(parsed.solution.cards)) {
        cards = parsed.solution.cards;
        console.log(`✅ [Cards JSON] 2차 파싱 성공 (solution.cards 구조) - ${cards.length}개 카드`);
      } else if (parsed.result && parsed.result.cards && Array.isArray(parsed.result.cards)) {
        cards = parsed.result.cards;
        console.log(`✅ [Cards JSON] 2차 파싱 성공 (result.cards 구조) - ${cards.length}개 카드`);
      } else if (parsed.data && parsed.data.cards && Array.isArray(parsed.data.cards)) {
        cards = parsed.data.cards;
        console.log(`✅ [Cards JSON] 2차 파싱 성공 (data.cards 구조) - ${cards.length}개 카드`);
      } else if (Array.isArray(parsed)) {
        cards = parsed;
        console.log(`✅ [Cards JSON] 2차 파싱 성공 (배열 구조) - ${cards.length}개 카드`);
      } else {
        // 최후의 수단: solution.steps를 cards로 변환 시도
        if (parsed.solution && parsed.solution.steps && Array.isArray(parsed.solution.steps)) {
          console.log(`🔄 [Cards JSON] 2차 파싱에서 solution.steps를 cards로 변환 시도`);
          cards = [
            {
              type: 'flow',
              title: parsed.solution.title || '자동화 가이드',
              content: parsed.solution.description || '',
              description: parsed.solution.description || '',
              steps: parsed.solution.steps,
              status: 'converted',
            },
          ];
          console.log(
            `✅ [Cards JSON] 2차 파싱에서 solution.steps 변환 성공 - ${cards.length}개 카드`
          );
        } else {
          console.log(`⚠️ [Cards JSON] 2차 파싱 성공하지만 cards 배열 없음`);
          console.log(`🔍 [Cards JSON] JSON 구조:`, Object.keys(parsed));
          console.log(
            `🔍 [Cards JSON] 전체 내용 (첫 500자):`,
            JSON.stringify(parsed).substring(0, 500)
          );
        }
      }

      return cards;
    } catch (secondError) {
      console.log('🔄 [Cards JSON] 2차 파싱 실패, 3차 복구 시도...');
      console.log(
        `🔍 [Cards JSON] 2차 에러: ${secondError instanceof Error ? secondError.message : String(secondError)}`
      );

      try {
        // 3차 시도: JSON 복구 (Unterminated string 등의 문제 해결)
        // 다시 원본에서 시작해서 강화된 정리 수행
        let repairContent = content;

        // 마크다운 블록 제거 (3차)
        if (content.includes('```json')) {
          const jsonStart = content.indexOf('```json');
          const afterJsonTag = jsonStart + 7;

          let startIndex = afterJsonTag;
          if (content.charAt(startIndex) === '\n') {
            startIndex++;
          }

          const endIndex = content.indexOf('```', afterJsonTag);
          if (endIndex !== -1) {
            repairContent = content.substring(startIndex, endIndex).trim();
          } else {
            repairContent = content.substring(startIndex).trim();
          }
        } else if (content.includes('```')) {
          const startIndex = content.indexOf('```') + 3;
          let actualStart = startIndex;
          if (content.charAt(actualStart) === '\n') {
            actualStart++;
          }
          const endIndex = content.indexOf('```', startIndex);
          if (endIndex !== -1) {
            repairContent = content.substring(actualStart, endIndex).trim();
          }
        }

        // Unterminated string 문제 해결
        if (secondError instanceof Error && secondError.message.includes('Unterminated string')) {
          console.log('🔧 [Cards JSON] Unterminated string 복구 시도');

          // 마지막 완전한 객체나 배열까지만 잘라내기
          const lastCompleteIndex = findLastCompleteJson(repairContent);
          if (lastCompleteIndex > 0) {
            repairContent = repairContent.substring(0, lastCompleteIndex);
            console.log(`🔧 [Cards JSON] JSON을 ${lastCompleteIndex}자까지 자름`);
          }
        }

        // 기본적인 JSON 복구 시도
        repairContent = repairContent
          .replace(/,(\s*[}\]])/g, '$1') // trailing comma 제거
          .replace(/\n/g, '\\n') // 줄바꿈 처리
          .trim();

        // 🔧 강화된 JSON 복구 로직
        // 1. expansion 카드의 복잡한 구조 단순화
        if (repairContent.includes('"expansion"') && repairContent.includes('"ideas":[')) {
          console.log('🔧 [Cards JSON] expansion 카드 복구 시도');
          
          // expansion 카드의 ideas 배열 부분을 단순화
          const expansionStart = repairContent.indexOf('"type":"expansion"');
          if (expansionStart !== -1) {
            const afterExpansion = repairContent.substring(expansionStart);
            const expansionEnd = afterExpansion.indexOf('}]}') + expansionStart;
            
            if (expansionEnd > expansionStart) {
              // expansion 카드를 단순한 형태로 교체
              const simpleExpansion = `{"type":"expansion","title":"🌱 확장 아이디어","content":"추가 기능과 확장 가능성을 탐색할 수 있습니다."}`;
              repairContent = repairContent.substring(0, expansionStart) + simpleExpansion + repairContent.substring(expansionEnd + 3);
              console.log('🔧 [Cards JSON] expansion 카드 단순화 완료');
            }
          }
        }

        // 2. 기본적인 괄호 복구
        if (!repairContent.endsWith('}') && !repairContent.endsWith(']')) {
          if (repairContent.includes('"cards":[')) {
            // 열린 괄호의 개수를 세어서 적절히 닫기
            const openBraces = (repairContent.match(/\{/g) || []).length;
            const closeBraces = (repairContent.match(/\}/g) || []).length;
            const openBrackets = (repairContent.match(/\[/g) || []).length;
            const closeBrackets = (repairContent.match(/\]/g) || []).length;
            
            let closingNeeded = '';
            
            // 배열이 먼저 닫혀야 하는 경우
            if (openBrackets > closeBrackets) {
              closingNeeded += ']';
            }
            
            // 객체가 닫혀야 하는 경우  
            if (openBraces > closeBraces) {
              closingNeeded += '}';
            }
            
            if (closingNeeded) {
              repairContent += closingNeeded;
              console.log(`🔧 [Cards JSON] 누락된 ${closingNeeded} 추가`);
            }
          }
        }

        const parsed = JSON.parse(repairContent);
        console.log('✅ [Cards JSON] 3차 복구 성공');

        // 복구된 데이터에서 cards 추출
        let cards: any[] = [];
        if (parsed.cards && Array.isArray(parsed.cards)) {
          cards = parsed.cards;
        } else if (Array.isArray(parsed)) {
          cards = parsed;
        }

        console.log(`✅ [Cards JSON] 복구 완료 - ${cards.length}개 카드`);
        return cards;
      } catch (thirdError) {
        console.error('❌ [Cards JSON] 3차 복구도 실패, 기본 카드 반환');
        console.log(
          `🔍 [Cards JSON] 3차 에러: ${thirdError instanceof Error ? thirdError.message : String(thirdError)}`
        );

        // 디버깅용 원본 내용 출력
        console.log(`🔍 [Cards JSON] 원본 첫 200자: ${content.substring(0, 200)}`);
        console.log(
          `🔍 [Cards JSON] 원본 마지막 200자: ${content.substring(content.length - 200)}`
        );

        return [];
      }
    }
  }
}

/**
 * JSON에서 마지막으로 완전한 구조가 끝나는 위치 찾기
 */
function findLastCompleteJson(content: string): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let lastCompleteIndex = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{' || char === '[') {
      depth++;
    } else if (char === '}' || char === ']') {
      depth--;
      if (depth === 0) {
        lastCompleteIndex = i + 1;
      }
    }
  }

  return lastCompleteIndex;
}

function calculateCost(tokens: number, model: string): number {
  // OpenAI 실제 가격 ($/1M tokens)를 토큰당 가격으로 변환
  const costs = {
    'gpt-4o-mini': 0.150 / 1000000,        // $0.150/1M tokens
    'gpt-4o-2024-11-20': 2.50 / 1000000,   // $2.50/1M tokens  
    'gpt-4o': 2.50 / 1000000,              // $2.50/1M tokens
    'gpt-3.5-turbo': 0.50 / 1000000,       // $0.50/1M tokens
  };

  return tokens * (costs[model as keyof typeof costs] || 2.50 / 1000000);
}
function getFallbackCards(userInput: string): any[] {
  return [
    {
      type: 'needs_analysis',
      title: '🎯 기본 니즈 분석',
      surfaceRequest: userInput,
      realNeed: '사용자 요청에 대한 기본적인 자동화 솔루션',
      recommendedLevel: '반자동',
      status: 'fallback',
    },
    {
      type: 'flow',
      title: '🚀 기본 자동화 플로우',
      subtitle: '기본적인 단계별 가이드',
      steps: [
        {
          id: '1',
          title: '첫 번째 단계',
          subtitle: '기본 설정',
        },
        {
          id: '2',
          title: '두 번째 단계',
          subtitle: '실행',
        },
        {
          id: '3',
          title: '세 번째 단계',
          subtitle: '완료',
        },
      ],
      status: 'fallback',
    },
  ];
}

/**
 * Step B 검증 결과를 기반으로 동적 단계 생성
 */
async function generateDynamicStepsFromValidation(
  userInput: string,
  followupAnswers: any,
  ragMetadata: any
): Promise<string[]> {
  console.log('🎯 [동적 생성] Step B 검증 결과 기반 단계 생성 시작...');
  
  const blueprint = await BlueprintReader.read('orchestrator/step_c_wow.md');
  
  const dynamicPrompt = `${blueprint}

🚨 **Step B 검증 결과 기반 동적 단계 생성**

사용자 요청: "${userInput}"
후속답변: ${JSON.stringify(followupAnswers || {})}

Step B 검증 결과:
- 검증된 방법: ${ragMetadata?.methodValidation?.viableMethods || 0}개
- 대안 방법: ${ragMetadata?.methodValidation?.alternativesFound || 0}개
- RAG 컨텍스트: ${ragMetadata?.ragContextLength || 0}자

🎯 **절대 원칙**:
- 현실적으로 실행 가능한 방법만 제시
- Facebook API, Instagram API 직접 연동 금지
- 대신 Google Alert, RSS 피드, 웹 스크래핑 등 현실적 대안 사용
- 단계 수: 3-7개 사이에서 자유롭게 조정
- 각 단계는 "X단계: [도구명] [구체적 작업]" 형식

현재 요청에 맞는 현실적이고 실행 가능한 단계들만 생성하세요.

응답 형식: ["1단계: ...", "2단계: ...", ...]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '현실적 자동화 단계 생성 전문가입니다. 사용자가 실제로 실행할 수 있는 방법만 제시하세요.' },
        { role: 'user', content: dynamicPrompt },
      ],
      max_tokens: 800,
      temperature: 0.1, // 🔥 JSON 안정성 강화
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return getDefaultSteps(userInput);

    // JSON 배열 파싱 시도
    try {
      const stepsArray = JSON.parse(content);
      if (Array.isArray(stepsArray) && stepsArray.length > 0) {
        console.log(`✅ [동적 생성] ${stepsArray.length}개 단계 생성 성공`);
        return stepsArray;
      }
    } catch {
      // JSON 파싱 실패시 텍스트에서 단계 추출
      const steps = content.split('\n')
        .filter(line => /^\d+단계:/.test(line.trim()))
        .map(line => line.trim());
      
      if (steps.length > 0) {
        console.log(`✅ [동적 생성] 텍스트 파싱으로 ${steps.length}개 단계 추출`);
        return steps;
      }
    }
  } catch (error) {
    console.error('❌ [동적 생성] 오류:', error);
  }

  return getDefaultSteps(userInput);
}

/**
 * 🧠 완전 동적 도메인 분석 (GPT 기반, 하드코딩 제거)
 */
async function analyzeDomainAndGenerateAlternatives(
  userInput: string,
  followupAnswers: any
): Promise<{
  domain: string;
  purpose: string;
  preferredApproach: string;
  alternatives: Array<{approach: string, tool: string, viability: string}>;
  verifiedTools: Array<{name: string, reason: string}>;
  domainRules: string[];
}> {
  console.log('🧠 [완전 동적] GPT에게 도메인 분석 및 대안 생성 요청...');
  
  const dynamicAnalysisPrompt = `Claude처럼 현실적이고 실행 가능한 솔루션만 제시하세요.

사용자 요청: "${userInput}"
후속답변: ${JSON.stringify(followupAnswers || {})}

🔍 **현실성 체크 (필수):**
- 대부분의 웹사이트에 RSS 피드가 없다면 → 브라우저 확장프로그램, 웹스크래핑 대안 제시
- API가 개인계정에서 지원 안된다면 → 공식 도구, 반자동화 방법 제시  
- 복잡한 개발이 필요하다면 → 노코드 도구, 기존 서비스 활용 제시

⚠️ **절대 금지:**
- 존재하지 않는 RSS 피드 가정
- 개인계정에서 지원 안되는 API 직접 연동
- 초보자가 실행 불가능한 복잡한 방법

🧠 **동적 위험성 감지 원칙**:
- 개인정보/금융 데이터 접근시 → 법적 제약 검토
- 소셜미디어 + 자동화 → API 정책 변경 확인  
- 의료/증권 + 자동연동 → 규제 준수 여부 검증
- 웹사이트 + 크롤링 → 이용약관 위반 가능성 체크

✅ **권장 접근법**:
- 공식 API 활용
- Google Apps Script, IFTTT 등 신뢰성 있는 도구
- RSS 피드, 웹훅 등 표준 방식
- 반자동화 (사람 + AI 조합)

다음 JSON 형식으로 응답하세요 (단순하고 확실한 정보만):
{
  "domain": "구체적인 도메인명",
  "preferredApproach": "가장 현실적이고 실행 가능한 접근 방법",
  "alternatives": [
    {"approach": "브라우저 확장프로그램 활용", "tool": "Visualping", "viability": "높음"},
    {"approach": "웹스크래핑 + 알림", "tool": "Google Apps Script", "viability": "중간"}
  ],
  "verifiedTools": [
    {"name": "실제로 작동하는 도구명", "reason": "2025년 현재 지원 확인됨"}
  ],
  "confidence": "high|medium|low",
  "warnings": ["RSS 피드 없을 경우 대안 필요", "수동 설정 단계 포함"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20', // Claude 방식 구현에는 더 강력한 모델 필요
      messages: [
        { 
          role: 'system', 
          content: `당신은 Claude처럼 신중하고 정확한 AI입니다. 다음 원칙을 따르세요:

🧠 **Claude의 사고 방식:**
1. 단계별로 천천히 생각하기
2. 확실하지 않으면 솔직히 말하기  
3. 다양한 관점에서 검토하기
4. 안전성을 최우선으로 고려하기
5. 사용자에게 정말 도움이 되는지 고민하기

🛡️ **안전성 우선 원칙:**
- 의심스러우면 보수적으로 판단
- 개인정보/금융/의료는 특히 신중하게
- 불가능한 것을 가능하다고 절대 말하지 않기
- 위험한 자동화는 대안 제시

🎯 **품질 우선 원칙:**  
- "될 것 같다"가 아닌 "확실히 된다"만 제시
- 초보자도 100% 따라할 수 있는 방법만
- 무료 도구 우선, 유료는 명시` 
        },
        { role: 'user', content: dynamicAnalysisPrompt }
      ],
      max_tokens: 2000, // Claude 방식에는 더 많은 토큰 필요
      temperature: 0.2, // 더 결정적으로
      response_format: { type: 'json_object' }
    });

    let analysisResult;
    try {
      analysisResult = JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (parseError) {
      console.error('❌ [Claude 방식] JSON 파싱 실패:', parseError);
      console.log('📝 [Claude 방식] 원본 응답:', response.choices[0]?.message?.content?.substring(0, 500));
      
      // 폴백: 기본 구조로 처리
      analysisResult = {
        domain: '일반 자동화',
        purpose: '업무 효율화',
        preferredApproach: '단계별 자동화',
        alternatives: [],
        verifiedTools: [],
        domainRules: [],
        confidence: 'low',
        warnings: ['JSON 파싱 실패로 기본값 사용']
      };
    }
    
    // Claude 방식 분석 결과 로깅
    console.log('🧠 [Claude 방식 분석 결과]:');
    console.log('🎯 도메인:', analysisResult.domain);
    console.log('🔧 접근법:', analysisResult.preferredApproach);
    console.log('📊 대안 수:', analysisResult.alternatives?.length || 0);
    console.log(`🎯 신뢰도: ${analysisResult.confidence || 'unknown'}`);
    if (analysisResult.warnings?.length > 0) {
      console.log('⚠️ 주의사항:', analysisResult.warnings);
    }
    if (analysisResult.verifiedTools?.length > 0) {
      console.log('🛠️ 검증된 도구들:', analysisResult.verifiedTools.map((t: any) => t.name).join(', '));
    }
    
    console.log(`✅ [완전 동적] ${analysisResult.domain} 도메인 분석 완료 - ${analysisResult.alternatives?.length || 0}개 대안 발견`);
    
    return {
      domain: analysisResult.domain || '일반 자동화',
      purpose: analysisResult.purpose || '업무 효율화',
      preferredApproach: analysisResult.preferredApproach || '단계별 자동화',
      alternatives: analysisResult.alternatives || [],
      verifiedTools: analysisResult.verifiedTools || [],
      domainRules: analysisResult.domainRules || []
    };
    
  } catch (error) {
    console.error('❌ [완전 동적] GPT 도메인 분석 실패:', error);
    
    // 🛡️ 안전한 폴백 (최소한의 기본값)
    return {
      domain: '일반 업무 자동화',
      purpose: '반복 업무의 효율화',
      preferredApproach: '단계별 점진적 자동화',
      alternatives: [
        { approach: 'Google Apps Script 활용', tool: 'Google Apps Script', viability: '무료, 안정적' },
        { approach: 'IFTTT 간단 연동', tool: 'IFTTT', viability: '무료, 제한적' },
        { approach: 'Zapier 워크플로우', tool: 'Zapier', viability: '유료, 강력' }
      ],
      verifiedTools: [
        { name: 'Google Apps Script', reason: '무료, 다양한 Google 서비스 연동' },
        { name: 'IFTTT', reason: '간단한 트리거-액션 자동화' }
      ],
      domainRules: [
        '- 개인정보 보호 준수',
        '- 무료 도구 우선 검토',
        '- 단계별 구현으로 위험 최소화'
      ]
    };
  }
}

/**
 * 현실적 대안 단계 동적 생성
 */
async function generateRealisticAlternativeSteps(
  userInput: string,
  followupAnswers: any
): Promise<string[]> {
  console.log('🧠 [AI 대안 생성] 사용자 요청에 맞는 현실적 대안을 AI처럼 동적 분석...');
  
  // 🔍 Step 1: 사용자 요청 도메인 분석 (GPT 기반 완전 동적)
  const domainAnalysis = await analyzeDomainAndGenerateAlternatives(userInput, followupAnswers);
  console.log(`🎯 [도메인 분석] ${domainAnalysis.domain} 영역으로 판단 - ${domainAnalysis.alternatives.length}개 대안 방법 식별`);
  
  const blueprint = await BlueprintReader.read('orchestrator/step_c_wow.md');
  
  const smartAlternativePrompt = `${blueprint}

🚨 **AI 기반 현실적 대안 방법 생성**

사용자 요청: "${userInput}"
후속답변: ${JSON.stringify(followupAnswers || {})}

🧠 **AI 도메인 분석 결과**:
- 도메인: ${domainAnalysis.domain}
- 핵심 목적: ${domainAnalysis.purpose}
- 추천 접근법: ${domainAnalysis.preferredApproach}

🎯 **해당 도메인 맞춤 현실적 방법들**:
${domainAnalysis.alternatives.map((alt, i) => `${i+1}. ${alt.approach} (${alt.tool})`).join('\n')}

🛡️ **현실성 검증 완료된 도구들**:
${domainAnalysis.verifiedTools.map(tool => `- ${tool.name}: ${tool.reason}`).join('\n')}

🎯 **절대 원칙 (도메인별 맞춤)**:
${domainAnalysis.domainRules.join('\n')}

현재 요청에 가장 적합한 현실적 방법 하나를 선택하여 3-6단계로 구체화하세요.
선택 근거와 함께 실행 가능한 단계들로 구성하세요.

응답 형식: ["1단계: ...", "2단계: ...", ...]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20', // Claude 방식 대안 생성에는 강력한 모델 필요
      messages: [
        { 
          role: 'system', 
          content: `당신은 Claude처럼 신중하고 현실적인 대안을 제시하는 AI입니다.
          
🧠 Claude의 대안 탐색 방식:
1. 불가능한 이유를 정확히 이해
2. 사용자의 진짜 목적을 파악  
3. 여러 각도에서 우회방법 고민
4. 안전하고 현실적인 방법만 제시
5. 초보자도 실행 가능한 수준으로` 
        },
        { role: 'user', content: smartAlternativePrompt },
      ],
      max_tokens: 800,
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return getDefaultSteps(userInput);

    // JSON 배열 파싱 시도
    try {
      const stepsArray = JSON.parse(content);
      if (Array.isArray(stepsArray) && stepsArray.length > 0) {
        console.log(`✅ [현실적 대안] ${stepsArray.length}개 대안 단계 생성 성공`);
        return stepsArray;
      }
    } catch {
      // JSON 파싱 실패시 텍스트에서 단계 추출
      const steps = content.split('\n')
        .filter(line => /^\d+단계:/.test(line.trim()))
        .map(line => line.trim());
      
      if (steps.length > 0) {
        console.log(`✅ [현실적 대안] 텍스트 파싱으로 ${steps.length}개 단계 추출`);
        return steps;
      }
    }
  } catch (error) {
    console.error('❌ [현실적 대안] 오류:', error);
  }

  return getDefaultSteps(userInput);
}

/**
 * 🔍 AI 기반 결과 검증 시스템
 */
async function validateAutomationResult(
  cards: any[], 
  userInput: string, 
  followupAnswers: any
): Promise<{
  isValid: boolean;
  qualityScore: number;
  issues: string[];
  canRetry: boolean;
  suggestions: string[];
}> {
  if (!cards || cards.length === 0) {
    return {
      isValid: false,
      qualityScore: 0,
      issues: ['카드가 생성되지 않음'],
      canRetry: true,
      suggestions: ['Step C 재실행 필요']
    };
  }

  const issues: string[] = [];
  const suggestions: string[] = [];
  let qualityScore = 100;

  // 🚨 1. 명백한 실패 패턴 검사 (휴리스틱)
  const guideCard = cards.find(card => card.type === 'guide');
  if (guideCard?.detailedSteps) {
    const allStepContent = JSON.stringify(guideCard.detailedSteps);
    
    // 치명적 패턴들 (2025년 한국 현실 반영)
    const criticalPatterns = [
      { pattern: /Math\.random|여기에.*추가|TODO|FIXME/i, issue: '미완성 코드 또는 플레이스홀더 발견', severity: 30 },
      { pattern: /크롤링|crawling|스크래핑|scraping/i, issue: '크롤링 기반 솔루션 (법적 위험)', severity: 25 },
      
      // 🚨 한국 플랫폼 특화 패턴들
      { pattern: /네이버.*카페.*API|카페.*API.*네이버/i, issue: '네이버 카페 API 없음 (공식 지원 안함)', severity: 30 },
      { pattern: /카카오톡.*개인|개인.*카톡|카톡.*자동화/i, issue: '카카오톡 개인 API 사용 (2022년부터 불가)', severity: 25 },
      { pattern: /네이버.*메일.*API|네이버메일.*연동/i, issue: '네이버메일 API 제한적 (Gmail 대안 필요)', severity: 20 },
      { pattern: /네이버.*블로그.*자동.*등록|자동.*포스팅.*네이버/i, issue: '네이버 블로그 자동 포스팅 (스팸 정책 위반)', severity: 25 },
      { pattern: /다음.*카페|다음카페.*API/i, issue: '다음 카페 API 없음 (서비스 축소)', severity: 20 },
      
      // 🚨 글로벌 플랫폼 2024-2025 변경사항
      { pattern: /Facebook.*API.*개인|개인.*Facebook.*API/i, issue: 'Facebook 개인 API 직접 접근 (권한 문제)', severity: 20 },
      { pattern: /LinkedIn.*API.*개인|개인.*LinkedIn.*API/i, issue: 'LinkedIn 개인 API 직접 접근 (불가능)', severity: 20 },
      { pattern: /인스타그램.*자동.*댓글|Instagram.*auto.*comment/i, issue: '인스타그램 자동 댓글 (계정 차단 위험)', severity: 25 },
      { pattern: /트위터.*API.*무료|Twitter.*API.*free/i, issue: 'Twitter API 무료 플랜 대폭 축소 (2023년부터)', severity: 20 },
      
      // 🚨 한국 특화 법적/정책 이슈
      { pattern: /부동산.*크롤링|부동산.*수집|직방.*API/i, issue: '부동산 사이트 크롤링 (대부분 이용약관 위반)', severity: 25 },
      { pattern: /개인정보.*자동.*수집|자동.*개인정보/i, issue: '개인정보 자동 수집 (개인정보보호법 위반 위험)', severity: 30 }
    ];

    criticalPatterns.forEach(({ pattern, issue, severity }) => {
      if (pattern.test(allStepContent)) {
        issues.push(issue);
        qualityScore -= severity;
      }
    });

    // 품질 지표 검사
    const qualityChecks = [
      { 
        test: () => guideCard.detailedSteps.length < 3, 
        issue: '단계가 너무 적음 (3단계 미만)', 
        suggestion: '더 세부적인 단계로 분할 필요',
        severity: 15 
      },
      { 
        test: () => guideCard.detailedSteps.some((step: any) => !step.title || step.title.length < 10), 
        issue: '단계 제목이 너무 간략함', 
        suggestion: '각 단계별 구체적인 작업 명시 필요',
        severity: 10 
      },
      { 
        test: () => !allStepContent.match(/(Google|Excel|API|Apps Script|Zapier|IFTTT)/i), 
        issue: '구체적인 도구명이 없음', 
        suggestion: '실제 사용 가능한 도구명 포함 필요',
        severity: 20 
      }
    ];

    qualityChecks.forEach(({ test, issue, suggestion, severity }) => {
      if (test()) {
        issues.push(issue);
        suggestions.push(suggestion);
        qualityScore -= severity;
      }
    });
  }

  // 🧠 2. AI 기반 맥락 검증 (복잡한 패턴)
  if (issues.length > 0) {
    try {
      const contextValidationPrompt = `
다음 자동화 솔루션을 검토하고 현실성을 평가해주세요:

**사용자 요청**: "${userInput}"
**발견된 이슈들**: ${issues.join(', ')}
**솔루션 내용**: ${JSON.stringify(guideCard?.detailedSteps?.slice(0, 3), null, 2)}

**평가 기준**:
1. 2025년 현재 실제로 구현 가능한가?
2. 개인 개발자가 접근 가능한 API/도구인가?
3. 법적/윤리적 문제가 없는가?
4. 초보자도 따라할 수 있을 정도로 구체적인가?

**응답 형식 (JSON)**:
{
  "isRealistic": true/false,
  "confidence": 0-100,
  "mainProblems": ["문제1", "문제2"],
  "quickFixes": ["수정방안1", "수정방안2"],
  "overallAssessment": "한줄 평가"
}`;

      const aiValidation = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // 검증용이므로 mini로 충분
        messages: [
          { 
            role: 'system', 
            content: '당신은 자동화 솔루션의 현실성을 검증하는 전문가입니다. 특히 불가능한 API 접근, 법적 문제, 실행 불가능한 단계들을 정확히 식별합니다.' 
          },
          { role: 'user', content: contextValidationPrompt }
        ],
        max_tokens: 500,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const aiResult = JSON.parse(aiValidation.choices[0]?.message?.content || '{}');
      
      if (!aiResult.isRealistic) {
        qualityScore -= 30;
        issues.push(...(aiResult.mainProblems || []));
        suggestions.push(...(aiResult.quickFixes || []));
      }

      console.log(`🧠 [AI 검증] 현실성: ${aiResult.isRealistic}, 신뢰도: ${aiResult.confidence}%`);
      if (aiResult.overallAssessment) {
        console.log(`💬 [AI 평가] ${aiResult.overallAssessment}`);
      }

    } catch (error) {
      console.warn('⚠️ [AI 검증] AI 기반 검증 실패:', error);
      qualityScore -= 5; // AI 검증 실패는 약간의 점수 차감
    }
  }

  const isValid = qualityScore >= 60 && issues.length <= 2;
  const canRetry = qualityScore < 60 && issues.length <= 5; // 너무 많은 문제가 있으면 재시도 불가

  return {
    isValid,
    qualityScore: Math.max(0, qualityScore),
    issues,
    canRetry,
    suggestions
  };
}

/**
 * 기본 단계 생성 (최후 수단)
 */
function getDefaultSteps(userInput: string): string[] {
  console.log('⚠️ [기본 단계] 최후 수단 기본 단계 생성');
  
  // 요청 분석해서 기본적인 현실적 단계 제공
  if (userInput.includes('분석') || userInput.includes('보고서')) {
    return [
      "1단계: Google Data Studio 계정 생성 및 기본 설정",
      "2단계: 데이터 소스 수동 업로드 또는 Google Sheets 연동",
      "3단계: 시각화 대시보드 생성 및 차트 구성",
      "4단계: 자동 새로고침 및 공유 설정"
    ];
  } else if (userInput.includes('알림') || userInput.includes('모니터링')) {
    return [
      "1단계: Google Alert 키워드 설정 및 RSS 피드 생성",
      "2단계: IFTTT 계정 생성 및 RSS 트리거 설정",
      "3단계: Slack Webhook URL 생성 및 연동",
      "4단계: 알림 테스트 및 주기 설정"
    ];
  } else {
    return [
      "1단계: Google Apps Script 프로젝트 생성",
      "2단계: 데이터 수집 및 처리 스크립트 작성",
      "3단계: 결과 저장 및 알림 기능 구현",
      "4단계: 자동 실행 트리거 설정"
    ];
  }
}
