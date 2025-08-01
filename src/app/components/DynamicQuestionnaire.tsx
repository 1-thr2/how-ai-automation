'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronRight, FiAlertCircle } from 'react-icons/fi';
import axios from 'axios';
import { DynamicAnswers } from './types';
import LoadingScreen from './LoadingScreen';

// 단순한 컴포넌트

// 새로운 동적 질문 타입 정의
export interface DynamicQuestion {
  key: string;
  question: string;
  type: 'single' | 'multiple';
  options: string[];
  category: 'environment' | 'data' | 'goal';
  importance: 'high' | 'medium';
  description: string;
  inputTriggers?: {
    [optionText: string]: {
      requiresInput: boolean;
      inputPlaceholder?: string;
    };
  };
}

interface Props {
  userInput: string;
  onSubmit: (answers: DynamicAnswers) => void;
}

export default function DynamicQuestionnaire({ userInput, onSubmit }: Props) {
  const [questions, setQuestions] = useState<DynamicQuestion[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<DynamicAnswers>({});
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false); // 🔥 자폭 스위치 추가
  const hasGeneratedRef = useRef(false);
  const lastUserInputRef = useRef<string>('');
  const isInitializedRef = useRef(false);
  
  // 🔥 가장 간단한 실행 제어
  useEffect(() => {
    if (!userInput || hasGeneratedRef.current) return;
    
    hasGeneratedRef.current = true;
    
    const generateQuestions = async () => {
      try {
        setLoading(true);
        
        console.log('🔄 후속질문 생성 시작:', userInput);
        
        const response = await axios.post('/api/agent-followup', {
          userInput: userInput
        });
        
        console.log('✅ [DynamicQuestionnaire] 전체 API 응답:', response.data);
        console.log('✅ [DynamicQuestionnaire] questions 필드:', response.data.questions);
        console.log('✅ [DynamicQuestionnaire] questions 타입:', typeof response.data.questions);
        console.log('✅ [DynamicQuestionnaire] questions 배열인가?:', Array.isArray(response.data.questions));
        
        if (response.data.questions && Array.isArray(response.data.questions)) {
          setQuestions(response.data.questions);
          setError(null);
        } else {
          throw new Error('질문 데이터가 올바르지 않습니다.');
        }
      } catch (err: any) {
        console.error('❌ 동적 후속질문 생성 실패:', err);
        setError(err instanceof Error ? err.message : '질문 생성에 실패했습니다.');
        
        // 기본 질문 제공
        setQuestions([
          {
            key: "current_situation",
            question: "현재 상황을 알려주세요",
            type: "single",
            options: ["처음 시작", "부분적으로 하고 있음", "완전히 수동", "개선 필요", "잘모름 (AI가 추천)"],
            category: "data",
            importance: "high",
            description: "현재 상황을 파악합니다."
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    generateQuestions();
  }, [userInput]); // userInput이 변경될 때만 실행

  // 🔥 로딩 상태 처리

  // 로딩 상태 - 기존 LoadingScreen 사용
  if (loading) {
    return <LoadingScreen />;
  }

  // 에러 상태
  if (error || !questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-2xl w-full bg-white rounded-2xl p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">😔</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              질문 생성에 실패했습니다
            </h1>
            <p className="text-gray-600 mb-6 text-lg leading-relaxed">
              {error || '맞춤 질문을 생성하는 데 실패했습니다.'}
            </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    다시 시도하기 →
                  </button>
                </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;

  const handleAnswer = (value: string | string[]) => {
    setCurrentAnswer(value);
  };

  const handleNext = () => {
    // 🚫 이미 제출된 상태에서는 실행하지 않음
    if (isSubmitted) {
      console.log('🚫 [차단] 이미 제출됨 - handleNext 무시');
      return;
    }
    
    console.log('🔄 [DynamicQuestionnaire] handleNext 호출됨');
    console.log('현재 단계:', currentStep, '/ 총 단계:', questions.length);
    console.log('마지막 단계인가?', isLastStep);
    console.log('현재 답변:', currentAnswer);
    
    const newAnswers = {
      ...answers,
      [currentQuestion.key]: currentAnswer,
    };
    
    console.log('최종 답변 객체:', newAnswers);

    if (isLastStep) {
      console.log('✅ [DynamicQuestionnaire] 마지막 단계 - onSubmit 호출');
      
      setIsSubmitted(true);
      onSubmit(newAnswers);
    } else {
      console.log('➡️ [DynamicQuestionnaire] 다음 단계로 이동');
      setAnswers(newAnswers);
      setCurrentAnswer('');
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentAnswer('');
    setCurrentStep(prev => prev - 1);
  };

  const isAnswerValid = () => {
    if (currentQuestion.importance === 'high') {
      if (currentQuestion.type === 'multiple') {
        return Array.isArray(currentAnswer) && currentAnswer.length > 0;
      }
      return !!currentAnswer;
    }
    return true;
  };

  // 카테고리별 아이콘 및 색상
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'environment':
        return {
          icon: '🏢',
          color: 'from-green-500 to-emerald-600',
          bg: 'from-green-50 to-emerald-50',
          text: 'text-green-700'
        };
      case 'data':
        return {
          icon: '📊',
          color: 'from-blue-500 to-indigo-600',
          bg: 'from-blue-50 to-indigo-50',
          text: 'text-blue-700'
        };
      case 'goal':
        return {
          icon: '🎯',
          color: 'from-purple-500 to-pink-600',
          bg: 'from-purple-50 to-pink-50',
          text: 'text-purple-700'
        };
      default:
        return {
          icon: '❓',
          color: 'from-gray-500 to-gray-600',
          bg: 'from-gray-50 to-gray-50',
          text: 'text-gray-700'
        };
    }
  };

  // 🚫 제출된 상태에서는 LoadingScreen 렌더링
  if (isSubmitted) {
    console.log('🚫 [조건부 렌더링] 이미 제출됨 - LoadingScreen으로 리다이렉트');
    return <LoadingScreen />;
  }

  const categoryStyle = getCategoryStyle(currentQuestion.category);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-2xl w-full bg-white rounded-2xl p-8 shadow-lg">
        {/* 진행 표시 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">
              {currentStep + 1} / {questions.length}
            </span>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text}`}>
              {categoryStyle.icon} {currentQuestion.category === 'environment' ? '환경/제약' : 
                                   currentQuestion.category === 'data' ? '데이터/상황' : '목표/성공기준'}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full bg-gradient-to-r ${categoryStyle.color} transition-all duration-300`}
              style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 질문 */}
        <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-8">
              <div className="flex items-start mb-4">
                <div className="text-3xl mr-3 mt-1">{categoryStyle.icon}</div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {currentQuestion.question}
                  </h2>
              <p className="text-gray-600 text-base leading-relaxed">
                {currentQuestion.description}
              </p>
                  {currentQuestion.importance === 'high' && (
                    <div className="flex items-center mt-2">
                      <FiAlertCircle className="w-4 h-4 text-red-500 mr-1" />
                      <span className="text-sm text-red-600 font-medium">필수 질문</span>
                    </div>
            )}
          </div>
              </div>
            </div>

            {/* 답변 옵션 */}
            <div className="mb-8">
              {currentQuestion.type === 'single' ? (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAnswer(option)}
                        className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 ${
                          (currentAnswer === option || 
                           (option === '기타 (직접입력)' && typeof currentAnswer === 'string' && currentAnswer.startsWith('기타:')) ||
                           (currentQuestion.inputTriggers?.[option] && typeof currentAnswer === 'string' && currentAnswer.startsWith(`${option}:`)))
                            ? `border-blue-500 bg-blue-50 text-blue-700`
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option}</span>
                          {(currentAnswer === option || 
                            (option === '기타 (직접입력)' && typeof currentAnswer === 'string' && currentAnswer.startsWith('기타:')) ||
                            (currentQuestion.inputTriggers?.[option] && typeof currentAnswer === 'string' && currentAnswer.startsWith(`${option}:`))) && (
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </motion.button>

                      {/* 바로 이 옵션 아래에 직접입력 칸 표시 */}
                      {((option === '기타 (직접입력)' && (
                        currentAnswer === '기타 (직접입력)' || 
                        (typeof currentAnswer === 'string' && currentAnswer.startsWith('기타:'))
                      )) || 
                      (currentQuestion.inputTriggers?.[option]?.requiresInput && currentAnswer === option)) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3"
                        >
                          <input
                            type="text"
                            placeholder={
                              currentQuestion.inputTriggers?.[option]?.inputPlaceholder || 
                              (option === '기타 (직접입력)' ? "직접 입력해주세요..." : "입력해주세요...")
                            }
                            defaultValue={
                              option === '기타 (직접입력)' && typeof currentAnswer === 'string' && currentAnswer.startsWith('기타:') 
                                ? currentAnswer.replace('기타:', '') 
                                : (currentQuestion.inputTriggers?.[option] && typeof currentAnswer === 'string' && currentAnswer.includes(':'))
                                  ? currentAnswer.split(':')[1] || ''
                                  : ''
                            }
                            className="w-full p-3 border-2 border-blue-300 rounded-xl focus:border-blue-500 focus:outline-none"
                            onChange={(e) => {
                              const customValue = e.target.value.trim();
                              if (option === '기타 (직접입력)') {
                                if (customValue) {
                                  handleAnswer(`기타:${customValue}`);
                                } else {
                                  handleAnswer('기타 (직접입력)');
                                }
                              } else if (currentQuestion.inputTriggers?.[option]) {
                                if (customValue) {
                                  handleAnswer(`${option}:${customValue}`);
                                } else {
                                  handleAnswer(option);
                                }
                              }
                            }}
                          />
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const currentArray = Array.isArray(currentAnswer) ? currentAnswer : [];
                          const newArray = currentArray.includes(option)
                            ? currentArray.filter(item => item !== option)
                            : [...currentArray, option];
                          handleAnswer(newArray);
                        }}
                        className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 ${
                          Array.isArray(currentAnswer) && currentAnswer.includes(option)
                            ? `border-blue-500 bg-blue-50 text-blue-700`
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option}</span>
                          {Array.isArray(currentAnswer) && currentAnswer.includes(option) && (
                            <div className="w-5 h-5 bg-blue-500 rounded-sm flex items-center justify-center">
                              <div className="text-white text-xs">✓</div>
                            </div>
                          )}
                        </div>
                      </motion.button>
                      
                      {/* 기타 직접입력 처리 - 해당 옵션 바로 아래에 표시 */}
                      {option === '기타 (직접입력)' && 
                       Array.isArray(currentAnswer) && 
                       currentAnswer.includes('기타 (직접입력)') && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3"
                        >
                          <input
                            type="text"
                            placeholder="직접 입력해주세요..."
                            className="w-full p-3 border-2 border-blue-300 rounded-xl focus:border-blue-500 focus:outline-none"
                            onChange={(e) => {
                              const customValue = e.target.value;
                              if (customValue.trim()) {
                                const currentArray = Array.isArray(currentAnswer) ? currentAnswer : [];
                                const filteredArray = currentArray.filter(item => 
                                  item !== '기타 (직접입력)' && !item.startsWith('기타:')
                                );
                                const newArray = [...filteredArray, '기타 (직접입력)', `기타:${customValue}`];
                                handleAnswer(newArray);
                              }
                            }}
                          />
                        </motion.div>
                      )}
                    </div>
                  ))}
            </div>
          )}
            </div>

            {/* 네비게이션 */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ← 이전
            </button>

              <div className="text-sm text-gray-500">
                {currentQuestion.type === 'multiple' && '복수 선택 가능'}
              </div>

            <button
              onClick={handleNext}
              disabled={!isAnswerValid()}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center ${
                isAnswerValid()
                    ? `bg-gradient-to-r ${categoryStyle.color} text-white hover:shadow-lg`
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
                {isLastStep ? '완료' : '다음'}
                <FiChevronRight className="w-5 h-5 ml-1" />
            </button>
          </div>
        </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
