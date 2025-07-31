import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/error-handler';
import { saveAutomationRequest } from '@/lib/supabase';
import { generate3StepAutomation } from '@/lib/agents/orchestrator-v2';
import { checkRAGHealth } from '@/lib/services/rag';

// 🚀 리팩토링된 3단계 시스템: A(초안) → B(RAG검증) → C(WOW마감)
export async function POST(req: Request) {
  let userInput = '';
  let followupAnswers = {};
  let startTime = Date.now();
  
  try {
    const requestData = await req.json();
    userInput = requestData.userInput;
    followupAnswers = requestData.followupAnswers;
    
    console.log('🚀 [리팩토링] 3단계 자동화 생성 시작 (v2.0)');
    console.log('📝 사용자 입력:', userInput);
    console.log('📋 후속 답변:', followupAnswers);

    // 🏥 RAG 시스템 헬스체크 (선택적)
    try {
      const ragHealth = await checkRAGHealth();
      console.log('🏥 [RAG] 헬스체크:', ragHealth);
      
      if (!ragHealth.tavilyAvailable) {
        console.log('⚠️ [RAG] Tavily 사용 불가, 기본 모드로 진행');
      }
    } catch (ragError) {
      console.log('⚠️ [RAG] 헬스체크 실패, 기본 모드로 진행:', ragError);
    }

    startTime = Date.now();

    // 🚀 새로운 3단계 시스템 실행: A(초안) → B(RAG검증) → C(WOW마감)
    console.log('🚀 [리팩토링] 새로운 3단계 시스템 실행...');
    const { cards: allCards, metrics } = await generate3StepAutomation(userInput, followupAnswers);

    const processingTime = metrics.totalLatencyMs;
    
    // 📊 리팩토링된 시스템 메트릭 로깅
    console.log(`🎯 [리팩토링] 완료 - 생성된 카드 수: ${allCards.length}`);
    console.log(`💰 [비용 최적화] 총 토큰: ${metrics.totalTokens}개`);
    console.log(`💰 [비용 세부내역]:`, {
      stepA: `${metrics.costBreakdown.stepA.tokens}토큰 (${metrics.costBreakdown.stepA.model})`,
      stepB: `${metrics.costBreakdown.stepB.tokens}토큰 + RAG ${metrics.costBreakdown.stepB.ragCalls}회`,
      stepC: `${metrics.costBreakdown.stepC.tokens}토큰 (${metrics.costBreakdown.stepC.model})`
    });
    console.log(`⚡ [속도 최적화] 총 처리시간: ${processingTime}ms`);
    console.log(`🎨 [품질 최적화] 완료 단계: ${metrics.stagesCompleted.join(' → ')}`);
    console.log(`🔍 [RAG 활용] 검색: ${metrics.ragSearches}회, 소스: ${metrics.ragSources}개, URL검증: ${metrics.urlsVerified}개`);
    console.log(`🚀 [리팩토링] 카드 타입들:`, allCards.map((card: any) => card.type));

    // 🎯 메타데이터 추가 (리팩토링 버전)
    const response_data = {
      cards: allCards,
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime: processingTime,
        approach: '3단계_리팩토링_시스템_v2',
        version: '2.0.0',
        stages: {
          stepA: `${metrics.costBreakdown.stepA.model} (카드 초안)`,
          stepB: `RAG 검증 (${metrics.ragSearches}회 검색)`,
          stepC: `${metrics.costBreakdown.stepC.model} (WOW 마감)`
        },
        performance: {
          totalTokens: metrics.totalTokens,
          totalLatencyMs: metrics.totalLatencyMs,
          stagesCompleted: metrics.stagesCompleted,
          ragUtilization: {
            searches: metrics.ragSearches,
            sources: metrics.ragSources,
            urlsVerified: metrics.urlsVerified
          }
        },
        costOptimization: {
          stepA: `$${metrics.costBreakdown.stepA.cost.toFixed(4)}`,
          stepB: `$${metrics.costBreakdown.stepB.cost.toFixed(4)}`,
          stepC: `$${metrics.costBreakdown.stepC.cost.toFixed(4)}`,
          total: `$${(metrics.costBreakdown.stepA.cost + metrics.costBreakdown.stepB.cost + metrics.costBreakdown.stepC.cost).toFixed(4)}`
        },
        qualityIndicators: {
          success: metrics.success,
          blueprintSystem: true,
          ragVerification: metrics.ragSearches > 0,
          wowFinalization: metrics.stagesCompleted.includes('C-wow')
        }
      }
    };

    // 💾 Supabase에 자동화 요청 데이터 저장 (백그라운드)
    try {
      await saveAutomationRequest({
        user_input: userInput,
        followup_answers: followupAnswers,
        generated_cards: allCards,
        user_session_id: `session_${Date.now()}`, // 임시 세션 ID
        processing_time_ms: processingTime,
        success: metrics.success
      });
      console.log('✅ 자동화 요청 데이터 저장 완료 (v2.0)');
    } catch (saveError) {
      console.error('⚠️ 자동화 요청 저장 실패 (응답은 정상 진행):', saveError);
      // 저장 실패해도 응답은 정상 반환
    }

    return NextResponse.json(response_data);

  } catch (error) {
    console.error('❌ 리팩토링된 자동화 생성 실패:', error);
    
    // 💾 실패한 요청도 Supabase에 저장 (분석용)
    try {
      await saveAutomationRequest({
        user_input: userInput || 'Unknown input',
        followup_answers: followupAnswers || {},
        generated_cards: [],
        user_session_id: `session_${Date.now()}`,
        processing_time_ms: Date.now() - startTime,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('✅ 실패한 요청 데이터 저장 완료 (v2.0)');
    } catch (saveError) {
      console.error('⚠️ 실패 요청 저장 실패:', saveError);
    }
    
    return handleApiError(error);
  }
}