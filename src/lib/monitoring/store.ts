import { APIMetric, SystemMetric, DashboardStats, MetricQuery, Alert, ThresholdConfig } from './types';

/**
 * 메모리 기반 메트릭 저장소
 * 운영 환경에서는 Redis나 시계열 DB 사용 권장
 */
class MetricsStore {
  private apiMetrics: APIMetric[] = [];
  private systemMetrics: SystemMetric[] = [];
  private alerts: Alert[] = [];
  
  // 데이터 보관 기간 (밀리초)
  private readonly RETENTION_PERIOD = 24 * 60 * 60 * 1000; // 24시간
  private readonly MAX_METRICS = 10000; // 최대 메트릭 개수
  
  // 임계값 설정
  private thresholds: ThresholdConfig = {
    maxLatencyMs: 20000,      // 20초
    minSuccessRate: 0.95,     // 95%
    maxCostPerHour: 5.0,      // $5
    maxTokensPerHour: 50000,  // 50K 토큰
    maxErrorsPerHour: 10      // 10개 에러
  };

  /**
   * API 메트릭 저장
   */
  addAPIMetric(metric: APIMetric): void {
    this.apiMetrics.push(metric);
    this.cleanup();
    this.checkThresholds(metric);
  }

  /**
   * 시스템 메트릭 저장
   */
  addSystemMetric(metric: SystemMetric): void {
    this.systemMetrics.push(metric);
    this.cleanup();
  }

  /**
   * API 메트릭 조회
   */
  getAPIMetrics(query: MetricQuery = {}): APIMetric[] {
    let filtered = this.apiMetrics;
    
    // 시간 범위 필터
    if (query.startTime) {
      filtered = filtered.filter(m => m.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      filtered = filtered.filter(m => m.timestamp <= query.endTime!);
    }
    
    // 엔드포인트 필터
    if (query.endpoint) {
      filtered = filtered.filter(m => m.endpoint === query.endpoint);
    }
    
    // 성공/실패 필터
    if (query.success !== undefined) {
      filtered = filtered.filter(m => m.success === query.success);
    }
    
    // 정렬 (최신순)
    filtered.sort((a, b) => b.timestamp - a.timestamp);
    
    // 제한
    if (query.limit) {
      filtered = filtered.slice(0, query.limit);
    }
    
    return filtered;
  }

  /**
   * 대시보드 통계 생성
   */
  getDashboardStats(): DashboardStats {
    const now = Date.now();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    
    // 오늘 데이터
    const todayMetrics = this.apiMetrics.filter(m => m.timestamp >= todayStart);
    
    // 최근 24시간 데이터
    const last24h = this.apiMetrics.filter(m => m.timestamp >= now - this.RETENTION_PERIOD);
    
    return {
      today: this.calculateTodayStats(todayMetrics),
      hourly: this.calculateHourlyStats(last24h),
      modelUsage: this.calculateModelUsage(todayMetrics),
      endpointStats: this.calculateEndpointStats(todayMetrics),
      ragStats: this.calculateRAGStats(todayMetrics),
      recentErrors: this.getRecentErrors(50),
      alerts: this.getActiveAlerts()
    };
  }

  /**
   * 알림 추가
   */
  addAlert(alert: Omit<Alert, 'id' | 'timestamp'>): void {
    const newAlert: Alert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    this.alerts.push(newAlert);
    console.log(`🚨 [Alert] ${newAlert.type.toUpperCase()}: ${newAlert.message}`);
  }

  /**
   * 알림 해결 처리
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`✅ [Alert] 해결됨: ${alert.message}`);
    }
  }

  /**
   * 활성 알림 조회
   */
  getActiveAlerts(): Alert[] {
    return this.alerts
      .filter(a => !a.resolved)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20); // 최대 20개
  }

  // Private 메서드들

  private cleanup(): void {
    const cutoff = Date.now() - this.RETENTION_PERIOD;
    
    // 오래된 데이터 제거
    this.apiMetrics = this.apiMetrics.filter(m => m.timestamp > cutoff);
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoff);
    
    // 개수 제한
    if (this.apiMetrics.length > this.MAX_METRICS) {
      this.apiMetrics = this.apiMetrics.slice(-this.MAX_METRICS);
    }
    
    // 해결된 오래된 알림 제거
    const alertCutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7일
    this.alerts = this.alerts.filter(a => 
      !a.resolved || a.timestamp > alertCutoff
    );
  }

  private checkThresholds(metric: APIMetric): void {
    // 지연시간 체크
    if (metric.latencyMs > this.thresholds.maxLatencyMs) {
      this.addAlert({
        type: 'warning',
        title: '응답 시간 초과',
        message: `${metric.endpoint}에서 ${(metric.latencyMs / 1000).toFixed(1)}초 응답 시간 (임계값: ${this.thresholds.maxLatencyMs / 1000}초)`,
        resolved: false,
        metadata: { metricId: metric.id, latency: metric.latencyMs }
      });
    }

    // 에러 체크
    if (!metric.success) {
      this.addAlert({
        type: 'error',
        title: 'API 호출 실패',
        message: `${metric.endpoint}: ${metric.errorMessage || '알 수 없는 오류'}`,
        resolved: false,
        metadata: { metricId: metric.id, error: metric.errorMessage }
      });
    }

    // 시간당 비용 체크
    const hourlyMetrics = this.getHourlyMetrics();
    const hourlyCost = hourlyMetrics.reduce((sum, m) => sum + m.estimatedCost, 0);
    if (hourlyCost > this.thresholds.maxCostPerHour) {
      this.addAlert({
        type: 'warning',
        title: '시간당 비용 초과',
        message: `현재 시간 비용: $${hourlyCost.toFixed(2)} (임계값: $${this.thresholds.maxCostPerHour})`,
        resolved: false,
        metadata: { hourlyCost }
      });
    }
  }

  private calculateTodayStats(metrics: APIMetric[]) {
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        avgLatencyMs: 0,
        totalCost: 0,
        totalTokens: 0
      };
    }

    const successCount = metrics.filter(m => m.success).length;
    const totalLatency = metrics.reduce((sum, m) => sum + m.latencyMs, 0);
    const totalCost = metrics.reduce((sum, m) => sum + m.estimatedCost, 0);
    const totalTokens = metrics.reduce((sum, m) => sum + m.tokensUsed, 0);

    return {
      totalRequests: metrics.length,
      successRate: successCount / metrics.length,
      avgLatencyMs: totalLatency / metrics.length,
      totalCost,
      totalTokens
    };
  }

  private calculateHourlyStats(metrics: APIMetric[]) {
    const hourlyData: { [hour: number]: APIMetric[] } = {};
    
    // 24시간 초기화
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = [];
    }
    
    // 메트릭을 시간별로 그룹화
    metrics.forEach(metric => {
      const hour = new Date(metric.timestamp).getHours();
      hourlyData[hour].push(metric);
    });
    
    // 시간별 통계 계산
    return Object.entries(hourlyData).map(([hour, hourMetrics]) => {
      const hourNum = parseInt(hour);
      const successCount = hourMetrics.filter(m => m.success).length;
      const totalLatency = hourMetrics.reduce((sum, m) => sum + m.latencyMs, 0);
      const totalCost = hourMetrics.reduce((sum, m) => sum + m.estimatedCost, 0);
      
      return {
        hour: hourNum,
        requests: hourMetrics.length,
        successRate: hourMetrics.length > 0 ? successCount / hourMetrics.length : 0,
        avgLatency: hourMetrics.length > 0 ? totalLatency / hourMetrics.length : 0,
        cost: totalCost
      };
    });
  }

  private calculateModelUsage(metrics: APIMetric[]) {
    const modelStats: { [model: string]: { count: number; tokens: number; cost: number } } = {};
    
    metrics.forEach(metric => {
      if (!modelStats[metric.modelUsed]) {
        modelStats[metric.modelUsed] = { count: 0, tokens: 0, cost: 0 };
      }
      
      modelStats[metric.modelUsed].count++;
      modelStats[metric.modelUsed].tokens += metric.tokensUsed;
      modelStats[metric.modelUsed].cost += metric.estimatedCost;
    });
    
    const totalRequests = metrics.length;
    
    return Object.entries(modelStats).map(([model, stats]) => ({
      model,
      ...stats,
      percentage: totalRequests > 0 ? (stats.count / totalRequests) * 100 : 0
    }));
  }

  private calculateEndpointStats(metrics: APIMetric[]) {
    const endpointStats: { [endpoint: string]: APIMetric[] } = {};
    
    metrics.forEach(metric => {
      if (!endpointStats[metric.endpoint]) {
        endpointStats[metric.endpoint] = [];
      }
      endpointStats[metric.endpoint].push(metric);
    });
    
    return Object.entries(endpointStats).map(([endpoint, endpointMetrics]) => {
      const successCount = endpointMetrics.filter(m => m.success).length;
      const totalLatency = endpointMetrics.reduce((sum, m) => sum + m.latencyMs, 0);
      const totalCost = endpointMetrics.reduce((sum, m) => sum + m.estimatedCost, 0);
      
      return {
        endpoint,
        count: endpointMetrics.length,
        avgLatency: totalLatency / endpointMetrics.length,
        successRate: successCount / endpointMetrics.length,
        totalCost
      };
    });
  }

  private calculateRAGStats(metrics: APIMetric[]) {
    const ragMetrics = metrics.filter(m => m.ragSearches !== undefined);
    
    if (ragMetrics.length === 0) {
      return {
        utilizationRate: 0,
        avgSearchesPerRequest: 0,
        avgSourcesFound: 0,
        urlVerificationRate: 0
      };
    }
    
    const totalSearches = ragMetrics.reduce((sum, m) => sum + (m.ragSearches || 0), 0);
    const totalSources = ragMetrics.reduce((sum, m) => sum + (m.ragSources || 0), 0);
    const urlMetrics = ragMetrics.filter(m => m.urlsVerified !== undefined);
    const totalUrlsVerified = urlMetrics.reduce((sum, m) => sum + (m.urlsVerified || 0), 0);
    
    return {
      utilizationRate: (ragMetrics.length / metrics.length) * 100,
      avgSearchesPerRequest: totalSearches / ragMetrics.length,
      avgSourcesFound: totalSources / ragMetrics.length,
      urlVerificationRate: urlMetrics.length > 0 ? (totalUrlsVerified / urlMetrics.length) * 100 : 0
    };
  }

  private getRecentErrors(limit: number = 50) {
    return this.apiMetrics
      .filter(m => !m.success)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(m => ({
        timestamp: m.timestamp,
        endpoint: m.endpoint,
        error: m.errorMessage || '알 수 없는 오류',
        userInput: m.userInput?.substring(0, 100) // 100자만
      }));
  }

  private getHourlyMetrics(): APIMetric[] {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return this.apiMetrics.filter(m => m.timestamp >= oneHourAgo);
  }
}

// 싱글톤 인스턴스
export const metricsStore = new MetricsStore();