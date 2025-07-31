import OpenAI from 'openai';
import pMap from 'p-map';
import { BlueprintReader, estimateTokens, selectModel } from '../blueprints/reader';
import { generateRAGContext, searchToolInfo, validateURL } from '../services/rag';

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
  followupAnswers: any
): Promise<{
  cards: any[];
  tokens: number;
  latency: number;
  model: string;
}> {
  const startTime = Date.now();
  console.log('📝 [Step A] 카드 뼈대 초안 생성 시작...');
  
  try {
    // Blueprint 읽기
    const stepABlueprint = await BlueprintReader.read('orchestrator/step_a_draft.md');
    
    // 프롬프트 구성
    const systemPrompt = stepABlueprint;
    const userPrompt = `사용자 요청: "${userInput}"
후속 답변: ${JSON.stringify(followupAnswers || {})}

위 정보를 바탕으로 자동화 카드들의 기본 뼈대를 빠르게 생성하세요.
상세한 내용은 B/C 단계에서 추가할 예정이니, 구조와 방향성에 집중하세요.

중요: 반드시 유효한 JSON 형식으로만 응답하세요. 마크다운이나 다른 설명은 포함하지 마세요.`;

    // 토큰 추정 및 모델 선택 (A단계는 항상 mini 사용)
    const estimatedTokens = estimateTokens(systemPrompt + userPrompt);
    const model = 'gpt-4o-mini'; // A단계는 비용 효율성 우선
    
    console.log(`📊 [Step A] 예상 토큰: ${estimatedTokens}, 모델: ${model}`);
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 600, // A단계는 제한적
      temperature: 0.8 // 창의성 우선
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Step A 응답이 비어있습니다');
    }

    // JSON 파싱 (개선된 로직 사용)
    const cards = parseCardsJSON(content);
    const latency = Date.now() - startTime;
    const actualTokens = response.usage?.total_tokens || estimatedTokens;
    
    console.log(`✅ [Step A] 완료 - ${cards.length}개 카드, ${actualTokens} 토큰, ${latency}ms`);
    
    return {
      cards,
      tokens: actualTokens,
      latency,
      model
    };
    
  } catch (error) {
    console.error('❌ [Step A] 실패:', error);
    throw error;
  }
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
}> {
  const startTime = Date.now();
  console.log('🔍 [Step B] RAG 검증 및 정보 강화 시작...');
  
  try {
    // 1. 언급된 도구들 추출
    const mentionedTools = extractToolsFromCards(draftCards);
    console.log(`🛠️ [Step B] 추출된 도구들: ${mentionedTools.join(', ')}`);
    
    // 2. RAG 컨텍스트 생성 (병렬 처리)
    const ragContext = await generateRAGContext(userInput, mentionedTools);
    
    // 3. 도구별 상세 정보 수집 (최대 3개 도구, 동시성 제한)
    const toolInfoPromises = mentionedTools.slice(0, 3).map(tool => searchToolInfo(tool));
    const toolInfoResults = await pMap(toolInfoPromises, async (promise) => promise, {
      concurrency: 2 // OpenAI Rate-Limit 보호
    });
    
    // 4. URL 검증 (언급된 링크들)
    const urls = extractURLsFromCards(draftCards);
    const urlValidationPromises = urls.map(url => validateURL(url));
    const urlValidationResults = await pMap(urlValidationPromises, async (promise) => promise, {
      concurrency: 3
    });
    
    // 5. Blueprint 읽기
    const stepBBlueprint = await BlueprintReader.read('orchestrator/step_b_rag.md');
    
    // 6. 프롬프트 구성
    const systemPrompt = `${stepBBlueprint}\n\n## RAG 수집 정보:\n${ragContext}`;
    const userPrompt = `Draft 카드들:
${JSON.stringify(draftCards, null, 2)}

언급된 도구들의 최신 정보:
${toolInfoResults.flat().map((info: any) => `- ${info.title}: ${info.url}`).join('\n')}

URL 검증 결과:
${urls.map((url, idx) => `- ${url}: ${urlValidationResults[idx] ? '✅ 유효' : '❌ 무효'}`).join('\n')}

위 정보를 바탕으로 draft 카드들을 검증하고 최신 정보로 보강하세요.
잘못된 정보는 수정하고, 깨진 링크는 대체하세요.

중요: 반드시 유효한 JSON 형식으로만 응답하세요. 마크다운이나 다른 설명은 포함하지 마세요.`;

    // 7. gpt-4o-mini로 처리 (B단계도 비용 효율적)
    const model = 'gpt-4o-mini';
    console.log(`📊 [Step B] 모델: ${model}`);
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1200,
      temperature: 0.3 // 정확성 우선
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Step B 응답이 비어있습니다');
    }

    // JSON 파싱
    const cards = parseCardsJSON(content);
    const latency = Date.now() - startTime;
    const actualTokens = response.usage?.total_tokens || 0;
    
    // RAG 메타데이터 구성
    const ragMetadata = {
      searchesPerformed: mentionedTools.length,
      sourcesFound: toolInfoResults.flat().length,
      linksVerified: urlValidationResults.filter(Boolean).length,
      linksTotal: urls.length,
      ragContextLength: ragContext.length
    };
    
    console.log(`✅ [Step B] 완료 - ${cards.length}개 카드, ${actualTokens} 토큰, ${latency}ms`);
    console.log(`🔍 [Step B] RAG 통계:`, ragMetadata);
    
    return {
      cards,
      tokens: actualTokens,
      latency,
      ragMetadata
    };
    
  } catch (error) {
    console.error('❌ [Step B] 실패:', error);
    
    // B단계 실패 시에도 A단계 결과 유지
    console.log('🔄 [Step B] 실패 시 A단계 결과 유지');
    return {
      cards: draftCards,
      tokens: 0,
      latency: Date.now() - startTime,
      ragMetadata: { error: 'RAG 처리 실패' }
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
  console.log('🎨 [Step C] 한국어 WOW 마감 처리 시작...');
  
  try {
    // Blueprint 읽기
    const stepCBlueprint = await BlueprintReader.read('orchestrator/step_c_wow.md');
    
    // 프롬프트 구성
    const systemPrompt = stepCBlueprint;
    const userPrompt = `원본 요청: "${userInput}"
후속 답변: ${JSON.stringify(followupAnswers || {})}

검증된 카드들:
${JSON.stringify(verifiedCards, null, 2)}

RAG 검증 정보:
- 검색된 소스: ${ragMetadata.sourcesFound || 0}개
- 검증된 링크: ${ragMetadata.linksVerified || 0}/${ragMetadata.linksTotal || 0}개

위 정보를 바탕으로 사용자가 "와! 정말 유용하다!"라고 감탄할 만한 최종 결과물을 만드세요.
개인화된 솔루션, 즉시 실행 가능성, 확장 비전, 창의적 대안을 모두 포함하세요.
한국어 톤앤매너로 친근하고 확신에 찬 표현을 사용하세요.

중요: 반드시 유효한 JSON 형식으로만 응답하세요. 마크다운이나 다른 설명은 포함하지 마세요.`;

    // 토큰 추정 및 모델 선택 (C단계는 품질 우선으로 gpt-4o 사용)
    const estimatedTokens = estimateTokens(systemPrompt + userPrompt);
    const model = estimatedTokens > 3000 ? 'gpt-4o-2024-11-20' : 'gpt-4o-2024-11-20'; // C단계는 항상 4o
    
    console.log(`📊 [Step C] 예상 토큰: ${estimatedTokens}, 모델: ${model}`);
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 2000, // C단계는 충분히 길게
      temperature: 0.7 // 창의성과 정확성의 균형
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Step C 응답이 비어있습니다');
    }

    // JSON 파싱
    const cards = parseCardsJSON(content);
    const latency = Date.now() - startTime;
    const actualTokens = response.usage?.total_tokens || estimatedTokens;
    
    // WOW 메타데이터 구성
    const wowMetadata = {
      personalizationElements: countPersonalizationElements(cards, followupAnswers),
      actionableSteps: countActionableSteps(cards),
      creativityScore: calculateCreativityScore(cards),
      koreanToneQuality: 'excellent' // 추후 자동 평가 로직 추가 가능
    };
    
    console.log(`✅ [Step C] 완료 - ${cards.length}개 카드, ${actualTokens} 토큰, ${latency}ms`);
    console.log(`🎨 [Step C] WOW 통계:`, wowMetadata);
    
    return {
      cards,
      tokens: actualTokens,
      latency,
      model,
      wowMetadata
    };
    
  } catch (error) {
    console.error('❌ [Step C] 실패:', error);
    
    // C단계 실패 시에도 B단계 결과 유지
    console.log('🔄 [Step C] 실패 시 B단계 결과 유지');
    return {
      cards: verifiedCards,
      tokens: 0,
      latency: Date.now() - startTime,
      model: 'fallback',
      wowMetadata: { error: 'WOW 처리 실패' }
    };
  }
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
      stepC: { tokens: 0, model: '', cost: 0 }
    }
  };
  
  try {
    console.log('🚀 [3-Step] 자동화 생성 시작');
    console.log(`📝 [3-Step] 사용자 입력: ${userInput}`);
    console.log(`📋 [3-Step] 후속 답변: ${JSON.stringify(followupAnswers)}`);
    
    // Step A: 카드 뼈대 초안
    const stepAResult = await executeStepA(userInput, followupAnswers);
    metrics.stagesCompleted.push('A-draft');
    metrics.modelsUsed.push(stepAResult.model);
    metrics.totalTokens += stepAResult.tokens;
    metrics.costBreakdown.stepA = {
      tokens: stepAResult.tokens,
      model: stepAResult.model,
      cost: calculateCost(stepAResult.tokens, stepAResult.model)
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
      cost: calculateCost(stepBResult.tokens, 'gpt-4o-mini') + (metrics.ragSearches * 0.001) // RAG 비용 추정
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
      cost: calculateCost(stepCResult.tokens, stepCResult.model)
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
      metrics
    };
    
  } catch (error) {
    metrics.success = false;
    metrics.errors = [error instanceof Error ? error.message : String(error)];
    metrics.totalLatencyMs = Date.now() - overallStartTime;
    
    console.error('❌ [3-Step] 실패:', error);
    
    // 완전 실패 시 기본 카드 반환
    return {
      cards: getFallbackCards(userInput),
      metrics
    };
  }
}

// 유틸리티 함수들
function parseCardsJSON(content: string): any[] {
  console.log(`🔍 [Cards JSON] 파싱 시작 - 원본 길이: ${content.length}`);
  
  try {
    const parsed = JSON.parse(content);
    
    // 다양한 JSON 구조 지원 (강화된 버전)
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
        cards = [{
          type: "flow",
          title: parsed.solution.title || "자동화 가이드",
          content: parsed.solution.description || "",
          description: parsed.solution.description || "",
          steps: parsed.solution.steps,
          status: "converted"
        }];
        console.log(`✅ [Cards JSON] solution.steps 변환 성공 - ${cards.length}개 카드`);
      } else {
        console.log(`⚠️ [Cards JSON] 1차 파싱 성공하지만 cards 배열 없음`);
        console.log(`🔍 [Cards JSON] JSON 구조:`, Object.keys(parsed));
        console.log(`🔍 [Cards JSON] 전체 내용 (첫 500자):`, JSON.stringify(parsed).substring(0, 500));
      }
    }
    
    return cards;
  } catch (firstError) {
    console.log('🔄 [Cards JSON] 1차 파싱 실패, 정리 후 재시도...');
    console.log(`🔍 [Cards JSON] 1차 에러: ${firstError instanceof Error ? firstError.message : String(firstError)}`);
    
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
      console.log(`🔍 [Cards JSON] 정리 후 마지막 100자: ${cleanContent.substring(cleanContent.length - 100)}`);
      
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
          cards = [{
            type: "flow",
            title: parsed.solution.title || "자동화 가이드",
            content: parsed.solution.description || "",
            description: parsed.solution.description || "",
            steps: parsed.solution.steps,
            status: "converted"
          }];
          console.log(`✅ [Cards JSON] 2차 파싱에서 solution.steps 변환 성공 - ${cards.length}개 카드`);
        } else {
          console.log(`⚠️ [Cards JSON] 2차 파싱 성공하지만 cards 배열 없음`);
          console.log(`🔍 [Cards JSON] JSON 구조:`, Object.keys(parsed));
          console.log(`🔍 [Cards JSON] 전체 내용 (첫 500자):`, JSON.stringify(parsed).substring(0, 500));
        }
      }
      
      return cards;
    } catch (secondError) {
      console.error('❌ [Cards JSON] 2차 파싱도 실패, 기본 카드 반환');
      console.log(`🔍 [Cards JSON] 2차 에러: ${secondError instanceof Error ? secondError.message : String(secondError)}`);
      
      // 디버깅용 원본 내용 출력
      console.log(`🔍 [Cards JSON] 원본 첫 200자: ${content.substring(0, 200)}`);
      console.log(`🔍 [Cards JSON] 원본 마지막 200자: ${content.substring(content.length - 200)}`);
      
      return [];
    }
  }
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
  const costs = {
    'gpt-4o-mini': 0.00015,
    'gpt-4o-2024-11-20': 0.0025,
    'gpt-4o': 0.0025
  };
  
  return tokens * (costs[model as keyof typeof costs] || 0.0025);
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
  
  return Math.min(score / cards.length * 10, 10); // 0-10 점수
}

function getFallbackCards(userInput: string): any[] {
  return [
    {
      type: 'needs_analysis',
      title: '🎯 기본 니즈 분석',
      surfaceRequest: userInput,
      realNeed: '사용자 요청에 대한 기본적인 자동화 솔루션',
      recommendedLevel: '반자동',
      status: 'fallback'
    },
    {
      type: 'flow',
      title: '🚀 기본 자동화 플로우',
      subtitle: '기본적인 단계별 가이드',
      steps: [
        {
          id: '1',
          title: '첫 번째 단계',
          subtitle: '기본 설정'
        },
        {
          id: '2',
          title: '두 번째 단계',
          subtitle: '실행'
        },
        {
          id: '3',
          title: '세 번째 단계',
          subtitle: '완료'
        }
      ],
      status: 'fallback'
    }
  ];
}