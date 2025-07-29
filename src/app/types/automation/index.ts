export interface AutomationContext {
  userInput: string;
  domain?: string;
  painPoints?: string[];
  constraints?: string[];
  followupAnswers?: Record<string, any>;
}

// 기본 카드 인터페이스
export interface AutomationCard {
  type: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  [key: string]: any;
}

// 임팩트 바 카드
export interface ImpactBarCard extends AutomationCard {
  type: 'impact-bar';
  title: string; // "💡 평균 8시간/주 절약"
  desc: string; // "95% 오류 감소 • 실시간 처리"
  color?: string; // 그라데이션 컬러
}

// 플로우 카드
export interface FlowCard extends AutomationCard {
  type: 'flow';
  title: string;
  subtitle?: string;
  steps: FlowStep[];
  
  // 전체 플로우 정보
  totalDuration?: string; // "첫 설정 2시간, 이후 월 10분"
  difficulty?: '쉬움' | '보통' | '어려움';
  estimatedSteps?: number; // 예상 단계 수
}

export interface ToolRecommendation {
  primary: string;
  reason: string;
  alternatives: string[];
  whyNotOthers: string;
  ecosystem: 'make' | 'zapier' | 'google' | 'notion' | 'manual';
}

export interface FlowStep {
  id: number | string;
  icon: string;
  title: string;
  subtitle: string;
  duration: string;
  preview: string;
  tech: string[];
  techTags?: string[];
  difficulty?: '쉬움' | '보통' | '어려움';
  
  substeps?: SubStep[];
  challenges?: string[];
  alternatives?: string[];
  
  code?: string;
  planB?: string;
  failureCases?: string[];
  tips?: string[];
  example?: string;
  stepId?: number | string;
  toolRecommendation?: ToolRecommendation;
}

export interface SubStep {
  id: string;
  title: string;
  duration: string;
  description?: string;
}

// 가이드 카드
export interface GuideCard extends AutomationCard {
  type: 'guide';
  title: string;
  stepId?: number | string;
  content: string;
  code?: string;
  planB?: string;
  failureCases?: string[];
  tips?: string[];
  example?: string;
  duration?: string;
  difficulty?: '초급' | '중급' | '고급';
  importBlocks?: {
    make_import_json?: string;
    sheet_header_csv?: string;
    config_template?: string;
  };
  commonErrors?: Array<{
    code: string;
    cause: string;
    fix: string;
  }>;
}

// FAQ 카드
export interface FAQCard extends AutomationCard {
  type: 'faq';
  title: string;
  questions: FAQItem[];
}

export interface FAQItem {
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
}

// 팁 카드
export interface TipCard extends AutomationCard {
  type: 'tip';
  title: string;
  content: string;
  category?: string;
  difficulty?: '초급' | '중급' | '고급';
  tags?: string[];
}

// PlanB 카드
export interface PlanBCard extends AutomationCard {
  type: 'planB';
  title: string;
  planB: string;
  failureCases: string[];
  alternatives: string[];
  tips?: string[];
}

// 확장 카드
export interface ExpansionCard extends AutomationCard {
  type: 'expansion';
  title: string;
  items: ExpansionItem[];
}

export interface ExpansionItem {
  title: string;
  description: string;
  duration: string;
  difficulty: '초급' | '중급' | '고급';
  cost?: string;
  requirements?: string[];
}

// 대시보드 카드
export interface DashboardCard extends AutomationCard {
  type: 'dashboard';
  title: string;
  stats: DashboardStat[];
  distribution: DashboardDistribution[];
  trends?: DashboardTrend[];
}

export interface DashboardStat {
  label: string;
  value: string | number;
  change?: string;
  color?: string;
}

export interface DashboardDistribution {
  category: string;
  percentage: number;
  color: string;
}

export interface DashboardTrend {
  period: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
}

// 시각화 카드들
export interface BarChartCard extends AutomationCard {
  type: 'bar_chart';
  title: string;
  data: BarChartData[];
  xAxis: string;
  yAxis: string;
}

export interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

export interface LineChartCard extends AutomationCard {
  type: 'line_chart';
  title: string;
  data: LineChartData[];
  xAxis: string;
  yAxis: string;
}

export interface LineChartData {
  label: string;
  values: number[];
  color?: string;
}

export interface TableCard extends AutomationCard {
  type: 'table';
  title: string;
  headers: string[];
  rows: string[][];
  sortable?: boolean;
}

// 코드 카드
export interface CodeCard extends AutomationCard {
  type: 'code';
  title: string;
  code: string;
  language: string;
  description?: string;
  copyable?: boolean;
  executable?: boolean;
  dependencies?: string[];
  setup?: string;
}

// 질문 카드 (설문용)
export interface QuestionCard extends AutomationCard {
  type: 'question';
  id?: string;
  questionType?: 'single' | 'multiple' | 'text';
  title: string;
  options?: string[];
  description?: string;
  required?: boolean;
  placeholder?: string;
  exampleAnswer?: string;
  multiple?: boolean;
  followupQuestions?: {
    question: string;
    example: string;
    purpose: string;
  }[];
}

// 실전 정보 카드
export interface PracticalInfoCard extends AutomationCard {
  type: 'practical_info';
  title: string;
  category: 'cost' | 'security' | 'performance' | 'maintenance' | 'scalability';
  content: string;
  tips: string[];
  warnings?: string[];
  examples?: string[];
}

// 방식 추천 카드
export interface MethodRecommendationCard extends AutomationCard {
  type: 'method_recommendation';
  title: string;
  method: 'nocode' | 'lowcode' | 'coding';
  reasoning: string;
  confidence: number;
  persona?: 'beginner' | 'intermediate' | 'advanced';
}

// 통합 카드 타입
export type AutomationCardType = 
  | ImpactBarCard
  | FlowCard
  | GuideCard
  | FAQCard
  | TipCard
  | PlanBCard
  | ExpansionCard
  | DashboardCard
  | BarChartCard
  | LineChartCard
  | TableCard
  | CodeCard
  | QuestionCard
  | PracticalInfoCard
  | MethodRecommendationCard;

export interface AutomationAPIResponse {
  context: AutomationContext;
  cards: AutomationCardType[];
  error?: string;
  fallbackExample?: string;
  followupQuestions?: string[];
  raw?: any;
  cost?: {
    estimated: string;
    breakdown: string[];
  };
  timeToComplete?: string;
  difficulty?: '초급' | '중급' | '고급';
  prerequisites?: string[];
  successRate?: string;
} 