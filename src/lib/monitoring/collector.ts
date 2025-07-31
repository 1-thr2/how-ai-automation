import { APIMetric, SystemMetric } from './types';
import { metricsStore } from './store';

/**
 * 메트릭 수집기 - API 호출 메트릭을 자동 수집
 */
export class MetricsCollector {
  private startTime: number = 0;
  public metricData: Partial<APIMetric> = {};

  /**
   * API 호출 시작 시 호출
   */
  start(endpoint: string, userInput?: string, followupAnswers?: any): MetricsCollector {
    this.startTime = Date.now();
    this.metricData = {
      id: `${endpoint}_${this.startTime}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: this.startTime,
      endpoint,
      userInput,
      followupAnswers
    };
    
    console.log(`📊 [Metrics] 측정 시작: ${endpoint}`);
    return this;
  }

  /**
   * AI 모델 사용 정보 기록
   */
  recordModel(model: string, tokensUsed: number): MetricsCollector {
    this.metricData.modelUsed = model;
    this.metricData.tokensUsed = tokensUsed;
    this.metricData.estimatedCost = this.calculateCost(model, tokensUsed);
    
    console.log(`🤖 [Metrics] 모델 사용: ${model}, 토큰: ${tokensUsed}, 비용: $${this.metricData.estimatedCost?.toFixed(4)}`);
    return this;
  }

  /**
   * 처리 접근 방식 기록 (2-step, 3-step 등)
   */
  recordApproach(approach: string, stagesCompleted?: string[]): MetricsCollector {
    this.metricData.approach = approach;
    this.metricData.stagesCompleted = stagesCompleted;
    
    console.log(`🎯 [Metrics] 접근 방식: ${approach}, 완료 단계: ${stagesCompleted?.join(' → ')}`);
    return this;
  }

  /**
   * RAG 사용 정보 기록
   */
  recordRAG(searches: number, sources: number, urlsVerified?: number): MetricsCollector {
    this.metricData.ragSearches = searches;
    this.metricData.ragSources = sources;
    this.metricData.urlsVerified = urlsVerified;
    
    console.log(`🔍 [Metrics] RAG 사용: 검색 ${searches}회, 소스 ${sources}개, URL 검증 ${urlsVerified || 0}개`);
    return this;
  }

  /**
   * 생성된 결과 정보 기록
   */
  recordResults(cardsGenerated: number): MetricsCollector {
    this.metricData.cardsGenerated = cardsGenerated;
    
    console.log(`📄 [Metrics] 결과: ${cardsGenerated}개 카드 생성`);
    return this;
  }

  /**
   * 성공으로 완료
   */
  success(): void {
    this.finish(true);
  }

  /**
   * 실패로 완료
   */
  error(errorMessage: string): void {
    this.metricData.errorMessage = errorMessage;
    this.finish(false);
  }

  /**
   * 측정 완료 및 저장
   */
  private finish(success: boolean): void {
    const latencyMs = Date.now() - this.startTime;
    
    const finalMetric: APIMetric = {
      id: this.metricData.id!,
      timestamp: this.metricData.timestamp!,
      endpoint: this.metricData.endpoint!,
      latencyMs,
      success,
      tokensUsed: this.metricData.tokensUsed || 0,
      modelUsed: this.metricData.modelUsed || 'unknown',
      estimatedCost: this.metricData.estimatedCost || 0,
      approach: this.metricData.approach,
      stagesCompleted: this.metricData.stagesCompleted,
      ragSearches: this.metricData.ragSearches,
      ragSources: this.metricData.ragSources,
      urlsVerified: this.metricData.urlsVerified,
      userInput: this.metricData.userInput,
      followupAnswers: this.metricData.followupAnswers,
      cardsGenerated: this.metricData.cardsGenerated,
      errorMessage: this.metricData.errorMessage
    };

    // 메트릭 저장
    metricsStore.addAPIMetric(finalMetric);
    
    // 로그 출력
    const status = success ? '✅ 성공' : '❌ 실패';
    const costInfo = finalMetric.estimatedCost > 0 ? `, $${finalMetric.estimatedCost.toFixed(4)}` : '';
    console.log(`📊 [Metrics] 완료: ${finalMetric.endpoint} - ${status}, ${latencyMs}ms${costInfo}`);
    
    // 성능 체크
    if (latencyMs > 15000) { // 15초 이상
      console.warn(`⚠️ [Metrics] 느린 응답: ${finalMetric.endpoint} - ${latencyMs}ms`);
    }
    
    if (finalMetric.estimatedCost > 0.1) { // $0.1 이상
      console.warn(`💰 [Metrics] 높은 비용: ${finalMetric.endpoint} - $${finalMetric.estimatedCost.toFixed(4)}`);
    }
  }

  /**
   * 모델별 토큰 비용 계산
   */
  private calculateCost(model: string, tokens: number): number {
    const costs: { [model: string]: number } = {
      'gpt-4o-mini': 0.00015,           // $0.15 / 1M 토큰
      'gpt-4o-2024-11-20': 0.0025,     // $2.50 / 1M 토큰
      'gpt-4o': 0.0025,                // $2.50 / 1M 토큰
      'gpt-3.5-turbo': 0.0015          // $1.50 / 1M 토큰
    };
    
    return tokens * (costs[model] || 0.0025); // 기본값은 gpt-4o 가격
  }
}

/**
 * 시스템 메트릭 수집
 */
export class SystemMetricsCollector {
  /**
   * 현재 시스템 상태 수집
   */
  static async collectSystemMetrics(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      
      const systemMetric: SystemMetric = {
        timestamp: Date.now(),
        memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        activeConnections: 0, // TODO: 실제 연결 수 측정
        services: {
          openai: !!process.env.OPENAI_API_KEY,
          tavily: !!process.env.TAVILY_API_KEY,
          supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        }
      };
      
      metricsStore.addSystemMetric(systemMetric);
      console.log(`🖥️ [System] 메모리: ${systemMetric.memoryUsage}MB, 서비스: ${Object.entries(systemMetric.services).filter(([_, status]) => status).map(([name]) => name).join(', ')}`);
      
    } catch (error) {
      console.error('❌ [System] 시스템 메트릭 수집 실패:', error);
    }
  }

  /**
   * 주기적 시스템 메트릭 수집 시작
   */
  static startPeriodicCollection(intervalMs: number = 60000): void {
    // 즉시 한 번 수집
    this.collectSystemMetrics();
    
    // 주기적 수집
    setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);
    
    console.log(`🔄 [System] 주기적 메트릭 수집 시작 (${intervalMs/1000}초 간격)`);
  }
}

/**
 * 편의 함수들
 */

/**
 * API 메트릭 수집 시작
 */
export function startAPIMetrics(endpoint: string, userInput?: string, followupAnswers?: any): MetricsCollector {
  return new MetricsCollector().start(endpoint, userInput, followupAnswers);
}

/**
 * 간단한 메트릭 기록 (성공 케이스)
 */
export function recordSimpleSuccess(
  endpoint: string,
  latencyMs: number,
  model: string,
  tokens: number,
  cardsGenerated?: number
): void {
  const cost = tokens * (model.includes('mini') ? 0.00015 : 0.0025);
  
  const metric: APIMetric = {
    id: `simple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    endpoint,
    latencyMs,
    success: true,
    tokensUsed: tokens,
    modelUsed: model,
    estimatedCost: cost,
    cardsGenerated
  };
  
  metricsStore.addAPIMetric(metric);
}

/**
 * 간단한 메트릭 기록 (실패 케이스)
 */
export function recordSimpleError(
  endpoint: string,
  latencyMs: number,
  errorMessage: string
): void {
  const metric: APIMetric = {
    id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    endpoint,
    latencyMs,
    success: false,
    tokensUsed: 0,
    modelUsed: 'none',
    estimatedCost: 0,
    errorMessage
  };
  
  metricsStore.addAPIMetric(metric);
}