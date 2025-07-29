// 검색 쿼리 생성 함수
export function generateSearchQueries({ automationType, userGoals, followupAnswers }: {
  automationType: string;
  userGoals: string;
  followupAnswers?: Record<string, any>;
}): string[] {
  const tools = Array.isArray(followupAnswers?.tools) ? followupAnswers.tools.join(', ') : '';
  const goal = userGoals || automationType || '';
  return [
    `${tools} ${goal} 자동화 실전 사례 n8n zapier 유튜브 연동`,
    `${tools} ${goal} 자동화 확장 아이디어 AI 크롤링 리포트 알림 챗봇 CRM 유튜브 슬랙 구글시트 n8n zapier make.com`,
    `${tools} ${goal} 자동화 최신 트렌드 실전 사례 커뮤니티 Q&A`,
    `${tools} ${goal} 자동화 실패 사례 확장 전문가 추천`,
  ];
}

// Tavily API 호출 함수
export async function fetchTavilyResults(queries: string[]): Promise<any[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not set');
  }

  const results = [];
  for (const q of queries) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ query: q, max_results: 3 }),
      });

      if (!res.ok) {
        console.error(`Tavily API Error: ${res.status} ${res.statusText}`);
        continue;
      }

      const data = await res.json();
      results.push(...(data.results || []));
    } catch (error) {
      console.error('Tavily API Error:', error);
    }
  }
  return results;
} 