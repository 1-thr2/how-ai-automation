console.log('🔥 search-latest API 라우트 진입!');
import { NextRequest, NextResponse } from 'next/server';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
console.log('TAVILY_API_KEY:', TAVILY_API_KEY);

async function searchWithTavily(query: string) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: TAVILY_API_KEY || '',
    },
    body: JSON.stringify({
      query: `${query} ${new Date().getFullYear()} latest automation methods`,
    }),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error('Tavily 검색 실패: ' + errorBody);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  console.log('🔥 POST 함수 진입!');
  try {
    const { userInput } = await req.json();
    if (!userInput) {
      return NextResponse.json({ error: '검색어가 필요합니다.' }, { status: 400 });
    }
    try {
      const tavily = await searchWithTavily(userInput);
      if (tavily.answer || tavily.results) {
        return NextResponse.json({ source: 'tavily', ...tavily });
      }
      // 결과가 없으면 에러 반환
      console.error('Tavily 결과 없음:', tavily);
      return NextResponse.json({ error: 'Tavily 결과 없음' }, { status: 500 });
    } catch (e) {
      console.error('Tavily 에러:', e);
      return NextResponse.json({ error: 'Tavily 검색 실패', detail: String(e) }, { status: 500 });
    }
  } catch (error) {
    console.error('search-latest API 에러:', error);
    return NextResponse.json({ error: '검색 중 오류 발생' }, { status: 500 });
  }
}
