import React from 'react';

interface FlowNodeCardProps {
  title: string;
  icon?: React.ReactNode;
  role?: string;
  desc?: string;
  onClick?: () => void;
  isActive?: boolean;
  children?: React.ReactNode; // 상세 정보(가이드/코드/팁 등)
  main?: boolean; // 주요 단계(상단) 강조 여부
}

const FlowNodeCard = ({
  title,
  icon,
  role,
  desc,
  onClick,
  isActive,
  children,
  main,
}: FlowNodeCardProps) => {
  return (
    <div
      className={`
        ${main ? 'bg-gradient-to-br from-indigo-50 to-white border-indigo-300 shadow-2xl scale-105' : 'bg-white border-gray-200 shadow-lg'}
        rounded-3xl border-4 transition-all cursor-pointer px-8 py-8 w-72 min-h-[240px] flex flex-col items-center justify-between
        hover:shadow-2xl hover:border-indigo-400
        ${isActive ? 'border-indigo-600 shadow-2xl scale-110 z-20' : ''}
      `}
      onClick={onClick}
      style={{ transition: 'box-shadow 0.2s, border 0.2s, transform 0.2s' }}
    >
      <div className="flex flex-col items-center mb-2">
        <div
          className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 text-4xl ${main ? 'bg-indigo-100 shadow-lg' : 'bg-gray-50'}`}
        >
          {icon}
        </div>
        <h3
          className={`font-extrabold text-2xl text-gray-900 text-center mb-2 ${main ? 'tracking-tight' : ''}`}
        >
          {title}
        </h3>
        {role && <div className="text-sm text-indigo-600 font-semibold mb-1">{role}</div>}
        {desc && <div className="text-sm text-gray-500 text-center leading-snug">{desc}</div>}
      </div>
      <button className="mt-4 text-sm text-indigo-500 hover:underline font-bold">자세히</button>
      {/* 상세 정보(펼침) */}
      {isActive && children && (
        <div className="mt-6 w-full bg-indigo-50 rounded-2xl p-4 text-base text-gray-700 shadow-inner animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};

export default FlowNodeCard;
