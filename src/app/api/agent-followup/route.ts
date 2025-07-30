import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

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

// 🚀 동적 후속질문 생성 (단계별 에러 추적)
export async function POST(req: NextRequest) {
  console.log('🔄 [agent-followup] POST 요청 시작');
  
  try {
    // 1단계: 요청 파싱
    console.log('📥 [1단계] 요청 파싱 시작');
    const { userInput } = await req.json();
    console.log('✅ [1단계] 요청 파싱 완료:', { userInput });

    if (!userInput) {
      console.log('❌ [1단계] userInput 없음');
      return NextResponse.json({ error: '사용자 입력이 필요합니다.' }, { status: 400 });
    }

    // 2단계: OpenAI 인스턴스 생성
    console.log('🤖 [2단계] OpenAI 인스턴스 생성 시작');
    console.log('🔑 [2단계] API 키 존재 여부:', !!process.env.OPENAI_API_KEY);
    
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ [2단계] OpenAI 인스턴스 생성 완료');

    // 3단계: 간단한 GPT 호출 테스트
    console.log('🚀 [3단계] GPT API 호출 시작');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '간단한 후속질문을 JSON 형태로 생성하세요.'
        },
        {
          role: 'user',
          content: `사용자 요청: "${userInput}"\n\n다음 형식으로 간단한 후속질문 1개를 생성하세요:\n{\n  "questions": [\n    {\n      "key": "test_question",\n      "question": "간단한 질문",\n      "type": "single",\n      "options": ["옵션1", "옵션2", "기타 (직접입력)", "잘모름 (AI가 추천)"],\n      "category": "data",\n      "importance": "high",\n      "description": "테스트 질문입니다."\n    }\n  ]\n}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    console.log('✅ [3단계] GPT API 호출 완료');

    // 4단계: 응답 파싱
    console.log('📝 [4단계] 응답 파싱 시작');
    const content = response.choices[0]?.message?.content;
    console.log('📄 [4단계] GPT 응답 내용:', content?.substring(0, 200) + '...');
    
    if (!content) {
      throw new Error('GPT 응답이 비어있습니다.');
    }

    // JSON 추출 및 파싱
    let dynamicQuestions;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : content;
      dynamicQuestions = JSON.parse(jsonContent);
      console.log('✅ [4단계] JSON 파싱 성공');
    } catch (parseError) {
      console.error('❌ [4단계] JSON 파싱 실패:', parseError);
      console.log('📄 원본 응답:', content);
      
      // 파싱 실패 시 기본 질문
      dynamicQuestions = {
        questions: [
          {
            key: "current_situation",
            question: "현재 상황을 알려주세요",
            type: "single",
            options: ["처음 시작", "부분적으로 하고 있음", "완전히 수동", "개선 필요", "기타 (직접입력)", "잘모름 (AI가 추천)"],
            category: "data",
            importance: "high",
            description: "현재 상황을 파악합니다."
          }
        ]
      };
    }

    // 5단계: 응답 검증
    console.log('🔍 [5단계] 응답 검증 시작');
    if (!dynamicQuestions.questions || !Array.isArray(dynamicQuestions.questions)) {
      throw new Error('올바른 questions 형식이 아닙니다.');
    }
    console.log('✅ [5단계] 응답 검증 완료');

    console.log('🎉 [최종] 성공적으로 완료:', {
      질문수: dynamicQuestions.questions.length,
      질문들: dynamicQuestions.questions.map((q: any) => q.question)
    });

    return NextResponse.json({
      questions: dynamicQuestions.questions,
      debug: {
        userInput,
        timestamp: new Date().toISOString(),
        hasApiKey: !!process.env.OPENAI_API_KEY,
        questionCount: dynamicQuestions.questions.length
      }
    });

  } catch (error) {
    console.error('❌ [ERROR] 단계별 에러 발생:', error);
    console.error('❌ [ERROR] 에러 스택:', error instanceof Error ? error.stack : '스택 없음');
    
    return NextResponse.json({ 
      error: 'API 처리 실패', 
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
