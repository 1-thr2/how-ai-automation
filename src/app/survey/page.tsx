'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useEffect, useState, useRef } from 'react';
import DynamicQuestionnaire from '../components/DynamicQuestionnaire';
import { DynamicAnswers } from '../components/types';

export default function SurveyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const goal = params?.get('goal') || '';
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isHandlingRef = useRef(false); // 🔥 중복 실행 방지

  const handleSubmit = (answers: DynamicAnswers) => {
    // 🚫 중복 실행 방지
    if (isHandlingRef.current || isSubmitted) {
      console.log('🚫 [Survey] 중복 실행 차단');
      return;
    }
    
    isHandlingRef.current = true;
    console.log('🎯 [Survey] handleSubmit 호출됨');
    console.log('받은 answers:', answers);
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
    
    // 🚫 강제 페이지 이동: Base64로 안전하게 전달
    const url = `/loading?goal=${encodeURIComponent(goal)}&answers=${answersBase64}`;
    console.log('🔄 [Survey] 강제 페이지 이동:', url);
    window.location.href = url;
  };

  // 이미 제출된 경우 바로 페이지 이동하므로 이 코드는 실행되지 않음
  if (isSubmitted) {
    return null; // 즉시 페이지 이동하므로 로딩화면 불필요
  }

  if (!goal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-2xl w-full bg-white rounded-2xl p-8 shadow-lg text-center">
          <div className="text-6xl mb-4">🤔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            자동화 목표가 없습니다
          </h1>
          <p className="text-gray-600 mb-6 text-lg leading-relaxed">
            홈페이지에서 자동화하고 싶은 업무를 입력해주세요.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            홈으로 돌아가기 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 제출 후에는 DynamicQuestionnaire 컴포넌트를 완전히 언마운트 */}
      {!isSubmitted && (
        <DynamicQuestionnaire 
          userInput={goal} 
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
