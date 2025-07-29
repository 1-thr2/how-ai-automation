import { 
  CardType, 
  BaseCard, 
  FlowCard, 
  GuideCard, 
  ImpactBarCard, 
  DashboardCard, 
  FAQCard,
  CARD_ORDER
} from '../types/automation';

// TipCard 인터페이스 정의
interface TipCard extends BaseCard {
  type: 'tip';
  tips: string[];
}

// ExpansionCard 인터페이스 정의
interface ExpansionCard extends BaseCard {
  type: 'expansion';
  ideas: string[];
}

// CodeCard 인터페이스 정의
interface CodeCard extends BaseCard {
  type: 'code';
  code: string;
  language?: string;
}

// 유효한 카드 타입인지 확인
const isValidCardType = (type: string): type is CardType => {
  return Object.keys(CARD_ORDER).includes(type);
};

// 플로우 카드 파싱
const parseFlowCard = (card: any): FlowCard => {
  return {
    type: 'flow',
    id: card.id || `flow-${Date.now()}`,
    title: card.title || '자동화 플로우',
    steps: (card.steps || [])
      .filter((step: any) => {
        const fields = [step.title, step.description, step.subtitle, step.code, step.preview]
          .map(v => (v || '').toLowerCase());
        const dummyKeywords = ['추가 단계', '자동 생성', '임시', '샘플', '기본값', 'default', 'placeholder', 'empty', '빈 값'];
        return fields.every(field => field && !dummyKeywords.some(keyword => field.includes(keyword)));
      })
      .map((step: any, index: number) => ({
        id: step.id || String(index + 1),
        icon: step.icon || '🔗',
        title: step.title || '',
        subtitle: step.subtitle || '',
        duration: step.duration || '5분',
        preview: step.preview || '',
        techTags: step.techTags || [],
        level: step.level || 0
      })),
    connections: (card.connections || []).map((conn: any, index: number) => ({
      from: conn.from || String(index + 1),
      to: conn.to || String(index + 2),
      type: conn.type || 'default'
    }))
  };
};

// 가이드 카드 파싱
const parseGuideCard = (card: any): GuideCard => {
  return {
    type: 'guide',
    id: card.id || `guide-${Date.now()}`,
    title: card.title || '단계별 가이드',
    stepId: card.stepId || '',
    content: {
      steps: (card.content?.steps || []).map((step: any, index: number) => ({
        number: step.number || index + 1,
        title: step.title || '',
        description: step.description || ''
      })),
      code: card.content?.code,
      tips: card.content?.tips || []
    }
  };
};

// 임팩트바 카드 파싱
const parseImpactBarCard = (card: any): ImpactBarCard => {
  return {
    type: 'impact-bar',
    id: card.id || `impact-${Date.now()}`,
    title: card.title || '💡 자동화 효과',
    desc: card.desc || '',
    stats: {
      timesSaved: card.stats?.timesSaved || '0시간/주',
      errorReduction: card.stats?.errorReduction || '0%',
      scalability: card.stats?.scalability || '높음'
    }
  };
};

// 대시보드 카드 파싱
const parseDashboardCard = (card: any): DashboardCard => {
  return {
    type: 'dashboard',
    id: card.id || `dashboard-${Date.now()}`,
    title: card.title || '자동화 대시보드',
    metrics: (card.metrics || []).map((metric: any) => ({
      name: metric.name || '',
      value: metric.value || '0',
      change: metric.change || '0%'
    }))
  };
};

// FAQ 카드 파싱
const parseFAQCard = (card: any): FAQCard => {
  return {
    type: 'faq',
    id: card.id || `faq-${Date.now()}`,
    title: card.title || '자주 묻는 질문',
    questions: (card.questions || []).map((qa: any) => ({
      question: qa.question || '',
      answer: qa.answer || ''
    }))
  };
};

// Tip 카드 파싱
const parseTipCard = (card: any): TipCard => {
  return {
    type: 'tip',
    id: card.id || `tip-${Date.now()}`,
    title: card.title || '실전 팁',
    tips: (card.tips || []).map((tip: any) => 
      typeof tip === 'string' ? tip : tip.text || tip.content || ''
    )
  };
};

// Expansion 카드 파싱
const parseExpansionCard = (card: any): ExpansionCard => {
  return {
    type: 'expansion',
    id: card.id || `expansion-${Date.now()}`,
    title: card.title || '확장 아이디어',
    ideas: (card.ideas || []).map((idea: any) => 
      typeof idea === 'string' ? idea : idea.text || idea.content || ''
    )
  };
};

// Code 카드 파싱
const parseCodeCard = (card: any): CodeCard => {
  return {
    type: 'code',
    id: card.id || `code-${Date.now()}`,
    title: card.title || '코드 예시',
    code: card.code || '',
    language: card.language || 'javascript'
  };
};

// 카드 파싱
export const parseCard = (card: any): BaseCard => {
  // planB 타입이 들어오면 guide로 자동 변환
  if (card.type === 'planB') {
    card.type = 'guide';
  }
  if (!isValidCardType(card.type)) {
    throw new Error(`Invalid card type: ${card.type}`);
  }

  switch (card.type) {
    case 'flow':
      return parseFlowCard(card);
    case 'guide':
      return parseGuideCard(card);
    case 'impact-bar':
      return parseImpactBarCard(card);
    case 'dashboard':
      return parseDashboardCard(card);
    case 'faq':
      return parseFAQCard(card);
    case 'tip':
      return parseTipCard(card);
    case 'expansion':
      return parseExpansionCard(card);
    case 'code':
      return parseCodeCard(card);
    default:
      throw new Error(`Unhandled card type: ${card.type}`);
  }
};

// cards 배열 파싱 및 정렬
export const parseCards = (rawCards: any[]): BaseCard[] => {
  try {
    const parsedCards = rawCards
      .filter(card => card && typeof card === 'object')
      .map(card => parseCard(card))
      .sort((a, b) => CARD_ORDER[a.type] - CARD_ORDER[b.type]);

    return parsedCards;
  } catch (error) {
    console.error('Error parsing cards:', error);
    return [];
  }
}; 