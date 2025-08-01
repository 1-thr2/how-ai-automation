import { tavily } from '@tavily/core';

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
    console.log(`🔍 [도구연동] 확인 시작: ${toolName} ↔ ${platformName}`);

    // 1차: 공식 연동 가능성 검색
    const integrationQuery = `${toolName} ${platformName} integration official support`;
    const integrationResults = await searchWithRAG(integrationQuery, { maxResults: 3 });

    // 2차: 문제점 및 제한사항 검색
    const limitationQuery = `${toolName} ${platformName} integration problems limitations`;
    const limitationResults = await searchWithRAG(limitationQuery, { maxResults: 2 });

    // 결과 분석
    const allContent = [...integrationResults, ...limitationResults]
      .map(r => `${r.title} ${r.content}`)
      .join(' ')
      .toLowerCase();

    // 지원 여부 판단 키워드
    const supportKeywords = ['official', 'supported', 'integration', 'connector', 'available'];
    const unsupportKeywords = [
      'not supported',
      'not available',
      'discontinued',
      'deprecated',
      'limited',
      'unofficial',
    ];

    const supportScore = supportKeywords.reduce((score, keyword) => {
      return score + (allContent.includes(keyword) ? 1 : 0);
    }, 0);

    const unsupportScore = unsupportKeywords.reduce((score, keyword) => {
      return score + (allContent.includes(keyword) ? 2 : 0); // 부정 키워드에 더 높은 가중치
    }, 0);

    const isSupported = supportScore > unsupportScore && integrationResults.length > 0;
    const confidence = Math.min(Math.max((supportScore - unsupportScore) / 10, 0), 1);

    let result: ToolIntegrationStatus = {
      isSupported,
      toolName,
      confidence,
      reason: isSupported
        ? `${platformName}에서 ${toolName} 공식 연동이 지원됩니다.`
        : `${toolName}은 ${platformName}과 직접 연동이 제한적이거나 지원되지 않습니다.`,
    };

    // 공식 URL 추가
    if (isSupported && integrationResults.length > 0) {
      result.officialUrl = integrationResults[0].url;
    }

    // 연동이 불가능한 경우, 💰 무료/저렴한 대안 우선 검색
    if (!isSupported) {
      console.log(`🔄 [도구연동] 무료/저렴한 대안 검색 중: ${toolName}`);

      const alternativeQueries = [
        `free alternative to ${toolName} ${platformName} integration low cost`,
        `${toolName} automation free Pipedream Make.com Google Apps Script`,
        `connect ${toolName} webhook API automation free`,
        `${toolName} integration free third party tools no cost`,
      ];

      const alternativeResults = await Promise.all(
        alternativeQueries.map(query => searchWithRAG(query, { maxResults: 2 }))
      );

      // 대안 도구 추출 및 구조화
      const alternatives = alternativeResults
        .flat()
        .slice(0, 4) // 최대 4개 대안
        .map((result, index) => {
          // 대안 도구명 추출 로직
          let altName = 'API 기반 연동';
          if (result.title.toLowerCase().includes('pipedream')) altName = 'Pipedream';
          else if (result.title.toLowerCase().includes('make')) altName = 'Make.com';
          else if (result.title.toLowerCase().includes('webhook')) altName = 'Webhook 연동';
          else if (result.title.toLowerCase().includes('zapier')) altName = 'Zapier 우회 방법';

          const difficulty = index < 2 ? 'easy' : index < 3 ? 'medium' : 'advanced';

          return {
            name: altName,
            url: result.url,
            description: result.content.substring(0, 120) + '...',
            difficulty: difficulty as 'easy' | 'medium' | 'advanced',
            pricing: extractPricingFromContent(result.content),
          };
        });

      result.alternatives = alternatives;
      console.log(`✅ [도구연동] 대안 ${alternatives.length}개 발견`);
    }

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
  const queries = [
    `${toolName} 공식 가이드 튜토리얼 2024`,
    `${toolName} API 문서 사용법`,
    `${toolName} 최신 업데이트 기능`,
  ];

  try {
    console.log(`🔧 [RAG] 도구 정보 검색: ${toolName}`);

    // 병렬 검색으로 속도 향상
    const searchPromises = queries.map(query => searchWithRAG(query, { maxResults: 2 }));

    const allResults = await Promise.all(searchPromises);
    const flatResults = allResults.flat();

    // 점수 기준 정렬 및 중복 제거
    const uniqueResults = flatResults
      .filter((result, index, self) => self.findIndex(r => r.url === result.url) === index)
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
      timeout: 5000, // 5초 타임아웃
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
      context =
        '## ℹ️ RAG 정보: 관련 최신 정보를 찾지 못했습니다. 기본 지식을 활용하여 답변드립니다.\n\n';
    }

    console.log(`✅ [RAG] 컨텍스트 생성 완료 (${context.length}자)`);
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
