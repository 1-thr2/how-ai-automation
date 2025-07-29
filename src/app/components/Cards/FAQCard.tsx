import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCardProps {
  faq: FAQItem[];
}

export default function FAQCard({ faq }: FAQCardProps) {
  if (!faq || faq.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          자주 묻는 질문
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {faq.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="flex flex-col items-center mt-8 gap-2">
          <button
            className="w-full max-w-md bg-gradient-to-r from-blue-500 to-purple-500 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center text-lg shadow-lg transition"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('링크가 복사되었습니다!');
            }}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 12v2a4 4 0 004 4h8a4 4 0 004-4v-2M16 6V4a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
              />
            </svg>
            레시피 공유하기
          </button>
          <p className="text-blue-600 text-sm">팀원들과 공유하여 협업하세요</p>
          <button
            className="mt-4 w-full max-w-md bg-white border border-blue-300 text-blue-700 font-bold py-3 rounded-xl shadow hover:bg-blue-50 transition"
            onClick={() => (window.location.href = '/')}
          >
            새로운 레시피 만들기
          </button>
          <p className="text-gray-500 text-sm mt-2">나만의 자동화 플로우를 직접 만들어보세요</p>
        </div>
      </CardContent>
    </Card>
  );
}
