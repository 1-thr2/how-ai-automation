import { NextRequest, NextResponse } from 'next/server';
import { saveAutomationRequest } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Supabase에 자동화 요청 저장
    const result = await saveAutomationRequest(data);
    
    return NextResponse.json({ 
      success: true, 
      id: result?.id || Date.now() // ID 반환
    });
  } catch (error) {
    console.error('❌ 자동화 저장 실패:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save automation' 
    }, { status: 500 });
  }
}