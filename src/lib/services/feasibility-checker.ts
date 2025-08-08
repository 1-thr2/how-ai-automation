/**
 * 🧠 동적 현실성 체크 시스템
 * AI 도구 레지스트리와 실시간 정보를 활용해서 시스템적으로 현실성을 판단합니다.
 */

import { detectDomainEnhanced, getOptimalAITools } from './ai-tools-registry';
import { searchWithRAG } from './rag';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface FeasibilityCheck {
  isRealistic: boolean;
  feasibilityScore: number; // 1-10
  impossibleElements: string[];
  expensiveElements: string[];
  complexElements: string[];
  viableAlternatives: string[];
  costWarnings: string[];
  difficultyWarnings: string[];
  recommendedApproach: string;
}

/**
 * 가격 패턴 감지 및 분석
 */
function analyzePricingPattern(pricingHint: string): {
  monthlyMin: number;
  isFree: boolean;
  hasFreeTier: boolean;
  isExpensive: boolean;
} {
  const pricing = pricingHint.toLowerCase();
  
  // 무료 패턴
  if (pricing.includes('무료') || pricing.includes('free')) {
    return { monthlyMin: 0, isFree: true, hasFreeTier: true, isExpensive: false };
  }
  
  // 가격 추출 ($99, 월 $19.99 등)
  const priceMatch = pricing.match(/\$(\d+(?:\.\d+)?)/);
  const monthlyMin = priceMatch ? parseFloat(priceMatch[1]) : 0;
  
  return {
    monthlyMin,
    isFree: monthlyMin === 0,
    hasFreeTier: pricing.includes('무료 플랜') || pricing.includes('무료 체험') || pricing.includes('free'),
    isExpensive: monthlyMin > 50
  };
}

/**
 * 복잡성 수준 분석
 */
function analyzeComplexity(difficultyLevel: string, setupTime: string): {
  isComplex: boolean;
  isBeginnerFriendly: boolean;
  setupMinutes: number;
} {
  const isBeginnerFriendly = difficultyLevel === '초급' || difficultyLevel === '초급-중급';
  const isComplex = difficultyLevel.includes('고급') || difficultyLevel.includes('중급-고급');
  
  // 설정 시간 추출 (15-30분 → 30)
  const timeMatch = setupTime.match(/(\d+)/g);
  const setupMinutes = timeMatch ? Math.max(...timeMatch.map(Number)) : 60;
  
  return {
    isComplex: isComplex || setupMinutes > 60,
    isBeginnerFriendly,
    setupMinutes
  };
}

/**
 * 🤖 AI 기반 현실성 체크 - 너처럼 생각하는 부분!
 */
async function performAIRealismCheck(userInput: string, followupAnswers: any): Promise<{
  isRealistic: boolean;
  reasoning: string;
  issues: string[];
  alternatives: string[];
  confidence: number;
}> {
  
  const prompt = `당신은 2025년 자동화 현실성 검증 전문가입니다. 
다음 요청이 실제로 개인 개발자/초보자가 구현 가능한지 정확히 판단하세요.

**사용자 요청**: "${userInput}"
**추가 정보**: ${JSON.stringify(followupAnswers, null, 2)}

🔍 **반드시 고려할 2025년 현실**:
- Twitter API: 월 $100+, 개인용 불가능
- Instagram API: 비즈니스 인증 필수, 복잡한 심사
- Facebook API: Meta 비즈니스 검증 필수
- 카카오톡 개인 메시지 API: 2022년부터 차단
- 네이버 대부분 서비스: 공식 API 미제공
- YouTube 댓글 실시간: RSS 지원 안함
- 은행/금융 API: 사업자등록증+보안인증 필수
- 부동산 사이트: 대부분 크롤링 금지

🎯 **무료/실현가능한 대안들**:
- Google Alert, IFTTT, Zapier 무료플랜
- RSS 피드, 공공데이터포털
- Gmail, Slack Webhook
- GitHub API, Google Sheets API

JSON으로 응답하세요:
{
  "isRealistic": true/false,
  "reasoning": "구체적인 판단 근거",
  "issues": ["불가능한 이유들"],
  "alternatives": ["현실적인 대안들"],
  "confidence": 85
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: '당신은 API 제약사항과 2025년 현실을 정확히 아는 전문가입니다. 불가능한 것은 명확히 불가능하다고 해야 합니다.' 
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 600,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log(`🤖 [AI 현실성 체크] ${result.isRealistic ? '가능' : '불가능'} (신뢰도: ${result.confidence}%)`);
    console.log(`🧠 [AI 판단 근거] ${result.reasoning}`);
    
    return {
      isRealistic: result.isRealistic || false,
      reasoning: result.reasoning || '판단 불가',
      issues: result.issues || [],
      alternatives: result.alternatives || [],
      confidence: result.confidence || 50
    };
    
  } catch (error) {
    console.error('🚨 [AI 현실성 체크] 실패:', error);
    return {
      isRealistic: false,
      reasoning: 'AI 분석 실패',
      issues: ['AI 분석 시스템 오류'],
      alternatives: ['수동 검토 필요'],
      confidence: 0
    };
  }
}

/**
 * 특정 플랫폼/API의 2025년 현실성 체크
 */
const PLATFORM_CONSTRAINTS: Record<string, {
  isRealistic: boolean;
  reason: string;
  alternatives: string[];
  keywords?: string[];
}> = {
  'twitter': {
    isRealistic: false,
    reason: 'Twitter API 2025년 현재 월 $100부터 시작, 초보자에게 비현실적',
    alternatives: ['Google Alert + RSS', 'IFTTT + RSS 피드'],
    keywords: ['twitter', '트위터', 'x.com', '엑스']
  },
  'instagram': {
    isRealistic: false,
    reason: 'Instagram API는 비즈니스 계정 + Meta 심사 필요',
    alternatives: ['수동 체크 + 스케줄링', 'Google Alert'],
    keywords: ['instagram', '인스타그램', '인스타', 'ig']
  },
  'facebook': {
    isRealistic: false,
    reason: 'Facebook API는 비즈니스 계정 + 앱 심사 과정 복잡',
    alternatives: ['Facebook 페이지 RSS', 'Google Alert'],
    keywords: ['facebook', '페이스북', 'fb', 'meta']
  },
  'kakao': {
    isRealistic: false,
    reason: '카카오톡 개인 메시지 API는 2022년부터 차단',
    alternatives: ['Slack Webhook', 'Discord Webhook', 'Gmail'],
    keywords: ['kakao', '카카오', '카카오톡', 'kakaotalk']
  },
  'naver': {
    isRealistic: false,
    reason: '네이버 서비스 대부분 공식 API 미제공',
    alternatives: ['공공데이터포털', 'Google Sheets API'],
    keywords: ['naver', '네이버', '네이버카페', '네이버블로그']
  },
  'youtube_comments': {
    isRealistic: false,
    reason: 'YouTube 댓글 실시간 모니터링은 RSS 지원 안함',
    alternatives: ['YouTube RSS (동영상만)', 'Google Alert'],
    keywords: ['youtube 댓글', '유튜브 댓글', '댓글 모니터링', '댓글 감지']
  }
};

/**
 * 🎯 메인 현실성 체크 함수
 */
export async function checkSystematicFeasibility(
  userInput: string, 
  followupAnswers: any = {}
): Promise<FeasibilityCheck> {
  
  console.log('🧠 [현실성 체크] 시스템적 분석 시작...');
  
  // 🤖 AI 기반 현실성 1차 검증
  const aiRealism = await performAIRealismCheck(userInput, followupAnswers);
  
  // 1. 도메인 감지 및 최적 도구 추천
  const domain = detectDomainEnhanced(userInput, followupAnswers);
  const recommendedTools = getOptimalAITools(domain, 'automation', false); // 고급 도구 제외
  
  const allTools = [...recommendedTools.primary, ...recommendedTools.secondary];
  console.log(`🔍 [현실성 체크] ${allTools.length}개 도구 분석 중...`);
  
  // 2. 비용 분석
  const expensiveTools = [];
  const affordableTools = [];
  let totalMinCost = 0;
  
  for (const tool of allTools) {
    const pricing = analyzePricingPattern(tool.pricingHint);
    if (pricing.isExpensive) {
      expensiveTools.push(`${tool.name} (월 $${pricing.monthlyMin}+)`);
    } else if (pricing.isFree || pricing.hasFreeTier) {
      affordableTools.push(tool.name);
    }
    totalMinCost += pricing.monthlyMin;
  }
  
  // 3. 복잡성 분석
  const complexTools = [];
  const beginnerFriendlyTools = [];
  
  for (const tool of allTools) {
    const complexity = analyzeComplexity(tool.difficultyLevel, tool.setupTime);
    if (complexity.isComplex) {
      complexTools.push(`${tool.name} (${tool.difficultyLevel})`);
    } else if (complexity.isBeginnerFriendly) {
      beginnerFriendlyTools.push(tool.name);
    }
  }
  
  // 4. 플랫폼별 제약사항 체크 (한글/영어 키워드 지원)
  const input = userInput.toLowerCase();
  const impossibleElements = [];
  const platformAlternatives = [];
  
  for (const [platform, constraint] of Object.entries(PLATFORM_CONSTRAINTS)) {
    // keywords 배열이 있으면 사용, 없으면 기존 platform 이름 사용
    const keywordsToCheck = constraint.keywords || [platform];
    
    const isMatched = keywordsToCheck.some(keyword => input.includes(keyword.toLowerCase()));
    
    if (isMatched && !constraint.isRealistic) {
      impossibleElements.push(constraint.reason);
      platformAlternatives.push(...constraint.alternatives);
      console.log(`🚨 [현실성 체크] ${platform} 감지: "${constraint.reason}"`);
    }
  }
  
  // 5. AI 기반 최종 현실성 점수 계산 (AI 판단 우선)
  let feasibilityScore = aiRealism.isRealistic ? 8 : 3; // AI 판단을 기본으로
  
  // 비용 패널티
  if (totalMinCost > 100) feasibilityScore -= 4;
  else if (totalMinCost > 50) feasibilityScore -= 2;
  else if (totalMinCost > 20) feasibilityScore -= 1;
  
  // 복잡성 패널티
  if (complexTools.length > beginnerFriendlyTools.length) feasibilityScore -= 2;
  
  // 플랫폼 제약 패널티
  if (impossibleElements.length > 0) feasibilityScore -= 3;
  
  // 최소 1점 보장
  feasibilityScore = Math.max(1, feasibilityScore);
  
  // 6. 대안 추천
  const viableAlternatives = [
    ...platformAlternatives,
    ...affordableTools.slice(0, 3),
  ].filter((item, index, arr) => arr.indexOf(item) === index); // 중복 제거
  
  // 7. 권장 접근법 결정
  let recommendedApproach = '';
  if (feasibilityScore >= 7) {
    recommendedApproach = `추천 도구(${beginnerFriendlyTools.slice(0, 2).join(', ')})로 직접 구현`;
  } else if (feasibilityScore >= 5) {
    recommendedApproach = `무료/저비용 도구(${affordableTools.slice(0, 2).join(', ')})로 반자동 구현`;
  } else {
    recommendedApproach = `단순한 대안(${viableAlternatives.slice(0, 2).join(', ')})으로 목적 달성`;
  }
  
  // AI 인사이트를 통합한 최종 결과
  const finalImpossibleElements = [...new Set([
    ...aiRealism.issues,
    ...impossibleElements
  ])];
  
  const finalViableAlternatives = [...new Set([
    ...aiRealism.alternatives,
    ...viableAlternatives
  ])];

  const result: FeasibilityCheck = {
    isRealistic: aiRealism.isRealistic && feasibilityScore >= 5,
    feasibilityScore,
    impossibleElements: finalImpossibleElements,
    expensiveElements: expensiveTools,
    complexElements: complexTools,
    viableAlternatives: finalViableAlternatives,
    costWarnings: totalMinCost > 50 ? [`예상 월 비용: $${totalMinCost}+`] : [],
    difficultyWarnings: complexTools.length > 0 ? [`복잡한 설정 필요: ${complexTools.join(', ')}`] : [],
    recommendedApproach: aiRealism.isRealistic ? recommendedApproach : `AI 권장: ${aiRealism.alternatives[0] || '대안 검토 필요'}`
  };
  
  console.log(`📊 [현실성 체크] 점수: ${feasibilityScore}/10, 현실적: ${result.isRealistic}`);
  console.log(`💰 [현실성 체크] 비용: $${totalMinCost}/월, 복잡도: ${complexTools.length}개`);
  
  return result;
}

/**
 * 간단한 키워드 기반 빠른 체크 (fallback용)
 */
export function quickFeasibilityCheck(userInput: string): Partial<FeasibilityCheck> {
  const input = userInput.toLowerCase();
  const impossibleElements = [];
  const viableAlternatives = [];
  
  // 플랫폼별 빠른 체크 (한글/영어 키워드 지원)
  for (const [platform, constraint] of Object.entries(PLATFORM_CONSTRAINTS)) {
    const keywordsToCheck = constraint.keywords || [platform];
    const isMatched = keywordsToCheck.some(keyword => input.includes(keyword.toLowerCase()));
    
    if (isMatched && !constraint.isRealistic) {
      impossibleElements.push(constraint.reason);
      viableAlternatives.push(...constraint.alternatives);
    }
  }
  
  const feasibilityScore = impossibleElements.length > 0 ? 3 : 7;
  
  return {
    isRealistic: feasibilityScore >= 5,
    feasibilityScore,
    impossibleElements,
    viableAlternatives: viableAlternatives.slice(0, 3)
  };
}