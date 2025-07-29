import React from 'react';
import { Copy, Check } from 'lucide-react';

interface StepCardProps {
  step: any;
}

const StepCard = ({ step }: StepCardProps) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    if (step.code) {
      navigator.clipboard.writeText(step.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 flex items-center">
          {step.step}
          {step.icon && <span className="ml-2 text-base text-gray-400">[{step.icon}]</span>}
          {step.role && <span className="ml-2 text-xs text-gray-500">{step.role}</span>}
        </h3>
      </div>

      <div className="p-6">
        {step.guide && <p className="text-gray-700 mb-4 whitespace-pre-line">{step.guide}</p>}

        {step.code && (
          <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
              <span className="text-gray-300 text-sm">Code</span>
              <button
                className="text-gray-300 hover:text-white flex items-center gap-1"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>복사</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-gray-300 text-sm overflow-x-auto">{step.code}</pre>
          </div>
        )}

        {step.tips && step.tips.length > 0 && (
          <div className="mb-4">
            <h4 className="font-bold text-blue-600 mb-2">실전 팁</h4>
            <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
              {step.tips.map((tip: string, idx: number) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {step.planB && (
          <div className="mb-4">
            <h4 className="font-bold text-indigo-600 mb-2">PlanB</h4>
            <p className="text-gray-700 text-sm">{step.planB}</p>
          </div>
        )}

        {step.faq && step.faq.length > 0 && (
          <div className="mb-4">
            <h4 className="font-bold text-purple-600 mb-2">FAQ</h4>
            <ul className="list-disc pl-5 text-gray-700 text-sm space-y-2">
              {step.faq.map((item: any, idx: number) => (
                <li key={idx}>
                  <b>{item.q}</b>: {item.a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {step.failureCases && step.failureCases.length > 0 && (
          <div className="mb-4">
            <h4 className="font-bold text-gray-600 mb-2">실패사례</h4>
            <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
              {step.failureCases.map((fail: string, idx: number) => (
                <li key={idx}>{fail}</li>
              ))}
            </ul>
          </div>
        )}

        {step.expansion && (
          <div>
            <h4 className="font-bold text-green-600 mb-2">확장/활용</h4>
            <p className="text-gray-700 text-sm">{step.expansion}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepCard;
