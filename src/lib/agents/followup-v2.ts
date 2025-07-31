import OpenAI from 'openai';
import { estimateTokens, selectModel } from '../blueprints/reader';

// 🔧 Blueprint 내용 인라인 처리 (Vercel 파일시스템 문제 해결)
const FOLLOWUP_BASE = `# 후속질문 생성 기본 블루프린트

당신은 자동화 솔루션을 위한 후속질문 생성 전문가입니다.

사용자의 초기 요청을 분석하여, 맞춤형 자동화를 설계하기 위한 핵심 후속질문들을 생성하세요.

## 핵심 원칙:
1. **깊이 있는 맥락 파악**: 표면적 요청 뒤의 진짜 목적과 업무 맥락 발굴
2. **실행 가능성 확보**: 구체적인 실행 방법과 도구 선택을 위한 정보 수집
3. **확장 가능성 탐색**: 단순 자동화를 더 큰 업무 시스템으로 발전시킬 수 있는 방향 모색

## 필수 질문 영역:
- **데이터 소스**: 현재 어떤 데이터를 어떻게 다루는지
- **현재 업무**: 지금은 어떤 방식으로 처리하는지
- **성공 기준**: 어떤 결과를 얻고 싶은지
- **기술 수준**: 어떤 도구나 방법을 선호하는지
- **업무 환경**: 팀, 회사, 개인적 상황

## 질문 형식:
각 질문은 다음 형식을 따르세요:
- **type**: "single" (단일선택) 또는 "multiple" (복수선택)
- **options**: 선택지 배열 (반드시 "기타 (직접입력)"과 "잘모름 (AI가 추천)" 포함)
- **category**: "data" | "workflow" | "goals" | "tech" | "environment"
- **importance**: "high" | "medium" | "low"

## 반드시 포함해야 할 옵션:
모든 질문의 options 배열 마지막에 반드시 다음 두 옵션을 포함하세요:
- "기타 (직접입력)"
- "잘모름 (AI가 추천)"`;

const FOLLOWUP_DRAFT = `# Draft 단계: 초기 후속질문 생성

## 목표
사용자 요청을 빠르게 분석하여 3-4개의 핵심 후속질문 초안을 생성합니다.

## 접근 방식
- **속도 우선**: 완벽함보다는 빠른 아이디어 도출
- **핵심 영역 커버**: 5개 영역(data, workflow, goals, tech, environment) 중 가장 중요한 것들 선택
- **간단한 옵션**: 각 질문당 4-6개의 기본 옵션만 제공

## 제약 조건
- 최대 4개 질문
- 각 질문당 최대 6개 옵션 (기본 옵션 + "기타 (직접입력)" + "잘모름 (AI가 추천)")
- 토큰 제한: 400 토큰 이내`;

const FOLLOWUP_REFINE = `# Refine 단계: 후속질문 정교화

## 목표
Draft 단계에서 생성된 질문들을 더 정교하고 실용적으로 개선합니다.

## 개선 포인트
1. **질문 명확성**: 사용자가 이해하기 쉬운 표현으로 수정
2. **옵션 완성도**: 실제 상황을 반영한 구체적인 선택지 추가
3. **설명 보강**: 각 질문의 목적과 중요성을 명확히 설명
4. **논리적 순서**: 질문 간의 연관성과 순서 최적화

## 개선 기준
- **명확성**: 전문용어 → 일반용어로 변경
- **구체성**: 추상적 옵션 → 구체적 상황으로 변경
- **완성도**: 누락된 중요 옵션 추가
- **사용자 친화성**: 사용자 관점에서 선택하기 쉬운 옵션 구성`;

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
    // 🔧 인라인 Blueprint 사용 (파일시스템 문제 해결)
    const systemPrompt = `${FOLLOWUP_BASE}\n\n${FOLLOWUP_DRAFT}`;
    const userPrompt = `사용자 요청: "${userInput}"

위 요청을 분석하여 3-4개의 핵심 후속질문 초안을 생성하세요.
속도를 우선시하여 간단하고 명확한 질문만 만드세요.`;

    // 토큰 수 추정 및 모델 선택
    const estimatedTokens = estimateTokens(systemPrompt + userPrompt);
    const model = selectModel(estimatedTokens);
    
    console.log(`📊 [Draft] 예상 토큰: ${estimatedTokens}, 선택된 모델: ${model}`);
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 600,
      temperature: 0.8 // Draft는 창의성 중시
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Draft 응답이 비어있습니다');
    }

    // JSON 파싱 (개선된 로직)
    const questions = parseQuestionsJSON(content);
    const latency = Date.now() - startTime;
    const actualTokens = response.usage?.total_tokens || estimatedTokens;
    
    console.log(`✅ [Draft] 완료 - ${questions.length}개 질문, ${actualTokens} 토큰, ${latency}ms`);
    
    return {
      questions,
      tokens: actualTokens,
      latency
    };
    
  } catch (error) {
    console.error('❌ [Draft] 실패:', error);
    throw error;
  }
}

/**
 * Refine 단계: 질문 품질 개선
 */
async function refineStepGen(draftQuestions: any[], userInput: string): Promise<{
  questions: any[];
  tokens: number;
  latency: number;
}> {
  const startTime = Date.now();
  console.log('🔧 [Refine] 질문 품질 개선 시작...');
  
  try {
    // 🔧 인라인 Blueprint 사용 (파일시스템 문제 해결)
    const systemPrompt = `${FOLLOWUP_BASE}\n\n${FOLLOWUP_REFINE}`;
    const userPrompt = `원본 요청: "${userInput}"

Draft 단계에서 생성된 질문들:
${JSON.stringify(draftQuestions, null, 2)}

위 질문들을 더 명확하고 실용적으로 개선해주세요. 
질문의 개수는 유지하되, 표현과 옵션들을 더 구체적이고 사용자 친화적으로 만드세요.`;

    // 토큰 수 추정 및 모델 선택
    const estimatedTokens = estimateTokens(systemPrompt + userPrompt);
    const model = selectModel(estimatedTokens);
    
    console.log(`📊 [Refine] 예상 토큰: ${estimatedTokens}, 선택된 모델: ${model}`);
    
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.3 // Refine은 정확성 중시
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Refine 응답이 비어있습니다');
    }

    // JSON 파싱
    const questions = parseQuestionsJSON(content);
    const latency = Date.now() - startTime;
    const actualTokens = response.usage?.total_tokens || estimatedTokens;
    
    console.log(`✅ [Refine] 완료 - ${questions.length}개 질문, ${actualTokens} 토큰, ${latency}ms`);
    
    return {
      questions,
      tokens: actualTokens,
      latency
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
  try {
    // 1차 시도: 직접 파싱
    const parsed = JSON.parse(content);
    return parsed.questions || [];
  } catch (firstError) {
    console.log('🔄 [JSON] 1차 파싱 실패, 정리 후 재시도...');
    
    try {
      // 2차 시도: 마크다운 코드 블록 제거
      let cleanContent = content;
      if (content.includes('```json')) {
        const startIndex = content.indexOf('```json') + 7;
        const endIndex = content.lastIndexOf('```');
        cleanContent = content.substring(startIndex, endIndex).trim();
      }
      
      // 3차 시도: 추가 정리
      cleanContent = cleanContent
        .replace(/[\u201C\u201D]/g, '"')  // 스마트 따옴표
        .replace(/[\u2018\u2019]/g, "'")  // 스마트 아포스트로피
        .replace(/,(\s*[}\]])/g, '$1')   // trailing comma 제거
        .trim();
      
      const parsed = JSON.parse(cleanContent);
      return parsed.questions || [];
      
    } catch (secondError) {
      console.error('❌ [JSON] 2차 파싱도 실패, 폴백 질문 반환');
      
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
      key: "data_source",
      question: "현재 처리하는 데이터는 주로 어디에서 오나요?",
      type: "single",
      options: ["엑셀/구글시트", "데이터베이스", "웹사이트", "이메일", "기타 (직접입력)", "잘모름 (AI가 추천)"],
      category: "data",
      importance: "high",
      description: "데이터 소스 파악"
    },
    {
      key: "current_workflow",
      question: "현재는 이 작업을 어떻게 처리하고 계신가요?",
      type: "single",
      options: ["수동으로 직접", "간단한 도구 사용", "복잡한 시스템 사용", "아직 시작 안함", "기타 (직접입력)", "잘모름 (AI가 추천)"],
      category: "workflow",
      importance: "high",
      description: "현재 업무 방식 파악"
    },
    {
      key: "success_criteria",
      question: "이 자동화를 통해 얻고 싶은 가장 중요한 결과는 무엇인가요?",
      type: "single",
      options: ["시간 절약", "정확도 향상", "실시간 모니터링", "데이터 인사이트", "기타 (직접입력)", "잘모름 (AI가 추천)"],
      category: "goals",
      importance: "high",
      description: "성공 기준 설정"
    }
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
    errors: []
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
    console.log(`💰 [비용] 예상 절약: ${((metrics.totalTokens * 0.00015) * 100).toFixed(2)}% (기존 4o 대비)`);
    
    return {
      questions: refineResult.questions,
      metrics
    };
    
  } catch (error) {
    metrics.success = false;
    metrics.errors = [error instanceof Error ? error.message : String(error)];
    metrics.latencyMs = Date.now() - overallStartTime;
    
    console.error('❌ [2-Step] 실패:', error);
    
    // 완전 실패 시에도 폴백 질문 반환
    return {
      questions: getFallbackQuestions(),
      metrics
    };
  }
}