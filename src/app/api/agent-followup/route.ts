import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generate2StepFollowup } from '@/lib/agents/followup-v2';
import { startAPIMetrics } from '@/lib/monitoring/collector';

// 🔧 OpenAI API 호출이 있는 동적 라우트
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'Agent Followup API 작동 중',
    openai_configured: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  // 📊 메트릭 수집 시작
  const metricsCollector = startAPIMetrics('/api/agent-followup');
  
  try {
    console.log('📞 [API] 2-Step 후속질문 생성 API 호출됨');
    
    const { userInput } = await request.json();
    console.log('📝 [API] 받은 사용자 입력:', userInput);

    // 메트릭에 사용자 입력 기록
    metricsCollector.metricData.userInput = userInput;

    console.log('🔑 [API] OpenAI API 키 확인:', process.env.OPENAI_API_KEY ? '있음' : '없음');

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ [API] OPENAI_API_KEY가 설정되지 않음');
      metricsCollector.error('OpenAI API 키가 설정되지 않음');
      return NextResponse.json({ 
        error: 'OpenAI API 키가 설정되지 않았습니다' 
      }, { status: 500 });
    }

    // 🚀 새로운 2-Step 시스템 사용
    console.log('🚀 [API] 2-Step 시스템 시작...');
    const { questions, metrics } = await generate2StepFollowup(userInput);

    // 📊 메트릭 기록
    metricsCollector
      .recordModel(metrics.modelUsed, metrics.totalTokens)
      .recordApproach('2-step-refactored', metrics.stepsUsed)
      .recordResults(questions.length);

    // 📊 메트릭 로깅
    console.log('📊 [API] 2-Step 메트릭:', {
      totalTokens: metrics.totalTokens,
      latencyMs: metrics.latencyMs,
      stepsUsed: metrics.stepsUsed,
      modelUsed: metrics.modelUsed,
      success: metrics.success,
      questionsGenerated: questions.length
    });

    // 💰 비용 정보 로깅 (동적 질문 생성 + gpt-4o)
    const estimatedCost = (metrics.totalTokens / 1000 * 0.005); // gpt-4o 기준: ~$0.005 per 1K tokens (평균)
    console.log(`💰 [API] 예상 비용: $${estimatedCost.toFixed(4)} (${metrics.totalTokens} 토큰)`);

    // 📋 질문 품질 검증 (동적 생성된 3-5개 질문)
    const validQuestions = questions.filter(q =>
      q.question && q.options && Array.isArray(q.options) && q.options.length >= 2
    );

    if (validQuestions.length === 0) {
      console.error('❌ [API] 유효한 질문이 생성되지 않음');
      metricsCollector.error('유효한 질문 생성 실패');
      return NextResponse.json({ 
        error: '질문 생성에 실패했습니다. 다시 시도해주세요.' 
      }, { status: 500 });
    }

    console.log(`✅ [API] 2-Step 완료 - ${validQuestions.length}개 질문 생성됨`);
    
    // 📊 성공으로 메트릭 완료
    metricsCollector.success();

    return NextResponse.json({
      questions: validQuestions,
      metadata: {
        approach: '2-step-refactored',
        metrics: metrics,
        version: 'v2.0'
      }
    });

  } catch (error) {
    console.error('💥 [API] 2-Step 전체 에러:', error);
    
    // 📊 실패로 메트릭 완료
    metricsCollector.error(error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.json({
      error: '후속질문 생성 중 오류가 발생했습니다',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
