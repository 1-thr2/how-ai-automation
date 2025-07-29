import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AutomationSurveyProvider } from './context/AutomationSurveyContext';

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
