import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { AutomationAPIResponse, AutomationContext, AutomationCard } from '@/app/types/automation/index';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
너는 대한민국 최고의 자동화 설계 컨설턴트이자 GPT 프롬프트 전문가다.

[반드시 지켜야 할 규칙]
1. 아래 입력값(자동화 목적, 데이터 구조, 단계별 플로우, 코드, 가이드, 팁, FAQ, 대시보드 등)을 바탕으로
2. ChatGPT에 붙여넣으면 바로 맞춤형 wow 자동화 설계/실행/복붙/문제해결/확장까지 도와주는 프롬프트를 생성
3. 프롬프트에는 반드시 아래 항목을 포함:
   - 비즈니스/업무 목적(한 줄 요약)
   - 데이터 구조/주요 도구/연동 흐름
   - 단계별 플로우(각 단계의 핵심 목표/행동/효과)
   - 산출물 요청(코드, 가이드, 트러블슈팅, 확장 아이디어 등)
   - 실전 팁/FAQ/PlanB/실패사례/확장 등 wow 요소
4. 복사해서 바로 붙여넣을 수 있게, 명확하고 구체적으로 plain text로만 작성
5. 마크다운/코드블록/불필요한 설명/표/장황한 서론 금지

[예시]
내 비즈니스는 [업무 목적]입니다. 아래 데이터 구조와 플로우에 맞는 자동화 설계/코드/가이드/문제해결/확장 아이디어를 제안해 주세요.

## 업무 목적
- ...

## 데이터 구조/주요 도구/연동 흐름
- ...

## 단계별 플로우
1. ...
2. ...
3. ...

## 산출물 요청
1. 복사-붙여넣기 실행 코드
2. 단계별 실행 가이드
3. 자주 묻는 질문/문제해결/실전팁/PlanB/확장 아이디어

[입력값]
- userInput: 사용자의 자동화 목적/상황
- recipe: 자동화 레시피 데이터(JSON)
`;

export async function POST(req: NextRequest) {
  try {
    const { userInput, recipe } = await req.json();
    const automationContext: AutomationContext = {
      userInput,
      followupAnswers: recipe,
    };

    if (!userInput || !recipe) {
      return NextResponse.json({
        context: automationContext,
        cards: [],
        error: 'userInput, recipe가 필요합니다.',
        fallbackExample: '',
        followupQuestions: [],
        raw: null,
      }, { status: 400 });
    }

    const prompt = `내 비즈니스 요구: ${userInput}\n자동화 레시피: ${JSON.stringify(recipe, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({
        context: automationContext,
        cards: [],
        error: 'API 응답이 비어있습니다.',
        fallbackExample: '',
        followupQuestions: [],
        raw: null,
      }, { status: 500 });
    }

    // gptPrompt 텍스트를 cards로 변환
    const gptPromptCard: AutomationCard = {
      type: 'gpt-prompt',
      title: 'GPT 프롬프트',
      code: content,
      planB: '프롬프트가 부족하면 더 구체적인 업무 상황이나 도구 정보를 추가해주세요.',
      faq: [
        'Q: 프롬프트가 너무 길어요? A: 핵심 업무 목적과 데이터 구조만 포함하세요.',
        'Q: 실행 코드가 안 나와요? A: 구체적인 도구명과 데이터 포맷을 명시하세요.',
        'Q: 실전 팁이 부족해요? A: 현재 사용 중인 도구와 실패 경험을 추가하세요.'
      ],
      expansion: '이 프롬프트를 기반으로 더 구체적인 자동화 시나리오나 고급 활용법을 추가할 수 있습니다.',
      visualization: '프롬프트 구조를 시각화하여 각 부분의 역할을 명확히 이해할 수 있습니다.',
      sources: [],
    };

    return NextResponse.json({
      context: automationContext,
      cards: [gptPromptCard],
      error: '',
      fallbackExample: '',
      followupQuestions: [],
      raw: content,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      context: {},
      cards: [],
      error: 'GPT 프롬프트 생성 중 오류가 발생했습니다.',
      fallbackExample: '',
      followupQuestions: [],
      raw: null,
    }, { status: 500 });
  }
}
