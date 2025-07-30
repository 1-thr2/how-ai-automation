import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'Simple API GET 작동 중',
    timestamp: new Date().toISOString(),
    environment: {
      node_env: process.env.NODE_ENV,
      has_openai_key: !!process.env.OPENAI_API_KEY,
      vercel_env: process.env.VERCEL_ENV
    }
  });
}

export async function POST(request: Request) {
  try {
    const { userInput } = await request.json();
    
    return NextResponse.json({ 
      status: 'Simple API POST 작동 중',
      userInput,
      timestamp: new Date().toISOString(),
      environment: {
        node_env: process.env.NODE_ENV,
        has_openai_key: !!process.env.OPENAI_API_KEY,
        vercel_env: process.env.VERCEL_ENV
      },
      // 하드코딩된 테스트 질문
      questions: [
        {
          key: "test_question",
          question: "이것은 테스트 질문입니다",
          type: "single",
          options: ["옵션1", "옵션2", "기타 (직접입력)", "잘모름 (AI가 추천)"],
          category: "data",
          importance: "high",
          description: "환경변수 없이 작동하는지 테스트"
        }
      ]
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Simple API POST 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}