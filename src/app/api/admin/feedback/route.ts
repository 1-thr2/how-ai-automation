import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/admin/feedback
 * 피드백 목록 조회 (관리자용)
 */
export async function GET(request: NextRequest) {
  try {
    // 쿼리 파라미터
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all'; // all, pending, completed
    const id = searchParams.get('id'); // 특정 피드백 조회

    // 특정 피드백 조회
    if (id) {
      const { data, error } = await supabase
        .from('user_feedback')
        .select(`
          *,
          automation_requests (
            id,
            user_input,
            followup_answers,
            generated_cards
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ 피드백 조회 실패:', error);
        return NextResponse.json(
          { error: '피드백을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      return NextResponse.json(data);
    }

    // 목록 조회
    let query = supabase
      .from('user_feedback')
      .select(`
        *,
        automation_requests (
          id,
          user_input
        )
      `)
      .order('created_at', { ascending: false });

    // 상태 필터
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ 피드백 목록 조회 실패:', error);
      return NextResponse.json(
        { error: '피드백 목록 조회에 실패했습니다', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('❌ 관리자 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    );
  }
}
