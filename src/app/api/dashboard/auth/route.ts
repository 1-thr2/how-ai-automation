import { NextRequest, NextResponse } from 'next/server';

/**
 * 대시보드 인증 API
 * 환경 변수에 설정된 비밀번호로 접근 제어
 */
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    
    // 환경 변수에서 대시보드 비밀번호 확인
    const dashboardPassword = process.env.DASHBOARD_PASSWORD;
    
    // 비밀번호가 설정되지 않은 경우 기본값 사용 (개발 모드)
    const defaultPassword = process.env.NODE_ENV === 'development' ? 'admin123' : null;
    const requiredPassword = dashboardPassword || defaultPassword;
    
    if (!requiredPassword) {
      console.error('❌ [Dashboard Auth] DASHBOARD_PASSWORD 환경 변수가 설정되지 않음');
      return NextResponse.json({
        success: false,
        error: 'Dashboard password not configured'
      }, { status: 500 });
    }
    
    // 비밀번호 검증
    if (password === requiredPassword) {
      console.log('✅ [Dashboard Auth] 대시보드 인증 성공');
      return NextResponse.json({
        success: true,
        message: 'Authentication successful'
      });
    } else {
      console.warn('⚠️ [Dashboard Auth] 잘못된 비밀번호 시도');
      return NextResponse.json({
        success: false,
        error: 'Invalid password'
      }, { status: 401 });
    }
    
  } catch (error) {
    console.error('❌ [Dashboard Auth] 인증 처리 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: 'Authentication error'
    }, { status: 500 });
  }
}

/**
 * GET: 인증 상태 확인 (옵션)
 */
export async function GET() {
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;
  const defaultPassword = process.env.NODE_ENV === 'development' ? 'admin123' : null;
  const hasPassword = !!(dashboardPassword || defaultPassword);
  
  return NextResponse.json({
    authRequired: hasPassword,
    environment: process.env.NODE_ENV,
    defaultPasswordInDev: process.env.NODE_ENV === 'development' && !dashboardPassword
  });
}