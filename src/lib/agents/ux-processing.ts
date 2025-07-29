// 통합+UX 가공(비개발자 3분 실전 복붙/실행 중심)

import { callOpenAI } from '@/lib/openai';
import { FlowDesignResult } from './flow-design';
import { TrendAnalysisResult } from './trend-analysis';

export interface UXResult {
  cards: Array<{
    type: '복붙' | '반자동' | '완전자동';
    title: string;
    flow: string[];
    copyPrompt: string;
    guide: string;
    story: string;
    planB: string;
    faq: Array<{ q: string; a: string }>;
    failureCases: string[];
    realTip: string;
    icon: string;
    checklist: string[];
    troubleshooting: string[];
    preview: string;
    implementationOptions: string[];
    role: string;
    color: string;
  }>;
  footer: {
    howToStart: string;
    pdfDownloadUrl?: string;
    gptSharePrompt?: string;
    community?: string;
    expertConsultation?: string;
  };
}

function getSystemPrompt(userGoal: string) {
  return `너는 대한민국 최고의 AI 자동화 UX 디자이너다. 아래 규칙을 반드시 지켜라.

1. 복붙/반자동/완전자동 옵션별로, 실제 현업에서 바로 복사/실행/공유/확장 가능한 카드(복붙, 실행, 가이드, 실전팁, PlanB, FAQ, 실패사례, 스토리, icon, checklist, troubleshooting, preview, implementationOptions)를 생성한다.
   - 각 카드/단계별로 반드시 다음 필드를 포함한다:
     - icon, checklist, troubleshooting, preview, implementationOptions
   - 실제 업무에서 자주 발생하는 문제/실패사례 고려
   - 유사한 실전 사례의 해결방법 참고
   - 실제 현업에서 통했던 우회/해결 방법 반영
   - 구체적인 실행 단계/코드/설정 포함

2. 각 카드에는 다음을 반드시 포함한다:
   - 복붙/실행 프롬프트(copyPrompt): 바로 복사/실행 가능한 코드/프롬프트
   - 실전팁(realTip): 실제 현업에서 통했던 팁/노하우
   - PlanB: 실패/불안 대비 대체 방법
   - FAQ: 실제 업무에서 자주 묻는 질문/답변
   - 실패사례: 실제 현업에서 자주 발생하는 실패사례/해결방법
   - 스토리: 실제 현업에서 통했던 성공/실패 경험
   - icon: 대표 아이콘
   - checklist: 체크리스트
   - troubleshooting: 문제해결
   - preview: 미리보기
   - implementationOptions: 구현 방법별 안내
   - 구체적인 성과/지표/수치 포함

3. 각 카드의 title, flow, guide, dashboard 등 모든 필드는 반드시 입력값(유저 목표: ${userGoal})을 기반으로 동적으로 생성해야 한다. 샘플/하드코딩/예시값이 남아있으면 에러를 반환한다. 입력값이 반영되지 않은 카드가 있으면 반드시 에러를 반환하라.
   - flow가 문자열 배열이면 안 됨. 반드시 각 단계별 wow 요소가 포함된 객체 배열이어야 함.
   - 누락 시 재생성.

4. 푸터에는 다음을 반드시 포함한다:
   - 시작 가이드(howToStart): 실제 업무/상황에 맞는 구체적인 시작 방법
   - PDF 다운로드(pdfDownloadUrl): 바로 실행 가능한 가이드/코드/프롬프트
   - GPT 공유 프롬프트(gptSharePrompt): 실제 업무/상황에 맞게 최적화된 프롬프트
   - 커뮤니티: 실제 현업에서 통했던 팁/노하우/실패사례/해결방법
   - 전문가 상담: 실제 현업에서 통했던 우회/해결 방법
   - 구체적인 실행 단계/코드/설정 포함

5. 반드시 JSON ONLY로 아래 형태로 답하라.
{
  "cards": [
    {
      "type": "복붙|반자동|완전자동",
      "title": "",
      "flow": [ { "title": "", "guide": "", "code": "", "tips": [], "planB": "", "faq": [], ... } ],
      "copyPrompt": "",
      "guide": "",
      "story": "",
      "planB": "",
      "faq": [],
      "failureCases": [],
      "realTip": "",
      "icon": "",
      "checklist": [],
      "troubleshooting": [],
      "preview": "",
      "implementationOptions": []
    }
  ],
  "footer": {
    "howToStart": "",
    "pdfDownloadUrl": "",
    "gptSharePrompt": "",
    "community": "",
    "expertConsultation": ""
  }
}`;
}

function enrichCard(card: any, idx: number) {
  const serviceIcons: Record<string, string> = {
    'Google Ads': 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png',
    'Facebook Ads':
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/768px-Facebook_Logo_%282019%29.png',
    'Google Sheets':
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Google_Sheets_logo_%282014-2020%29.svg/1498px-Google_Sheets_logo_%282014-2020%29.svg.png',
  };
  const serviceRoles: Record<string, string> = {
    'Google Ads': '광고 데이터 소스',
    'Facebook Ads': '광고 데이터 소스',
    'Google Sheets': '데이터 저장/통합',
    Supermetrics: '데이터 연동',
    리포트: '성과 리포트/대시보드',
    알림: '자동 알림/보고',
  };
  const stepColors: Record<string, string> = {
    'Google Ads': 'indigo',
    'Facebook Ads': 'violet',
    'Google Sheets': 'emerald',
    Supermetrics: 'blue',
    리포트: 'green',
    알림: 'amber',
  };
  const title: string = typeof card.title === 'string' ? card.title : `카드 ${idx + 1}`;
  return {
    ...card,
    icon: card.icon || serviceIcons[title] || '',
    checklist: card.checklist || [],
    troubleshooting: card.troubleshooting || [],
    preview: card.preview || '',
    implementationOptions: card.implementationOptions || [],
    role: card.role || serviceRoles[title] || '카드',
    color: card.color || stepColors[title] || 'indigo',
  };
}

export async function processUX(
  flows: FlowDesignResult,
  trends: TrendAnalysisResult,
  userGoal: string
): Promise<UXResult> {
  try {
    const prompt = `자동화 플로우: ${JSON.stringify(flows)}\n\n트렌드/도구: ${JSON.stringify(trends)}\n\n유저 목표: ${userGoal}`;
    const systemPrompt = getSystemPrompt(userGoal);
    const response = await callOpenAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('API 응답이 비어있습니다.');
    }

    try {
      const result = JSON.parse(content);
      // flow가 문자열 배열이거나 wow 요소가 없는 경우 에러
      if (!result.cards || !Array.isArray(result.cards)) throw new Error('카드 배열이 없습니다.');
      result.cards.forEach((card: any, idx: number) => {
        if (!Array.isArray(card.flow) || card.flow.length === 0)
          throw new Error(`카드 ${idx + 1}의 flow가 비어있음`);
        if (typeof card.flow[0] === 'string')
          throw new Error(
            `카드 ${idx + 1}의 flow가 문자열 배열임. 반드시 단계별 wow 요소가 포함된 객체 배열이어야 함.`
          );
        if (!card.flow[0].guide || !card.flow[0].code)
          throw new Error(`카드 ${idx + 1}의 flow에 wow 요소(guide, code 등)가 누락됨`);
        // 입력값 기반 title/flow/guide/dashboard 등 체크
        if (
          !card.title?.includes(userGoal) &&
          !JSON.stringify(card.flow).includes(userGoal) &&
          !(card.guide && card.guide.includes(userGoal))
        ) {
          throw new Error(`카드 ${idx + 1}에 입력값(userGoal)이 반영되지 않았음`);
        }
      });
      return {
        cards: (result.cards || []).map(enrichCard),
        footer: result.footer || {
          howToStart: '',
          pdfDownloadUrl: '',
          gptSharePrompt: '',
          community: '',
          expertConsultation: '',
        },
      };
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      throw new Error(
        'API 응답 형식이 올바르지 않습니다. (flow는 반드시 단계별 wow 요소가 포함된 객체 배열이어야 함)'
      );
    }
  } catch (error) {
    console.error('UX 가공 오류:', error);
    throw new Error(
      'UX 가공 중 오류가 발생했습니다. (flow는 반드시 단계별 wow 요소가 포함된 객체 배열이어야 함)'
    );
  }
}
