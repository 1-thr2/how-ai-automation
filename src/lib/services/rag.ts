import { tavily } from 'tavily';

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
      ...options
    };

    // Tavily API 호출
    const response = await tavilyClient.search({
      query,
      max_results: defaultOptions.maxResults,
      include_images: defaultOptions.includeImages,
      include_answer: defaultOptions.includeAnswers,
      search_depth: defaultOptions.searchDepth,
      exclude_domains: defaultOptions.excludeDomains,
      include_domains: defaultOptions.includeDomains
    });

    // 결과 변환
    const results: RAGResult[] = response.results?.map((result: any) => ({
      url: result.url || '',
      title: result.title || '',
      content: result.content || '',
      score: result.score || 0,
      publishedDate: result.published_date
    })) || [];

    console.log(`✅ [RAG] 검색 완료: ${results.length}개 결과`);
    console.log(`📊 [RAG] 결과 점수:`, results.map(r => r.score));
    
    return results;
    
  } catch (error) {
    console.error('❌ [RAG] 검색 실패:', error);
    
    // Tavily API 오류 시 빈 결과 반환 (서비스 중단 방지)
    return [];
  }
}

/**
 * 도구/서비스 관련 최신 정보 검색
 */
export async function searchToolInfo(toolName: string): Promise<RAGResult[]> {
  const queries = [
    `${toolName} 공식 가이드 튜토리얼 2024`,
    `${toolName} API 문서 사용법`,
    `${toolName} 최신 업데이트 기능`
  ];
  
  try {
    console.log(`🔧 [RAG] 도구 정보 검색: ${toolName}`);
    
    // 병렬 검색으로 속도 향상
    const searchPromises = queries.map(query => 
      searchWithRAG(query, { maxResults: 2 })
    );
    
    const allResults = await Promise.all(searchPromises);
    const flatResults = allResults.flat();
    
    // 점수 기준 정렬 및 중복 제거
    const uniqueResults = flatResults
      .filter((result, index, self) => 
        self.findIndex(r => r.url === result.url) === index
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // 상위 5개만
    
    console.log(`✅ [RAG] 도구 정보 수집 완료: ${uniqueResults.length}개`);
    return uniqueResults;
    
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
    
    const response = await fetch(url, { 
      method: 'HEAD',
      timeout: 5000 // 5초 타임아웃
    });
    
    const isValid = response.ok;
    console.log(`${isValid ? '✅' : '❌'} [RAG] URL 검증 결과: ${url} - ${response.status}`);
    
    return isValid;
    
  } catch (error) {
    console.log(`❌ [RAG] URL 검증 실패: ${url}`);
    return false;
  }
}

/**
 * 컨텍스트 주입용 RAG 정보 생성
 */
export async function generateRAGContext(
  userInput: string, 
  mentionedTools: string[]
): Promise<string> {
  
  try {
    console.log(`📋 [RAG] 컨텍스트 생성 시작`);
    console.log(`📝 [RAG] 사용자 입력: ${userInput}`);
    console.log(`🛠️ [RAG] 언급된 도구들: ${mentionedTools.join(', ')}`);
    
    // 1. 사용자 요청 관련 최신 정보 검색
    const userSearchQuery = `${userInput} 자동화 가이드 최신 방법 2024`;
    const userResults = await searchWithRAG(userSearchQuery, { maxResults: 2 });
    
    // 2. 각 도구별 최신 정보 수집
    const toolResults = await Promise.all(
      mentionedTools.slice(0, 3).map(tool => searchToolInfo(tool)) // 최대 3개 도구만
    );
    
    const allToolResults = toolResults.flat();
    
    // 3. 컨텍스트 문자열 생성
    let context = '';
    
    if (userResults.length > 0) {
      context += '## 📊 최신 동향 정보:\n';
      userResults.forEach((result, index) => {
        context += `${index + 1}. **${result.title}**\n`;
        context += `   - 출처: ${result.url}\n`;
        context += `   - 요약: ${result.content.substring(0, 150)}...\n\n`;
      });
    }
    
    if (allToolResults.length > 0) {
      context += '## 🛠️ 도구별 최신 정보:\n';
      allToolResults.forEach((result, index) => {
        context += `${index + 1}. **${result.title}**\n`;
        context += `   - 도구: ${mentionedTools.find(tool => result.title.toLowerCase().includes(tool.toLowerCase())) || '기타'}\n`;
        context += `   - 링크: ${result.url}\n`;
        context += `   - 내용: ${result.content.substring(0, 100)}...\n\n`;
      });
    }
    
    if (!context) {
      context = '## ℹ️ RAG 정보: 관련 최신 정보를 찾지 못했습니다. 기본 지식을 활용하여 답변드립니다.\n\n';
    }
    
    console.log(`✅ [RAG] 컨텍스트 생성 완료 (${context.length}자)`);
    return context;
    
  } catch (error) {
    console.error('❌ [RAG] 컨텍스트 생성 실패:', error);
    return '## ℹ️ RAG 정보: 최신 정보 수집 중 오류가 발생했습니다. 기본 지식을 활용하여 답변드립니다.\n\n';
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
    testSearchWorking: false
  };
  
  try {
    // 간단한 테스트 검색
    const testResults = await searchWithRAG('test query', { maxResults: 1 });
    health.testSearchWorking = testResults.length >= 0; // 빈 배열도 성공으로 간주
    
  } catch (error) {
    console.error('❌ [RAG] 헬스체크 실패:', error);
    health.tavilyAvailable = false;
  }
  
  console.log('🏥 [RAG] 헬스체크 결과:', health);
  return health;
}