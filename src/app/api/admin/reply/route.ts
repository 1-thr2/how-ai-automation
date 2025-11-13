import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * POST /api/admin/reply
 * 피드백 답변 작성 및 이메일 발송
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feedbackId, reply } = body;

    if (!feedbackId || !reply) {
      return NextResponse.json(
        { error: 'feedbackId와 reply는 필수입니다' },
        { status: 400 }
      );
    }

    // 피드백 조회
    const { data: feedback, error: fetchError } = await supabase
      .from('user_feedback')
      .select(`
        *,
        automation_requests (
          id,
          user_input,
          generated_cards
        )
      `)
      .eq('id', feedbackId)
      .single();

    if (fetchError || !feedback) {
      return NextResponse.json(
        { error: '피드백을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // DB 업데이트
    const { error: updateError } = await supabase
      .from('user_feedback')
      .update({
        admin_reply: reply,
        status: 'completed',
        replied_at: new Date().toISOString(),
      })
      .eq('id', feedbackId);

    if (updateError) {
      console.error('❌ 답변 저장 실패:', updateError);
      return NextResponse.json(
        { error: '답변 저장에 실패했습니다', details: updateError.message },
        { status: 500 }
      );
    }

    // 이메일 발송
    if (feedback.email) {
      await sendReplyEmail({
        to: feedback.email,
        reply,
        userInput: feedback.automation_requests?.user_input || '자동화 요청',
        automationId: feedback.automation_id,
      });
    }

    return NextResponse.json({
      success: true,
      message: '답변이 저장되고 이메일이 발송되었습니다',
    });
  } catch (error: any) {
    console.error('❌ 답변 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * 이메일 발송 (현재는 콘솔 로그만)
 * TODO: Resend/SendGrid 연동
 */
async function sendReplyEmail(data: {
  to: string;
  reply: string;
  userInput: string;
  automationId: number;
}) {
  // TODO: 실제 이메일 발송 구현
  // 예: Resend, SendGrid, Nodemailer 등

  console.log('📧 이메일 발송 (시뮬레이션):');
  console.log('받는사람:', data.to);
  console.log('제목:', `[How-AI] 피드백 답변드립니다`);
  console.log('내용:');
  console.log(`
안녕하세요!

"${data.userInput}" 자동화 요청에 대한 피드백 감사드립니다.

답변:
${data.reply}

자동화 결과 보기:
${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3005'}/automation-result/${data.automationId}

추가 문의사항이 있으시면 언제든 답장 주세요.

감사합니다!
How-AI 팀
  `);

  // 실제 이메일 발송 예시 (Resend)
  /*
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'How-AI <noreply@your-domain.com>',
    to: data.to,
    subject: '[How-AI] 피드백 답변드립니다',
    html: `
      <h2>안녕하세요!</h2>
      <p>"${data.userInput}" 자동화 요청에 대한 피드백 감사드립니다.</p>
      <h3>답변:</h3>
      <p>${data.reply.replace(/\n/g, '<br>')}</p>
      <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/automation-result/${data.automationId}">자동화 결과 보기</a></p>
    `,
  });
  */
}
