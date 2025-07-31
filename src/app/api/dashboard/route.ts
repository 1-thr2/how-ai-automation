import { NextRequest, NextResponse } from 'next/server';
import { metricsStore } from '@/lib/monitoring/store';

// 🔧 실시간 메트릭 데이터 반환하는 동적 라우트
export const dynamic = 'force-dynamic';

/**
 * 대시보드 메인 API
 * GET: 전체 대시보드 통계 반환
 */
export async function GET(req: NextRequest) {
  try {
    console.log('📊 [Dashboard] 통계 요청됨');
    
    // 전체 대시보드 통계 가져오기
    const stats = metricsStore.getDashboardStats();
    
    // 응답 데이터 구성
    const response = {
      success: true,
      timestamp: Date.now(),
      stats,
      meta: {
        version: '2.0.0',
        dataRetentionHours: 24,
        updateIntervalSeconds: 30
      }
    };
    
    console.log(`📊 [Dashboard] 통계 반환: 오늘 ${stats.today.totalRequests}건, 성공률 ${(stats.today.successRate * 100).toFixed(1)}%`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [Dashboard] 통계 조회 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard stats',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * POST: 실시간 메트릭 업데이트 (테스트용)
 */
export async function POST(req: NextRequest) {
  try {
    const { action, data } = await req.json();
    
    switch (action) {
      case 'test_metric':
        // 테스트 메트릭 추가
        const testMetric = {
          id: `test_${Date.now()}`,
          timestamp: Date.now(),
          endpoint: data.endpoint || '/api/test',
          latencyMs: data.latency || Math.random() * 5000 + 1000,
          success: data.success !== false,
          tokensUsed: data.tokens || Math.floor(Math.random() * 1000 + 100),
          modelUsed: data.model || 'gpt-4o-mini',
          estimatedCost: data.cost || Math.random() * 0.01,
          approach: data.approach || 'test',
          cardsGenerated: data.cards || Math.floor(Math.random() * 5 + 1)
        };
        
        metricsStore.addAPIMetric(testMetric);
        console.log('🧪 [Dashboard] 테스트 메트릭 추가됨');
        
        return NextResponse.json({
          success: true,
          message: 'Test metric added',
          metric: testMetric
        });
        
      case 'clear_alerts':
        // 모든 알림 해결 처리
        const activeAlerts = metricsStore.getActiveAlerts();
        activeAlerts.forEach(alert => {
          metricsStore.resolveAlert(alert.id);
        });
        
        console.log(`✅ [Dashboard] ${activeAlerts.length}개 알림 해결 처리됨`);
        
        return NextResponse.json({
          success: true,
          message: `${activeAlerts.length} alerts resolved`
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ [Dashboard] POST 처리 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process request'
    }, { status: 500 });
  }
}