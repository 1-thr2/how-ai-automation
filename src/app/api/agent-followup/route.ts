import { NextRequest, NextResponse } from 'next/server';

// 🩺 헬스체크 엔드포인트 (GET)
export async function GET() {
  try {
    return NextResponse.json({ 
      status: 'API 작동 중',
      hasApiKey: !!process.env.OPENAI_API_KEY,
      keyPreview: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : 'API 키 없음',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '헬스체크 실패', 
      details: error instanceof Error ? error.message : '알 수 없는 오류' 
    }, { status: 500 });
  }
}

// 🚀 간단한 POST 엔드포인트 (OpenAI 라이브러리 없이)
export async function POST(req: NextRequest) {
  try {
    const { userInput } = await req.json();

    if (!userInput) {
      return NextResponse.json({ error: '사용자 입력이 필요합니다.' }, { status: 400 });
    }

    // 임시로 간단한 응답 반환 (OpenAI 호출 없이)
    const mockQuestions = [
      {
        key: "current_situation",
        question: "현재 상황을 알려주세요",
        type: "single",
        options: ["처음 시작", "부분적으로 하고 있음", "완전히 수동", "개선 필요", "기타 (직접입력)", "잘모름 (AI가 추천)"],
        category: "data",
        importance: "high",
        description: "현재 상황을 파악합니다."
      }
    ];

    console.log('✅ [agent-followup] 간단한 응답 반환:', { userInput, questionCount: mockQuestions.length });

    return NextResponse.json({
      questions: mockQuestions,
      debug: {
        userInput,
        timestamp: new Date().toISOString(),
        hasApiKey: !!process.env.OPENAI_API_KEY
      }
    });

  } catch (error) {
    console.error('❌ [agent-followup] 에러 발생:', error);
    return NextResponse.json({ 
      error: 'API 처리 실패', 
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
