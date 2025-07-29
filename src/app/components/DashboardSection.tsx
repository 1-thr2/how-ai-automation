import React from 'react';
import { DashboardCard } from '@/lib/types/automation';

interface DashboardSectionProps {
  card: DashboardCard;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ card }) => {
  if (!card) return null;

  const { stats, distribution } = card;

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
        <div className="p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-500">총계</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-500">완료</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">대기중</div>
        </div>
      </div>

      <div>
        <h4 className="text-md font-semibold text-gray-700 mb-3">데이터 분포</h4>
        <div className="space-y-3">
          {distribution.map((item, index) => (
            <div key={index}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-600">{item.category}</span>
                <span className="text-sm font-medium text-gray-600">{item.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="h-2.5 rounded-full" 
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color || '#6C5CE7' }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSection;
