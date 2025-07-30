import { NextRequest, NextResponse } from 'next/server';
import { createOrGetShareLink } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json();
    
    if (!requestId) {
      return NextResponse.json({ 
        error: 'Request ID is required' 
      }, { status: 400 });
    }

    // 공유 링크 생성 또는 기존 링크 반환
    const shareId = await createOrGetShareLink(requestId);
    
    if (!shareId) {
      return NextResponse.json({ 
        error: 'Failed to create share link' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      shareId 
    });
  } catch (error) {
    console.error('❌ 공유 링크 생성 실패:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}