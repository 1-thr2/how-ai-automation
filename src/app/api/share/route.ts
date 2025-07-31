import { NextRequest, NextResponse } from 'next/server';
import { saveAutomationRequest, createOrGetShareLink } from '@/lib/supabase';

// 🔧 데이터베이스 호출이 있는 동적 라우트
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { requestId, automationData } = await req.json();
    
    let finalRequestId = requestId;
    
    // requestId가 없으면 새로 저장
    if (!finalRequestId && automationData) {
      console.log('🔄 자동화 데이터 저장 중...');
      const savedData = await saveAutomationRequest(automationData);
      finalRequestId = savedData?.id;
      
      if (!finalRequestId) {
        throw new Error('자동화 데이터 저장 실패');
      }
    }
    
    if (!finalRequestId) {
      return NextResponse.json({ 
        error: 'requestId 또는 automationData가 필요합니다' 
      }, { status: 400 });
    }

    // 공유 링크 생성
    console.log('🔗 공유 링크 생성 중...', finalRequestId);
    const shareId = await createOrGetShareLink(finalRequestId);
    
    if (!shareId) {
      throw new Error('공유 링크 생성 실패');
    }

    return NextResponse.json({ 
      success: true, 
      id: shareId,
      requestId: finalRequestId 
    });
    
  } catch (error: any) {
    console.error('❌ 공유 API 오류:', error);
    return NextResponse.json({ 
      error: error.message || '공유 링크 생성에 실패했습니다' 
    }, { status: 500 });
  }
}
