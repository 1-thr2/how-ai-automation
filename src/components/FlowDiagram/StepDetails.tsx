import React from 'react';
import { FlowStep, GuideCard } from '@/lib/types/automation';
import styles from './StepDetails.module.css';

interface StepDetailsProps {
  step?: FlowStep;
  guide?: GuideCard;
  onClose: () => void;
}

export default function StepDetails({ step, guide, onClose }: StepDetailsProps) {
  if (!step || !guide) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{guide.title}</h3>
            <p className="text-gray-600">{guide.subtitle}</p>
          </div>
              <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
              </button>
          </div>

          <div className="space-y-6">
          {guide.content.steps.map((guideStep) => (
            <div key={guideStep.number} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-start">
                <div className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {guideStep.number}
                      </div>
                      <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {guideStep.title}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {guideStep.description}
                  </p>
                </div>
              </div>
                  </div>
                ))}

          {guide.content.code && (
            <div className="bg-gray-900 rounded-xl p-4">
              <pre className="text-gray-100 text-sm overflow-x-auto">
                <code>{guide.content.code}</code>
              </pre>
              </div>
            )}

          {guide.content.tips && guide.content.tips.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-semibold text-blue-900 mb-2">💡 팁</h4>
              <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
                {guide.content.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
              </div>
            )}
              </div>
            </div>
          </div>
  );
}
