import OpenAI from 'openai';
import pMap from 'p-map';
import { z } from 'zod';
import { BlueprintReader, estimateTokens, selectModel } from '../blueprints/reader';
import {
  generateRAGContext,
  searchToolInfo,
  validateURL,
  checkToolIntegration,
  searchWithRAG,
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
 * Step A: 빠른 플로우 생성 (gpt-4o-mini, 속도 우선)
 * - 핵심 단계들만 빠르게 생성
 * - Step B에서 검증 후 수정
 * - Step C에서 상세 가이드 생성
 */
async function executeStepA(
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
}> {
  const startTime = Date.now();
  console.log('📝 [Step A] 카드 뼈대 초안 생성 시작...');

    // Blueprint 읽기
    const stepABlueprint = await BlueprintReader.read('orchestrator/step_a_draft.md');

    // 프롬프트 구성
    const systemPrompt = stepABlueprint;
    const userPrompt = `사용자 요청: "${userInput}"
후속 답변: ${JSON.stringify(followupAnswers || {})}

위 정보를 바탕으로 자동화 플로우의 핵심 단계들만 빠르게 생성하세요.
Step B에서 실현 가능성을 검증하고, Step C에서 상세 가이드를 작성할 예정입니다.

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

단계는 3-7개, 각 단계는 구체적이고 실행 가능하게 작성하세요.`;

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
  
  // 플로우의 각 단계에서 도구 및 방법론 추출 (엄격한 검증)
  flow.steps.forEach((step: string) => {
    if (step && typeof step === 'string') {
      // 🚨 구체적 서비스/API 검증이 필요한 도구들 (영어/한글 모두 지원)
      const criticalServicesMatches = step.match(/(잡코리아|jobkorea|사람인|saramin|인크루트|incruit|링크드인|linkedin|Facebook API|Instagram API|카카오톡|kakao|네이버 카페|naver|유튜브 API|youtube api)/gi);
      if (criticalServicesMatches) {
        methods.push({
          tool: criticalServicesMatches[0],
          action: step,
          details: flow.title + ' (개인 사용자 API 지원 여부 검증 필요)'
        });
      }
      
      // 일반적인 도구들 (검증 필요하지만 보통 지원됨)
      const generalToolMatches = step.match(/(Google Apps Script|Zapier|Make\.com|Slack|Gmail|Drive|Sheets|Forms|IFTTT|Airtable|Notion)/gi);
      if (generalToolMatches) {
        methods.push({
          tool: generalToolMatches[0],
          action: step,
          details: flow.title || ''
        });
      }
      
      // 🔍 웹훅/API 관련 키워드는 더 구체적으로 검증
      const webhookMatches = step.match(/(웹훅|webhook|API.*연결|직접.*연동)/gi);
      if (webhookMatches) {
        methods.push({
          tool: 'Custom API Integration',
          action: step,
          details: flow.title + ' (API 개인 지원 여부 및 개발 복잡도 검증 필요)'
        });
      }
      
      // 일반적 액션들 (낮은 우선순위)
      else {
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
    const isProblematic = problematicMethods.some(pm => 
      originalStep.toLowerCase().includes(pm.tool.toLowerCase())
    );
    
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
 * 🔄 문제 있는 단계를 현실적 대안으로 교체하는 함수
 */
async function generateAlternativeStep(
  problematicStep: string,
  problematicMethods: any[]
): Promise<string> {
  
  // 빠른 대안 생성 (패턴 기반)
  const stepLower = problematicStep.toLowerCase();
  
  // 일반적인 대안 패턴들
  if (stepLower.includes('rss') || stepLower.includes('피드')) {
    return problematicStep.replace(/rss|피드/gi, 'Visualping 웹 모니터링');
  }
  
  if (stepLower.includes('facebook') || stepLower.includes('instagram')) {
    return problematicStep.replace(/facebook|instagram/gi, 'Google Apps Script + 웹스크래핑');
  }
  
  if (stepLower.includes('api') && stepLower.includes('직접')) {
    return problematicStep.replace(/api.*직접/gi, '웹훅 및 공식 연동 도구');
  }
  
  // 기본 대안: 원본에서 문제 도구만 교체
  let alternativeStep = problematicStep;
  problematicMethods.forEach(pm => {
    const toolPattern = new RegExp(pm.tool, 'gi');
    alternativeStep = alternativeStep.replace(toolPattern, 'Google Apps Script');
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
    
    // 🚨 Critical Services: 개인 사용자 API 지원 여부 검증
    if (['잡코리아', '사람인', '인크루트', '링크드인', 'Facebook API', 'Instagram API', '카카오톡'].includes(method.tool)) {
      searchQueries.push(
        `"${method.tool}" 개인 사용자 API 지원 여부 2025`,
        `"${method.tool}" personal developer API access restrictions 2025`,
        `"${method.tool}" 웹훅 개인계정 지원 안함 2025`,
        `"${method.tool}" alternative methods without API 개인용 2025`
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
    
    let allResults: any[] = [];
    for (const query of searchQueries) {
      const results = await searchWithRAG(query, { maxResults: 2 });
      if (results) allResults.push(...results);
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
  
  // 🚨 1단계: Claude 수준 엄격한 불가능 패턴 감지
  const impossibilityChecks = [
    // 채용 플랫폼들의 개인 API 제한
    {
      pattern: /(잡코리아|jobkorea).*(api|웹훅|webhook|연동)/,
      applies: () => method.tool.includes('잡코리아'),
      reason: "잡코리아는 개인 사용자에게 웹훅 API를 제공하지 않음 (기업용 ATS만 지원)"
    },
    {
      pattern: /(사람인|saramin).*(api|웹훅|webhook|연동)/,
      applies: () => method.tool.includes('사람인'),
      reason: "사람인은 개인 사용자에게 API 접근을 제공하지 않음"
    },
    {
      pattern: /(인크루트|incruit).*(api|웹훅|webhook)/,
      applies: () => method.tool.includes('인크루트'),
      reason: "인크루트는 개인 개발자 API를 지원하지 않음"
    },
    // 기존 소셜미디어 제한들
    {
      pattern: /(google alert|google 알림).*(youtube|유튜브).*(comment|댓글)/,
      applies: () => method.tool.includes('Google Alert') && userGoal.includes('유튜브') && userGoal.includes('댓글'),
      reason: "Google Alert는 YouTube 댓글을 크롤링할 수 없음 (기술적 불가능)"
    },
    {
      pattern: /(instagram|인스타).*(personal|개인).*(api|연동)/,
      applies: () => method.tool.includes('Instagram') && !userGoal.includes('business'),
      reason: "Instagram 개인계정 API는 Meta 정책으로 제한됨"
    },
    {
      pattern: /(kakao|카카오).*(api|연동).*(webhook|웹훅)/,
      applies: () => method.tool.includes('카카오') || method.action.includes('카카오'),
      reason: "카카오톡 공식 API는 비즈니스 인증 필요"
    },
    {
      pattern: /(facebook|페이스북).*(personal|개인).*(api|직접)/,
      applies: () => method.tool.includes('Facebook') && !userGoal.includes('page'),
      reason: "Facebook 개인계정 직접 API 연동 제한"
    },
    // 복잡한 커스텀 API 통합
    {
      pattern: /(custom api|커스텀|직접.*연동).*(개발|구현)/,
      applies: () => method.tool === 'Custom API Integration' && !userGoal.includes('개발자'),
      reason: "커스텀 API 통합은 개발 지식이 필요하여 초보자에게 부적합"
    }
  ];
  
  // 명백한 불가능 케이스 체크
  for (const check of impossibilityChecks) {
    if (check.applies() || check.pattern.test(combinedContent + ' ' + userGoal)) {
      return {
        isViable: false,
        reasoning: check.reason,
        issues: [check.reason],
        status: 'Technically Impossible',
        uiChanges: [],
        recommendations: await generateSmartAlternatives(method, userInput)
      };
    }
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

🚫 **절대 제안 금지 (Claude 기준):**
- 잡코리아/사람인 등 채용사이트 직접 API (지원 안함)
- Instagram/Facebook 개인계정 직접 API (정책 위반)
- 카카오톡 개인 메시지 자동화 (불법)
- 개인정보 무단 수집 (개인정보보호법 위반)

✅ **추천 현실적 대안들:**
${specificAlternatives.map((alt, i) => `${i+1}. ${alt}`).join('\n')}

위 추천 대안들을 참고하여 사용자 요청에 가장 적합한 4개 대안을 JSON 형식으로 응답하세요:
{"alternatives": ["대안1", "대안2", "대안3", "대안4"]}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20', // Claude 수준의 스마트한 대안 생성
      messages: [
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
      ],
      max_tokens: 500,
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });

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
      
      if (avgScore > 0.2) { // 낮은 임계값으로 현실적 방법 허용
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
        action: "=GPT_ANALYZE(A1, '감정분석') 커스텀 함수로 수백개 문의 한번에 분석",
        viabilityReason: "스프레드시트에서 바로 AI 분석, 접근성 최고"
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
 * 📊 2025년 기준 도구별 현재 상태 (알려진 정보)
 */
function getCurrentToolStatus(tool: string): string {
  const statusMap: Record<string, string> = {
    'Google Apps Script': '2025년 정상 작동 중 - 새로운 V8 런타임 적용',
    'Zapier': '2025년 정상 작동 중 - AI 기능 대폭 강화',
    'Make.com': '2025년 정상 작동 중 - Integromat에서 완전 전환',
    'Slack': '2025년 정상 작동 중 - 새로운 Workflow Builder 적용',
    'Microsoft Power Automate': '2025년 정상 작동 중 - Copilot 통합',
    'Gmail': '2025년 정상 작동 중 - Gmail API v1 유지'
  };
  
  return statusMap[tool] || '2025년 상태 확인 필요';
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
async function executeStepB(
  flow: {steps: string[], title: string, subtitle: string},
  userInput: string
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

    // 1. 플로우 단계들에서 구체적 방법론 추출
    const proposedMethods = extractProposedMethodsFromFlow(flow);
    console.log(`🎯 [Step B] 추출된 방법: ${proposedMethods.map(m => m.tool + ':' + m.action.substring(0, 30)).join(', ')}`);

    // 2. 🔍 각 단계의 2025년 현재 실제 작동 여부 검증
    const methodValidationResults = await Promise.all(
      proposedMethods.map(method => validateMethodCurrentStatus(method, userInput))
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
    
    // cards 배열을 그대로 사용하되, 각 카드에 ID와 기본값 추가
    const processedCards = parsedResult.cards.map((card: any, index: number) => {
      return {
        ...card,
        id: card.id || `${card.type}_${Date.now()}_${index}`,
        status: card.status || 'completed'
      };
    });
    
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
 * Step C: 검증된 플로우 기반 상세 가이드 생성 (논리적 구조)
 * - Step B에서 검증된 플로우를 받아서
 * - 각 단계별로 상세한 실행 가이드 생성
 * - 초보자도 따라할 수 있는 구체적 방법 제시
 */
async function executeStepC(
  verifiedFlow: {steps: string[], title: string, subtitle: string},
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
  console.log('🎨 [Step C] 검증된 플로우 기반 가이드 생성 시작...');
  console.log(`📋 [Step C] 플로우: ${verifiedFlow.title} (${verifiedFlow.steps.length}개 단계)`);
  
  try {
    // Blueprint 읽기
    const blueprint = await BlueprintReader.read('orchestrator/step_c_wow.md');
    
    // 검증된 플로우 기반 가이드 생성 프롬프트
    const systemPrompt = `${blueprint}

## 🎯 검증된 플로우 정보:
제목: ${verifiedFlow.title}
설명: ${verifiedFlow.subtitle}
단계 수: ${verifiedFlow.steps.length}개

## 🔍 Step B 검증 결과:
${ragMetadata.validationSummary || '검증 완료'}

## 📚 RAG 컨텍스트:
${ragMetadata.targetedRagContext || '관련 정보 없음'}`;

    const userPrompt = `사용자 요청: "${userInput}"
후속답변: ${JSON.stringify(followupAnswers || {})}

검증된 플로우 단계들:
${verifiedFlow.steps.map((step, i) => `${i+1}. ${step}`).join('\n')}

위 검증된 플로우를 바탕으로 초보자도 따라할 수 있는 상세한 실행 가이드를 생성하세요.
각 단계별로 구체적인 방법, 스크린샷 위치, 체크포인트를 포함해야 합니다.

JSON 형식으로 응답하세요:
{
  "type": "guide",
  "title": "📋 상세 실행 가이드",
  "subtitle": "단계별 완벽 가이드",
  "detailedSteps": [
    {
      "title": "1단계: 구체적 작업명",
      "description": "자세한 설명",
      "content": "단계별 상세 내용",
      "screen": "어떤 화면에서 작업할지",
      "checkpoint": "완료 확인 방법"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20', // Step C는 품질 우선
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 5000, // 🔧 상세 가이드를 위해 토큰 증가 (2000 → 5000)
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Step C 응답이 비어있습니다');
    }

    // 🛡️ JSON 파싱 전 안전성 검사
    console.log(`📝 [Step C] GPT 응답 길이: ${content.length}자`);
    console.log(`📝 [Step C] 응답 첫 100자: ${content.substring(0, 100)}`);
    console.log(`📝 [Step C] 응답 마지막 100자: ${content.substring(content.length - 100)}`);
    
    // 🔧 JSON 파싱 및 복구 시도
    let cards: any[] = [];
    try {
      const parsedResult = JSON.parse(content);
      cards = extractCardsFromParsedResult(parsedResult, verifiedFlow);
      console.log('✅ [Step C] JSON 파싱 성공');
    } catch (parseError) {
      console.error('❌ [Step C] JSON 파싱 실패:', parseError);
      console.log('🔧 [Step C] JSON 복구 시도...');
      
      // JSON 복구 시도 1: 불완전한 JSON 감지 및 수정
      try {
        let fixedContent = content.trim();
        
        // 일반적인 JSON 문제들 수정
        if (!fixedContent.endsWith('}') && !fixedContent.endsWith(']}')) {
          console.log('🔧 [JSON 복구] 불완전한 JSON 끝부분 감지');
          
          // detailedSteps 배열이 열려있는 경우
          if (fixedContent.includes('"detailedSteps":[') && !fixedContent.includes(']}')) {
            fixedContent += ']}';
            console.log('🔧 [JSON 복구] detailedSteps 배열 닫기 시도');
          } else if (!fixedContent.endsWith('}')) {
            fixedContent += '}';
            console.log('🔧 [JSON 복구] 객체 닫기 시도');
          }
        }
        
        // 마지막 콤마 제거
        fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1');
        
        const parsedResult = JSON.parse(fixedContent);
        cards = extractCardsFromParsedResult(parsedResult, verifiedFlow);
        console.log('✅ [Step C] JSON 복구 성공!');
        
      } catch (recoveryError) {
        console.error('❌ [Step C] JSON 복구 실패:', recoveryError);
        
        // 최종 fallback: fallback cards 생성
        console.log('🔧 [Step C] 최종 fallback cards 생성...');
        cards = createFallbackCards(verifiedFlow);
        console.log('✅ [Step C] fallback cards 생성 완료');
      }
    }
    const latency = Date.now() - startTime;
    const totalTokens = response.usage?.total_tokens || 0;

    console.log(`✅ [Step C] 카드 생성 완료 - ${cards.length}개 카드, ${totalTokens} 토큰, ${latency}ms`);
    console.log(`🔍 [Step C] 생성된 카드 타입들:`, cards.map(c => c.type));

    return {
      cards,
      tokens: totalTokens,
      latency,
      model: 'gpt-4o-2024-11-20',
      wowMetadata: {
        stepCount: verifiedFlow.steps.length,
        cardsCount: cards.length,
        detailLevel: 'comprehensive',
        userFriendly: true
      }
    };

  } catch (error) {
    console.error('❌ [Step C] 가이드 생성 실패:', error);
    
    // 실패 시 기본 cards 생성
    const fallbackCards = createFallbackCards(verifiedFlow);
    const latency = Date.now() - startTime;
    
    return {
      cards: fallbackCards,
      tokens: 0,
      latency,
      model: 'fallback-cards',
      wowMetadata: {
        stepCount: verifiedFlow.steps.length,
        cardsCount: fallbackCards.length,
        detailLevel: 'basic',
        userFriendly: false
      }
    };
  }
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

    // 🚀 Step A: 빠른 플로우 생성 (논리적 구조)
    console.log('🚀 [Step A] 빠른 플로우 생성 시작...');
    const stepAResult = await executeStepA(userInput, followupAnswers, intentAnalysis);
    metrics.stagesCompleted.push('A-flow');
    metrics.modelsUsed.push(stepAResult.model);
    metrics.totalTokens += stepAResult.tokens;
    metrics.costBreakdown.stepA = {
      tokens: stepAResult.tokens,
      model: stepAResult.model,
      cost: calculateCost(stepAResult.tokens, stepAResult.model),
    };
    console.log(`✅ [Step A] 플로우 생성 완료: ${stepAResult.flow.title} (${stepAResult.flow.steps.length}개 단계)`);

    // 🔍 Step B: 플로우 검증 및 수정 (논리적 구조)
    console.log('🔍 [Step B] 플로우 검증 및 수정 시작...');
    const stepBResult = await executeStepB(stepAResult.flow, userInput);
    metrics.stagesCompleted.push('B-verification');
    metrics.totalTokens += stepBResult.tokens;
    metrics.ragSearches = stepBResult.ragMetadata.ragSearches || 0;
    metrics.ragSources = stepBResult.ragMetadata.ragSources || 0;
    metrics.urlsVerified = 0; // URL 검증은 더 이상 수행하지 않음
    metrics.costBreakdown.stepB = {
      tokens: stepBResult.tokens,
      ragCalls: metrics.ragSearches,
      cost: calculateCost(stepBResult.tokens, stepBResult.model) + metrics.ragSearches * 0.001,
    };
    console.log(`✅ [Step B] 플로우 검증 완료: ${stepBResult.verifiedFlow.steps.length}개 검증된 단계`);

    // 🎨 Step C: 검증된 플로우 기반 가이드 생성 (논리적 구조)
    console.log('🎨 [Step C] 상세 가이드 생성 시작...');
    const stepCResult = await executeStepC(
      stepBResult.verifiedFlow,
      userInput,
      followupAnswers,
      stepBResult.ragMetadata
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

    // 메트릭 완성
    metrics.totalLatencyMs = Date.now() - overallStartTime;
    metrics.success = true;

    // 비용 계산 및 로깅
    const totalCost =
      metrics.costBreakdown.stepA.cost +
      metrics.costBreakdown.stepB.cost +
      metrics.costBreakdown.stepC.cost;

    // 🎯 최종 결과 조합: Step C에서 생성된 cards 사용
    const finalCards = stepCResult.cards || [
      // Fallback: Flow 카드 (Frontend에서 Flow UI 생성용)
      {
        type: 'flow',
        title: stepBResult.verifiedFlow.title,
        subtitle: stepBResult.verifiedFlow.subtitle,
        steps: stepBResult.verifiedFlow.steps,
        status: 'verified',
        id: `flow_${Date.now()}`
      },
      // Fallback: Guide 카드 (Frontend에서 상세 가이드 표시용)
      {
        type: 'guide',
        title: '📋 상세 실행 가이드',
        subtitle: '단계별 자동화 구현',
        detailedSteps: stepBResult.verifiedFlow.steps.map((step, index) => ({
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

    console.log(`✅ [3-Step] 논리적 구조 완료 - 총 ${metrics.totalTokens} 토큰, ${metrics.totalLatencyMs}ms`);
    console.log(`📊 [3-Step] 플로우: ${stepBResult.verifiedFlow.steps.length}개 단계, 카드: ${finalCards.length}개`);
    console.log(`🔍 [3-Step] 생성된 카드 타입들: ${finalCards.map(c => c.type).join(', ')}`);
    console.log(`💰 [3-Step] 총 비용: $${totalCost.toFixed(4)}`);
    console.log(`🎯 [3-Step] 완료된 단계: ${metrics.stagesCompleted.join(' → ')}`);
    console.log(`🤖 [3-Step] 사용된 모델: ${Array.from(new Set(metrics.modelsUsed)).join(', ')}`);

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

🎯 **Pass 1에서 확정된 단계들**: 
${skeletonCard.steps ? skeletonCard.steps.map((step: any, i: number) => `${i+1}. ${step}`).join('\n') : '단계 정보 없음'}

⚠️ **중요**: 위 단계들과 100% 일치하는 솔루션으로만 상세 내용을 생성하세요!

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
      temperature: 0.3,
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

🚫 **절대 금지 (알려진 불가능한 조합들)**:
- Google Alert + YouTube 댓글 모니터링
- Instagram/Facebook 개인계정 직접 API
- 카카오톡 개인 메시지 자동화
- 증권사 계좌 직접 연동
- 의료 개인정보 직접 처리

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
