import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'OK',
    message: '간단한 테스트 API 작동 중',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ 
      status: 'POST OK',
      received: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '요청 처리 실패',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}