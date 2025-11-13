'use client';
import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingScreen from '../components/LoadingScreen';

function LoadingContent() {
  const router = useRouter();
  const params = useSearchParams();
  
  // 컴포넌트 레벨에서 answers 정의
  const goal = params?.get('goal') || '';
  const answers = params?.get('answers');

  useEffect(() => {
    if (!goal) {
      router.replace('/');
      return;
    }

    let isMounted = true;
    const start = Date.now();

    const fetchData = async () => {
      try {
        if (answers) {
          // 🔥 Base64 디코딩으로 안전하게 파싱
          let parsedAnswers;
          try {
            const decodedAnswers = decodeURIComponent(atob(answers));
            parsedAnswers = JSON.parse(decodedAnswers);
          } catch (e) {
            console.error('❌ [Loading] answers 디코딩 실패:', e);
            throw new Error('답변 데이터 파싱 실패');
          }
          
          console.log('🔄 [Loading] API 호출 시작:', {
            userInput: goal,
            followupAnswers: parsedAnswers
          });
          
          // 최종 레시피 생성 API 호출
          const res = await fetch('/api/agent-orchestrator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              userInput: goal, 
              followupAnswers: parsedAnswers 
            }),
          });
          
          if (!res.ok) {
            throw new Error(`API 호출 실패: ${res.status} ${res.statusText}`);
          }
          
          const data = await res.json();
          console.log('✅ [Loading] API 응답 받음:', data);
          
          // sessionStorage에 결과 저장 + goal도 함께 저장
          sessionStorage.setItem('automationResultData', JSON.stringify(data));
          sessionStorage.setItem('currentGoal', goal); // 🔧 goal을 별도 저장
          sessionStorage.setItem('resultReady', 'true'); // 🔥 결과 준비 플래그
          console.log('💾 [Loading] sessionStorage에 저장 완료 (goal 포함)');

          // 🎯 UX 개선: 즉시 리디렉트하지 않음
          // LoadingScreen이 resultReady 플래그를 감지하여 알림 표시
          // 사용자가 게임 중이면 게임을 계속하고, 아니면 자동 이동
          console.log('✅ [Loading] 결과 준비 완료 - LoadingScreen이 처리할 예정');
        } else {
          // 후속질문 생성 API 호출 (기존)
          const res = await fetch('/api/agent-followup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userInput: goal }),
          });
          // const data = await res.json();
          // const encodedData = encodeURIComponent(JSON.stringify(data));
          // 최소 1초 보장
          const elapsed = Date.now() - start;
          const wait = Math.max(0, 1000 - elapsed);
          setTimeout(() => {
            if (isMounted) router.replace(`/survey?goal=${encodeURIComponent(goal)}`);
          }, wait);
        }
      } catch (e) {
        console.error('❌ [Loading] API 호출 실패:', e);
        if (isMounted) router.replace(`/survey?goal=${encodeURIComponent(goal)}`);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, []); // 🔥 의존성 배열 제거로 한 번만 실행

  // stage 결정: answers가 있으면 두 번째 로딩(결과 생성), 없으면 첫 번째 로딩(후속질문)
  const stage = answers ? 'second' : 'first';
  
  return <LoadingScreen stage={stage} />;
}

export default function LoadingPage() {
  return (
    <Suspense fallback={<LoadingScreen stage="first" />}>
      <LoadingContent />
    </Suspense>
  );
}
