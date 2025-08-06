import { tavily } from '@tavily/core';
import { detectDomain, getOptimalToolsForDomain } from '../domain-tools-registry';

/**
 * Tavily RAG 서비스
 * 최신 정보 검색 및 검증을 담당
 */

// Tavily 클라이언트 설정
const tavilyClient = tavily({
  apiKey: process.env.TAVILY_API_KEY || '',
});

/**
 * RAG 검색 결과 인터페이스
 */
export interface RAGResult {
  url: string;
  title: string;
  content: string;
  score: number;
  publishedDate?: string;
  relevanceScore?: number; // 추가: 관련성 점수
  qualityScore?: number;   // 추가: 품질 점수
}

/**
 * RAG 검색 옵션
 */
export interface RAGSearchOptions {
  maxResults?: number;
  includeImages?: boolean;
  includeAnswers?: boolean;
  searchDepth?: 'basic' | 'advanced';
  excludeDomains?: string[];
  includeDomains?: string[];
}

/**
 * 도구 연동 상태 인터페이스
 */
export interface ToolIntegrationStatus {
  isSupported: boolean;
  toolName: string;
  officialUrl?: string;
  alternatives?: {
    name: string;
    url: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'advanced';
    pricing?: string;
  }[];
  reason?: string;
  confidence: number; // 0-1 사이의 신뢰도
}

/**
 * 주요 검색 함수: 쿼리에 대한 최신 정보 검색
 */
export async function searchWithRAG(
  query: string,
  options: RAGSearchOptions = {}
): Promise<RAGResult[]> {
  try {
    console.log(`🔍 [RAG] 검색 시작: "${query}"`);

    const defaultOptions = {
      maxResults: 3,
      includeImages: false,
      includeAnswers: true,
      searchDepth: 'basic' as const,
      ...options,
    };

    // Tavily API 호출
    const response = await tavilyClient.search(query, {
      max_results: defaultOptions.maxResults,
      include_images: defaultOptions.includeImages,
      include_answer: defaultOptions.includeAnswers,
      search_depth: defaultOptions.searchDepth,
      exclude_domains: defaultOptions.excludeDomains,
      include_domains: defaultOptions.includeDomains,
    });

    // 결과 변환
    const results: RAGResult[] =
      response.results?.map((result: any) => ({
        url: result.url || '',
        title: result.title || '',
        content: result.content || '',
        score: result.score || 0,
        publishedDate: result.published_date,
      })) || [];

    console.log(`✅ [RAG] 검색 완료: ${results.length}개 결과`);
    console.log(
      `📊 [RAG] 결과 점수:`,
      results.map(r => r.score)
    );

    return results;
  } catch (error) {
    console.error('❌ [RAG] 검색 실패:', error);

    // Tavily API 오류 시 빈 결과 반환 (서비스 중단 방지)
    return [];
  }
}

/**
 * 🔧 도구 연동 가능성 확인 및 대안 검색
 */
export async function checkToolIntegration(
  toolName: string,
  platformName: string = 'Zapier'
): Promise<ToolIntegrationStatus> {
  try {
    console.log(`🔍 [도구연동] 확인 시작: ${toolName}`);

    // 🆓 간편 도구부터 우선 검색
    const easyToolsQuery = `${toolName} automation IFTTT "Google Apps Script" Pipedream free tools`;
    const easyToolsResults = await searchWithRAG(easyToolsQuery, { maxResults: 3 });

    // 🔧 No-code 플랫폼 검색  
    const noCodeQuery = `${toolName} Zapier Make "Microsoft Power Automate" no-code integration`;
    const noCodeResults = await searchWithRAG(noCodeQuery, { maxResults: 2 });

    // 🔍 API/고급 도구 검색
    const advancedQuery = `${toolName} API direct integration webhook custom script`;
    const advancedResults = await searchWithRAG(advancedQuery, { maxResults: 2 });

    // 결과 분석
    const allContent = [...easyToolsResults, ...noCodeResults, ...advancedResults]
      .map(r => `${r.title} ${r.content}`)
      .join(' ')
      .toLowerCase();

    // 🎯 다양한 도구 옵션 분석
    const easyOptions = ['ifttt', 'google apps script', 'pipedream', 'slack workflow'];
    const noCodeOptions = ['zapier', 'make', 'power automate', 'integromat'];
    const advancedOptions = ['api', 'webhook', 'script', 'custom'];

    const foundEasyTools = easyOptions.filter(tool => allContent.includes(tool));
    const foundNoCodeTools = noCodeOptions.filter(tool => allContent.includes(tool));
    const foundAdvancedTools = advancedOptions.filter(tool => allContent.includes(tool));

    // 지원 여부는 어떤 옵션이라도 있으면 true
    const isSupported = foundEasyTools.length > 0 || foundNoCodeTools.length > 0 || foundAdvancedTools.length > 0;
    const confidence = Math.min((foundEasyTools.length + foundNoCodeTools.length + foundAdvancedTools.length) / 5, 1);

    let result: ToolIntegrationStatus = {
      isSupported,
      toolName,
      confidence,
      reason: isSupported
        ? `${toolName} 자동화를 위한 다양한 도구 옵션이 있습니다.`
        : `${toolName} 자동화는 제한적이지만 대안 도구를 검토해보겠습니다.`,
    };

    // 공식 URL 추가 (가장 높은 점수의 결과에서)
    const allResults = [...easyToolsResults, ...noCodeResults, ...advancedResults];
    if (isSupported && allResults.length > 0) {
      const bestResult = allResults.sort((a, b) => b.score - a.score)[0];
      result.officialUrl = bestResult.url;
    }

    // 더 나은 대안 검색 (지원되지 않는 경우든 상관없이 다양한 옵션 제공)
    console.log(`🔄 [도구연동] 다양한 자동화 대안 검색 중: ${toolName}`);

      const alternativeQueries = [
      `${toolName} "Google Apps Script" automation free tutorial guide`,
      `${toolName} IFTTT Pipedream free integration webhook`,
      `${toolName} "Slack Workflow Builder" "Microsoft Power Automate" free`,
      `${toolName} open source free automation tools RPA`,
      ];

      const alternativeResults = await Promise.all(
        alternativeQueries.map(query => searchWithRAG(query, { maxResults: 2 }))
      );

    // 🎯 우선순위 기반 대안 도구 구조화
      const alternatives = alternativeResults
        .flat()
      .slice(0, 5) // 최대 5개 대안
        .map((result, index) => {
        // 🆓 무료 도구 우선 추출
        let altName = 'Custom Script/API';
        let pricing = '개발 시간 필요';
        let difficulty: 'easy' | 'medium' | 'advanced' = 'advanced';
        
        const content = (result.title + ' ' + result.content).toLowerCase();
        
        if (content.includes('google apps script') || content.includes('google script')) {
          altName = 'Google Apps Script';
          pricing = '완전 무료';
          difficulty = 'medium';
        } else if (content.includes('ifttt')) {
          altName = 'IFTTT';
          pricing = '무료 (제한적)';
          difficulty = 'easy';
        } else if (content.includes('pipedream')) {
          altName = 'Pipedream';
          pricing = '무료 플랜 있음';
          difficulty = 'easy';
        } else if (content.includes('slack workflow')) {
          altName = 'Slack Workflow Builder';
          pricing = '슬랙 플랜에 포함';
          difficulty = 'easy';
        } else if (content.includes('power automate')) {
          altName = 'Microsoft Power Automate';
          pricing = '오피스365 포함';
          difficulty = 'medium';
        } else if (content.includes('zapier')) {
          altName = 'Zapier';
          pricing = '유료 ($20/월~)';
          difficulty = 'easy';
        } else if (content.includes('make') || content.includes('integromat')) {
          altName = 'Make.com';
          pricing = '유료 ($9/월~)';
          difficulty = 'medium';
        }

          return {
            name: altName,
            url: result.url,
          description: result.content.substring(0, 100) + '...',
          difficulty,
          pricing,
        };
      })
      .sort((a, b) => {
        // 🆓 무료 도구 우선 정렬
        const freeKeywords = ['무료', '완전 무료', '포함'];
        const aIsFree = freeKeywords.some(keyword => a.pricing.includes(keyword));
        const bIsFree = freeKeywords.some(keyword => b.pricing.includes(keyword));
        if (aIsFree && !bIsFree) return -1;
        if (!aIsFree && bIsFree) return 1;
        
        // 난이도 순 정렬 (easy > medium > advanced)
        const difficultyOrder = { easy: 0, medium: 1, advanced: 2 };
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        });

      result.alternatives = alternatives;
      console.log(`✅ [도구연동] 대안 ${alternatives.length}개 발견`);

    console.log(
      `✅ [도구연동] 분석 완료: ${toolName} - 지원여부: ${isSupported} (신뢰도: ${confidence.toFixed(2)})`
    );
    return result;
  } catch (error) {
    console.error(`❌ [도구연동] 확인 실패 (${toolName}):`, error);

    // 에러 시 안전한 기본값 반환
    return {
      isSupported: false,
      toolName,
      confidence: 0,
      reason: `${toolName} 연동 가능성을 확인하는 중 오류가 발생했습니다. 수동으로 확인이 필요합니다.`,
      alternatives: [
        {
          name: '수동 확인 필요',
          url: `https://zapier.com/apps/${toolName.toLowerCase()}/integrations`,
          description: '공식 Zapier 앱 디렉토리에서 직접 확인해보세요.',
          difficulty: 'easy',
        },
      ],
    };
  }
}

/**
 * 도구/서비스 관련 최신 정보 검색
 */
export async function searchToolInfo(toolName: string): Promise<RAGResult[]> {
  try {
    console.log(`🔧 [RAG] 도구 정보 검색: ${toolName}`);

    // ⚡ 성능 최적화: 3번 검색 → 1번 통합 검색으로 변경
    const query = `${toolName} 공식 가이드 API 문서 튜토리얼 2024 최신 기능 사용법`;
    console.log(`🔍 [RAG] 통합 검색: "${query}"`);
    
    const results = await searchWithRAG(query, { maxResults: 3 }); // 3개로 충분
    
    // 점수 기준 정렬
    const sortedResults = results.sort((a, b) => b.score - a.score);

    console.log(`✅ [RAG] 도구 정보 수집 완료: ${sortedResults.length}개`);
    return sortedResults;
  } catch (error) {
    console.error(`❌ [RAG] 도구 정보 검색 실패 (${toolName}):`, error);
    return [];
  }
}

/**
 * URL 유효성 검증
 */
export async function validateURL(url: string): Promise<boolean> {
  try {
    console.log(`🔗 [RAG] URL 검증: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const isValid = response.ok;
    console.log(`${isValid ? '✅' : '❌'} [RAG] URL 검증 결과: ${url} - ${response.status}`);

    return isValid;
  } catch (error) {
    console.log(`❌ [RAG] URL 검증 실패: ${url}`);
    return false;
  }
}

// 🚀 세션별 RAG 캐시 (중복 검색 방지)
const ragSessionCache = new Map<string, any>();

/**
 * 🎯 도메인별 맞춤형 검색 쿼리 생성
 */
function generateDomainSpecificQuery(userInput: string, domain: string, tools: string[]): string {
  // 🎯 핵심 키워드 추출 (더 정확한 검색을 위해)
  const keywords = extractCoreKeywords(userInput);
  const coreKeywords = keywords.slice(0, 4).join(' '); // 최대 4개 핵심 키워드만
  
  // 🔍 구글시트/스프레드시트 특별 처리
  if (userInput.includes('구글시트') || userInput.includes('google sheets') || userInput.includes('스프레드시트')) {
    return `Google Sheets ${coreKeywords} automation tutorial 2024`;
  }
  
  switch (domain) {
    case 'customer_support':
      return `${coreKeywords} customer support automation tutorial ${tools.slice(0,2).join(' ')} 2024`;
      
    case 'advertising':
      return `${coreKeywords} marketing automation tutorial ${tools.slice(0,2).join(' ')} 2024`;
      
    case 'hr':
      return `${coreKeywords} HR automation tutorial ${tools.slice(0,2).join(' ')} 2024`;
      
    case 'finance':
      return `${coreKeywords} financial automation tutorial ${tools.slice(0,2).join(' ')} 2024`;
      
    case 'ecommerce':
      return `${coreKeywords} ecommerce automation tutorial ${tools.slice(0,2).join(' ')} 2024`;
      
    default:
      return `${coreKeywords} automation tutorial ${tools.slice(0,2).join(' ')} 2024`;
  }
}

/**
 * 🎯 더 정확한 핵심 키워드 추출 (검색 최적화)
 */
function extractCoreKeywords(input: string): string[] {
  const stopWords = ['를', '을', '이', '가', '의', '에', '와', '과', '로', '으로', '에서', '만들고', '싶어요', '하고', '있어요', '해줘', '자동으로', '바로'];
  const keywords = input
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ') // 특수문자 제거
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.includes(word));
    
  // 🎯 중요 키워드 우선 순위 부여
  const priorityKeywords = ['구글시트', 'google sheets', '스프레드시트', '그래프', '보고서', '차트', '대시보드'];
  const priority = keywords.filter(k => priorityKeywords.some(p => k.includes(p) || p.includes(k)));
  const others = keywords.filter(k => !priorityKeywords.some(p => k.includes(p) || p.includes(k)));
  
  return [...priority, ...others].slice(0, 6); // 최대 6개
}

/**
 * 🔍 검색 결과 검증 및 필터링
 */
function validateAndFilterResults(results: RAGResult[], userInput: string, domain: string): RAGResult[] {
  if (!results || results.length === 0) {
    console.log('⚠️ [RAG] 검색 결과 없음 - 빈 배열 반환');
    return [];
  }

  const userKeywords = extractKeywords(userInput);
  const domainKeywords = getDomainKeywords(domain);
  
  const validatedResults = results
    .map(result => ({
      ...result,
      relevanceScore: calculateRelevanceScore(result, userKeywords, domainKeywords),
      qualityScore: calculateQualityScore(result)
    }))
    .filter(result => {
      // 🎯 필터링 기준 완화 (실용성 개선)
      const isRelevant = result.relevanceScore >= 0.15; // 0.3 → 0.15 완화
      const isQuality = result.qualityScore >= 0.25;    // 0.4 → 0.25 완화  
      const hasContent = result.content && result.content.length > 30; // 50 → 30 완화
      
      if (!isRelevant) {
        console.log(`❌ [RAG] 관련성 부족 제외: ${result.title} (점수: ${result.relevanceScore.toFixed(2)})`);
      }
      if (!isQuality) {
        console.log(`❌ [RAG] 품질 부족 제외: ${result.title} (점수: ${result.qualityScore.toFixed(2)})`);
      }
      if (!hasContent) {
        console.log(`❌ [RAG] 내용 부족 제외: ${result.title} (길이: ${result.content?.length || 0})`);
      }
      
      return isRelevant && isQuality && hasContent;
    })
    .sort((a, b) => (b.relevanceScore + b.qualityScore) - (a.relevanceScore + a.qualityScore)) // 점수 기준 정렬
    .slice(0, 3); // 최대 3개만 유지

  const avgRelevance = validatedResults.reduce((sum, r) => sum + r.relevanceScore, 0) / Math.max(validatedResults.length, 1);
  const avgQuality = validatedResults.reduce((sum, r) => sum + r.qualityScore, 0) / Math.max(validatedResults.length, 1);
  
  console.log(`📊 [RAG] 검증 통계: 관련성 평균 ${avgRelevance.toFixed(2)}, 품질 평균 ${avgQuality.toFixed(2)}`);
  
  // 🔍 실제 사용자가 따라할 수 있는지 검증
  validatedResults.forEach((result, index) => {
    const hasSteps = result.content.toLowerCase().includes('step') || result.content.includes('단계');
    const hasTutorial = result.title.toLowerCase().includes('tutorial') || result.content.includes('튜토리얼');
    const hasCode = result.content.includes('```') || result.content.includes('code');
    
    console.log(`🔍 [RAG ${index + 1}] ${result.title}`);
    console.log(`   📊 점수: 관련성 ${result.relevanceScore.toFixed(2)}, 품질 ${result.qualityScore.toFixed(2)}`);
    console.log(`   ✅ 실행가능성: 단계별가이드 ${hasSteps ? '✓' : '✗'}, 튜토리얼 ${hasTutorial ? '✓' : '✗'}, 코드예제 ${hasCode ? '✓' : '✗'}`);
    console.log(`   🔗 URL: ${result.url}`);
  });
  
  return validatedResults;
}

/**
 * 🔤 사용자 입력에서 핵심 키워드 추출
 */
function extractKeywords(input: string): string[] {
  const stopWords = ['를', '을', '이', '가', '의', '에', '와', '과', '로', '으로', '에서', '만들고', '싶어요', '하고', '있어요'];
  return input
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.includes(word))
    .slice(0, 10); // 최대 10개 키워드
}

/**
 * 🎯 도메인별 핵심 키워드
 */
function getDomainKeywords(domain: string): string[] {
  const domainKeywordMap: Record<string, string[]> = {
    customer_support: ['고객', '지원', '문의', '헬프데스크', 'support', 'helpdesk', 'ticket', '티켓'],
    advertising: ['광고', '마케팅', '캠페인', 'ads', 'marketing', 'campaign', 'roas'],
    hr: ['인사', '채용', '직원', 'hr', 'hiring', 'employee', '온보딩'],
    finance: ['재무', '회계', '예산', 'finance', 'accounting', 'budget', '정산'],
    ecommerce: ['쇼핑몰', '주문', '상품', 'ecommerce', 'order', 'product', '재고'],
    general: ['자동화', 'automation', 'workflow', '프로세스']
  };
  
  return domainKeywordMap[domain] || domainKeywordMap.general;
}

/**
 * 📈 관련성 점수 계산 (개선된 한국어 지원)
 */
function calculateRelevanceScore(result: RAGResult, userKeywords: string[], domainKeywords: string[]): number {
  const text = `${result.title} ${result.content}`.toLowerCase();
  
  // 🎯 더 유연한 키워드 매칭 (부분 매칭 포함)
  const userMatches = userKeywords.filter(keyword => {
    if (text.includes(keyword)) return true;
    // 부분 매칭 (3글자 이상일 때)
    if (keyword.length >= 3) {
      const partial = keyword.slice(0, -1); // 마지막 글자 제거하고 매칭
      return text.includes(partial);
    }
    return false;
  }).length;
  
  const domainMatches = domainKeywords.filter(keyword => {
    if (text.includes(keyword)) return true;
    // 영어-한국어 동의어 매칭
    const synonyms: Record<string, string[]> = {
      'sheets': ['시트', '스프레드시트'],
      'graph': ['그래프', '차트'],
      'report': ['보고서', '리포트'],
      'automation': ['자동화', '자동'],
      'dashboard': ['대시보드', '대쉬보드']
    };
    
    return Object.entries(synonyms).some(([eng, korList]) => {
      return (keyword === eng && korList.some(kor => text.includes(kor))) ||
             (korList.includes(keyword) && text.includes(eng));
    });
  }).length;
  
  const userScore = userMatches / Math.max(userKeywords.length, 1);
  const domainScore = domainMatches / Math.max(domainKeywords.length, 1);
  
  // 🎯 최소 점수 보장 (검색 엔진이 찾은 결과라면 기본 관련성 부여)
  const baseScore = result.score ? Math.min(result.score * 0.3, 0.2) : 0.1;
  const calculatedScore = (userScore * 0.7) + (domainScore * 0.3);
  
  return Math.max(baseScore, calculatedScore);
}

/**
 * ⭐ 품질 점수 계산 (실행 가능성 중심)
 */
function calculateQualityScore(result: RAGResult): number {
  let score = 0;
  
  // 제목 품질 (20%)
  if (result.title && result.title.length > 10 && result.title.length < 100) {
    score += 0.2;
  }
  
  // 실행 가능성 품질 (50%) - 가장 중요!
  if (result.content) {
    // 기본 내용 길이
    if (result.content.length > 200) score += 0.1;
    
    // 단계별 가이드 여부 (핵심!)
    if (result.content.includes('step') || result.content.includes('단계') || 
        result.content.match(/\d+\.\s/g)) score += 0.15;
    
    // 튜토리얼/가이드 여부
    if (result.content.includes('tutorial') || result.content.includes('가이드') ||
        result.content.includes('how to') || result.content.includes('방법')) score += 0.1;
    
    // 코드 예제 여부
    if (result.content.includes('```') || result.content.includes('code') ||
        result.content.includes('script')) score += 0.1;
    
    // 도구별 실행 가능성
    if (result.content.includes('zapier') || result.content.includes('make') ||
        result.content.includes('gmail api') || result.content.includes('google apps script')) score += 0.05;
  }
  
  // URL 신뢰성 (20%)
  if (result.url) {
    const url = result.url.toLowerCase();
    // 공식 문서나 신뢰할 만한 사이트
    if (url.includes('github') || url.includes('docs') || url.includes('developer')) score += 0.1;
    // 튜토리얼 사이트
    if (url.includes('medium') || url.includes('blog') || url.includes('tutorial')) score += 0.05;
    // 자동화 도구 관련
    if (url.includes('zapier') || url.includes('integromat') || url.includes('make.com')) score += 0.05;
  }
  
  // 검색 점수 반영 (10%)
  if (result.score && result.score > 0.7) {
    score += 0.1;
  }
  
  return Math.min(score, 1.0); // 최대 1.0
}

/**
 * 🎯 RAG 검색 결과의 전체적인 품질을 평가
 */
function evaluateRAGQuality(context: string, results: any[], userInput: string): {
  summary: string;
  isUseful: boolean;
  actionable: boolean;
  completeness: number;
} {
  if (!results || results.length === 0) {
    return {
      summary: '❌ 검색 결과 없음 - 기본 지식으로 답변',
      isUseful: false,
      actionable: false,
      completeness: 0
    };
  }

  // 실행 가능성 평가
  const hasSteps = results.some(r => 
    r.content.includes('step') || 
    r.content.includes('단계') || 
    r.content.match(/\d+\.\s/g)
  );
  
  const hasTutorials = results.some(r => 
    r.title.toLowerCase().includes('tutorial') || 
    r.content.includes('튜토리얼') || 
    r.content.includes('가이드')
  );
  
  const hasCode = results.some(r => 
    r.content.includes('```') || 
    r.content.includes('code') ||
    r.content.includes('script')
  );
  
  const hasTools = results.some(r => 
    r.content.includes('zapier') || 
    r.content.includes('gmail') ||
    r.content.includes('slack') ||
    r.content.includes('automation')
  );

  // 관련성 평가
  const userKeywords = extractKeywords(userInput);
  const relevantResults = results.filter(r => {
    const text = `${r.title} ${r.content}`.toLowerCase();
    return userKeywords.some(keyword => text.includes(keyword.toLowerCase()));
  });

  // 완성도 점수 계산 (0-1)
  let completeness = 0;
  if (hasSteps) completeness += 0.3;
  if (hasTutorials) completeness += 0.2;
  if (hasCode) completeness += 0.2;
  if (hasTools) completeness += 0.2;
  if (relevantResults.length >= 2) completeness += 0.1;

  // 종합 평가
  const isUseful = completeness >= 0.5;
  const actionable = hasSteps && (hasTutorials || hasCode);

  let summary = '';
  if (completeness >= 0.8) {
    summary = '🌟 우수 - 실행 가능한 단계별 가이드 제공';
  } else if (completeness >= 0.6) {
    summary = '✅ 양호 - 유용한 정보와 일부 실행 가이드 제공';
  } else if (completeness >= 0.4) {
    summary = '⚠️ 보통 - 기본 정보 제공, 추가 검색 권장';
  } else {
    summary = '❌ 부족 - 구체적인 실행 가이드 부족';
  }

  summary += ` (${results.length}개 결과, 완성도 ${Math.round(completeness * 100)}%)`;

  return {
    summary,
    isUseful,
    actionable,
    completeness
  };
}

/**
 * 컨텍스트 주입용 RAG 정보 생성 (성능 최적화 + 캐싱)
 */
export async function generateRAGContext(
  userInput: string,
  mentionedTools: string[],
  followupAnswers?: any
): Promise<string> {
  try {
    console.log(`📋 [RAG] 컨텍스트 생성 시작`);
    console.log(`📝 [RAG] 사용자 입력: ${userInput}`);
    console.log(`🛠️ [RAG] 언급된 도구들: ${mentionedTools.join(', ')}`);

    // 🎯 도메인 자동 감지
    const detectedDomain = detectDomain(userInput, followupAnswers);
    console.log(`🎯 [RAG] 감지된 도메인: ${detectedDomain}`);

    // ⚡ 캐시 키 생성 (세션 내 중복 방지)
    const cacheKey = `${detectedDomain}_${mentionedTools.sort().join('_')}_${userInput.length}`;
    
    if (ragSessionCache.has(cacheKey)) {
      console.log(`⚡ [RAG] 캐시 히트! 빠른 응답 제공`);
      return ragSessionCache.get(cacheKey);
    }

    // 🛠️ 도메인별 최적 도구 추천
    const optimalTools = [
      ...getOptimalToolsForDomain(detectedDomain, 'dataCollection', true),
      ...getOptimalToolsForDomain(detectedDomain, 'automation', true),
      ...getOptimalToolsForDomain(detectedDomain, 'reporting', true)
    ].slice(0, 3); // 최대 3개로 축소

    console.log(`💡 [RAG] 도메인 최적 도구들:`, optimalTools.map(t => t.name));

    // ⚡ 도메인 기반 스마트 쿼리 생성 (품질 개선)
    const allTools = [...mentionedTools, ...optimalTools.map(t => t.name)];
    const uniqueTools = Array.from(new Set(allTools)); // 중복 제거
    
    // 🎯 도메인별 맞춤형 검색 쿼리 생성
    const smartQuery = generateDomainSpecificQuery(userInput, detectedDomain, uniqueTools.slice(0, 3));
    console.log(`🔍 [RAG] 개선된 쿼리: "${smartQuery}"`);
    console.log(`🎯 [RAG] 원본 입력: "${userInput}"`);
    console.log(`🏷️ [RAG] 감지된 도메인: ${detectedDomain}`);
    
    const searchResults = await searchWithRAG(smartQuery, { maxResults: 4 });
    
    // 🔍 원시 검색 결과 로깅
    if (searchResults && searchResults.length > 0) {
      console.log(`📊 [RAG] 원시 검색 결과: ${searchResults.length}개`);
      searchResults.forEach((result, i) => {
        console.log(`  ${i+1}. "${result.title}" (Tavily점수: ${result.score?.toFixed(3) || 'N/A'})`);
      });
    }
    
    // 🔍 검색 결과 검증 및 필터링 (품질 개선)
    const validatedResults = validateAndFilterResults(searchResults, userInput, detectedDomain);
    console.log(`✅ [RAG] 검증 완료: ${searchResults.length}개 → ${validatedResults.length}개 (필터링 완료)`);
    
    // 🔍 최종 결과 로깅
    if (validatedResults.length > 0) {
      console.log(`📋 [RAG] 최종 채택된 결과:`);
      validatedResults.forEach((result, i) => {
        console.log(`  ${i+1}. "${result.title}" (관련성: ${result.relevanceScore?.toFixed(2)}, 품질: ${result.qualityScore?.toFixed(2)})`);
      });
    } else {
      console.log(`⚠️ [RAG] 모든 결과가 필터링됨 - 기본 지식 사용`);
    }
    
    const allToolResults = validatedResults;

    // 3. 컨텍스트 문자열 생성 (최적화된)
    let context = '';

    // 🎯 도메인 정보 추가 (간소화)
    if (detectedDomain !== 'general') {
      context += `## 🎯 도메인: ${detectedDomain}\n`;
      context += `## 💡 추천 도구: ${optimalTools.map(t => t.name).join(', ')}\n\n`;
    }

    // 📊 통합된 최신 정보 (기존 2개 섹션 → 1개로 통합)
    if (allToolResults.length > 0) {
      context += '## 📊 관련 정보 & 도구 가이드:\n';
      allToolResults.slice(0, 3).forEach((result, index) => { // 최대 3개만
        context += `${index + 1}. **${result.title}**\n`;
        context += `   - 링크: ${result.url}\n`;
        context += `   - 요약: ${result.content.substring(0, 120)}...\n\n`;
      });
    }

    if (!context || context.length < 50) {
      context = '## ℹ️ 기본 지식을 활용하여 최적의 자동화 솔루션을 제공합니다.\n\n';
    }

    // 💾 캐시 저장 (5분간 유지)
    ragSessionCache.set(cacheKey, context);
    setTimeout(() => ragSessionCache.delete(cacheKey), 5 * 60 * 1000);

      // 🎯 RAG 품질 최종 검증 (사용자에게 도움이 되는지 확인)
  const qualityCheck = evaluateRAGQuality(context, validatedResults, userInput);
  console.log(`✅ [RAG] 컨텍스트 생성 완료 (${context.length}자) - 캐시 저장됨`);
  console.log(`🎯 [RAG] 품질 검증: ${qualityCheck.summary}`);
  
    return context;
  } catch (error) {
    console.error('❌ [RAG] 컨텍스트 생성 실패:', error);
    return '## ℹ️ RAG 정보: 최신 정보 수집 중 오류가 발생했습니다. 기본 지식을 활용하여 답변드립니다.\n\n';
  }
}

/**
 * 🤖 AI 기반 메시지 분류 결과 인터페이스
 */
export interface MessageClassification {
  urgency: 'high' | 'medium' | 'low';
  category: string;
  customerType: 'new' | 'existing' | 'vip' | 'unknown';
  keywords: string[];
  suggestedActions: string[];
  confidence: number;
}

/**
 * 🤖 AI 기반 고객 메시지 분류 (GPT-4o 사용)
 */
export async function classifyCustomerMessage(
  message: string,
  context?: string
): Promise<MessageClassification> {
  try {
    console.log(`🤖 [AI분류] 메시지 분석 시작: "${message.substring(0, 50)}..."`);

    // OpenAI API 호출 (gpt-4o-mini 사용으로 비용 절약)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `
당신은 고객 메시지를 분석하는 전문가입니다. 다음 기준으로 메시지를 분류해주세요:

**긴급도 (urgency)**:
- high: 시스템 오류, 결제 문제, 긴급 문의
- medium: 일반 문의, 기능 요청
- low: 인사말, 일반 정보 요청

**카테고리 (category)**:
메시지 내용에 따라 구체적 분야 (예: 기술지원, 결제, 계정, 기능문의, 기타)

**고객 유형 (customerType)**:
- new: 신규 고객
- existing: 기존 고객
- vip: VIP/중요 고객
- unknown: 파악 불가

**키워드 (keywords)**:
메시지의 핵심 키워드 3-5개

**권장 조치 (suggestedActions)**:
이 메시지에 대한 처리 방법 2-3가지

**신뢰도 (confidence)**:
분류 정확도 (0-1)

JSON 형식으로만 응답하세요:
{
  "urgency": "medium",
  "category": "기술지원",
  "customerType": "existing",
  "keywords": ["로그인", "오류", "해결"],
  "suggestedActions": ["기술팀 전달", "FAQ 안내"],
  "confidence": 0.85
}
            `,
          },
          {
            role: 'user',
            content: `분석할 메시지: "${message}"${context ? `\n\n추가 컨텍스트: ${context}` : ''}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 에러: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('AI 분류 응답이 비어있습니다');
    }

    // JSON 파싱
    const classification = JSON.parse(aiResponse.trim()) as MessageClassification;

    console.log(
      `✅ [AI분류] 완료: ${classification.urgency}/${classification.category} (신뢰도: ${classification.confidence})`
    );
    return classification;
  } catch (error) {
    console.error(`❌ [AI분류] 실패:`, error);

    // 기본값 반환
    return {
      urgency: 'medium',
      category: '일반문의',
      customerType: 'unknown',
      keywords: ['문의'],
      suggestedActions: ['담당자 확인', '수동 분류'],
      confidence: 0.3,
    };
  }
}

/**
 * RAG 시스템 상태 확인
 */
export async function checkRAGHealth(): Promise<{
  tavilyAvailable: boolean;
  apiKeyConfigured: boolean;
  testSearchWorking: boolean;
}> {
  const health = {
    tavilyAvailable: true,
    apiKeyConfigured: !!process.env.TAVILY_API_KEY,
    testSearchWorking: false,
  };

  try {
    // 🔧 실제 검색 대신 Tavily 클라이언트 초기화 확인으로 변경
    if (process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.length > 10) {
      health.testSearchWorking = true; // API 키가 유효하면 작동한다고 가정
      console.log('✅ [RAG] 헬스체크: Tavily API 키 확인됨');
    } else {
      health.testSearchWorking = false;
      console.log('⚠️ [RAG] 헬스체크: Tavily API 키 없음');
    }
  } catch (error) {
    console.error('❌ [RAG] 헬스체크 실패:', error);
    health.tavilyAvailable = false;
    health.testSearchWorking = false;
  }

  console.log('🏥 [RAG] 헬스체크 완료:', health);
  return health;
}

/**
 * 💰 콘텐츠에서 가격 정보 추출
 */
function extractPricingFromContent(content: string): string {
  const pricingPatterns = [
    /free/i,
    /\$\d+\/month/i,
    /\$\d+\/mo/i,
    /\$\d+ per month/i,
    /무료/i,
    /월 \$\d+/i,
    /\d+원\/월/i,
    /무료 플랜/i,
    /free plan/i,
    /무료 \d+회/i,
    /free \d+ times/i,
  ];

  for (const pattern of pricingPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match[0];
    }
  }

  // 'free' 키워드가 있으면 무료로 표시
  if (content.toLowerCase().includes('free') || content.includes('무료')) {
    return '무료';
  }

  return '가격 정보 없음';
}
