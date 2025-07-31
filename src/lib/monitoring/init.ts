import { SystemMetricsCollector } from './collector';

/**
 * 모니터링 시스템 초기화
 * 앱 시작 시 한 번 호출하여 주기적 메트릭 수집을 시작합니다
 */
export function initializeMonitoring() {
  console.log('🚀 [Monitoring] 모니터링 시스템 초기화 시작');
  
  try {
    // 주기적 시스템 메트릭 수집 시작 (1분마다)
    SystemMetricsCollector.startPeriodicCollection(60000);
    
    console.log('✅ [Monitoring] 모니터링 시스템 초기화 완료');
    console.log('📊 [Monitoring] 대시보드: /dashboard');
    console.log('🔗 [Monitoring] API: /api/dashboard');
    console.log('📡 [Monitoring] 스트림: /api/dashboard/stream');
    
    // 환경 변수 상태 체크
    const envStatus = {
      openai: !!process.env.OPENAI_API_KEY,
      tavily: !!process.env.TAVILY_API_KEY,
      supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    };
    
    console.log('🔧 [Monitoring] 서비스 상태:', envStatus);
    
    // 누락된 환경 변수 경고
    Object.entries(envStatus).forEach(([service, available]) => {
      if (!available) {
        console.warn(`⚠️ [Monitoring] ${service.toUpperCase()} 환경 변수 누락 - 일부 기능이 제한될 수 있습니다`);
      }
    });
    
  } catch (error) {
    console.error('❌ [Monitoring] 모니터링 시스템 초기화 실패:', error);
  }
}

/**
 * 개발 모드에서만 실행되는 디버그 함수들
 */
export function initializeDebugMode() {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  console.log('🧪 [Debug] 개발 모드 디버그 기능 활성화');
  
  // 5분마다 테스트 메트릭 자동 생성 (개발 모드만)
  setInterval(() => {
    if (Math.random() > 0.5) { // 50% 확률로 생성
      const testMetrics = [
        {
          endpoint: '/api/agent-followup',
          success: Math.random() > 0.05, // 95% 성공률
          latency: Math.random() * 8000 + 2000, // 2-10초
          tokens: Math.floor(Math.random() * 1500 + 500),
          model: Math.random() > 0.7 ? 'gpt-4o-2024-11-20' : 'gpt-4o-mini'
        },
        {
          endpoint: '/api/agent-orchestrator',
          success: Math.random() > 0.1, // 90% 성공률
          latency: Math.random() * 15000 + 5000, // 5-20초
          tokens: Math.floor(Math.random() * 3000 + 1000),
          model: 'mixed'
        }
      ];
      
      // 랜덤하게 하나 선택
      const testMetric = testMetrics[Math.floor(Math.random() * testMetrics.length)];
      
      // 실제 메트릭 API 호출
      fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_metric',
          data: testMetric
        })
      }).catch(error => {
        console.log('🧪 [Debug] 테스트 메트릭 생성 실패 (정상):', error.message);
      });
    }
  }, 5 * 60 * 1000); // 5분
  
  console.log('🧪 [Debug] 5분마다 테스트 메트릭 자동 생성 시작');
}

/**
 * Next.js 앱에서 사용할 초기화 함수
 */
export function startMonitoring() {
  // 모니터링 시스템 초기화
  initializeMonitoring();
  
  // 개발 모드 디버그 기능
  initializeDebugMode();
  
  // 메모리 사용량 주기적 체크 (5분마다)
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    if (heapUsedMB > 500) { // 500MB 이상
      console.warn(`⚠️ [Monitoring] 높은 메모리 사용량: ${heapUsedMB}MB`);
    }
  }, 5 * 60 * 1000);
}