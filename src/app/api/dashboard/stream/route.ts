import { NextRequest } from 'next/server';
import { metricsStore } from '@/lib/monitoring/store';

/**
 * 실시간 대시보드 스트림 (Server-Sent Events)
 * 클라이언트가 실시간으로 메트릭 업데이트를 받을 수 있음
 */
export async function GET(req: NextRequest) {
  console.log('🔄 [Dashboard] 실시간 스트림 연결됨');
  
  // SSE 헤더 설정
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();
  
  // SSE 연결 설정
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // 초기 데이터 전송
  const sendData = async (eventType: string, data: any) => {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };
  
  // 연결 확인 메시지
  await sendData('connected', {
    message: '대시보드 실시간 연결 성공',
    timestamp: Date.now()
  });
  
  // 초기 통계 전송
  try {
    const initialStats = metricsStore.getDashboardStats();
    await sendData('stats', initialStats);
  } catch (error) {
    console.error('❌ [Dashboard] 초기 통계 전송 실패:', error);
    await sendData('error', { message: '초기 데이터 로드 실패' });
  }
  
  // 주기적 업데이트 (30초마다)
  const updateInterval = setInterval(async () => {
    try {
      const stats = metricsStore.getDashboardStats();
      await sendData('stats', stats);
      
      // 새로운 알림이 있으면 별도 이벤트 전송
      const activeAlerts = stats.alerts;
      if (activeAlerts.length > 0) {
        await sendData('alerts', activeAlerts);
      }
      
      console.log('📊 [Dashboard] 실시간 통계 업데이트 전송됨');
      
    } catch (error) {
      console.error('❌ [Dashboard] 스트림 업데이트 실패:', error);
      await sendData('error', { message: '데이터 업데이트 실패' });
    }
  }, 30000); // 30초마다
  
  // 연결 종료 처리
  req.signal.addEventListener('abort', () => {
    console.log('🔌 [Dashboard] 실시간 스트림 연결 종료됨');
    clearInterval(updateInterval);
    writer.close();
  });
  
  // 5분 후 자동 연결 종료 (리소스 보호)
  setTimeout(() => {
    console.log('⏰ [Dashboard] 실시간 스트림 타임아웃 (5분)');
    clearInterval(updateInterval);
    writer.close();
  }, 5 * 60 * 1000);
  
  return new Response(responseStream.readable, { headers });
}