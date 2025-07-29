import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AutomationSurveyProvider } from './context/AutomationSurveyContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'how-ai wow 자동화',
  description: '따라만 하면 완성되는 wow 자동화',
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
