import fetch from 'node-fetch';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_API_URL = 'https://api.tavily.com/search';

export async function tavilySearch(userInput: string): Promise<{ answer: string; sources: any[] }> {
  try {
    if (!TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY가 설정되지 않았습니다.');
    }

    const prompt = `
"${userInput}" 자동화에 대해
- 실제 적용 사례
- 성공/실패 경험
- 구체적 결과/성과(수치 포함)
- 최신 블로그/뉴스/유튜브 자료
를 찾아주세요.
각 자료는 title, url, content(요약)로 반환.
최신 자료, 실무 중심, 구체적 결과 위주로!`;

    console.log('Tavily API 호출!', prompt, 'API_KEY:', !!TAVILY_API_KEY);

    const res = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: prompt,
        search_depth: 'advanced',
        include_answer: true,
        include_sources: true,
        include_raw_content: false,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('Tavily API 오류:', errorBody);
      throw new Error(`Tavily API 오류: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('Tavily API 응답:', data);

    // sources가 없고 results가 있으면 results를 sources로 사용
    const sources = Array.isArray(data.sources)
      ? data.sources
      : Array.isArray(data.results)
        ? data.results
        : [];
    if (!data.answer || !Array.isArray(sources)) {
      throw new Error('Tavily API 응답이 올바르지 않습니다.');
    }

    return {
      answer: data.answer,
      sources: sources.map((source: any) => ({
        title: source.title || '',
        url: source.url || '',
        content: source.content || '',
      })),
    };
  } catch (error) {
    console.error('Tavily 검색 오류:', error);
    throw new Error('최신 정보 검색 중 오류가 발생했습니다.');
  }
}
