'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackSectionProps {
  automationId?: number;
}

export default function FeedbackSection({ automationId }: FeedbackSectionProps) {
  const [feedback, setFeedback] = useState<'success' | 'failed' | null>(null);
  const [failedSteps, setFailedSteps] = useState<number[]>([]);
  const [detail, setDetail] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleStepToggle = (step: number) => {
    if (failedSteps.includes(step)) {
      setFailedSteps(failedSteps.filter((s) => s !== step));
    } else {
      setFailedSteps([...failedSteps, step]);
    }
  };

  const handleSubmit = async () => {
    if (feedback === 'failed' && !email) {
      alert('24시간 내 답변을 받으려면 이메일을 입력해주세요');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automationId,
          success: feedback === 'success',
          failedSteps,
          detail,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '피드백 전송에 실패했습니다');
      }

      setSubmitted(true);
    } catch (error: any) {
      alert(`오류: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center"
      >
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold text-green-900 mb-2">
          {feedback === 'success' ? '감사합니다!' : '답변드릴게요!'}
        </h3>
        <p className="text-green-700">
          {feedback === 'success'
            ? '소중한 피드백 감사합니다!'
            : '24시간 내 이메일로 답변드리겠습니다!'}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 shadow-lg border border-purple-200">
      {/* Beta 배너 */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 rounded-r-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🚧</span>
          <div>
            <h4 className="font-bold text-yellow-900 mb-1">Beta 버전입니다</h4>
            <p className="text-yellow-800 text-sm">
              이 서비스는 테스트 중이에요. 가이드가 완벽하지 않을 수 있습니다.
              <br />
              실패하셨나요? 꼭 피드백을 남겨주세요! 더 나은 서비스를 만들겠습니다.
            </p>
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-gray-900 mb-2">
        이 가이드가 도움이 되셨나요?
      </h3>
      <p className="text-gray-600 mb-6">
        여러분의 피드백이 더 나은 서비스를 만듭니다
      </p>

      {/* 성공/실패 선택 */}
      {!feedback && (
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setFeedback('success');
              setTimeout(() => handleSubmit(), 100);
            }}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl py-4 font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            ✅ 성공했어요!
          </button>
          <button
            onClick={() => setFeedback('failed')}
            className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl py-4 font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            ❌ 안 됐어요
          </button>
        </div>
      )}

      {/* 실패 케이스 상세 */}
      <AnimatePresence>
        {feedback === 'failed' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* 실패 단계 */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-3">
                어느 단계에서 막히셨나요?
              </h4>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <label
                    key={step}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={failedSteps.includes(step)}
                      onChange={() => handleStepToggle(step)}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-gray-700 font-medium">
                      {step}단계
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 상세 내용 */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-3">
                구체적으로 어떤 부분이 안 됐나요? (선택사항)
              </h4>
              <textarea
                placeholder="예: API 키 발급 화면이 안 나와요"
                className="w-full border border-gray-300 rounded-lg p-4 text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={4}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              />
            </div>

            {/* 이메일 */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-3">
                이메일 (24시간 내 답변드릴게요)
              </h4>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full border border-gray-300 rounded-lg p-4 text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* 제출 버튼 */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !email}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-xl py-4 font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  전송 중...
                </span>
              ) : (
                '📧 도움 요청하기'
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
