'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Feedback {
  id: number;
  automation_id: number;
  success: boolean;
  failed_steps: number[];
  detail: string;
  email: string;
  status: 'pending' | 'completed';
  admin_reply: string | null;
  created_at: string;
  replied_at: string | null;
  automation_requests: {
    id: number;
    user_input: string;
  };
}

export default function AdminFeedbackContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams?.get('id');

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbacks();
  }, [filter]);

  async function fetchFeedbacks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/feedback?status=${filter}`);
      const data = await res.json();
      setFeedbacks(data);
    } catch (error) {
      console.error('피드백 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }

  const pendingCount = feedbacks.filter((f) => f.status === 'pending').length;
  const completedCount = feedbacks.filter((f) => f.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 피드백 관리</h1>
          <p className="text-gray-600">Beta 서비스 사용자 피드백 관리</p>
        </div>

        {/* 필터 */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilter('pending')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'pending'
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            🚨 답변 필요{' '}
            {filter !== 'pending' && pendingCount > 0 && (
              <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-sm ml-1">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'completed'
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            ✅완료 ({completedCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              filter === 'all'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            전체 ({feedbacks.length})
          </button>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-gray-600 mt-4">로딩 중...</p>
          </div>
        )}

        {/* 피드백 목록 */}
        {!loading && feedbacks.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-600 text-lg">피드백이 없습니다</p>
          </div>
        )}

        {!loading && feedbacks.length > 0 && (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <FeedbackCard
                key={feedback.id}
                feedback={feedback}
                onReplySuccess={fetchFeedbacks}
                highlight={highlightId === String(feedback.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackCard({
  feedback,
  onReplySuccess,
  highlight,
}: {
  feedback: Feedback;
  onReplySuccess: () => void;
  highlight: boolean;
}) {
  const [showReply, setShowReply] = useState(false);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleReply() {
    if (!reply.trim()) {
      alert('답변을 입력해주세요');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackId: feedback.id,
          reply,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '답변 전송 실패');
      }

      alert('답변이 전송되었습니다!');
      setShowReply(false);
      setReply('');
      onReplySuccess();
    } catch (error: any) {
      alert(`오류: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border-2 rounded-2xl p-6 shadow-sm ${
        highlight ? 'border-purple-500 ring-4 ring-purple-200' : 'border-gray-200'
      }`}
    >
      {/* 상단 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`px-4 py-1.5 rounded-full text-sm font-bold ${
              feedback.status === 'pending'
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {feedback.status === 'pending' ? '답변 필요' : '완료'}
          </span>
          <span className="text-sm text-gray-500">
            {new Date(feedback.created_at).toLocaleString('ko-KR')}
          </span>
        </div>
        <span className="text-2xl">{feedback.success ? '✅' : '❌'}</span>
      </div>

      {/* 이메일 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">📧 {feedback.email}</p>
      </div>

      {/* 자동화 요청 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-1">자동화 요청:</p>
        <p className="text-gray-900">
          {feedback.automation_requests?.user_input || '(없음)'}
        </p>
      </div>

      {/* 실패 정보 */}
      {!feedback.success && (
        <div className="bg-red-50 rounded-lg p-4 mb-4">
          {feedback.failed_steps && feedback.failed_steps.length > 0 && (
            <p className="text-sm font-medium text-red-900 mb-2">
              실패 단계: {feedback.failed_steps.join(', ')}
            </p>
          )}
          {feedback.detail && (
            <p className="text-sm text-red-800">{feedback.detail}</p>
          )}
        </div>
      )}

      {/* 자동화 결과 보기 */}
      <button
        onClick={() =>
          window.open(
            `/automation-result/${feedback.automation_id}`,
            '_blank'
          )
        }
        className="text-sm text-purple-600 hover:text-purple-700 hover:underline mb-4"
      >
        → 해당 자동화 결과 보기
      </button>

      {/* 관리자 답변 (완료된 경우) */}
      {feedback.status === 'completed' && feedback.admin_reply && (
        <div className="bg-green-50 border-l-4 border-green-400 rounded-r-lg p-4 mb-4">
          <h4 className="font-bold text-green-900 mb-2">답변 내용:</h4>
          <p className="text-green-800 whitespace-pre-wrap">
            {feedback.admin_reply}
          </p>
          {feedback.replied_at && (
            <p className="text-sm text-green-600 mt-2">
              답변 시각: {new Date(feedback.replied_at).toLocaleString('ko-KR')}
            </p>
          )}
        </div>
      )}

      {/* 답변 작성 */}
      {feedback.status === 'pending' && (
        <>
          {!showReply ? (
            <button
              onClick={() => setShowReply(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl py-3 font-bold transition-all shadow-lg hover:shadow-xl"
            >
              답변 작성
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                placeholder="답변 내용 (이메일로 전송됩니다)"
                className="w-full border border-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={6}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReply}
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-lg py-3 font-bold transition-all"
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
                    '📧 답변 보내기'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowReply(false);
                    setReply('');
                  }}
                  className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
