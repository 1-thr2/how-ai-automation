import React from 'react';
import type { PreviewData } from '@/types/automation-flow';

interface ShowcaseItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick?: () => void;
}

interface ResultShowcaseProps {
  title: string;
  subtitle?: string;
  items: ShowcaseItem[];
}

export default function ResultShowcase({ title, subtitle, items }: ResultShowcaseProps) {
  return (
    <div className="bg-white rounded-3xl p-10 md:p-14 shadow-[0_8px_32px_rgba(0,0,0,0.08)] mb-8">
      <div className="text-xl md:text-2xl font-extrabold text-center mb-2 flex items-center justify-center gap-2">
        <span role="img" aria-label="celebrate">🎉</span> {title}
      </div>
      {subtitle && <div className="text-base text-gray-500 text-center mb-8">{subtitle}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item, i) => (
          <div
            key={i}
            className="result-card bg-[#F8F9FA] rounded-2xl p-8 text-center transition hover:bg-[#F0F7FF] hover:scale-105 cursor-pointer shadow"
            onClick={item.onClick}
          >
            <div className="result-icon w-12 h-12 rounded-xl flex items-center justify-center text-2xl mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)' }}>
              {item.icon}
            </div>
            <div className="font-bold text-lg text-gray-800 mb-1">{item.title}</div>
            <div className="text-sm text-gray-600">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
