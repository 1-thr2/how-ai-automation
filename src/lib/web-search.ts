import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

/**
 * 🔍 실시간 웹 검색 (gpt-4o-mini-search-preview)
 * - 2025년 최신 정보 검색
 * - Bing 검색 API 통합
 * - 빠르고 저렴한 비용
 */
export async function searchWithWeb(userInput: string): Promise<{ answer: string; sources: any[] }> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
    }

    const prompt = `"${userInput}" 자동화에 대해
- 실제 적용 사례
- 성공/실패 경험
- 구체적 결과/성과(수치 포함)
- 최신 블로그/뉴스/유튜브 자료
를 찾아주세요.

각 자료는 title, url, content(요약)로 반환해주세요.
최신 자료, 실무 중심, 구체적 결과 위주로 제공해주세요.

응답은 다음 JSON 형식으로 제공해주세요:
{
  "answer": "전체 요약 답변",
  "sources": [
    {
      "title": "자료 제목",
      "url": "실제 URL",
      "content": "내용 요약"
    }
  ]
}`;

    console.log('🔍 gpt-4o-mini-search-preview API 호출 (실시간 웹 검색)', 'API_KEY:', !!process.env.OPENAI_API_KEY);

    // 🔥 gpt-4o-mini-search-preview: 실제 웹 검색 가능
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini-search-preview',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseContent = completion.choices[0]?.message?.content || '';
    console.log('✅ gpt-4o-mini-search-preview API 응답:', responseContent);

    // JSON 파싱
    let data: any;
    try {
      data = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('JSON 파싱 실패, 기본 응답 생성:', parseError);
      // 파싱 실패 시 기본 응답
      data = {
        answer: responseContent,
        sources: []
      };
    }

    const sources = Array.isArray(data.sources) ? data.sources : [];

    if (!data.answer) {
      throw new Error('gpt-4o-mini-search-preview API 응답이 올바르지 않습니다.');
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
    console.error('❌ 웹 검색 오류:', error);
    throw new Error('최신 정보 검색 중 오류가 발생했습니다.');
  }
}
