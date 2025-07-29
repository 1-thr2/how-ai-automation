// wow 자동화 플로우 전체 타입/인터페이스 정의 (프론트/백엔드 공유)

export interface FlowData {
  title: string;
  subtitle: string;
  impactStats: {
    timesSaved: string;
    errorReduction: string;
    realTime: boolean;
    scalability: string;
  };
  steps: FlowStep[];
  gptPromptTemplate: string;
  cards?: Array<{
    type: string;
    title?: string;
    subtitle?: string;
    desc?: string;
    steps?: FlowStep[];
    items?: Array<{ q: string; a: string }>;
    stats?: Array<{ label: string; value: string; color: string }>;
    charts?: any[];
    insights?: string[];
  }>;
  metadata?: {
    totalSteps: number;
    estimatedTime: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface FlowStep {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  duration: string;
  preview: string;
  techTags: string[];
}

export interface StepGuideData {
  title: string;
  subtitle: string;
  guides: Array<{
    number: number;
    title: string;
    description: string;
    expectedResult: string;
  }>;
  codeBlocks: Array<{
    title: string;
    code: string;
    platform: string;
    instruction: string;
  }>;
  troubleshooting: Array<{
    problem: string;
    solution: string;
  }>;
}

export interface PreviewData {
  dashboard: {
    stats: Array<{ label: string; value: string; color: string }>;
    chartData: any;
    insights: string[];
  };
  notification: {
    slackTemplate: string;
    emailTemplate: string;
    triggerKeywords: string[];
  };
}

export interface FAQData {
  faqs: Array<{ q: string; a: string }>;
}
