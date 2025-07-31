/**
 * 모니터링 시스템 타입 정의
 */

export interface APIMetric {
  id: string;
  timestamp: number;
  endpoint: string; // '/api/agent-followup' | '/api/agent-orchestrator'
  
  // 성능 메트릭
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  
  // AI/LLM 메트릭
  tokensUsed: number;
  modelUsed: string;
  estimatedCost: number;
  
  // 품질 메트릭
  approach?: string; // '2-step' | '3-step'
  stagesCompleted?: string[];
  
  // RAG 메트릭 (orchestrator만)
  ragSearches?: number;
  ragSources?: number;
  urlsVerified?: number;
  
  // 사용자 컨텍스트
  userInput?: string;
  followupAnswers?: any;
  cardsGenerated?: number;
}

export interface SystemMetric {
  timestamp: number;
  
  // 시스템 상태
  memoryUsage: number; // MB
  cpuUsage?: number;   // %
  activeConnections: number;
  
  // 서비스 상태
  services: {
    openai: boolean;
    tavily: boolean;
    supabase: boolean;
  };
}

export interface DashboardStats {
  // 오늘 통계
  today: {
    totalRequests: number;
    successRate: number;
    avgLatencyMs: number;
    totalCost: number;
    totalTokens: number;
  };
  
  // 시간별 통계 (최근 24시간)
  hourly: Array<{
    hour: number; // 0-23
    requests: number;
    successRate: number;
    avgLatency: number;
    cost: number;
  }>;
  
  // 모델별 사용량
  modelUsage: Array<{
    model: string;
    count: number;
    tokens: number;
    cost: number;
    percentage: number;
  }>;
  
  // 엔드포인트별 통계
  endpointStats: Array<{
    endpoint: string;
    count: number;
    avgLatency: number;
    successRate: number;
    totalCost: number;
  }>;
  
  // RAG 활용 통계
  ragStats: {
    utilizationRate: number; // RAG를 사용한 요청 비율
    avgSearchesPerRequest: number;
    avgSourcesFound: number;
    urlVerificationRate: number;
  };
  
  // 최근 에러들
  recentErrors: Array<{
    timestamp: number;
    endpoint: string;
    error: string;
    userInput?: string;
  }>;
  
  // 실시간 알림
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: number;
    resolved: boolean;
  }>;
}

export interface MetricQuery {
  startTime?: number;
  endTime?: number;
  endpoint?: string;
  success?: boolean;
  limit?: number;
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: number;
  resolved: boolean;
  metadata?: any;
}

// 임계값 설정
export interface ThresholdConfig {
  maxLatencyMs: number;        // 기본: 20000 (20초)
  minSuccessRate: number;      // 기본: 0.95 (95%)
  maxCostPerHour: number;      // 기본: 5.0 ($5)
  maxTokensPerHour: number;    // 기본: 50000
  maxErrorsPerHour: number;    // 기본: 10
}