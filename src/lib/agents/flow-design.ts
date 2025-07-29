// 맞춤형 자동화 플로우+복붙 프롬프트+PlanB/FAQ/실전팁

import { callOpenAI } from '@/lib/openai';
import { TrendAnalysisResult } from './trend-analysis';

export interface FlowDesignResult {
  flows: Array<{
    type: '복붙' | '반자동' | '완전자동';
    title: string;
    steps: Array<{
      step: string;
      code?: string;
      guide?: string;
      tips?: string[];
      planB?: string;
      faq?: Array<{ q: string; a: string }>;
      failureCases?: string[];
      icon?: string;
      role?: string;
      checklist?: string[];
      troubleshooting?: Array<{ problem: string; solution: string }>;
      preview?: string;
      implementationOptions?: string[];
    }>;
    copyPrompt: string;
    realTip: string;
  }>;
}

const SYSTEM_PROMPT = `
너는 자동화 플로우 설계 전문가다.

[반드시 지켜야 할 규칙]
1. 자동화 플로우(Flow) 카드는 반드시 3단계 이상 steps 배열로 생성해야 한다.
2. 각 step의 title은 반드시 "행동 + 목적" 형식의 wow 단계명으로 생성
   예시: "FAQ 데이터 자동 업로드", "챗봇 인텐트 등록", "메시지 앱 통합"
3. 모든 step은 반드시 다음 필드를 포함해야 함:
   - id: 고유 식별자(예: step1, step2, ...)
   - title: 한눈에 이해되는 wow 단계명
   - subtitle: 단계의 부제목/설명
   - icon: 단계를 대표하는 이모지
   - duration: 예상 소요 시간(예: '5분')
   - preview: 이 단계에서 실제로 일어나는 일 요약
   - techTags: 사용 기술/도구 배열(예: ['Webhook', 'Google Sheets'])
   - desc: 단계의 핵심 목적/효과
   - story: 이 단계가 해결하는 문제/가져오는 변화
   - wowElements: 실전 정보 배열 (아래 타입 중 2개 이상 반드시 포함)
     * { type: 'code'|'example'|'fail'|'faq'|'expand'|'preview', content: string }

4. wowElements는 반드시 아래 중 2개 이상 포함:
   - code: 복사/실행 가능한 실제 코드
   - example: 실전 예시/실제 데이터/업무/상황
   - fail: 실패사례/PlanB/실패 시 대처법
   - faq: 자주 묻는 질문/문제해결
   - expand: 확장/추가 활용/연동/고도화
   - preview: 시각화/외부링크/이미지/실제 동작 예시

5. JSON 응답 구조:
{
  "flows": [{
    "steps": [
      {
        "id": string,
        "title": string,
        "subtitle": string,
        "icon": string,
        "duration": string,
        "preview": string,
        "techTags": string[],
        "desc": string,
        "story": string,
        "wowElements": [
          { "type": 'code'|'example'|'fail'|'faq'|'expand'|'preview', "content": string }, ...최소 2개 이상
        ]
      }, ...최소 3개 이상]
  }]
}

[실패 처리]
- steps가 3개 미만이거나, wowElements가 2개 미만이거나, title/desc/icon/story/id/subtitle/duration/preview/techTags 중 하나라도 없으면 에러 반환
- 각 step의 title이 "단계 1", "단계 2" 등으로 생성되면 에러 반환
- 임시/샘플/하드코딩/템플릿/목데이터/영문/불필요한 텍스트가 포함되면 에러 반환 및 재생성
- 마크다운/설명/코드블록/불필요한 텍스트는 절대 금지, JSON만 반환

[입력 데이터 활용]
- answers의 각 단계 설명에서 title/subtitle 후보 추출
- guide.instructions[0]에서 핵심 행동/목적 파악
- code.description에서 단계의 핵심 기능 파악
`;

export async function designFlow(
  requirements: any,
  trends: TrendAnalysisResult,
  userGoal: string
): Promise<FlowDesignResult> {
  try {
    const prompt = `요구사항: ${JSON.stringify(requirements)}\n\n트렌드/도구: ${JSON.stringify(trends)}\n\n유저 목표: ${userGoal}`;
    const response = await callOpenAI({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('API 응답이 비어있습니다.');
    }
    const result = JSON.parse(content);
    // 누락 필드 보완
    const enrichedSteps = (result.flows || []).map((flow: any) => ({
      ...flow,
      steps: (flow.steps || []).map((step: any, idx: number) => {
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
        // wow 메타 필드 추출 (title을 guide.instructions[0].action 등에서 강제로 생성)
        let title = step.title;
        if (!title) {
          if (
            step.guide &&
            Array.isArray(step.guide.instructions) &&
            step.guide.instructions[0]?.action
          ) {
            title = step.guide.instructions[0].action.slice(0, 20);
          } else if (step.dashboard && step.dashboard.title) {
            title = step.dashboard.title;
          } else if (step.code && step.code.test_method) {
            title = step.code.test_method.slice(0, 20);
          } else {
            title = `단계 ${idx + 1}`;
          }
        }
        const desc =
          step.desc ||
          (step.guide &&
            Array.isArray(step.guide.preparation) &&
            step.guide.preparation.join(', ')) ||
          (step.code && step.code.test_method) ||
          (step.dashboard && step.dashboard.title) ||
          '';
        const icon = step.icon || '✨';
        const story =
          step.story ||
          (step.guide && step.guide.checkpoint) ||
          (step.code && step.code.test_method) ||
          '';
        return {
          ...step,
          title,
          desc,
          icon,
          story,
          color: step.color || stepColors[title] || 'indigo',
          code: step.code || '',
          guide: step.guide || '',
          tips: step.tips || [],
          planB: step.planB || '',
          faq: step.faq || [],
          failureCases: step.failureCases || [],
          expansion: step.expansion || '',
          effects: step.effects || '',
          dashboard: step.dashboard || '',
          role: step.role || serviceRoles[title] || '',
          checklist: step.checklist || [],
          troubleshooting: step.troubleshooting || [],
          preview: step.preview || '',
          implementationOptions: step.implementationOptions || [],
          next: step.next || null,
          iconUrl: step.iconUrl || serviceIcons[title] || '',
        };
      }),
    }));
    return {
      flows: enrichedSteps,
    };
  } catch (error) {
    console.error('플로우 설계 오류:', error);
    throw new Error('플로우 설계 중 오류가 발생했습니다.');
  }
}
