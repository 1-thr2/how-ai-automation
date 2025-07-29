// 트렌드/도구/성공사례+실패사례+PlanB 추천

import { callOpenAI } from '@/lib/openai';
import { tavilySearch } from '@/lib/tavily';

export interface TrendAnalysisResult {
  trendSummary: string; // 최신 트렌드/실전 요약
  bestTools: Array<{
    name: string;
    useCase: string;
    pros: string[];
    cons: string[];
    planB: string;
    realTip: string;
    icon: string;
    checklist: string[];
    troubleshooting: string[];
    preview: string;
    implementationOptions: string[];
    color: string;
  }>;
  realCase: string; // 실전 성공/실패/주의 사례
  copyPrompt: string; // 복붙/실행 프롬프트
}

const SYSTEM_PROMPT = `너는 2024년 대한민국에서 현업 자동화 도구/트렌드/실전사례/PlanB까지 모두 꿰고 있는 실무자다. 아래 규칙을 반드시 지켜라.

1. 최신 트렌드/실전 요약을 1문단으로 정리한다.
   - 실제 업무에서 자주 사용하는 도구/방법 중심
   - 유사한 실전 사례의 성공/실패 경험 참고
   - 실제 현업에서 통했던 팁/노하우 반영
   - 구체적인 성과/지표/수치 포함

2. 이 목적에 최적인 도구/방법(복붙/반자동/완전자동)별로, 언제/어떻게 쓰면 좋은지(useCase), 장단점, PlanB, 실전팁, icon, checklist, troubleshooting, preview, implementationOptions 등을 표로 정리한다.
   - 각 도구/방법별로 반드시 다음 필드를 포함한다:
     - name, useCase, pros, cons, planB, realTip, icon, checklist, troubleshooting, preview, implementationOptions
   - 실제 업무에서 자주 발생하는 문제/실패사례 고려
   - 유사한 실전 사례의 해결방법 참고
   - 실제 현업에서 통했던 우회/해결 방법 반영
   - 구체적인 ROI/시간절약/비용절감 수치 포함

3. 실제 현업에서 통했던 실전 성공/실패/주의 사례를 1개 이상 제시한다.
   - 유저의 실제 업무/상황과 유사한 사례 선택
   - 실패사례/PlanB/해결방법까지 포함
   - 실제 현업에서 통했던 팁/노하우 반영
   - 구체적인 성과/지표/수치 포함

4. 위 내용을 바탕으로, 복붙/실행 가능한 프롬프트를 생성한다.
   - 실제 업무/상황에 맞게 최적화
   - 실패사례/PlanB를 고려한 방어 로직 포함
   - 실제 현업에서 통했던 팁/노하우 반영
   - 구체적인 실행 단계/코드/설정 포함

5. 반드시 JSON ONLY로 아래 형태로 답하라.
{
  "trendSummary": "",
  "bestTools": [
    { "name": "", "useCase": "", "pros": [], "cons": [], "planB": "", "realTip": "", "icon": "", "checklist": [], "troubleshooting": [], "preview": "", "implementationOptions": [] }
  ],
  "realCase": "",
  "copyPrompt": ""
}`;

function enrichTool(tool: any, idx: number) {
  const serviceIcons: Record<string, string> = {
    'Google Ads': 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png',
    'Facebook Ads':
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/768px-Facebook_Logo_%282019%29.png',
    'Google Sheets':
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Google_Sheets_logo_%282014-2020%29.svg/1498px-Google_Sheets_logo_%282014-2020%29.svg.png',
  };
  const stepColors: Record<string, string> = {
    'Google Ads': 'indigo',
    'Facebook Ads': 'violet',
    'Google Sheets': 'emerald',
    Supermetrics: 'blue',
    리포트: 'green',
    알림: 'amber',
  };
  const name: string = typeof tool.name === 'string' ? tool.name : `도구 ${idx + 1}`;
  return {
    ...tool,
    icon: tool.icon || serviceIcons[name] || '',
    checklist: tool.checklist || [],
    troubleshooting: tool.troubleshooting || [],
    preview: tool.preview || '',
    implementationOptions: tool.implementationOptions || [],
    color: tool.color || stepColors[name] || 'indigo',
  };
}

export async function analyzeTrends(
  requirements: any,
  userGoal: string
): Promise<TrendAnalysisResult> {
  try {
    // 1. Tavily로 최신 정보 검색
    const searchQuery = `${requirements.dataStructure || ''} ${userGoal} ${new Date().getFullYear()} 최신 자동화 방법`;
    const tavilyResult = await tavilySearch(searchQuery);

    // 2. GPT로 트렌드/도구/사례 분석
    const prompt = `요구사항: ${JSON.stringify(requirements)}\n\n유저 목표: ${userGoal}\n\n최신 정보: ${tavilyResult.answer}`;
    const response = await callOpenAI(prompt);

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('API 응답이 비어있습니다.');
    }

    try {
      const result = JSON.parse(content);
      return {
        trendSummary: result.trendSummary || '',
        bestTools: (result.bestTools || []).map(enrichTool),
        realCase: result.realCase || '',
        copyPrompt: result.copyPrompt || '',
      };
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      throw new Error('API 응답 형식이 올바르지 않습니다.');
    }
  } catch (error) {
    console.error('트렌드 분석 오류:', error);
    throw new Error('트렌드 분석 중 오류가 발생했습니다.');
  }
}
