import React from 'react';

interface ActionHeroProps {
  title: string;
  subtitle?: string;
  onMainClick?: () => void;
  onSecondaryClick?: () => void;
  mainLabel?: string;
  secondaryLabel?: string;
}

export default function ActionHero({
  title,
  subtitle,
  onMainClick,
  onSecondaryClick,
  mainLabel = 'GPT와 함께 설계하기',
  secondaryLabel = '새 레시피 만들기',
}: ActionHeroProps) {
  return (
    <div className="bg-white rounded-3xl p-10 md:p-16 text-center shadow-[0_8px_32px_rgba(108,92,231,0.08)] mb-8 relative overflow-hidden">
      <div className="text-2xl md:text-3xl font-extrabold mb-2 flex items-center justify-center gap-2">
        <span role="img" aria-label="rocket">🚀</span> {title}
      </div>
      {subtitle && <div className="text-base md:text-lg text-gray-500 mb-8">{subtitle}</div>}
      <button
        className="main-cta bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] text-white font-bold py-4 px-10 rounded-2xl text-lg shadow-lg transition hover:scale-105 mb-4"
        onClick={onMainClick}
      >
        {mainLabel}
      </button>
      <div className="secondary-actions flex justify-center gap-4 mt-2">
        <button
          className="secondary-btn bg-white border border-[#A29BFE] text-[#6C5CE7] font-bold py-3 px-6 rounded-xl shadow hover:bg-[#F0F7FF] transition"
          onClick={onSecondaryClick}
        >
          <span className="mr-2">➕</span>{secondaryLabel}
        </button>
      </div>
    </div>
  );
}
