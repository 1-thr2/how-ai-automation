/**
 * 🚀 2024-2025 AI 도구 레지스트리 서비스
 * 최신 AI 도구 메타데이터를 관리하고 도메인별 최적 도구를 추천합니다.
 */

import aiToolsData from '../data/ai-tools-2025.json';

// Types
export interface AITool {
  toolSlug: string;
  name: string;
  description: string;
  capabilityTags: string[];
  pricingHint: string;
  docsUrl: string;
  koreanSupport: string;
  difficultyLevel: '초급' | '초급-중급' | '중급' | '중급-고급' | '고급';
  setupTime: string;
}

export interface ToolRecommendation {
  tool: AITool;
  relevanceScore: number;
  reasoning: string;
}

export interface DomainTools {
  primary: AITool[];
  secondary: AITool[];
  fallback: AITool[];
  reasoning: string;
}

/**
 * 🔍 도메인 감지 (기존 로직 개선)
 */
export function detectDomainEnhanced(userInput: string, followupAnswers: any = {}): string {
  const input = userInput.toLowerCase();
  const context = JSON.stringify(followupAnswers).toLowerCase();
  const combined = `${input} ${context}`;

  // 🎯 우선순위 기반 도메인 감지
  const domainPatterns = [
    { domain: 'sns_analytics', patterns: ['sns', '소셜', 'facebook', 'instagram', 'tiktok', '광고', 'ads', '분석'], weight: 3 },
    { domain: 'customer_service', patterns: ['고객', '문의', 'cs', '상담', '채팅', '서비스'], weight: 3 },
    { domain: 'content_creation', patterns: ['콘텐츠', '이미지', '글쓰기', '생성', '제작', 'content'], weight: 2 },
    { domain: 'data_analysis', patterns: ['데이터', '분석', '차트', '리포트', '통계', 'dashboard'], weight: 2 },
    { domain: 'document_processing', patterns: ['문서', '요약', 'pdf', '파일', '정리', '번역'], weight: 2 },
    { domain: 'voice_automation', patterns: ['음성', '목소리', '녹음', 'stt', '전화', 'voice'], weight: 2 },
    { domain: 'image_workflow', patterns: ['이미지', '사진', '그림', '디자인', '편집', 'image'], weight: 2 },
    { domain: 'general_automation', patterns: ['자동화', 'automation', '워크플로우', '연동', '통합'], weight: 1 }
  ];

  let bestMatch = { domain: 'general_automation', score: 0 };

  for (const { domain, patterns, weight } of domainPatterns) {
    const matches = patterns.filter(pattern => combined.includes(pattern)).length;
    const score = matches * weight;
    
    if (score > bestMatch.score) {
      bestMatch = { domain, score };
    }
  }

  console.log(`🎯 [도메인 감지] "${bestMatch.domain}" (점수: ${bestMatch.score})`);
  return bestMatch.domain;
}

/**
 * 🛠️ 도메인별 최적 AI 도구 추천 (2025년 버전)
 */
export function getOptimalAITools(
  domain: string, 
  priority: 'automation' | 'dataCollection' | 'reporting' | 'integration' = 'automation',
  includeAdvanced: boolean = false
): DomainTools {
  
  console.log(`🔍 [도구 추천] ${domain} 도메인에서 ${priority} 우선으로 도구 검색...`);

  // 도메인 매핑에서 추천 도구 가져오기
  const domainMapping = aiToolsData.domainMappings[domain as keyof typeof aiToolsData.domainMappings];
  
  if (!domainMapping) {
    console.warn(`⚠️ [도구 추천] 알 수 없는 도메인: ${domain}, 기본 도구 사용`);
    return getGeneralAutomationTools(includeAdvanced);
  }

  // 모든 카테고리에서 추천된 도구들 수집
  const recommendedTools: AITool[] = [];
  const allCategories = aiToolsData.categories;

  for (const toolSlug of domainMapping) {
    for (const categoryKey of Object.keys(allCategories)) {
      const category = allCategories[categoryKey as keyof typeof allCategories];
      const tool = category.tools.find((t: any) => t.toolSlug === toolSlug);
      if (tool) {
        recommendedTools.push(tool as AITool);
        break;
      }
    }
  }

  // 난이도 기준 필터링
  let filteredTools = recommendedTools;
  if (!includeAdvanced) {
    filteredTools = recommendedTools.filter(tool => 
      !tool.difficultyLevel.includes('고급')
    );
  }

  // 우선순위별 분류
  const priorityMapping = {
    automation: ['make', 'zapier', 'n8n', 'pipedream'],
    dataCollection: ['supermetrics', 'airtable', 'notion_api'],
    reporting: ['looker_studio', 'tableau_public'],
    integration: ['zapier', 'make', 'airtable']
  };

  const priorityTools = priorityMapping[priority] || [];
  
  const primary = filteredTools.filter(tool => priorityTools.includes(tool.toolSlug));
  const secondary = filteredTools.filter(tool => !priorityTools.includes(tool.toolSlug));
  const fallback = getUniversalFallbackTools();

  return {
    primary,
    secondary,
    fallback,
    reasoning: `${domain} 도메인에서 ${priority} 우선으로 ${primary.length + secondary.length}개 도구 추천`
  };
}

/**
 * 🎯 특정 도구 정보 조회
 */
export function getToolBySlug(toolSlug: string): AITool | null {
  const allCategories = aiToolsData.categories;
  
  for (const categoryKey of Object.keys(allCategories)) {
    const category = allCategories[categoryKey as keyof typeof allCategories];
    const tool = category.tools.find((t: any) => t.toolSlug === toolSlug);
    if (tool) {
      return tool as AITool;
    }
  }
  
  return null;
}

/**
 * 🔍 기능 태그 기반 도구 검색
 */
export function searchToolsByCapability(capabilityTag: string, maxResults: number = 5): AITool[] {
  const results: AITool[] = [];
  const allCategories = aiToolsData.categories;
  
  for (const categoryKey of Object.keys(allCategories)) {
    const category = allCategories[categoryKey as keyof typeof allCategories];
    for (const tool of category.tools) {
      if ((tool as AITool).capabilityTags.includes(capabilityTag)) {
        results.push(tool as AITool);
      }
      if (results.length >= maxResults) break;
    }
    if (results.length >= maxResults) break;
  }
  
  return results;
}

/**
 * 📊 도구 추천 점수 계산
 */
export function calculateToolRelevance(
  tool: AITool, 
  userInput: string, 
  domain: string
): ToolRecommendation {
  let score = 0;
  const reasoning: string[] = [];

  // 도메인 매칭 점수
  const domainMapping = aiToolsData.domainMappings[domain as keyof typeof aiToolsData.domainMappings];
  if (domainMapping && domainMapping.includes(tool.toolSlug)) {
    score += 30;
    reasoning.push('도메인 최적화');
  }

  // 키워드 매칭 점수
  const keywords = userInput.toLowerCase().split(' ');
  const toolText = `${tool.name} ${tool.description} ${tool.capabilityTags.join(' ')}`.toLowerCase();
  
  const keywordMatches = keywords.filter(keyword => 
    keyword.length > 2 && toolText.includes(keyword)
  ).length;
  
  score += keywordMatches * 10;
  if (keywordMatches > 0) reasoning.push(`키워드 매칭 (${keywordMatches}개)`);

  // 난이도 점수 (초급 우대)
  if (tool.difficultyLevel === '초급') {
    score += 20;
    reasoning.push('초보자 친화적');
  } else if (tool.difficultyLevel === '초급-중급') {
    score += 10;
  }

  // 한국어 지원 점수
  if (tool.koreanSupport.includes('완전') || tool.koreanSupport.includes('뛰어난')) {
    score += 15;
    reasoning.push('한국어 지원 우수');
  }

  // 가격 점수 (무료 우대)
  if (tool.pricingHint.includes('무료') || tool.pricingHint.includes('free')) {
    score += 15;
    reasoning.push('무료 사용 가능');
  }

  return {
    tool,
    relevanceScore: score,
    reasoning: reasoning.join(', ')
  };
}

/**
 * 🔧 범용 폴백 도구들
 */
function getUniversalFallbackTools(): AITool[] {
  return [
    getToolBySlug('zapier'),
    getToolBySlug('airtable'),
    getToolBySlug('claude_3_haiku'),
    getToolBySlug('looker_studio')
  ].filter(Boolean) as AITool[];
}

/**
 * 🌐 일반적인 자동화 도구 세트
 */
function getGeneralAutomationTools(includeAdvanced: boolean): DomainTools {
  const tools = [
    getToolBySlug('make'),
    getToolBySlug('zapier'),
    getToolBySlug('airtable'),
    getToolBySlug('claude_3_haiku')
  ].filter(Boolean) as AITool[];

  if (includeAdvanced) {
    tools.push(...([
      getToolBySlug('n8n'),
      getToolBySlug('pipedream')
    ].filter(Boolean) as AITool[]));
  }

  return {
    primary: tools.slice(0, 2),
    secondary: tools.slice(2),
    fallback: getUniversalFallbackTools(),
    reasoning: '일반 자동화 도구 세트'
  };
}

/**
 * 🆕 2025년 신규 도구 피어 서치 (Step B용)
 */
export async function performPeerToolSearch(
  domain: string, 
  failedTool: string, 
  userGoal: string
): Promise<string[]> {
  console.log(`🔍 [피어 서치] ${domain} 도메인에서 ${failedTool} 대신 사용할 도구 검색...`);

  try {
    // Tavily RAG 사용하여 실시간 도구 검색
    const { searchWithRAG } = await import('./rag');
    
    const searchQuery = `"${failedTool}" alternative ${domain} tools 2025 korean support free legal`;
    const ragResults = await searchWithRAG(searchQuery, { maxResults: 5 });
    
    // 검색 결과에서 도구명 추출
    const foundTools: string[] = [];
    
    for (const result of ragResults) {
      const content = result.content.toLowerCase();
      
      // 레지스트리에 있는 도구들 중 언급된 것 찾기
      const allCategories = aiToolsData.categories;
      for (const categoryKey of Object.keys(allCategories)) {
        const category = allCategories[categoryKey as keyof typeof allCategories];
        for (const tool of category.tools) {
          const toolData = tool as AITool;
          if (content.includes(toolData.name.toLowerCase()) || 
              content.includes(toolData.toolSlug)) {
            if (!foundTools.includes(toolData.name)) {
              foundTools.push(toolData.name);
            }
          }
        }
      }
    }

    // 최소 3개 도구 보장
    if (foundTools.length < 3) {
      const domainTools = getOptimalAITools(domain, 'automation', true);
      const additionalTools = [...domainTools.primary, ...domainTools.secondary]
        .map(tool => tool.name)
        .filter(name => !foundTools.includes(name))
        .slice(0, 3 - foundTools.length);
      
      foundTools.push(...additionalTools);
    }

    console.log(`✅ [피어 서치] ${foundTools.length}개 대안 도구 발견: ${foundTools.join(', ')}`);
    return foundTools;

  } catch (error) {
    console.error('❌ [피어 서치] 실패:', error);
    
    // 폴백: 레지스트리에서 도메인 도구 반환
    const domainTools = getOptimalAITools(domain, 'automation', true);
    return [...domainTools.primary, ...domainTools.secondary]
      .map(tool => tool.name)
      .slice(0, 5);
  }
}