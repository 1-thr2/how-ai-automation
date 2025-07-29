import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import TaskInput from './TaskInput';

const QUICK_AUTOMATIONS = [
  '메시징 앱에서 질문 자동 수집',
  '이메일 첨부파일 자동 정리',
  '소셜미디어 브랜드 모니터링',
  '웹사이트 문의 CRM 연동',
  '엑셀 데이터 자동 분석',
  '매출 리포트 자동 생성',
];

const PRACTICAL_TIPS = [
  '💡 구체적으로 입력할수록 더 정확한 자동화를 설계할 수 있어요',
  '🚀 현재 사용 중인 도구나 플랫폼을 언급해주세요',
  '⚡ 예상되는 데이터량이나 빈도를 알려주세요',
];

interface HeroSectionProps {
  onSubmit: (input: string) => void;
  isLoading: boolean;
}

export default function HeroSection({ onSubmit, isLoading }: HeroSectionProps) {
  // TaskInput의 내부 상태를 제어하기 위한 ref
  const taskInputRef = useRef<any>(null);

  // 퀵버튼 클릭 시 입력창에 값 세팅
  const handleQuickButton = (text: string) => {
    if (taskInputRef.current && taskInputRef.current.setTask) {
      taskInputRef.current.setTask(text);
    }
  };

  return (
    <section className="w-full min-h-screen bg-[#f7f8fd] flex flex-col items-center justify-start py-12">
      <div className="max-w-2xl mx-auto flex flex-col items-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-3 leading-snug">
          ㅋㅋ아직도 <span className="text-[#8b5cf6]">그거</span>하고있음?
        </h1>
        <h2 className="text-base md:text-lg font-normal text-center text-gray-400 mb-6">
          당신만의 자동화 레시피를 만들어드려요
        </h2>
      </div>
      
      {/* 3단계 안내 */}
      <div className="flex items-center justify-center gap-6 mb-10">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#ede9fe] text-[#8b5cf6] font-bold text-lg mb-1">1</div>
          <span className="text-sm text-gray-700">상황 설명</span>
        </div>
        <span className="text-2xl text-gray-300">→</span>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#ede9fe] text-[#8b5cf6] font-bold text-lg mb-1">2</div>
          <span className="text-sm text-gray-700">맞춤 질문</span>
        </div>
        <span className="text-2xl text-gray-300">→</span>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#ede9fe] text-[#8b5cf6] font-bold text-lg mb-1">3</div>
          <span className="text-sm text-gray-700">개인 레시피</span>
        </div>
      </div>
      
      {/* 입력 카드 */}
      <div className="mt-8 w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-12 flex flex-col items-center">
        <div className="mb-2">
          <span className="inline-block px-4 py-2 bg-[#ede9fe] text-[#8b5cf6] text-sm font-bold rounded-full mb-5">✨ AI 맞춤 분석</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">어떤 업무가 귀찮으신가요?</h3>
        <p className="text-gray-500 text-center mb-8 text-lg leading-relaxed">간단히 설명해주시면 맞춤 해결책을 제안해드려요</p>
        
        {/* TaskInput 컴포넌트 */}
        <TaskInput
          ref={taskInputRef}
          onSubmit={onSubmit}
          isLoading={isLoading}
          placeholder="예: 매일 엑셀에 데이터를 복사하는 게 너무 귀찮아요..."
          buttonText="맞춤 분석 시작 🚀"
          buttonClassName="w-full h-16 mt-6 bg-[#8b5cf6] text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-[#7c3aed] transition"
          inputClassName="min-h-[140px] text-lg leading-relaxed"
        />
        
        {/* 퀵버튼: 지금 인기있는 자동화 */}
        <div className="w-full mt-10">
          <div className="flex items-center mb-4">
            <span className="text-xl mr-2">🔥</span>
            <span className="font-semibold text-gray-800 text-lg">지금 인기있는 자동화</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {QUICK_AUTOMATIONS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="px-5 py-2 rounded-full bg-gray-100 text-[#8b5cf6] text-base font-medium border border-gray-200 hover:bg-[#ede9fe] hover:text-[#7c3aed] transition shadow-sm"
                style={{ cursor: 'pointer' }}
                onClick={() => handleQuickButton(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
