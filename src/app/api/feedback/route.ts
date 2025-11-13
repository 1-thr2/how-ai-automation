import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * POST /api/feedback
 * 사용자 피드백 등록
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { automationId, success, failedSteps, detail, email } = body;

    // 검증
    if (typeof success !== 'boolean') {
      return NextResponse.json(
        { error: 'success 필드는 필수입니다 (boolean)' },
        { status: 400 }
      );
    }

    // DB 저장
    const { data, error } = await supabase
      .from('user_feedback')
      .insert({
        automation_id: automationId || null,
        success,
        failed_steps: failedSteps || [],
        detail: detail || null,
        email: email || null,
        status: success ? 'completed' : 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ 피드백 저장 실패:', error);
      return NextResponse.json(
        { error: '피드백 저장에 실패했습니다', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ 피드백 저장 완료:', data);

    // 실패 케이스면 Slack 알람
    if (!success && email) {
      await sendSlackAlert({
        feedbackId: data.id,
        email,
        detail,
        failedSteps,
        automationId,
      });
    }

    return NextResponse.json({
      success: true,
      feedbackId: data.id,
      message: success
        ? '피드백 감사합니다!'
        : '24시간 내 답변드리겠습니다!',
    });
  } catch (error: any) {
    console.error('❌ 피드백 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Slack 알람 전송
 */
async function sendSlackAlert(data: {
  feedbackId: number;
  email: string;
  detail: string;
  failedSteps: number[];
  automationId: number;
}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('⚠️ SLACK_WEBHOOK_URL이 설정되지 않았습니다');
    return;
  }

  try {
    const message = {
      text: '🚨 새로운 피드백 (실패 케이스)',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 실패 케이스 발생',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*이메일:*\n${data.email}`,
            },
            {
              type: 'mrkdwn',
              text: `*실패 단계:*\n${data.failedSteps.join(', ') || '없음'}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*상세 내용:*\n${data.detail || '없음'}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '대시보드에서 보기',
                emoji: true,
              },
              url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3005'}/admin/feedback?id=${data.feedbackId}`,
              style: 'primary',
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '자동화 결과 보기',
                emoji: true,
              },
              url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3005'}/automation-result/${data.automationId}`,
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error('❌ Slack 알람 전송 실패:', response.statusText);
    } else {
      console.log('✅ Slack 알람 전송 완료');
    }
  } catch (error) {
    console.error('❌ Slack 알람 오류:', error);
  }
}
