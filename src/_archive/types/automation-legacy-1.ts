export type Step = {
  id: string;
  title: string;
  icon?: string;
  color?: string;
  role?: string;
  preview?: string;
  code?: string;
  guide?: string;
  troubleshooting?: {
    problem: string;
    solution: string;
  }[];
  realCase?: string;
  failureCase?: string;
  planB?: string;
  expansion?: string;
  upsell?: string;
  dashboard?: string;
  alert?: string;
  faq?: { q: string; a: string }[];
  tip?: string;
  action?: string;
  description?: string;
};

export interface AutomationCard {
  title: string;
  description: string;
  code: string;
  language: string;
  steps: Step[];
  planB?: string;
  failureCases?: string[];
  realTip?: string;
  tips?: string;
  expansionIdeas?: string;
  realCase?: string;
  realData?: string;
  agentName?: string;
  agentType?: string;
  dashboard?: any;
  trends?: any;
}

// API 응답 기본 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// 자동화 데이터 타입
export interface AutomationData {
  title: string;
  subtitle: string;
  impact: {
    timeSaved: string;
    errorReduction: string;
    realtime: boolean;
  };
  steps: Array<{
    number: number;
    icon: string;
    title: string;
    subtitle: string;
    duration: string;
    preview: string;
    tech: string[];
    modal: {
      title: string;
      subtitle: string;
      guide: string[];
      code: string;
    };
  }>;
  results: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  cta: {
    main: {
      text: string;
      icon: string;
    };
    secondary: Array<{
      text: string;
      icon: string;
    }>;
  };
  share: {
    title: string;
    description: string;
    button: {
      text: string;
      icon: string;
    };
  };
  faq: Array<{
    question: string;
    answer: string;
  }>;
  flow?: AutomationData;
}

export interface FlowNode {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  guide?: {
    title: string;
    steps: string[];
    prerequisites: string[];
    expectedOutcome: string;
  };
  code?: {
    title: string;
    description: string;
    codeBlock: string;
    dependencies: string[];
    setupInstructions: string[];
  };
  tips?: {
    title: string;
    items: string[];
    bestPractices: string[];
    commonMistakes: string[];
  };
  faq?: {
    title: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
  details: {
    guide: string[];
    code: string;
    tips: string[];
    planB: string;
    failureCases: string[];
    expansion: string;
    realCase?: string;
    effects?: string;
    dashboard?: string;
  };
  realCase?: {
    title: string;
    description: string;
    beforeAfter: {
      before: string;
      after: string;
    };
    metrics: {
      name: string;
      value: string;
      change: string;
    }[];
  };
  effects?: {
    title: string;
    benefits: string[];
    metrics: {
      name: string;
      value: string;
      change: string;
    }[];
  };
  dashboard?: {
    title: string;
    charts: {
      type: 'line' | 'bar' | 'pie';
      title: string;
      data: any;
    }[];
    metrics: {
      name: string;
      value: string;
      change: string;
    }[];
  };
}

export interface FlowConnection {
  from: string;
  to: string;
  type: 'default' | 'success' | 'error';
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  steps: string[];
  code: string;
  author: string;
  likes: number;
}

// 카드 타입 정의
export type CardType = 
  | 'flow' 
  | 'guide' 
  | 'impact-bar' 
  | 'dashboard' 
  | 'faq'
  | 'tip'
  | 'expansion'
  | 'code';

// 기본 카드 인터페이스
export interface BaseCard {
  type: CardType;
  id?: string;
  title?: string;
}

// 플로우 카드
export interface FlowCard extends BaseCard {
  type: 'flow';
  steps: FlowStep[];
  connections: FlowConnection[];
}

// 가이드 카드
export interface GuideCard extends BaseCard {
  type: 'guide';
  stepId: string;
  content: {
    steps: GuideStep[];
    code?: string;
    tips?: string[];
  };
}

// 임팩트바 카드
export interface ImpactBarCard extends BaseCard {
  type: 'impact-bar';
  desc: string;
  stats: {
    timesSaved: string;
    errorReduction: string;
    scalability: string;
  };
}

// 대시보드 카드
export interface DashboardCard extends BaseCard {
  type: 'dashboard';
  metrics: {
    name: string;
    value: string;
    change: string;
  }[];
  stats?: {
    total: number;
    completed: number;
    pending: number;
  };
  distribution?: Array<{
    category: string;
    percentage: number;
    color: string;
  }>;
}

// FAQ 카드
export interface FAQCard extends BaseCard {
  type: 'faq';
  questions: {
    question: string;
    answer: string;
  }[];
}

// 플로우 스텝
export interface FlowStep {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  duration: string;
  preview: string;
  techTags: string[];
  level?: number;
}

// 가이드 스텝
export interface GuideStep {
  number: number;
  title: string;
  description: string;
}

// API 응답 타입
export interface AutomationResponse {
  cards: (FlowCard | GuideCard | ImpactBarCard | DashboardCard | FAQCard)[];
}

// 카드 순서 정의
export const CARD_ORDER: Record<CardType, number> = {
  'impact-bar': 0,
  'flow': 1,
  'guide': 2,
  'dashboard': 3,
  'faq': 4,
  'tip': 5,
  'expansion': 6,
  'code': 7
};
