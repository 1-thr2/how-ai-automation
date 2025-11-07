import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function tavilySearch(userInput: string): Promise<{ answer: string; sources: any[] }> {
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

    console.log('🧠 o1-preview API 호출 (깊은 리서치 모드)', 'API_KEY:', !!process.env.OPENAI_API_KEY);

    // 🔥 o1-preview: 깊은 추론으로 더 나은 한국어 리서치 결과 제공
    const completion = await openai.chat.completions.create({
      model: 'o1-preview',
      messages: [
        {
          role: 'user',
          content: `당신은 자동화 관련 최신 정보와 사례를 제공하는 전문가입니다. 실제 사용 가능한 URL과 구체적인 사례를 제공하세요.

${prompt}`
        }
      ],
      // o1-preview는 temperature, max_tokens 파라미터 미지원
    });

    const responseContent = completion.choices[0]?.message?.content || '';
    console.log('✅ o1-preview API 응답:', responseContent);

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
      throw new Error('o1-preview API 응답이 올바르지 않습니다.');
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
    console.error('❌ o1-preview 검색 오류:', error);
    throw new Error('최신 정보 검색 중 오류가 발생했습니다.');
  }
}
