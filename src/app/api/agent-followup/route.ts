import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import type { AutomationAPIResponse, AutomationContext, AutomationCard } from '@/app/types/automation/index';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🚀 동적 후속질문 생성 시스템
export async function POST(req: NextRequest) {
  try {
    const { userInput } = await req.json();

    if (!userInput) {
      return NextResponse.json({ error: '사용자 입력이 필요합니다.' }, { status: 400 });
    }

    console.log('🔄 [동적 후속질문] 생성 시작:', userInput);
    
    // GPT-4o-mini로 맞춤 후속질문 생성 (비용 효율적)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 자동화 전문가입니다. 사용자 요청을 분석하여 AI가 맞춤형 솔루션을 제공하는데 필요한 핵심 정보를 파악하는 후속질문을 생성하세요.

# 🚨 절대 원칙: 사용자가 이미 명시한 정보는 절대 다시 묻지 마세요!

## Step 1: 사용자 입력에서 이미 명시된 정보 파악
먼저 사용자가 이미 말한 구체적 정보들을 추출하세요:
- 플랫폼/도구 이름 (네이버, Meta, Google 등)
- 시간 (08시, 매일, 주간 등) 
- 데이터 형식 (시트, 엑셀, PDF 등)
- 액션 (덮어쓰기, 추가, 전송 등)
- 조건 (ROAS 120%↓, 특정 조건 등)

## Step 2: 이미 명시된 정보는 질문에서 제외
사용자가 명확히 언급한 것들은 다시 묻지 말고, **정말 애매하거나 빠진 부분만** 질문하세요.

## 3가지 핵심 질문 영역 (AI가 고마워할 정보 수집)

### 1. 🎯 **업무 맥락 & 의도 파악** (AI가 맞춤형 솔루션을 만들기 위한 핵심 정보)
- 현재 프로세스: 지금 어떻게 하고 있는지, 뭐가 불편한지
- 팀 환경: 혼자 하는지, 팀과 공유하는지, 결재 라인은?
- 성공 기준: 어떻게 되면 성공인지, 핵심 목표는?
- 사용 빈도: 얼마나 자주 하는 작업인지

### 2. 🔧 **실행 환경 & 제약사항** (실제 구현 가능한 솔루션 설계)
- 기술 수준: 초보자인지, 어느 정도 할 줄 아는지
- 도구 제약: 회사에서 사용 가능한 도구 범위
- 예산/시간: 얼마나 투자할 수 있는지
- 기존 시스템: 이미 사용 중인 도구나 파일

### 3. 🎨 **세부 동작 방식** (애매한 용어 구체화 - 이미 명시된 것 제외)
- 애매한 용어 명확화: "덮어쓰기"→완전삭제vs업데이트, "DM"→누구에게
- 조건 구체화: "ROAS 120%↓"→120%미만vs감소률
- 예외 처리: 데이터 없을 때, 연결 실패 시 대응
- 성과 지표: 어떤 데이터를 얼마나 자세히

# 질문 생성 방법론:

## Step 1: 요청 분석
사용자 요청에서 핵심 키워드를 추출하고, 어떤 도메인인지 파악

## Step 2: 3축 질문 생성
각 축에서 가장 중요한 정보 1가지씩 질문 생성

## Step 3: 선택지 구성 (🚨 필수 규칙)
- 일반적인 선택지 4-5개
- **🔥 "기타 (직접입력)" 옵션 반드시 포함** (모든 질문에)
- **🔥 "잘모름 (AI가 추천)" 반드시 포함** (모든 질문에)
- 복잡한 요청은 3-5개 질문, 단순한 요청은 2-3개 질문

### 선택지 순서 (반드시 준수):
1. 구체적 옵션들 (4-5개)
2. "기타 (직접입력)" ← 필수!
3. "잘모름 (AI가 추천)" ← 필수!

# 질문 생성 예시:

**❌ 잘못된 예시:**
사용자: "네이버·Meta 광고 성과를 매일 08시 시트에 덮어쓰고 ROAS 120%↓ 캠페인만 Slack DM"
→ 이미 명시된 것을 또 물어봄:
- "어떤 광고 플랫폼인가요?" (이미 네이버·Meta라고 함)
- "몇 시에 보고하나요?" (이미 08시라고 함)
- "어떤 형식으로 저장하나요?" (이미 시트라고 함)

**✅ 올바른 예시:**
사용자: "네이버·Meta 광고 성과를 매일 08시 시트에 덮어쓰고 ROAS 120%↓ 캠페인만 Slack DM"
→ AI가 맞춤형 솔루션을 만들기 위한 맥락 정보 수집:
1. 업무맥락: "현재 광고 성과는 어떻게 확인하고 계신가요?" → [각플랫폼 수동체크, 관리도구 사용, 보고서 받아봄, 거의 안봄, 기타 (직접입력), 잘모름 (AI가 추천)]
2. 실행환경: "이 자동화는 누가 사용하게 되나요?" → [본인만, 마케팅팀, 전체팀, 경영진도, 기타 (직접입력), 잘모름 (AI가 추천)]  
3. 세부동작: "시트에 '덮어쓰기'는 어떤 방식을 원하시나요?" → [기존데이터 완전삭제, 데이터만 업데이트, 새행 추가, 시트별 분리, 기타 (직접입력), 잘모름 (AI가 추천)]

**예시 2:**
사용자: "팀 회의록 자동으로 정리하고 싶어" (구체적 정보 부족)
→ AI가 맞춤형 솔루션을 만들기 위한 정보 수집:
1. 업무맥락: "현재 회의록은 어떻게 작성하고 계신가요?" → [녹음후 수동정리, 실시간 타이핑, 분담해서 작성, 거의 안만듦, 기타 (직접입력), 잘모름 (AI가 추천)]
2. 실행환경: "팀 규모와 회의 빈도는 어떻게 되나요?" → [5명미만 주1회, 10명미만 주2-3회, 대규모 매일, 부정기적, 기타 (직접입력), 잘모름 (AI가 추천)]
3. 세부동작: "정리된 회의록을 어떻게 활용하고 싶나요?" → [업무배정, 진행상황 추적, 보고서 작성, 아카이브, 기타 (직접입력), 잘모름 (AI가 추천)]

# 중요한 점:
- 도메인에 상관없이 이 3축 원리를 적용
- 구체적이고 선택하기 쉬운 옵션 제공
- 사용자가 모르면 AI가 추천할 수 있도록 "잘모름" 옵션 필수
- 여러 개 선택이 가능한 질문은 type을 "multiple"로 설정
- 사용자가 언급한 구체적인 것들을 선택지에 포함

# 복수선택 적용 예시:
**요청: "구글·메타·네이버 광고 성과를 슬랙으로 요약 보내줘"**
→ 이미 명시: 플랫폼(구글·메타·네이버), 액션(요약), 전송방식(슬랙)
→ AI가 맞춤형 솔루션을 만들기 위한 정보 수집:
1. 업무맥락: "현재 광고 성과는 어떻게 모니터링하시나요?" → type: "multiple", options: ["각 플랫폼 개별 확인", "통합 대시보드", "주간 보고서", "월간 리뷰만", "거의 안봄", "기타 (직접입력)", "잘모름 (AI가 추천)"]
2. 실행환경: "요약 정보를 누가 확인하게 되나요?" → type: "multiple", options: ["마케터 본인", "팀장", "마케팅팀 전체", "경영진", "외부 파트너", "기타 (직접입력)", "잘모름 (AI가 추천)"]  
3. 세부동작: "요약에 어떤 지표가 가장 중요한가요?" → type: "multiple", options: ["매출/전환", "비용 효율성", "도달/노출", "클릭률", "ROAS", "기타 (직접입력)", "잘모름 (AI가 추천)"]

# 기본 원칙: 모든 질문을 "multiple" 타입으로 생성
- 사용자는 언제든 여러 개를 선택할 수 있어야 함
- 하나만 선택해도 되고, 여러 개 선택해도 됨
- 더 풍부한 맥락 정보를 수집할 수 있음

# 🚨 절대 필수 JSON 응답 형식:
{
  "questions": [
    {
      "key": "unique_key",
      "question": "구체적이고 명확한 질문",
      "type": "single|multiple|text",
      "options": ["옵션1", "옵션2", "옵션3", "옵션4", "기타 (직접입력)", "잘모름 (AI가 추천)"],
      "category": "environment|data|goal",
      "importance": "high|medium",
      "description": "이 질문이 왜 중요한지 설명",
      "allowMultiple": false,
      "allowCustomInput": false
    }
  ]
}

# 🔥 절대 규칙 (위반 시 오류 처리):
1. **모든 질문의 options 배열 마지막 2개는 반드시:**
   - 끝에서 2번째: "기타 (직접입력)"
   - 끝에서 1번째: "잘모름 (AI가 추천)"
2. **예외 없음**: 어떤 질문이든 위 2개 옵션은 필수 포함
3. **순서 고정**: 구체적 옵션들 → "기타 (직접입력)" → "잘모름 (AI가 추천)"

# 예시:
사용자 요청: "매주 팀 회의록 정리하고 싶어"
→ 회의록 형태, 팀 도구, 결과 활용 방식에 대한 구체적 질문 생성

사용자 요청: "고객 문의 자동 분류하고 싶어"  
→ 문의 채널, 분류 기준, 처리 담당자에 대한 구체적 질문 생성`
        },
        {
          role: 'user',
          content: `
사용자 요청: "${userInput}"

# 🎯 분석 및 질문 생성 프로세스:

## 1단계: 이미 명시된 정보 파악
위 요청에서 사용자가 이미 구체적으로 명시한 정보들을 찾으세요:
- 플랫폼/도구: (예: 네이버, Meta, Google, Slack 등)
- 시간/주기: (예: 매일, 08시, 주간 등)  
- 데이터 형식: (예: 시트, 엑셀, PDF 등)
- 액션: (예: 덮어쓰기, 전송, 분석 등)
- 조건: (예: ROAS 120%↓, 특정 필터 등)

## 2단계: 이미 명시된 것은 제외하고 애매한 부분만 질문
**절대 금지**: 이미 말한 것을 다시 묻기
**질문 대상**: 정말 애매하거나 구체화가 필요한 부분만

## 3단계: 3가지 영역에서 질문 생성
1. **세부 동작 방식**: 애매한 용어의 구체적 의미 (덮어쓰기→완전삭제vs업데이트, DM→누구에게)
2. **실행 환경**: 기술적/권한적 제약사항 (계정연결, 권한, 기존파일유무)
3. **예외 처리**: 실패/오류 상황 대응 (데이터없음, 연결실패, 권한오류)

# 🎯 질문 품질 기준:
- **생각 없이 클릭 가능**: 복잡한 설명 없이 바로 선택
- **구체적 선택지**: 4-5개의 명확한 옵션 제공  
- **업무 맥락 반영**: 해당 도메인 특화된 현실적 옵션
- **"잘모름" 항상 포함**: AI 추천 받을 수 있도록

이미 명시된 정보는 다시 묻지 말고, AI가 맞춤형 자동화 솔루션을 만들기 위해 필요한 핵심 맥락 정보를 수집해주세요. 

**목표**: AI가 받았을 때 "아, 이 사람은 이런 환경에서 이런 목적으로 이걸 원하는구나!"를 이해할 수 있는 정보 제공.
`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('AI 응답이 비어있습니다.');
    }

    // JSON 파싱
    let dynamicQuestions;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : content;
      dynamicQuestions = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      console.log('원본 응답:', content);
      
      // 파싱 실패 시 기본 질문 제공
      dynamicQuestions = {
        questions: [
          {
            key: "current_process",
            question: "현재 이 작업을 어떻게 하고 계신가요?",
            type: "single",
            options: ["수동으로 직접", "부분적으로 자동화", "완전히 수동", "아직 시작 안함", "기타 (직접입력)", "잘모름 (AI가 추천)"],
            category: "data",
            importance: "high",
            description: "현재 상황을 파악하여 최적 자동화 수준을 결정합니다."
          },
          {
            key: "main_challenge",
            question: "가장 큰 문제점은 무엇인가요?",
            type: "single", 
            options: ["시간이 너무 오래 걸림", "실수가 자주 발생", "반복 작업이 지루함", "결과 공유가 어려움", "기타 (직접입력)", "잘모름 (AI가 추천)"],
            category: "goal",
            importance: "high",
            description: "해결해야 할 핵심 문제를 파악합니다."
          },
          {
            key: "tool_constraint",
            question: "도구 사용에 제한이 있나요?",
            type: "single",
            options: ["모든 도구 사용 가능", "회사 승인 도구만", "무료 도구만", "기존 도구 활용", "기타 (직접입력)", "잘모름 (AI가 추천)"],
            category: "environment", 
            importance: "medium",
            description: "사용 가능한 도구 범위를 확인합니다."
          }
        ]
      };
    }

    // 응답 검증 및 필수 옵션 강제 추가
    if (!dynamicQuestions.questions || !Array.isArray(dynamicQuestions.questions)) {
      throw new Error('올바른 questions 형식이 아닙니다.');
    }

    // 🚨 모든 질문에 필수 옵션 강제 추가
    dynamicQuestions.questions = dynamicQuestions.questions.map((q: any) => {
      if (q.options && Array.isArray(q.options)) {
        // 기존 옵션에서 필수 옵션들 제거 (중복 방지)
        let cleanOptions = q.options.filter((opt: string) => 
          opt !== '기타 (직접입력)' && opt !== '잘모름 (AI가 추천)'
        );
        
        // 필수 옵션들을 끝에 추가
        q.options = [...cleanOptions, '기타 (직접입력)', '잘모름 (AI가 추천)'];
      }
      return q;
    });

    console.log('✅ [동적 후속질문] 생성 완료:', {
      질문수: dynamicQuestions.questions.length,
      질문들: dynamicQuestions.questions.map((q: any) => q.question)
    });

    return NextResponse.json({
      questions: dynamicQuestions.questions,
      metadata: {
        generatedAt: new Date().toISOString(),
        userInput: userInput,
        questionCount: dynamicQuestions.questions.length,
        approach: 'dynamic_contextual_generation'
      }
    });

  } catch (error) {
    console.error('❌ 동적 후속질문 생성 실패:', error);
    
    // 오류 시 기본 질문 제공
    return NextResponse.json({
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
      ],
      metadata: {
        generatedAt: new Date().toISOString(),
        fallback: true,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      }
    });
  }
}
