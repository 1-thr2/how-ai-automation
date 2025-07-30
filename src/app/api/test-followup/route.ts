import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: '새 API 파일 작동 중',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    return NextResponse.json({
      message: '새 API POST 작동 중',
      receivedData: body,
      questions: [
        {
          key: "test",
          question: "테스트 질문입니다",
          type: "single",
          options: ["옵션1", "옵션2", "기타 (직접입력)", "잘모름 (AI가 추천)"],
          category: "data",
          importance: "high",
          description: "새 API 테스트"
        }
      ]
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: '새 API 에러',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 