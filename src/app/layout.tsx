import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AutomationSurveyProvider } from './context/AutomationSurveyContext';

// 모니터링 시스템 초기화 (서버 사이드에서만)
if (typeof window === 'undefined') {
  import('@/lib/monitoring/init').then(({ startMonitoring }) => {
    startMonitoring();
  }).catch(error => {
    console.error('❌ 모니터링 시스템 초기화 실패:', error);
  });
}

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '⚡ 원클릭 자동화 생성기',
  description: '💫 나만의 자동화 만들기',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AutomationSurveyProvider>{children}</AutomationSurveyProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
