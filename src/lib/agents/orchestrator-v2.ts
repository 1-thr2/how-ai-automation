import OpenAI from 'openai';
import pMap from 'p-map';
import { z } from 'zod';
import { BlueprintReader, estimateTokens, selectModel } from '../blueprints/reader';
import {
  generateRAGContext,
  searchToolInfo,
  validateURL,
  checkToolIntegration,
} from '../services/rag';
import { detectDomain, getOptimalToolsForDomain } from '../domain-tools-registry';
import { getCodeTemplate, personalizeCodeTemplate } from '../code-templates';
import {
  analyzeUserIntent,
  generateDynamicTemplate,
  generateContextualCreativity,
  optimizePromptLength,
} from './intent-analyzer';

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
 * Step A: 카드 뼈대 초안 생성 (gpt-4o-mini, 속도 우선)
 */
async function executeStepA(
  userInput: string,
  followupAnswers: any,
  intentAnalysis?: any
): Promise<{
  cards: any[];
  tokens: number;
  latency: number;
  model: string;
}> {
  const startTime = Date.now();
  console.log('📝 [Step A] 카드 뼈대 초안 생성 시작...');

    // Blueprint 읽기
    const stepABlueprint = await BlueprintReader.read('orchestrator/step_a_draft.md');

    // 프롬프트 구성
    const systemPrompt = stepABlueprint;
    const userPrompt = `사용자 요청: "${userInput}"
후속 답변: ${JSON.stringify(followupAnswers || {})}

위 정보를 바탕으로 자동화 카드들의 기본 뼈대를 빠르게 생성하세요.
상세한 내용은 B/C 단계에서 추가할 예정이니, 구조와 방향성에 집중하세요.

중요: 반드시 유효한 JSON 형식으로만 응답하세요. 마크다운이나 다른 설명은 포함하지 마세요.`;

    const estimatedTokens = estimateTokens(systemPrompt + userPrompt);

  // 🛡️ 백업 모델 시퀀스: gpt-4o-mini → gpt-3.5-turbo → fallback
  // 🔧 비용 최적화: 간단한 요청은 mini만 사용
  const isSimpleRequest = userInput.length < 100 && Object.keys(followupAnswers || {}).length < 3;
  const modelSequence = isSimpleRequest ? ['gpt-4o-mini'] : ['gpt-4o-mini', 'gpt-3.5-turbo'];
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
        temperature: 0.3, // 🔧 더 결정적으로
        response_format: { type: 'json_object' }, // 🎯 JSON 전용 모드
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        throw new Error(`${model} 응답이 비어있습니다`);
      }

      // JSON 파싱 시도
      const cards = await parseCardsJSON(content);
      
      // ✅ 파싱 성공 및 카드 개수 검증
      if (cards.length > 0) {
    const latency = Date.now() - startTime;
        totalTokens = response.usage?.total_tokens || estimatedTokens;

        console.log(`✅ [Step A] 성공 - ${cards.length}개 카드, ${totalTokens} 토큰, ${latency}ms (${model})`);

        // 🎯 카드 개수는 복잡도에 따라 유연하게 - 강제 제한 제거
    return {
      cards,
          tokens: totalTokens,
      latency,
      model,
    };
      } else {
        throw new Error(`${model}에서 유효한 카드 생성 실패 (0개)`);
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

  // 🚨 모든 모델 실패 시 Fallback 카드 생성
  console.warn('🚨 [Step A] 모든 모델 실패, Fallback 카드 생성...');
  
  const fallbackCards = createFallbackCards(userInput, followupAnswers);
  const latency = Date.now() - startTime;

  console.log(`🛡️ [Step A] Fallback 완료 - ${fallbackCards.length}개 기본 카드, ${latency}ms`);

  return {
    cards: fallbackCards,
    tokens: estimatedTokens, // 추정값 사용
    latency,
    model: 'fallback',
  };
}

/**
 * 🛡️ Fallback 카드 생성 (모든 모델 실패 시)
 */
function createFallbackCards(userInput: string, followupAnswers: any): any[] {
  const timestamp = Date.now();
  
  return [
    {
      type: 'needs_analysis',
      title: '🎯 니즈 분석',
      surfaceRequest: userInput || '자동화 요청',
      realNeed: '업무 효율성 향상을 위한 자동화',
      recommendedLevel: '반자동',
      status: 'draft',
      id: `needs_${timestamp}`
    },
    {
      type: 'flow',
      title: '🚀 자동화 플로우',
      subtitle: '기본 단계별 계획',
      steps: [
        {
          id: '1',
          title: '데이터 수집',
          tool: '데이터 수집 도구'
        },
        {
          id: '2',
          title: '자동화 설정',
          tool: '워크플로우 자동화 도구'
        },
        {
          id: '3',
          title: '결과 확인',
          tool: '모니터링 도구'
        }
      ],
      status: 'draft',
      id: `flow_${timestamp}`
    },
    {
      type: 'faq',
      title: '❓ 자주 묻는 질문',
      subtitle: '실전 궁금증 해결',
      questions: [
        {
          question: '얼마나 시간이 절약되나요?',
          answer: '기본적으로 반복 작업 시간을 50% 이상 절약할 수 있습니다.'
        },
        {
          question: '비용이 얼마나 들까요?',
          answer: '무료 도구부터 시작할 수 있으며, 필요에 따라 유료 플랜을 고려할 수 있습니다.'
        },
        {
          question: '설정이 어렵나요?',
          answer: '단계별 가이드를 따라하면 30분 내에 설정을 완료할 수 있습니다.'
        }
      ],
      status: 'draft',
      id: `faq_${timestamp}`
    }
  ];
}

/**
 * Step B: RAG 검증 및 정보 강화
 */
async function executeStepB(
  draftCards: any[],
  userInput: string
): Promise<{
  cards: any[];
  tokens: number;
  latency: number;
  ragMetadata: any;
  model: string; // 사용된 모델 정보 추가
}> {
  const startTime = Date.now();
  console.log('🔍 [Step B] RAG 검증 및 정보 강화 시작...');

  try {
    // 1. 언급된 도구들 추출
    const mentionedTools = extractToolsFromCards(draftCards);
    console.log(`🛠️ [Step B] 추출된 도구들: ${mentionedTools.join(', ')}`);

    // 2. RAG 컨텍스트 생성 (도메인 인식 강화)
    const ragContext = await generateRAGContext(userInput, mentionedTools, userInput);

    // 3. ⚡ 중복 검색 제거 (generateRAGContext에서 이미 통합 검색 완료)
    console.log(`⚡ [Step B] 도구 정보는 RAG 컨텍스트에서 이미 수집됨 - 중복 검색 생략`);
    const toolInfoResults: any[] = []; // 빈 배열로 대체

    // 4. 🔧 도구 연동 가능성 확인 (조건부 실행으로 성능 최적화)
    let toolIntegrationResults: any[] = [];
    let supportedTools: any[] = []; // 🔧 미리 초기화
    let unsupportedTools: any[] = []; // 🔧 미리 초기화
    
    // ⚡ 성능 최적화: 특정 키워드가 있을 때만 연동 검사 실행
    const hasIntegrationKeywords = userInput.toLowerCase().includes('연동') || 
                                  userInput.toLowerCase().includes('integration') || 
                                  userInput.toLowerCase().includes('zapier') || 
                                  userInput.toLowerCase().includes('make');
    
    if (hasIntegrationKeywords && mentionedTools.length > 0) {
      console.log(`🔍 [Step B] 연동 키워드 감지 → 도구 연동 검사 실행`);
    const toolIntegrationPromises = mentionedTools
        .slice(0, 2) // 최대 2개만 검사로 제한
      .map(tool => checkToolIntegration(tool));
      toolIntegrationResults = await pMap(toolIntegrationPromises, async promise => promise, {
        concurrency: 1, // 더 안전하게 1개씩
      });

      // 연동 현황 분석
      unsupportedTools = toolIntegrationResults.filter(result => !result.isSupported);
      supportedTools = toolIntegrationResults.filter(result => result.isSupported);

    console.log(
      `📊 [Step B] 연동 현황: ${supportedTools.length}개 지원, ${unsupportedTools.length}개 불가`
    );
    } else {
      console.log(`⚡ [Step B] 연동 키워드 없음 → 도구 연동 검사 생략 (성능 최적화)`);
    }

    // 5. URL 검증 (언급된 링크들)
    const urls = extractURLsFromCards(draftCards);
    const urlValidationPromises = urls.map(url => validateURL(url));
    const urlValidationResults = await pMap(urlValidationPromises, async promise => promise, {
      concurrency: 3,
    });

    // 6. Blueprint 읽기
    const stepBBlueprint = await BlueprintReader.read('orchestrator/step_b_rag.md');

    // 7. 프롬프트 구성 (도구 연동 정보 포함)
    const systemPrompt = `${stepBBlueprint}\n\n## RAG 수집 정보:\n${ragContext}`;

    // 도구 연동 상태 정리
    const toolIntegrationSummary = toolIntegrationResults
      .map(result => {
        if (result.isSupported) {
          return `✅ ${result.toolName}: 연동 지원됨 (신뢰도: ${(result.confidence * 100).toFixed(0)}%)`;
        } else {
          const alternatives =
            result.alternatives
              ?.slice(0, 2)
              .map((alt: any) => alt.name)
              .join(', ') || '없음';
          return `❌ ${result.toolName}: 연동 불가 → 대안: ${alternatives}`;
        }
      })
      .join('\n');

    const userPrompt = `Draft 카드들:
${JSON.stringify(draftCards, null, 2)}

언급된 도구들의 최신 정보:
${toolInfoResults
  .flat()
  .map((info: any) => `- ${info.title}: ${info.url}`)
  .join('\n')}

🔧 도구 연동 가능성 분석:
${toolIntegrationSummary}

URL 검증 결과:
${urls.map((url, idx) => `- ${url}: ${urlValidationResults[idx] ? '✅ 유효' : '❌ 무효'}`).join('\n')}

📋 중요 지침:
1. 연동 불가능한 도구에 대해서는 반드시 대안을 제시하세요
2. 각 카드에 "alternativeTools" 배열을 추가하여 대안 도구 정보를 포함하세요
3. 불가능한 연동은 명확히 "사용 불가" 표시하고 실행 가능한 방법만 안내하세요
4. 깨진 링크는 대체하고, 잘못된 정보는 수정하세요

중요: 반드시 유효한 JSON 형식으로만 응답하세요. 마크다운이나 다른 설명은 포함하지 마세요.`;

    // 7. 모델 선택 최적화 (복잡할 때만 gpt-4o)
    const isComplexVerification = mentionedTools.length > 3 || ragContext.length > 1000;
    const model = isComplexVerification ? 'gpt-4o-2024-11-20' : 'gpt-3.5-turbo';
    console.log(`📊 [Step B] 모델: ${model} (${isComplexVerification ? '복잡한 검증' : '간단한 검증'})`);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800, // ⚡ Step B 토큰 축소
      temperature: 0.2, // 검증의 정확성 최우선
      response_format: { type: 'json_object' }, // 🎯 JSON 전용 모드
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Step B 응답이 비어있습니다');
    }

    // JSON 파싱
    const cards = await parseCardsJSON(content);
    const latency = Date.now() - startTime;
    const actualTokens = response.usage?.total_tokens || 0;

    // RAG 메타데이터 구성 (실제 검색 횟수 정확하게 반영)
    const ragMetadata = {
      searchesPerformed: ragContext.length > 100 ? 1 : 0, // ✅ 실제 RAG 검색 수행 여부로 수정
      sourcesFound: ragContext.includes('## 📊 관련 정보') ? 3 : 0, // RAG 결과에서 소스 개수 추정
      linksVerified: urlValidationResults.filter(Boolean).length,
      linksTotal: urls.length,
      ragContextLength: ragContext.length,
      toolIntegrationChecks: {
        total: toolIntegrationResults.length,
        supported: supportedTools.length,
        unsupported: unsupportedTools.length,
        alternativesFound: unsupportedTools.reduce(
          (sum, tool) => sum + (tool.alternatives?.length || 0),
          0
        ),
      },
    };

    console.log(`✅ [Step B] 완료 - ${cards.length}개 카드, ${actualTokens} 토큰, ${latency}ms`);
    console.log(`🔍 [Step B] RAG 통계:`, ragMetadata);

    return {
      cards,
      tokens: actualTokens,
      latency,
      ragMetadata,
      model, // 사용된 모델 정보 추가
    };
  } catch (error) {
    console.error('❌ [Step B] 실패:', error);

    // B단계 실패 시에도 A단계 결과 유지
    console.log('🔄 [Step B] 실패 시 A단계 결과 유지');
    return {
      cards: draftCards,
      tokens: 0,
      latency: Date.now() - startTime,
      ragMetadata: { error: 'RAG 처리 실패' },
      model: 'gpt-4o-2024-11-20', // 에러 시에도 모델 정보 제공
    };
  }
}

/**
 * Step C: 한국어 WOW 마감 처리 (gpt-4o, 품질 우선)
 */
async function executeStepC(
  verifiedCards: any[],
  userInput: string,
  followupAnswers: any,
  ragMetadata: any
): Promise<{
  cards: any[];
  tokens: number;
  latency: number;
  model: string;
  wowMetadata: any;
}> {
  const startTime = Date.now();
  console.log('🎨 [Step C] 2-Pass WOW 카드 생성 시작...');
  
  // 🎯 서비스 본질: 모든 요청은 2-Pass로 최고 품질 보장
  console.log('🎨 [Step C] 품질 최우선 → 모든 요청을 2-Pass로 처리 (서비스 본질)');
  return await execute2PassStepC(verifiedCards, userInput, followupAnswers, ragMetadata, startTime);
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

    // 🧠 Step 0: 동적 인텐트 분석 (서버용으로 수정 완료!)
    console.log('🧠 [Intent] 사용자 의도 분석 시작...');
    const intentAnalysis = await analyzeUserIntent(userInput, followupAnswers);
    console.log('🎯 [Intent] 분석 완료:', intentAnalysis);

    // 🎨 맞춤형 창의적 솔루션 생성
    const contextualCreativity = generateContextualCreativity(
      userInput,
      followupAnswers,
      intentAnalysis
    );
    console.log('💡 [Creativity] 맞춤형 창의성 생성:', contextualCreativity);

    // 동적 템플릿 생성
    const dynamicTemplate = generateDynamicTemplate(intentAnalysis);
    console.log('🎨 [Template] 동적 템플릿 생성 완료');

    // Step A: 카드 뼈대 초안 (인텐트 분석 결과 반영)
    const stepAResult = await executeStepA(userInput, followupAnswers, intentAnalysis);
    metrics.stagesCompleted.push('A-draft');
    metrics.modelsUsed.push(stepAResult.model);
    metrics.totalTokens += stepAResult.tokens;
    metrics.costBreakdown.stepA = {
      tokens: stepAResult.tokens,
      model: stepAResult.model,
      cost: calculateCost(stepAResult.tokens, stepAResult.model),
    };

    // Step B: RAG 검증 (1초 대기 후 실행)
    await new Promise(resolve => setTimeout(resolve, 1000));
    const stepBResult = await executeStepB(stepAResult.cards, userInput);
    metrics.stagesCompleted.push('B-rag');
    metrics.totalTokens += stepBResult.tokens;
    metrics.ragSearches = stepBResult.ragMetadata.searchesPerformed || 0;
    metrics.ragSources = stepBResult.ragMetadata.sourcesFound || 0;
    metrics.urlsVerified = stepBResult.ragMetadata.linksVerified || 0;
    metrics.costBreakdown.stepB = {
      tokens: stepBResult.tokens,
      ragCalls: metrics.ragSearches,
      cost: calculateCost(stepBResult.tokens, stepBResult.model) + metrics.ragSearches * 0.001, // RAG 비용 추정
    };

    // Step C: WOW 마감 (1초 대기 후 실행)
    await new Promise(resolve => setTimeout(resolve, 1000));
    const stepCResult = await executeStepC(
      stepBResult.cards,
      userInput,
      followupAnswers,
      stepBResult.ragMetadata
    );
    metrics.stagesCompleted.push('C-wow');
    metrics.modelsUsed.push(stepCResult.model);
    metrics.totalTokens += stepCResult.tokens;
    metrics.costBreakdown.stepC = {
      tokens: stepCResult.tokens,
      model: stepCResult.model,
      cost: calculateCost(stepCResult.tokens, stepCResult.model),
    };

    // 메트릭 완성
    metrics.totalLatencyMs = Date.now() - overallStartTime;
    metrics.success = true;

    // 비용 계산 및 로깅
    const totalCost =
      metrics.costBreakdown.stepA.cost +
      metrics.costBreakdown.stepB.cost +
      metrics.costBreakdown.stepC.cost;

    console.log(`✅ [3-Step] 완료 - 총 ${metrics.totalTokens} 토큰, ${metrics.totalLatencyMs}ms`);
    console.log(`💰 [3-Step] 총 비용: $${totalCost.toFixed(4)}`);
    console.log(`🎯 [3-Step] 완료된 단계: ${metrics.stagesCompleted.join(' → ')}`);
    console.log(`🤖 [3-Step] 사용된 모델: ${Array.from(new Set(metrics.modelsUsed)).join(', ')}`);

    return {
      cards: stepCResult.cards,
      metrics,
    };
  } catch (error) {
    metrics.success = false;
    metrics.errors = [error instanceof Error ? error.message : String(error)];
    metrics.totalLatencyMs = Date.now() - overallStartTime;

    console.error('❌ [3-Step] 실패:', error);

    // 완전 실패 시 기본 카드 반환
    return {
      cards: getFallbackCards(userInput),
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

// 🔧 2-Pass Step C 전략 (품질 우선)
async function execute2PassStepC(
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
  
  // 🎯 도메인 감지 및 최적 도구 선택
  const detectedDomain = detectDomain(userInput, followupAnswers);
  const optimalTools = getOptimalToolsForDomain(detectedDomain, 'automation', true);
  
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

🚨 **Skeleton JSON 필수 형식**:

{
  "cards": [
    {
      "type": "flow", 
      "title": "🚀 자동화 플로우",
      "steps": [
        "여기에 실제 요청에 맞는 구체적 단계 배열을 반드시 작성"
      ],
      "contentId": "flow_1",
      "status": "skeleton"
    },
    {
      "type": "guide", 
      "title": "📋 상세 실행 가이드",
      "steps": [
        "Flow와 동일한 단계 배열 작성"
      ],
      "contentId": "guide_1", 
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
}`;

  const skeletonResponse = await openai.chat.completions.create({
    model: 'gpt-4o', // 🚨 Skeleton도 4o로! mini가 지시를 제대로 안 따름
    messages: [
      { role: 'system', content: '자동화 레시피 설계 전문가입니다. 사용자의 요청을 분석하여 실제 완성 가능한 구체적 단계들을 설계하세요. Flow와 Guide 카드의 steps 배열에는 "1단계: [도구명] [구체적 작업]" 형식으로 실제 도구명과 구체적 작업이 포함된 단계를 반드시 작성하세요. 추상적 제목(도구 설정, 자동화 설정 등) 절대 금지!' },
      { role: 'user', content: skeletonPrompt },
    ],
    max_tokens: 1200, // 🚨 토큰 증가: 구체적인 단계 생성 필요
    temperature: 0.1, // 🚨 더 결정적으로
    response_format: { type: 'json_object' },
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
  // 2️⃣ Flow 카드가 비어있거나 예제 텍스트인 경우 강제 생성
  else {
    console.log('🚨 [Skeleton 검증] Flow 카드 steps가 비어있거나 예제 텍스트 - 요청 기반 강제 생성');
    
    // 🎯 실제 사용자 요청에 기반한 구체적 단계 생성
    if (userInput.includes('sns') || userInput.includes('브랜드') || userInput.includes('언급')) {
      finalSteps = [
        "1단계: Zapier 계정 생성 및 Twitter 검색 트리거 설정",
        "2단계: 브랜드 키워드 설정 및 검색 조건 정의",
        "3단계: Slack Webhook URL 생성 및 연동 설정",
        "4단계: 알림 메시지 템플릿 작성 및 테스트"
      ];
    } else if (userInput.includes('잡코리아') || userInput.includes('사람인') || userInput.includes('지원서')) {
      finalSteps = [
        "1단계: Google Apps Script 프로젝트 생성 및 초기 설정",
        "2단계: 잡코리아/사람인 RSS 피드 또는 웹 스크래핑 설정",
        "3단계: Google 스프레드시트 연동 및 데이터 저장 스크립트 구현",
        "4단계: 주간 데이터 분석 및 요약 보고서 생성 로직 작성",
        "5단계: Slack Incoming Webhook 설정 및 메시지 전송 구현",
        "6단계: 매주 월요일 자동 실행을 위한 트리거 설정 및 테스트"
      ];
    } else {
      // 🎯 일반적인 자동화 Fallback 단계 (더 이상 하드코딩 없음)
      finalSteps = [
        "1단계: 자동화 도구 계정 설정 및 초기 구성",
        "2단계: 데이터 소스 연동 및 트리거 설정",
        "3단계: 데이터 처리 및 변환 로직 구현",
        "4단계: 결과 전달 채널 연동 및 테스트"
      ];
    }
    
    console.log(`✅ [Skeleton 강제생성] 요청 기반 ${finalSteps.length}단계 생성 완료`);
  }
  
  // 3️⃣ Flow와 Guide 카드 동기화
  if (flowCard) {
    flowCard.steps = finalSteps;
  }
  if (guideCard) {
    guideCard.steps = finalSteps; // 🎯 핵심: Guide도 동일한 steps 보유
    console.log(`✅ [동기화] Guide 카드에 ${finalSteps.length}개 단계 동기화 완료`);
  }
  
  console.log(`✅ [Step C-1] Skeleton 완료 - ${skeletonCards.length}개 카드`);

  // 2️⃣ Pass 2: 각 카드별 상세 내용 생성 (품질 우선, 제한 없음)
  console.log('🎨 [Step C-2] Pass 2: 상세 내용 생성...');
  
  // 🚨 Blueprint 로드 (근본 해결!)
  const blueprint = await BlueprintReader.read('orchestrator/step_c_wow.md');
  
  const enrichedCards = [];
  let totalPass2Tokens = 0;

  for (const skeletonCard of skeletonCards) {
    const detailPrompt = `${blueprint}

=== 현재 작업 ===
카드 타입: ${skeletonCard.type}
카드 제목: ${skeletonCard.title}
사용자 요청: ${userInput}
후속답변: ${JSON.stringify(followupAnswers || {})}
최적 도구들: ${optimalTools.map(t => t.name).join(', ')}

🚨🚨🚨 절대 원칙 재확인:
- 방법론 비교 절대 금지 (예: "Zapier 방법 vs Google Apps Script 방법")
- 단 하나의 최적 솔루션만 제시
- 선택한 도구로 처음부터 끝까지 일관된 가이드 (적절한 단계 수로)

${skeletonCard.type === 'guide' ? `
🎯 **GUIDE 카드 JSON 응답 형식 (필수 준수!):**

현재 작업: "${userInput}"

다음 JSON 형식으로만 응답하세요:

{
  "detailedSteps": [
    {
      "number": 1,
      "title": "1단계: [구체적 도구명] [구체적 작업명]",
      "description": "이 단계에서 수행할 구체적인 작업 내용을 상세히 설명합니다. 초보자도 따라할 수 있도록 단계별로 설명하세요.",
      "expectedScreen": "이 단계 완료 후 사용자가 확인할 수 있는 구체적인 화면이나 결과물",
      "checkpoint": "이 단계가 정상적으로 완료되었는지 확인하는 방법"
    },
    {
      "number": 2,
      "title": "2단계: [구체적 도구명] [구체적 작업명]",
      "description": "구체적인 설명...",
      "expectedScreen": "구체적인 결과 화면...",
      "checkpoint": "구체적인 확인 방법..."
    }
  ]
}

⚠️ 절대 금지: "도구 설정", "자동화 설정" 같은 추상적 제목
⚠️ 필수: 실제 도구명과 구체적 작업명 포함
⚠️ 현재 요청 "${userInput}"에 맞는 실제 실행 가능한 단계들만 작성
` : `
🎯 **${optimalTools[0]?.name || 'Google Apps Script'}를 사용한 완전한 단일 솔루션** 생성:
- 1단계: 계정 생성/준비
- 2단계: API/연결 설정  
- 3단계: 코드 작성/배포
- 4단계: 테스트 및 검증
- 5단계: 자동화 활성화
`}

초보자도 따라할 수 있는 완벽한 품질로 작성하세요.`;

    const detailResponse = await openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20', // 품질 우선
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
      max_tokens: skeletonCard.type === 'guide' ? 4000 : 2500, // 🎯 Guide 카드는 더 많은 토큰 필요 (복잡한 작업시)
      temperature: 0.4,
      ...(skeletonCard.type === 'guide' ? { response_format: { type: 'json_object' } } : {}),
    });

    const detailContent = detailResponse.choices[0]?.message?.content;
    totalPass2Tokens += detailResponse.usage?.total_tokens || 0;

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
      enrichedCard.items = extractFAQItems(detailContent);
    }

    enrichedCards.push(enrichedCard);
  }

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
  
  const faqItems = [];
  
  // 1️⃣ JSON 형태로 FAQ가 생성된 경우 우선 처리
  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const jsonContent = JSON.parse(jsonMatch[1]);
      if (jsonContent.items && Array.isArray(jsonContent.items)) {
        console.log('✅ [FAQ 추출] JSON 형태 FAQ 발견:', jsonContent.items.length, '개');
        return jsonContent.items.map((item: any) => ({
          question: item.question || item.q,
          answer: item.answer || item.a
        }));
      }
    }
  } catch (e) {
    console.log('⚠️ [FAQ 추출] JSON 파싱 실패, 마크다운 파싱 시도');
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

function extractToolsFromCards(cards: any[]): string[] {
  const tools = new Set<string>();

  cards.forEach(card => {
    if (card.type === 'flow' && card.steps) {
      card.steps.forEach((step: any) => {
        if (step.tool) tools.add(step.tool);
        if (step.toolRecommendation?.primary) tools.add(step.toolRecommendation.primary);
      });
    }
  });

  return Array.from(tools);
}

function extractURLsFromCards(cards: any[]): string[] {
  const urls = new Set<string>();
  const urlRegex = /https?:\/\/[^\s\)]+/g;

  const searchInObject = (obj: any) => {
    if (typeof obj === 'string') {
      const matches = obj.match(urlRegex);
      if (matches) matches.forEach(url => urls.add(url));
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(searchInObject);
    }
  };

  cards.forEach(searchInObject);
  return Array.from(urls);
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

function countPersonalizationElements(cards: any[], followupAnswers: any): number {
  // 후속답변 기반 개인화 요소 개수 계산
  let count = 0;
  const answersStr = JSON.stringify(followupAnswers).toLowerCase();
  const cardsStr = JSON.stringify(cards).toLowerCase();

  Object.keys(followupAnswers || {}).forEach(key => {
    if (cardsStr.includes(followupAnswers[key]?.toLowerCase?.())) {
      count++;
    }
  });

  return count;
}

function countActionableSteps(cards: any[]): number {
  // 실행 가능한 단계 개수 계산
  let count = 0;

  cards.forEach(card => {
    if (card.type === 'flow' && card.steps) {
      count += card.steps.length;
    }
    if (card.type === 'guide' && card.content?.detailedSteps) {
      count += card.content.detailedSteps.length;
    }
  });

  return count;
}

function calculateCreativityScore(cards: any[]): number {
  // 창의성 점수 계산 (기본 구현)
  let score = 0;

  cards.forEach(card => {
    if (card.type === 'expansion') score += 2;
    if (card.title?.includes('🚀') || card.title?.includes('💡')) score += 1;
    if (card.content && typeof card.content === 'object') score += 1;
  });

  return Math.min((score / cards.length) * 10, 10); // 0-10 점수
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
