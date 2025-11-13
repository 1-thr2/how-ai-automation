'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminFeedbackContent from './AdminFeedbackContent';

export default function AdminFeedbackPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // 세션 확인
    const isAuth = sessionStorage.getItem('admin_authenticated');
    if (isAuth === 'true') {
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // 비밀번호 확인 (환경변수 또는 기본값)
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

    if (password === correctPassword) {
      sessionStorage.setItem('admin_authenticated', 'true');
      setAuthenticated(true);
      setError('');
    } else {
      setError('비밀번호가 틀렸습니다');
      setPassword('');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              관리자 로그인
            </h1>
            <p className="text-gray-600 text-sm">
              관리자만 접근 가능합니다
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg py-3 font-bold transition-all shadow-lg hover:shadow-xl"
            >
              로그인
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            개발 환경 기본 비밀번호: admin123
          </p>
        </div>
      </div>
    );
  }

  return <AdminFeedbackContent />;
}
