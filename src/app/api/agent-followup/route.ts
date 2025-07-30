import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'Agent Followup API 작동 중',
    openai_configured: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  try {
    console.log('📞 [API] 후속질문 생성 API 호출됨');
    
    const { userInput } = await request.json();
    console.log('📝 [API] 받은 사용자 입력:', userInput);

    console.log('🔑 [API] OpenAI API 키 확인:', process.env.OPENAI_API_KEY ? '있음' : '없음');

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ [API] OPENAI_API_KEY가 설정되지 않음');
      return NextResponse.json({ 
        error: 'OpenAI API 키가 설정되지 않았습니다' 
      }, { status: 500 });
    }

    console.log('🤖 [API] OpenAI API 호출 시작...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 자동화 솔루션을 위한 후속질문 생성 전문가입니다.

사용자의 초기 요청을 분석하여, 맞춤형 자동화를 설계하기 위한 핵심 후속질문들을 생성하세요.

# 핵심 원칙:
1. **깊이 있는 맥락 파악**: 표면적 요청 뒤의 진짜 목적과 업무 맥락 발굴
2. **실행 가능성 확보**: 구체적인 실행 방법과 도구 선택을 위한 정보 수집
3. **확장 가능성 탐색**: 단순 자동화를 더 큰 업무 시스템으로 발전시킬 수 있는 방향 모색

# 필수 질문 영역:
- **데이터 소스**: 현재 어떤 데이터를 어떻게 다루는지
- **현재 업무**: 지금은 어떤 방식으로 처리하는지
- **성공 기준**: 어떤 결과를 얻고 싶은지
- **기술 수준**: 어떤 도구나 방법을 선호하는지
- **업무 환경**: 팀, 회사, 개인적 상황

# 질문 형식:
각 질문은 다음 형식을 따르세요:
- **type**: "single" (단일선택) 또는 "multiple" (복수선택)
- **options**: 선택지 배열 (반드시 "기타 (직접입력)"과 "잘모름 (AI가 추천)" 포함)
- **category**: "data" | "workflow" | "goals" | "tech" | "environment"
- **importance**: "high" | "medium" | "low"

# 반드시 포함해야 할 옵션:
모든 질문의 options 배열 마지막에 반드시 다음 두 옵션을 포함하세요:
- "기타 (직접입력)"
- "잘모름 (AI가 추천)"

# JSON 응답 형식:
{
  "questions": [
    {
      "key": "data_source",
      "question": "현재 처리하는 데이터는 주로 어디에서 오나요?",
      "type": "single",
      "options": ["엑셀/구글시트", "데이터베이스", "웹사이트", "이메일", "기타 (직접입력)", "잘모름 (AI가 추천)"],
      "category": "data",
      "importance": "high",
      "description": "데이터 소스를 파악하여 최적의 연동 방법을 제안하기 위함"
    }
  ]
}`
        },
        {
          role: 'user',
          content: `사용자 요청: "${userInput}"

이 요청을 바탕으로 맞춤형 자동화를 설계하기 위한 3-4개의 핵심 후속질문을 생성해주세요.
각 질문은 사용자의 진짜 니즈와 실행 가능한 솔루션을 발굴하는 데 집중해야 합니다.

모든 질문의 options에는 반드시 "기타 (직접입력)"과 "잘모름 (AI가 추천)" 옵션을 포함해주세요.`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    console.log('✅ [API] OpenAI API 응답 받음');
    console.log('📤 [API] 응답 내용:', response.choices[0]?.message?.content?.substring(0, 200) + '...');

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('❌ [API] OpenAI 응답이 비어있음');
      return NextResponse.json({ 
        error: 'OpenAI 응답을 받지 못했습니다' 
      }, { status: 500 });
    }

    let questions;
    try {
      console.log('🔄 [API] JSON 파싱 시도...');
      
      // OpenAI가 ```json으로 래핑한 경우 제거
      let cleanContent = content;
      if (content.includes('```json')) {
        const startIndex = content.indexOf('```json') + 7;
        const endIndex = content.lastIndexOf('```');
        cleanContent = content.substring(startIndex, endIndex).trim();
        console.log('🧹 [API] JSON 마크다운 래퍼 제거됨');
      }
      
      const parsed = JSON.parse(cleanContent);
      questions = parsed.questions || [];
      console.log('✅ [API] JSON 파싱 성공, 질문 수:', questions.length);
    } catch (parseError) {
      console.error('❌ [API] JSON 파싱 실패:', parseError);
      console.log('📝 [API] 원본 응답:', content);
      
      // JSON 파싱 실패 시 fallback 질문들
      questions = [
        {
          key: "data_source",
          question: "현재 처리하는 데이터는 주로 어디에서 오나요?",
          type: "single",
          options: ["엑셀/구글시트", "데이터베이스", "웹사이트", "이메일", "기타 (직접입력)", "잘모름 (AI가 추천)"],
          category: "data",
          importance: "high",
          description: "데이터 소스 파악"
        },
        {
          key: "current_workflow",
          question: "현재는 이 작업을 어떻게 처리하고 계신가요?",
          type: "single", 
          options: ["수동으로 직접", "간단한 도구 사용", "복잡한 시스템 사용", "아직 시작 안함", "기타 (직접입력)", "잘모름 (AI가 추천)"],
          category: "workflow",
          importance: "high",
          description: "현재 업무 방식 파악"
        },
        {
          key: "success_criteria",
          question: "이 자동화를 통해 얻고 싶은 가장 중요한 결과는 무엇인가요?",
          type: "single",
          options: ["시간 절약", "정확도 향상", "실시간 모니터링", "데이터 인사이트", "기타 (직접입력)", "잘모름 (AI가 추천)"],
          category: "goals", 
          importance: "high",
          description: "성공 기준 설정"
        }
      ];
    }

    // 모든 질문에 필수 옵션이 있는지 확인하고 없으면 추가
    questions = questions.map((q: any) => {
      if (!q.options.includes("기타 (직접입력)")) {
        q.options.push("기타 (직접입력)");
      }
      if (!q.options.includes("잘모름 (AI가 추천)")) {
        q.options.push("잘모름 (AI가 추천)");
      }
      return q;
    });

    console.log('🎯 [API] 최종 질문 수:', questions.length);
    console.log('📋 [API] 각 질문의 옵션 수:', questions.map((q: any) => q.options?.length || 0));

    return NextResponse.json({ questions });

  } catch (error) {
    console.error('💥 [API] 전체 에러:', error);
    return NextResponse.json({ 
      error: '후속질문 생성 중 오류가 발생했습니다',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
