import React, { useState } from 'react';
import StepCard from './StepCard';

interface FlowTabsProps {
  flows: any[];
}

const FlowTabs = ({ flows }: FlowTabsProps) => {
  const [activeTab, setActiveTab] = useState(0);
  if (!flows || flows.length === 0) return null;

  return (
    <section className="mb-12 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">상세 가이드</h2>
        <p className="text-gray-600 text-sm">각 단계별 구현 방법을 확인하세요</p>
      </div>

      <div className="p-6">
        <div className="flex space-x-2 mb-6">
          {flows.map((flow, idx) => (
            <button
              key={idx}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                activeTab === idx
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTab(idx)}
            >
              {flow.title || flow.type || `옵션 ${idx + 1}`}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {flows[activeTab].steps.map((step: any, idx: number) => (
            <StepCard key={idx} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlowTabs;
