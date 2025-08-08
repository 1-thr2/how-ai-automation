'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useEffect, useState, useRef, Suspense } from 'react';
import DynamicQuestionnaire from '../components/DynamicQuestionnaire';
import { DynamicAnswers } from '../components/types';
import LoadingScreen from '../components/LoadingScreen';

function SurveyContent() {
  const router = useRouter();
  const params = useSearchParams();
  const goal = params?.get('goal') || '';
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isHandlingRef = useRef(false); // 🔥 중복 실행 방지

  // 🔍 컴포넌트 언마운트 감지
  useEffect(() => {
    console.log('🏗️ [SurveyContent] 컴포넌트 마운트됨');
    return () => {
      console.log('🏗️ [SurveyContent] 컴포넌트 언마운트됨!');
    };
  }, []);

  // 🔍 isSubmitted 상태 변화 추적
  useEffect(() => {
    console.log('🔍 [SurveyContent] isSubmitted 변화:', isSubmitted);
    if (isSubmitted) {
      console.trace('🚨 [SurveyContent] isSubmitted가 true로 변경됨');
    }
  }, [isSubmitted]);

  const handleSubmit = (answers: DynamicAnswers) => {
    console.log('🚨 [Survey] handleSubmit 호출됨! 스택 추적:');
    console.trace(); // 🔍 누가 이 함수를 호출했는지 스택 추적
    console.log('받은 answers:', answers);
    console.log('answers의 키 개수:', Object.keys(answers || {}).length);
    
    // 🚫 중복 실행 방지
    if (isHandlingRef.current || isSubmitted) {
      console.log('🚫 [Survey] 중복 실행 차단');
      return;
    }
    
    isHandlingRef.current = true;
    console.log('🎯 [Survey] handleSubmit 진행');
    console.log('목표 goal:', goal);
    
    if (!answers || Object.keys(answers).length === 0) {
      console.error('❌ [Survey] 답변이 비어있음');
      alert('답변이 비어 있습니다. 모든 질문에 답변해 주세요.');
      return;
    }
    if (!goal) {
      console.error('❌ [Survey] goal이 없음');
      alert('목표(goal) 값이 없습니다.');
      return;
    }
    
    console.log('✅ 제출된 answers:', answers);
    
    // 🔥 Base64 인코딩으로 안전하게 전달 (URI malformed 방지)
    const answersData = { ...answers, goal: answers.goal || goal };
    const answersBase64 = btoa(encodeURIComponent(JSON.stringify(answersData)));
    
    console.log('🔄 [Survey] Base64 인코딩 완료');
    
    // 🔥 즉시 submitted 상태로 변경하여 리렌더링 방지
    setIsSubmitted(true);
    
    // 🧹 제출 완료 시 localStorage 클리어
    try {
      localStorage.removeItem('dynamicQuestionnaire_inputValues');
      console.log('🧹 [Survey] localStorage 클리어됨');
    } catch (e) {
      console.warn('localStorage 클리어 실패:', e);
    }
    
    // 🚫 강제 페이지 이동: Base64로 안전하게 전달
    const url = `/loading?goal=${encodeURIComponent(goal)}&answers=${answersBase64}`;
    console.log('🔄 [Survey] 페이지 이동:', url);
    
    // router.push 대신 replace 사용하여 뒤로가기 방지
    router.replace(url);
  };

  if (isSubmitted) {
    return <LoadingScreen stage="first" />;
  }

  return (
    <div>
      <DynamicQuestionnaire 
        userInput={goal} 
        onSubmit={handleSubmit} 
      />
    </div>
  );
}

export default function SurveyPage() {
  return (
    <Suspense fallback={<LoadingScreen stage="first" />}>
      <SurveyContent />
    </Suspense>
  );
}
