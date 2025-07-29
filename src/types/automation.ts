// 자동화 결과 전체 타입 정의 (wow 구조)

export interface FlowStep {
  id?: string;
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
  dashboard?: {
    title: string;
    metrics: string[];
    visualizations: string[];
    alerts: string[];
  };
  faq?: { q: string; a: string }[];
  tip?: string;
  tips?: {
    title: string;
    items: string[];
    bestPractices: string[];
    commonMistakes: string[];
  };
  realCases?: Array<{
    title: string;
    description: string;
    outcome: string;
    challenges: string[];
    solutions: string[];
  }>;
  effects?: {
    title: string;
    benefits: string[];
    metrics: string[];
    timeline: string;
  };
}

export interface AutomationFlow {
  id: string;
  title: string;
  description: string;
  steps: FlowStep[];
  toolsFlow: Array<{
    name: string;
    icon: string;
    url: string;
    desc: string;
  }>;
  connections: Array<{
    from: string;
    to: string;
    label: string;
  }>;
}

export interface ParsedAutomationData {
  flowDiagram: Array<{ icon?: string; title: string; role?: string; desc?: string; key?: string }>;
  steps: Array<FlowStep>;
  summary: string[];
  dashboard?: any;
  realCase?: any;
  trends?: any;
  implementationOptions?: any[];
  effects?: any[];
}

export type Connection = {
  from: string;
  to: string;
  label?: string;
};

export type Flow = {
  steps: Step[];
  connections: Connection[];
};

export type CodeGuide = {
  code: {
    main: string;
    dependencies: string[];
    config: string;
    test: string;
  };
  guide: {
    setup: string;
    permissions: string;
    validation: string;
    tips: string[];
  };
};

export type FAQ = {
  question: string;
  answer: string;
  related: string[];
};

export type FailureCase = {
  scenario: string;
  cause: string;
  solution: string;
  prevention: string;
};

export type Extension = {
  feature: string;
  description: string;
  implementation: string;
};

export type FAQResult = {
  faq: FAQ[];
  failureCases: FailureCase[];
  extensions: Extension[];
};

export type RealWorldSample = {
  title: string;
  description: string;
  environment: string;
  results: string;
  screenshots: string[];
  setup: string;
  timeline: string;
  benefits: string;
};

export type RealWorldResult = {
  samples: RealWorldSample[];
};

export interface ManualStep {
  title: string;
  description: string;
  code?: string;
  language?: string;
}

export interface AutomationCard {
  type: string;
  title: string;
  flow: Step[];
  copyPrompt?: string;
  manualSteps?: ManualStep[];
  planB?: string;
  failureCases?: string[];
  faq?: Array<{ q: string; a: string }>;
  realTip?: string;
}

export interface AutomationFooter {
  howToStart?: string;
  pdfDownloadUrl?: string;
  gptSharePrompt?: string;
  community?: string;
  expertConsultation?: string;
}

export interface AutomationUX {
  cards: AutomationCard[];
  footer?: AutomationFooter;
}

export interface AutomationStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  guide: {
    title: string;
    steps: string[];
    prerequisites: string[];
    expectedOutcome: string;
  };
  code: {
    title: string;
    description: string;
    codeBlock: string;
    dependencies: string[];
    setupInstructions: string[];
  };
  tips: {
    title: string;
    items: string[];
    bestPractices: string[];
    commonMistakes: string[];
  };
  faq: {
    title: string;
    items: Array<{
      question: string;
      answer: string;
      category: string;
    }>;
  };
  realCases: Array<{
    title: string;
    description: string;
    outcome: string;
    challenges: string[];
    solutions: string[];
  }>;
  expansion: {
    title: string;
    ideas: string[];
    integrations: string[];
    futurePossibilities: string[];
  };
  effects: {
    title: string;
    benefits: string[];
    metrics: string[];
    timeline: string;
  };
  dashboard: {
    title: string;
    metrics: string[];
    visualizations: string[];
    alerts: string[];
  };
  recommendedTools?: Array<{
    name: string;
    icon: string;
    url: string;
    desc?: string;
  }>;
}

export interface AutomationFlows {
  flows: Array<{
    id: string;
    title: string;
    description: string;
    steps: FlowStep[];
    toolsFlow?: Array<{
      name: string;
      icon: string;
      url: string;
      desc: string;
    }>;
    connections: Connection[];
  }>;
}

export interface AutomationTrends {
  timeSaved?: string;
  roi?: string;
  difficulty?: string;
}

export interface AutomationIntent {
  userGoal?: string;
}

export interface AutomationRequirements {
  // 요구사항 관련 필드 추가
}

export interface AutomationResult {
  ux: AutomationUX;
  flows: AutomationFlows;
  intent: AutomationIntent;
  requirements: AutomationRequirements;
  trends: AutomationTrends;
  tavilyResults?: Array<{
    title: string;
    url: string;
    content: string;
  }>;
  realCase?: any;
  dashboard?: any;
}

// Tavily 기반 도구/서비스 플로우 노드 타입
export interface ToolNode {
  name: string;
  icon: string;
  desc: string;
  url: string;
  tips?: string[];
  faq?: Array<{ q: string; a: string }>;
  expansion?: string[];
}

// 각 단계별 추천 도구/플러그인 타입
export interface RecommendedTool {
  name: string;
  icon: string;
  url: string;
  desc?: string;
}

export interface AutomationData {
  id: string;
  header: {
    title: string;
    subtitle: string;
  };
  flowDiagram: {
    nodes: FlowNode[];
    connections: FlowConnection[];
  };
  faq: FAQ[];
  recipes: Recipe[];
}

export interface FlowNode {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  details: {
    guide: string;
    code: string;
    tips: string[];
    planB: string;
    failureCases: string[];
    expansion: string;
  };
}

export interface FlowConnection {
  from: string;
  to: string;
  type: 'solid' | 'dashed';
  color: string;
  path: string;
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

export interface AgentPrompt {
  system: string;
  user: string;
}

export interface AgentResponse {
  flow?: {
    title: string;
    subtitle: string;
    impact: {
      timeSaved: string;
      errorReduction: string;
      realtime: boolean;
    };
    steps: Array<{
      id: string;
      icon: string;
      title: string;
      subtitle: string;
      duration: string;
      tech: string[];
    }>;
  };
  guide?: {
    title: string;
    description: string;
    steps: Array<{
      number: number;
      title: string;
      description: string;
      code: string;
      tips: string[];
      troubleshooting: string[];
    }>;
    examples: string[];
    faq: Array<{
      question: string;
      answer: string;
    }>;
  };
  dashboard?: {
    title: string;
    description: string;
    stats: Array<{
      label: string;
      value: string;
      trend: string;
      icon: string;
    }>;
    charts: Array<{
      type: string;
      title: string;
      data: any;
    }>;
  };
  notifications?: {
    templates: Array<{
      type: string;
      title: string;
      content: string;
      triggers: string[];
    }>;
  };
  expansion?: {
    possibilities: string[];
    futureVision: string[];
  };
  design?: {
    colorScheme: {
      primary: string;
      secondary: string;
      accent: string;
      gradients: string[];
    };
    icons: {
      stepIcons: string[];
      statIcons: string[];
      actionIcons: string[];
    };
    components: {
      cards: string[];
      buttons: string[];
      modals: string[];
    };
    animations: {
      transitions: string[];
      interactions: string[];
    };
  };
  code?: {
    mainCode: string;
    dependencies: string[];
    errorHandling: {
      scenarios: string[];
      solutions: string[];
    };
    optimization: {
      performance: string[];
      security: string[];
    };
    testing: {
      scenarios: string[];
      edgeCases: string[];
    };
  };
}
