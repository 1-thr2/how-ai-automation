import React from 'react';

interface RealCaseSectionProps {
  realCase: any;
}

const RealCaseSection = ({ realCase }: RealCaseSectionProps) => {
  if (!realCase) return null;
  return (
    <section className="mb-12 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">실전 사례/실패사례/확장</h2>
        <p className="text-gray-600 text-sm">다른 기업들의 성공과 실패 사례를 통해 배우세요</p>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {realCase.successCases && realCase.successCases.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-green-700 mb-4">성공 사례</h3>
              <div className="space-y-4">
                {realCase.successCases.map((item: any, idx: number) => (
                  <div key={idx} className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <h4 className="font-bold text-green-800 mb-2">{item.company}</h4>
                    <p className="text-gray-700 text-sm mb-2">{item.description}</p>
                    <p className="text-xs text-gray-500">{item.outcome}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {realCase.failureCases && realCase.failureCases.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-700 mb-4">실패 사례</h3>
              <div className="space-y-3">
                {realCase.failureCases.map((item: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-2">{item.company}</h4>
                    <p className="text-gray-700 text-sm mb-2">{item.description}</p>
                    <p className="text-xs text-gray-500">{item.outcome}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {realCase.expansion && (
            <div className="px-6 py-4">
              <h3 className="font-bold text-green-700 mb-4">확장/활용</h3>
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <p className="text-gray-700 text-sm">{realCase.expansion}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default RealCaseSection;
