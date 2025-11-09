'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronRight, FiAlertCircle } from 'react-icons/fi';
import axios from 'axios';
import { DynamicAnswers } from './types';
import LoadingScreen from './LoadingScreen';

// 🔥 HMR 방지: 개발 모드에서 파일 변경 감지 무시
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // HMR 이벤트 리스너 무력화
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type: string, listener: any, options?: any) {
    if (type === 'beforeunload' || type === 'unload') {
      console.log('🚫 [HMR 차단] HMR 이벤트 무시:', type);
      return;
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
}

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

const DynamicQuestionnaire = React.memo(function DynamicQuestionnaire({ userInput, onSubmit }: Props) {
  const [questions, setQuestions] = useState<DynamicQuestion[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<DynamicAnswers>({});
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>('');
  // 🔄 localStorage에 입력값 저장하여 HMR에도 유지
  const [inputValues, setInputValues] = useState<{[key: string]: string}>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('dynamicQuestionnaire_inputValues');
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        console.warn('localStorage 읽기 실패:', e);
        return {};
      }
    }
    return {};
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false); // 🔥 자폭 스위치 추가
  const hasGeneratedRef = useRef(false);
  const lastUserInputRef = useRef<string>('');
  const isInitializedRef = useRef(false);
  const isHandlingNextRef = useRef(false); // 🔥 handleNext 중복 실행 방지
  
  // 🔥 가장 간단한 실행 제어
  // 현재 단계 변경 시 기존 답변을 inputValues에 복원
  useEffect(() => {
    if (questions.length > 0 && currentStep < questions.length) {
      const currentQuestion = questions[currentStep];
      const existingAnswer = answers[currentQuestion.key];
      
      if (typeof existingAnswer === 'string') {
        // 기존 답변에서 input 값 추출하여 복원
        currentQuestion.options?.forEach(option => {
          const inputKey = `${currentStep}-${option}`;
          
          if (option === '기타 (직접입력)' && existingAnswer.startsWith('기타:')) {
            const inputValue = existingAnswer.replace('기타:', '');
            setInputValues(prev => ({ ...prev, [inputKey]: inputValue }));
          } else if (existingAnswer.startsWith(`${option}:`) && currentQuestion.inputTriggers?.[option]) {
            const inputValue = existingAnswer.split(':')[1] || '';
            setInputValues(prev => ({ ...prev, [inputKey]: inputValue }));
          }
        });
      }
    }
  }, [currentStep, questions, answers]);

  // 🔍 isSubmitted 상태 변화 모니터링 (디버깅용)
  useEffect(() => {
    console.log('🔍 [isSubmitted 변화] isSubmitted:', isSubmitted);
    if (isSubmitted) {
      console.trace('🚨 [isSubmitted] true로 변경된 스택 추적');
    }
  }, [isSubmitted]);

  // 🚨 HMR 감지 및 상태 보존
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔥 [개발 모드] HMR로 인한 입력 중단 가능성 있음');
      
      // HMR 이벤트 감지
      if ((module as any).hot) {
        console.log('🔥 [HMR] Hot Module Replacement 활성화됨');
        (module as any).hot.accept();
        
        // HMR 업데이트 시 상태 보존
        (module as any).hot.dispose(() => {
          console.log('🔥 [HMR] 컴포넌트 재로드 - 상태 보존 시도');
        });
      }
    }
  }, []);

  // 🧹 컴포넌트 언마운트 시 localStorage 클리어
  useEffect(() => {
    return () => {
      try {
        localStorage.removeItem('dynamicQuestionnaire_inputValues');
        console.log('🧹 [DynamicQuestionnaire] 컴포넌트 언마운트 시 localStorage 클리어됨');
      } catch (e) {
        console.warn('localStorage 클리어 실패:', e);
      }
    };
  }, []);

  useEffect(() => {
    if (!userInput || hasGeneratedRef.current) return;
    
    hasGeneratedRef.current = true;
    
    // 🧹 새로운 세션 시작 시 이전 localStorage 클리어
    try {
      localStorage.removeItem('dynamicQuestionnaire_inputValues');
      console.log('🧹 [DynamicQuestionnaire] 이전 localStorage 클리어됨');
    } catch (e) {
      console.warn('localStorage 클리어 실패:', e);
    }
    
    const generateQuestions = async () => {
      try {
        setLoading(true);

        // 🔍 먼저 sessionStorage에서 후속질문 확인
        if (typeof window !== 'undefined') {
          const cachedQuestions = sessionStorage.getItem('followupQuestions');
          if (cachedQuestions) {
            try {
              const data = JSON.parse(cachedQuestions);
              console.log('✅ [DynamicQuestionnaire] sessionStorage에서 후속질문 로드:', data);

              if (data.questions && Array.isArray(data.questions)) {
                console.log('🎯 [질문 설정] 캐시된 질문 개수:', data.questions.length);
                setQuestions(data.questions);
                setError(null);
                setLoading(false);

                // 사용한 후 삭제
                sessionStorage.removeItem('followupQuestions');
                return;
              }
            } catch (e) {
              console.warn('⚠️ [DynamicQuestionnaire] sessionStorage 파싱 실패:', e);
            }
          }
        }

        // sessionStorage에 없으면 API 호출
        console.log('🔄 후속질문 API 호출 시작:', userInput);

        const response = await axios.post('/api/agent-followup', {
          userInput: userInput
        });

        console.log('✅ [DynamicQuestionnaire] 전체 API 응답:', response.data);
        console.log('✅ [DynamicQuestionnaire] questions 필드:', response.data.questions);
        console.log('✅ [DynamicQuestionnaire] questions 타입:', typeof response.data.questions);
        console.log('✅ [DynamicQuestionnaire] questions 배열인가?:', Array.isArray(response.data.questions));

        if (response.data.questions && Array.isArray(response.data.questions)) {
          console.log('🎯 [질문 설정] 받은 질문 개수:', response.data.questions.length);
          setQuestions(response.data.questions);
          setError(null);
        } else {
          throw new Error('질문 데이터가 올바르지 않습니다.');
        }
      } catch (err: any) {
        console.error('❌ 동적 후속질문 생성 실패:', err);
        setError(err instanceof Error ? err.message : '질문 생성에 실패했습니다.');

        // 🔧 기본 질문 제공 (최소 2개로 증가하여 즉시 제출 방지)
        console.log('🛠️ [폴백] 기본 질문 2개 설정');
        setQuestions([
          {
            key: "current_situation",
            question: "현재 상황을 알려주세요 (여러 개 선택 가능)",
            type: "multiple",
            options: ["처음 시작", "부분적으로 하고 있음", "완전히 수동", "개선 필요", "잘모름 (AI가 추천)"],
            category: "data",
            importance: "high",
            description: "현재 상황을 파악합니다."
          },
          {
            key: "urgency_level",
            question: "언제까지 필요하신가요?",
            type: "multiple",
            options: ["오늘 당장", "이번 주 내", "한 달 내", "시간 여유 있음"],
            category: "goal",
            importance: "medium",
            description: "시급성을 파악합니다."
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    generateQuestions();
  }, [userInput]); // userInput이 변경될 때만 실행

  // 🔥 로딩 상태 처리

  // 🚫 isSubmitted가 true이면 즉시 로딩 화면으로 전환
  if (isSubmitted) {
    console.log('🔄 [DynamicQuestionnaire] isSubmitted=true, 로딩 화면 표시');
    return <LoadingScreen />;
  }

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
  
  // 🔍 디버깅: Step Info는 handleNext에서만 로그

  const handleAnswer = (value: string | string[]) => {
    console.log('🎯 [handleAnswer] 호출됨 - value:', value, 'isSubmitted:', isSubmitted);
    if (isSubmitted) {
      console.log('🚫 [handleAnswer] 이미 제출됨 - 무시');
      return;
    }
    setCurrentAnswer(value);
  };

  const handleNext = () => {
    console.log('🚨 [handleNext] 호출됨! 스택 추적:');
    console.trace(); // 🔍 누가 이 함수를 호출했는지 스택 추적
    
    // 🚫 이미 제출된 상태에서는 실행하지 않음
    if (isSubmitted) {
      console.log('🚫 [차단] 이미 제출됨 - handleNext 무시');
      return;
    }
    
    // 🚫 이미 처리 중이면 중복 실행 방지
    if (isHandlingNextRef.current) {
      console.log('🚫 [차단] 이미 처리 중 - handleNext 무시');
      return;
    }
    
    isHandlingNextRef.current = true;
    
    console.log('🔄 [DynamicQuestionnaire] handleNext 진행');
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
      console.log('🔍 [제출 직전] currentStep:', currentStep, 'questions.length:', questions.length);
      console.log('🔍 [제출 직전] isLastStep:', isLastStep);
      console.log('🔍 [제출 직전] newAnswers:', newAnswers);
      
      setIsSubmitted(true);
      console.log('📞 [onSubmit 호출] 답변 전달 중...');
      onSubmit(newAnswers);
      // 마지막 단계에서는 ref를 리셋하지 않음 (제출 완료)
    } else {
      console.log('➡️ [DynamicQuestionnaire] 다음 단계로 이동');
      setAnswers(newAnswers);
      setCurrentAnswer('');
      // inputValues는 유지 (사용자가 이전에 입력한 값 보존)
      setCurrentStep(prev => prev + 1);
      
      // 🔄 다음 단계로 이동 완료 후 ref 리셋
      setTimeout(() => {
        isHandlingNextRef.current = false;
      }, 100);
    }
  };

  const handleBack = () => {
    setCurrentAnswer('');
    // inputValues는 유지 (이전/다음 이동 시 입력값 보존)
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
                      (currentQuestion.inputTriggers?.[option]?.requiresInput && (
                        currentAnswer === option || 
                        (typeof currentAnswer === 'string' && currentAnswer.startsWith(`${option}:`))
                      ))) && (
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
                            value={(() => {
                              const inputKey = `${currentStep}-${option}`;
                              return inputValues[inputKey] || '';
                            })()}
                            className="w-full p-3 border-2 border-blue-300 rounded-xl focus:border-blue-500 focus:outline-none"
                            onChange={(e) => {
                              const customValue = e.target.value; // trim 제거로 실시간 입력 반영
                              const inputKey = `${currentStep}-${option}`;
                              
                              console.log('📝 [Input onChange] 입력 중:', customValue, 'isSubmitted:', isSubmitted);
                              
                              // 🚫 제출된 상태에서는 입력 처리하지 않음
                              if (isSubmitted) {
                                console.log('🚫 [Input] 이미 제출됨 - 입력 무시');
                                return;
                              }
                              
                              // 1. 입력값 state 업데이트 (즉시 UI 반영)
                              const newInputValues = {
                                ...inputValues,
                                [inputKey]: customValue
                              };
                              setInputValues(newInputValues);
                              
                              // localStorage에도 즉시 저장 (HMR 보호)
                              try {
                                localStorage.setItem('dynamicQuestionnaire_inputValues', JSON.stringify(newInputValues));
                              } catch (e) {
                                console.warn('localStorage 저장 실패:', e);
                              }
                              
                              // 2. 답변 state 업데이트 (디바운스 없이 즉시)
                              if (option === '기타 (직접입력)') {
                                if (customValue.trim()) {
                                  handleAnswer(`기타:${customValue.trim()}`);
                                } else {
                                  handleAnswer('기타 (직접입력)');
                                }
                              } else if (currentQuestion.inputTriggers?.[option]) {
                                if (customValue.trim()) {
                                  handleAnswer(`${option}:${customValue.trim()}`);
                                } else {
                                  handleAnswer(option);
                                }
                              }
                            }}
                            onFocus={() => {
                              // 포커스 시 추가 로직 (필요시)
                              console.log('🎯 Input focused:', option);
                            }}
                            onKeyDown={(e) => {
                              console.log('⌨️ [키 이벤트]', e.key, 'isSubmitted:', isSubmitted);
                              if (e.key === 'Enter') {
                                console.log('🚨 [Enter 키] 감지! 기본 동작 방지');
                                e.preventDefault(); // Enter 키 기본 동작 방지
                                e.stopPropagation(); // 이벤트 버블링 방지
                                return false; // 추가 보안
                              }
                            }}
                            onBlur={() => {
                              console.log('👋 [Blur] 입력 필드에서 포커스 벗어남');
                            }}
                            onInput={(e) => {
                              console.log('📝 [onInput] 원시 입력 이벤트:', (e.target as HTMLInputElement).value);
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
              onClick={(e) => {
                console.log('🖱️ [버튼 클릭] 다음 버튼 클릭됨');
                e.preventDefault();
                e.stopPropagation();
                handleNext();
              }}
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
});

export default DynamicQuestionnaire;
