// Card 타입 정의 - WOW 카드 타입 확장
export type CardType = 
  | 'impact-bar'
  | 'flow'
  | 'guide'
  | 'dashboard'
  | 'faq'
  | 'tip'
  | 'notification'
  | 'expansion'
  | 'code'
  | 'share'
  | 'text'
  | 'bar_chart'
  | 'line_chart'
  | 'table'
  | 'situation_analysis'
  | 'optimal_solution'
  | 'step_by_step_guide'
  | 'modern_solution'
  | 'needs_analysis'
  | 'result_flow'
  | 'execution_guide'
  | 'beginner_guide'
  | 'detail-flow'
  // 🚀 새로운 WOW 카드 타입들
  | 'video_guide'          // 영상 생성 가이드 (Runway, HeyGen)
  | 'slide_guide'          // 슬라이드 생성 가이드 (Zenspark, Beautiful.AI)
  | 'landing_guide'        // 랜딩페이지 생성 가이드 (Durable, Typedream)
  | 'dashboard_guide'      // 대시보드 생성 가이드 (Hex, Metabase)
  | 'creative_guide'       // 크리에이티브 생성 가이드 (Bannerbear, Canva)
  | 'audio_guide'          // 오디오 생성 가이드 (ElevenLabs, Murf)
  | 'chatbot_guide'        // 챗봇 생성 가이드 (Landbot, Chatbase)
  | 'tool_recommendation'  // 맞춤형 툴 추천
  | 'wow_preview'         // WOW 결과 미리보기
  | 'method_recommendation'; // 방법 추천

// 기본 Card 인터페이스
export interface BaseCard {
  type: CardType;
}

// 임팩트 바 카드
export interface ImpactBarCard extends BaseCard {
  type: 'impact-bar';
  title: string;
  desc: string;
}

// 플로우 단계 카드
export interface FlowStep {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
  duration: string;
  preview: string;
  tech: string[];
  detailGuide?: {
    detailSteps: Array<{
      id: string;
      icon: string;
      title: string;
      duration: string;
      description: string;
    }>;
    executionGuide: Array<{
      number: number;
      title: string;
      description: string;
    }>;
    faq: Array<{
      q: string;
      a: string;
    }>;
    troubleshooting: string;
    modernSolutions?: any[];
    beginnerTips?: {
      concept: string;
      preparation: string[];
      successCheck: string;
    };
  };
}

export interface FlowCard extends BaseCard {
  type: 'flow';
  title: string;
  subtitle: string;
  steps: FlowStep[];
  engine: 'make' | 'zapier' | 'apps_script' | 'power_automate';
  flowMap: string[];
  fallback?: {
    method: 'csv_download' | 'browserless' | 'unofficial_api' | 'rpa_ocr';
    reason: string;
  };
  toolRecommendation?: {
    ecosystem: 'make' | 'zapier' | 'apps_script' | 'power_automate';
    reason: string;
  };
}

// 가이드 카드
export interface GuideStep {
  number: number;
  title: string;
  description: string;
}

export interface GuideCard extends BaseCard {
  type: 'guide';
  stepId: number;
  title: string;
  subtitle: string;
  content: {
    steps: GuideStep[];
    code?: string;
    tips?: string[];
  };
  engine?: 'make' | 'zapier' | 'apps_script' | 'power_automate';
  importBlocks?: {
    make_import_json?: string;
    sheet_header_csv?: string;
    config_template?: string;
    zapier_template?: string;
    apps_script_code?: string;
  };
  apiGuide?: {
    portalUrl?: string;
    prereq?: string[];
    steps?: string[];
    status?: 'OFFICIAL_API' | 'NO_OFFICIAL_API';
    alternatives?: string[];
    fallback?: 'csv_download' | 'browserless' | 'unofficial_api' | 'rpa_ocr';
  };
  downloadGuide?: {
    portalUrl: string;
    steps: string[];
  };
  emailAttachment?: 'pdf' | 'xlsx' | 'link';
  commonErrors?: Array<{
    code: string;
    cause: string;
    fix: string;
  }>;
}

// 대시보드 카드
export interface DashboardCard extends BaseCard {
  type: 'dashboard';
  stats: {
    total: number;
    completed: number;
    pending: number;
  };
  distribution: {
    category: string;
    percentage: number;
    color: string;
  }[];
}

// FAQ 카드
export interface FAQCard extends BaseCard {
  type: 'faq';
  items: {
    q: string;
    a: string;
  }[];
}

// 팁 카드
export interface TipCard extends BaseCard {
  type: 'tip';
  icon?: string;
  content: string;
}

// 알림 카드
export interface NotificationCard extends BaseCard {
  type: 'notification';
  priority: 'info' | 'warning' | 'error';
  title: string;
  content: string;
}

// 확장 카드
export interface ExpansionCard extends BaseCard {
  type: 'expansion';
  title: string;
  items: {
    title: string;
    description: string;
    duration: string;
    color: string;
  }[];
}

// 코드 카드
export interface CodeCard extends BaseCard {
  type: 'code';
  language: string;
  code: string;
  description?: string;
}

// 공유 카드
export interface ShareCard extends BaseCard {
  type: 'share';
  title: string;
  description: string;
  url: string;
}

// 텍스트 카드
export interface TextCard extends BaseCard {
  type: 'text';
  text?: string;
  data?: { text?: string };
}

// 바 차트 카드
export interface BarChartCard extends BaseCard {
  type: 'bar_chart';
  data: {
    title: string;
    labels: string[];
    datasets: Array<{ label: string; data: number[]; color?: string }>;
  };
}

// 라인 차트 카드
export interface LineChartCard extends BaseCard {
  type: 'line_chart';
  data: {
    title: string;
    labels: string[];
    datasets: Array<{ label: string; data: number[]; color?: string }>;
  };
}

// 테이블 카드
export interface TableCard extends BaseCard {
  type: 'table';
  data: {
    title: string;
    columns: string[];
    rows: Array<string[]>;
  };
}

// 통합 Card 타입
export type Card = 
  | ImpactBarCard
  | FlowCard
  | GuideCard
  | DashboardCard
  | FAQCard
  | TipCard
  | NotificationCard
  | ExpansionCard
  | CodeCard
  | ShareCard
  | TextCard
  | BarChartCard
  | LineChartCard
  | TableCard
  | SituationAnalysisCard
  | OptimalSolutionCard
  | StepByStepGuideCard
  | ModernSolutionCard
  | NeedsAnalysisCard
  | ResultFlowCard
  | ExecutionGuideCard
  | BeginnerGuideCard
  | DetailFlowCard
  // 🚀 새로운 WOW 카드들
  | VideoGuideCard
  | SlideGuideCard
  | LandingGuideCard
  | DashboardGuideCard
  | CreativeGuideCard
  | AudioGuideCard
  | ChatbotGuideCard
  | ToolRecommendationCard
  | WowPreviewCard;

// API 응답 타입
export interface CardsResponse {
  cards: Card[];
}

// 에이전트 프롬프트 타입
export interface AgentPrompt {
  system: string;
  user: string;
}

// 자동화 요청 타입
export interface AutomationRequest {
  automationType: string;
  userGoals: string;
  followupAnswers?: Record<string, string>;
}

// 자동화 응답 타입
export interface AutomationResponse {
  cards: Card[];
  metadata?: {
    totalSteps: number;
    estimatedTime: string;
    difficulty: string;
  };
  debug?: string;
}

// 에이전트 응답 타입
export interface AgentResponse {
  cards: Card[];
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface SituationAnalysisCard {
  type: 'situation_analysis';
  title: string;
  analysis: {
    actualGoal: string;
    currentTools: string[];
    techLevel: string;
    constraints: string[];
    successCriteria: string;
  };
}

export interface OptimalSolutionCard {
  type: 'optimal_solution';
  title: string;
  selectedTool: string;
  selectionReason: string;
  alternativeTools: Array<{
    tool: string;
    whyNot: string;
  }>;
  estimatedTime: string;
  cost: string;
  difficulty: string;
}

export interface StepByStepGuideCard {
  type: 'step_by_step_guide';
  title: string;
  preparation: {
    requiredAccounts: string[];
    permissions: string[];
    testData: string;
  };
  steps: Array<{
    stepNumber: number;
    title: string;
    estimatedTime: string;
    actions: string[];
    expectedResult: string;
    troubleshooting: {
      commonIssue: string;
      solution: string;
    };
  }>;
  finalVerification: {
    checkpoints: string[];
    testScenario: string;
  };
  futureExpansion: string[];
}

export interface ModernSolutionCard extends BaseCard {
  type: 'modern_solution';
  title: string;
  description: string;
  solution: string;
}

export interface NeedsAnalysisCard {
  type: 'needs_analysis';
  title: string;
  surfaceRequest: string;
  realNeeds: string;
  currentPain: {
    timeWasted: string;
    stressPoints: string[];
    opportunityCost: string;
  };
  idealFuture: {
    timeSaved: string;
    newPossibilities: string[];
    lifeChange: string;
  };
  successMetrics: {
    quantitative: string[];
    qualitative: string[];
  };
}

export interface ResultFlowCard {
  type: 'result_flow';
  title: string;
  subtitle: string;
  story: {
    before: string;
    trigger: string;
    magic: string;
    result: string;
    after: string;
  };
  steps: Array<{
    id: number;
    icon: string;
    title: string;
    subtitle: string;
    timing: string;
    userExperience: string;
    visualResult: string;
  }>;
}

export interface ExecutionGuideCard {
  type: 'execution_guide';
  stepId: string;
  title: string;
  subtitle: string;
  goal: string;
  preparation: string[];
  detailedSteps: Array<{
    number: number;
    action: string;
    screenshot: string;
    checkpoint: string;
  }>;
  successCheck: string;
  commonMistakes: Array<{
    mistake: string;
    prevention: string;
  }>;
  alternatives: Array<{
    when: string;
    method: string;
  }>;
}

export interface BeginnerGuideCard {
  type: 'beginner_guide';
  stepId: string;
  title: string;
  subtitle: string;
  content: {
    concept: string;
    preparation: string[];
    detailed_steps: Array<{
      number: number;
      title: string;
      description: string;
      screenshot_hint: string;
    }>;
    common_mistakes: string[];
    success_check: string;
  };
}

export interface DetailFlowCard {
  type: 'detail-flow';
  stepId: string;
  title: string;
  subtitle: string;
  detailSteps: Array<{
    id: string;
    icon: string;
    title: string;
    duration: string;
    description: string;
  }>;
  executionGuide: Array<{
    number: number;
    title: string;
    description: string;
  }>;
  faq: Array<{
    q: string;
    a: string;
  }>;
} 

// 🚀 새로운 WOW 카드 인터페이스들

// 영상 생성 가이드 카드 (Runway, HeyGen)
export interface VideoGuideCard extends BaseCard {
  type: 'video_guide';
  tool: string; // "Runway ML", "HeyGen" 등
  title: string;
  subtitle: string;
  videoType: 'shorts' | 'presentation' | 'ad' | 'educational' | 'avatar';
  detailedSteps: Array<{
    number: number;
    title: string;
    description: string;
    expectedScreen: string;
    checkpoint: string;
  }>;
  importBlocks: {
    video_prompt?: string;
    script_template?: string;
    setting_json?: string;
  };
  outputFormat: 'mp4' | 'mov' | 'gif';
  estimatedTime: string;
  pricing: string;
  commonErrors: Array<{
    error: string;
    cause: string;
    solution: string;
  }>;
}

// 슬라이드 생성 가이드 카드 (Zenspark, Beautiful.AI)
export interface SlideGuideCard extends BaseCard {
  type: 'slide_guide';
  tool: string; // "Zenspark", "Beautiful.AI" 등
  title: string;
  subtitle: string;
  slideCount: number;
  detailedSteps: Array<{
    number: number;
    title: string;
    description: string;
    expectedScreen: string;
    checkpoint: string;
  }>;
  importBlocks: {
    slide_prompt?: string;
    outline_template?: string;
    design_settings?: string;
  };
  outputFormat: 'pptx' | 'pdf' | 'png';
  estimatedTime: string;
  pricing: string;
  commonErrors: Array<{
    error: string;
    cause: string;
    solution: string;
  }>;
}

// 랜딩페이지 생성 가이드 카드 (Durable, Typedream)
export interface LandingGuideCard extends BaseCard {
  type: 'landing_guide';
  tool: string; // "Durable", "Typedream" 등
  title: string;
  subtitle: string;
  pageType: 'product' | 'service' | 'portfolio' | 'event' | 'coming_soon';
  detailedSteps: Array<{
    number: number;
    title: string;
    description: string;
    expectedScreen: string;
    checkpoint: string;
  }>;
  importBlocks: {
    content_template?: string;
    design_config?: string;
    seo_settings?: string;
  };
  liveUrl: string;
  estimatedTime: string;
  pricing: string;
  commonErrors: Array<{
    error: string;
    cause: string;
    solution: string;
  }>;
}

// 대시보드 생성 가이드 카드 (Hex, Metabase)
export interface DashboardGuideCard extends BaseCard {
  type: 'dashboard_guide';
  tool: string; // "Hex", "Metabase" 등
  title: string;
  subtitle: string;
  dataSource: string[];
  detailedSteps: Array<{
    number: number;
    title: string;
    description: string;
    expectedScreen: string;
    checkpoint: string;
  }>;
  importBlocks: {
    sql_queries?: string;
    dashboard_config?: string;
    data_connection?: string;
  };
  shareUrl: string;
  estimatedTime: string;
  pricing: string;
  commonErrors: Array<{
    error: string;
    cause: string;
    solution: string;
  }>;
}

// 크리에이티브 생성 가이드 카드 (Bannerbear, Canva)
export interface CreativeGuideCard extends BaseCard {
  type: 'creative_guide';
  tool: string; // "Bannerbear", "Canva Magic" 등
  title: string;
  subtitle: string;
  creativeType: 'thumbnail' | 'banner' | 'social' | 'bulk' | 'template';
  detailedSteps: Array<{
    number: number;
    title: string;
    description: string;
    expectedScreen: string;
    checkpoint: string;
  }>;
  importBlocks: {
    template_config?: string;
    batch_data_csv?: string;
    design_variables?: string;
  };
  outputFiles: string[];
  estimatedTime: string;
  pricing: string;
  commonErrors: Array<{
    error: string;
    cause: string;
    solution: string;
  }>;
}

// 오디오 생성 가이드 카드 (ElevenLabs, Murf)
export interface AudioGuideCard extends BaseCard {
  type: 'audio_guide';
  tool: string; // "ElevenLabs", "Murf.ai" 등
  title: string;
  subtitle: string;
  audioType: 'narration' | 'podcast' | 'ad' | 'voiceover' | 'announcement';
  detailedSteps: Array<{
    number: number;
    title: string;
    description: string;
    expectedScreen: string;
    checkpoint: string;
  }>;
  importBlocks: {
    script_text?: string;
    voice_settings?: string;
    audio_config?: string;
  };
  outputFormat: 'mp3' | 'wav' | 'm4a';
  estimatedTime: string;
  pricing: string;
  commonErrors: Array<{
    error: string;
    cause: string;
    solution: string;
  }>;
}

// 챗봇 생성 가이드 카드 (Landbot, Chatbase)
export interface ChatbotGuideCard extends BaseCard {
  type: 'chatbot_guide';
  tool: string; // "Landbot", "Chatbase" 등
  title: string;
  subtitle: string;
  botType: 'customer_service' | 'faq' | 'lead_generation' | 'knowledge_base' | 'survey';
  detailedSteps: Array<{
    number: number;
    title: string;
    description: string;
    expectedScreen: string;
    checkpoint: string;
  }>;
  importBlocks: {
    conversation_flow?: string;
    knowledge_base?: string;
    embed_code?: string;
  };
  liveUrl: string;
  estimatedTime: string;
  pricing: string;
  commonErrors: Array<{
    error: string;
    cause: string;
    solution: string;
  }>;
}

// 맞춤형 툴 추천 카드
export interface ToolRecommendationCard extends BaseCard {
  type: 'tool_recommendation';
  title: string;
  subtitle: string;
  selectedTool: {
    name: string;
    type: string;
    url: string;
    wowScore: number;
    reasoning: string;
  };
  alternatives: Array<{
    name: string;
    type: string;
    url: string;
    pros: string[];
    cons: string[];
    whyNotSelected: string;
  }>;
  selectionCriteria: {
    userInput: string;
    matchedKeywords: string[];
    difficultyPreference: 'easy' | 'medium' | 'hard';
    budgetRange: string;
  };
}

// WOW 결과 미리보기 카드
export interface WowPreviewCard extends BaseCard {
  type: 'wow_preview';
  title: string;
  subtitle: string;
  previewType: 'video' | 'slide' | 'landing' | 'dashboard' | 'creative' | 'audio' | 'chatbot';
  mockups: Array<{
    type: 'image' | 'video' | 'iframe' | 'link';
    url: string;
    description: string;
  }>;
  beforeAfter: {
    before: string;
    after: string;
    improvement: string;
  };
  timeToValue: string;
  expectedOutcome: string[];
} 