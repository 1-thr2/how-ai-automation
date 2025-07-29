import React from 'react';

interface ImpactBarCardProps {
  card: {
    title: string;
    desc?: string;
  };
}

export default function ImpactBarCard({ card }: ImpactBarCardProps) {
  return (
    <div className="bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] text-white rounded-2xl p-6 shadow-lg flex flex-col items-center">
      <div className="text-2xl font-bold mb-2">{card.title}</div>
      {card.desc && <div className="text-lg opacity-90">{card.desc}</div>}
    </div>
  );
} 