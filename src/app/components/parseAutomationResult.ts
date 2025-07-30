// 다양한 API 응답 구조를 UI용 데이터로 추상화하는 함수

import { FlowCard, GuideCard, ImpactBarCard, DashboardCard, FAQCard } from '../../lib/types/automation';

type Card = FlowCard | GuideCard | ImpactBarCard | DashboardCard | FAQCard;

export interface ParsedAutomationData {
  flowDiagram: Array<{ icon?: string; title: string; role?: string; desc?: string; key?: string }>;
  steps: Array<any>; // 단계별 상세 정보(코드, 팁, FAQ 등 포함)
  summary: string[];
  dashboard?: any;
  realCase?: any;
  trends?: any;
  implementationOptions?: any[];
  effects?: any[];
}

function deepParse(str: any) {
  let parsed = str;
  let count = 0;
  while (typeof parsed === 'string' && count < 3) {
    try {
      const match = parsed.match && parsed.match(/```json\s*([\s\S]*?)\s*```/);
      parsed = match ? JSON.parse(match[1]) : JSON.parse(parsed);
    } catch {
      break;
    }
    count++;
  }
  return parsed;
}

export function parseAutomationResult(data: any): Card[] {
  if (!data) return [];

  const cards: Card[] = [];

  // 임팩트 바 카드
  if (data.impact) {
    cards.push({
      type: 'impact-bar',
      title: `💡 ${data.impact.timeSaved}`,
      desc: `${data.impact.errorReduction} • ${data.impact.realtime ? '실시간 처리' : ''}`
    });
  }

  // 플로우 카드
  if (data.steps && Array.isArray(data.steps)) {
    cards.push({
      type: 'flow',
      title: data.title || '',
      subtitle: data.subtitle || '',
      steps: data.steps.map((step: any, index: number) => ({
        id: step.id || index + 1,
        icon: step.icon || '',
        title: step.title || '',
        subtitle: step.subtitle || '',
        duration: step.duration || '',
        preview: step.preview || '',
        tech: step.tech || step.techTags || []
      })),
      engine: 'make',
      flowMap: data.steps.map((step: any) => step.title || '')
    });
  }

  // 가이드 카드
  if (data.guide) {
    cards.push({
      type: 'guide',
      stepId: 1,
      title: data.guide.title || '',
      subtitle: data.guide.subtitle || '',
      content: {
        steps: data.guide.steps?.map((step: any, index: number) => ({
          number: index + 1,
          title: step.title || '',
          description: step.description || ''
        })) || [],
        code: data.guide.code,
        tips: data.guide.tips || []
      }
    });
  }

  // 대시보드 카드
  if (data.stats) {
    cards.push({
      type: 'dashboard',
      stats: {
        total: data.stats.total || 0,
        completed: data.stats.completed || 0,
        pending: data.stats.pending || 0
      },
      distribution: data.stats.distribution?.map((item: any) => ({
        category: item.category || '',
        percentage: item.percentage || 0,
        color: item.color || '#6C5CE7'
      })) || []
    });
  }

  // FAQ 카드
  if (data.faq && Array.isArray(data.faq)) {
    cards.push({
      type: 'faq',
      items: data.faq.map((item: any) => ({
        q: item.q || item.question || '',
        a: item.a || item.answer || ''
      }))
    });
  }

  return cards;
}
