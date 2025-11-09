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
          console.log('💾 [Loading] sessionStorage에 저장 완료 (goal 포함)');

          // 최소 1초 보장
          const elapsed = Date.now() - start;
          const wait = Math.max(0, 1000 - elapsed);
          setTimeout(() => {
            if (isMounted) {
              console.log('🔄 [Loading] automation-result로 이동');
              router.replace(`/automation-result?goal=${encodeURIComponent(goal)}`);
            }
          }, wait);
        } else {
          // 후속질문 생성 API 호출
          const res = await fetch('/api/agent-followup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userInput: goal }),
          });

          if (!res.ok) {
            throw new Error(`후속질문 생성 실패: ${res.status} ${res.statusText}`);
          }

          const data = await res.json();
          console.log('✅ [Loading] 후속질문 생성 완료:', data);

          // sessionStorage에 후속질문 데이터 저장
          sessionStorage.setItem('followupQuestions', JSON.stringify(data));
          console.log('💾 [Loading] sessionStorage에 후속질문 저장 완료');

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
