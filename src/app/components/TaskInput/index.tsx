'use client';
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { FiSend, FiLoader, FiAlertCircle, FiInfo, FiCopy, FiCheck } from 'react-icons/fi';
import type { AutomationAPIResponse, AutomationContext, AutomationCard } from '@/app/types/automation/index';

interface Props {
  onSubmit: (task: string) => void;
  isLoading: boolean;
  placeholder: string;
  buttonText?: string;
  buttonClassName?: string;
  inputClassName?: string;
  error?: string;
  fallbackExample?: string;
  followupQuestions?: string[];
}

export interface TaskInputRef {
  setTask: (value: string) => void;
}

const practicalExamples = [
  "메시징 앱에서 질문을 자동으로 수집하고 구글 시트에 저장하고 싶어요",
  "이메일로 받은 주문 정보를 자동으로 ERP 시스템에 입력하고 싶어요",
  "소셜미디어에서 브랜드 언급을 모니터링하고 리포트를 자동 생성하고 싶어요",
  "웹사이트 문의 폼 데이터를 CRM에 자동 연동하고 싶어요",
  "엑셀 파일의 데이터를 자동으로 분석하고 차트를 생성하고 싶어요"
];

const TaskInput = forwardRef<TaskInputRef, Props>(
  (
    {
      onSubmit,
      isLoading,
      placeholder,
      buttonText = '',
      buttonClassName = '',
      inputClassName = '',
      error,
      fallbackExample,
      followupQuestions,
    },
    ref
  ) => {
    const [task, setTask] = useState('');
    const [copiedExample, setCopiedExample] = useState(false);
    const [randomExample, setRandomExample] = useState(practicalExamples[0]);

    useImperativeHandle(ref, () => ({
      setTask,
    }));

    useEffect(() => {
      setRandomExample(practicalExamples[Math.floor(Math.random() * practicalExamples.length)]);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!task.trim() || isLoading) return;
      onSubmit(task.trim());
    };

    const handleExampleClick = (example: string) => {
      setTask(example);
    };

    const handleCopyExample = async (example: string) => {
      try {
        await navigator.clipboard.writeText(example);
        setCopiedExample(true);
        setTimeout(() => setCopiedExample(false), 2000);
      } catch (err) {
        // 복사 실패 시 수동 복사
        const textArea = document.createElement('textarea');
        textArea.value = example;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedExample(true);
        setTimeout(() => setCopiedExample(false), 2000);
      }
    };

    return (
      <div className="space-y-6">
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <FiAlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">입력 오류</h3>
                <p className="text-red-700 text-base leading-relaxed">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fallback 예시 */}
        {fallbackExample && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-100 border border-blue-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <FiInfo className="w-6 h-6 text-blue-500" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">💡 더 구체적인 예시</h3>
                <div className="bg-white border border-blue-100 rounded-xl p-4 mb-4 shadow-sm">
                  <p className="text-blue-700 font-medium text-base leading-relaxed">{fallbackExample}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleExampleClick(fallbackExample)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    이 예시로 시도하기 →
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyExample(fallbackExample)}
                    className="flex items-center gap-2 bg-white border border-blue-300 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                  >
                    {copiedExample ? <FiCheck className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                    {copiedExample ? '복사됨!' : '복사'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 추가 질문 */}
        {followupQuestions && followupQuestions.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <FiInfo className="w-6 h-6 text-green-500" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-green-800 mb-3">🤔 추가로 물어볼 질문들</h3>
                <div className="space-y-3">
                  {followupQuestions.map((question, index) => (
                    <div key={index} className="flex items-start bg-white border border-green-100 rounded-xl p-4 shadow-sm">
                      <span className="text-green-600 mr-3 mt-1 text-lg">•</span>
                      <span className="text-green-700 text-base leading-relaxed">{question}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 메인 입력창 */}
        <div className="relative">
          <textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder={task ? placeholder : randomExample}
            className={`w-full p-6 pr-16 bg-white rounded-2xl border-2 border-gray-200 focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/20 transition-all duration-200 resize-none min-h-[80px] text-gray-700 placeholder-gray-400 text-lg leading-relaxed shadow-sm hover:shadow-md focus:shadow-lg ${inputClassName}`}
            disabled={isLoading}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!task.trim() || isLoading}
            className={
              buttonText
                ? `absolute right-0 left-0 bottom-[-80px] mx-auto ${buttonClassName}`
                : `absolute right-4 bottom-4 p-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${
                    task.trim() && !isLoading
                      ? 'bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transform hover:scale-105'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`
            }
            style={buttonText ? { position: 'static', marginTop: '16px' } : {}}
          >
            {isLoading ? (
              <FiLoader className="w-6 h-6 animate-spin" />
            ) : buttonText ? (
              buttonText
            ) : (
              <FiSend className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* 입력 팁 */}
        {!task && !error && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-[#ede9fe] border border-[#8b5cf6]/20 rounded-xl px-4 py-3">
              <span className="text-[#8b5cf6] text-lg">💡</span>
              <span className="text-[#8b5cf6] font-medium text-sm">
                구체적으로 입력할수록 더 정확한 자동화를 설계할 수 있어요
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default TaskInput;
