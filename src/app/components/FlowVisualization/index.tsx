'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  Download,
  Code,
  BookOpen,
  AlertCircle,
  Play,
} from 'lucide-react';
import type { IntentAnalysisResult } from '@/lib/agents/intent-analysis';

interface Step {
  key: string;
  title: string;
  description: string;
  iconUrl?: string;
  color?: string;
  role?: string;
  preview?: string;
  code?: string;
  guide?: string;
  checklist?: string[];
  troubleshooting?: Array<{ problem: string; solution: string }>;
  implementationOptions?: string[];
}

interface FlowVisualizationProps {
  steps: Step[];
  intent?: IntentAnalysisResult;
}

const serviceIcons: Record<string, string> = {
  'Google Ads': 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png',
  'Facebook Ads':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/768px-Facebook_Logo_%282019%29.png',
  'Google Sheets':
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Google_Sheets_logo_%282014-2020%29.svg/1498px-Google_Sheets_logo_%282014-2020%29.svg.png',
};

export default function FlowVisualization({ steps, intent }: FlowVisualizationProps) {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <section className="mb-12 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">한눈에 보는 자동화 플로우</h2>
        <span className="text-sm text-purple-500 font-medium">
          클릭하면 상세 정보를 볼 수 있어요
        </span>
      </div>
      <div className="p-6 overflow-x-auto">
        <div className="relative min-w-max">
          {/* 화살표/연결선 SVG */}
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
          >
            {steps.map((step, idx) =>
              idx < steps.length - 1 ? (
                <line
                  key={idx}
                  x1={180 + idx * 220}
                  y1={100}
                  x2={180 + (idx + 1) * 220}
                  y2={100}
                  stroke="#a78bfa"
                  strokeWidth="3"
                  markerEnd="url(#arrowhead)"
                />
              ) : null
            )}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#a78bfa" />
              </marker>
            </defs>
          </svg>
          <div className="flex justify-between items-center relative z-10 gap-8">
            {steps.map((step, idx) => (
              <div key={step.key || idx} className="text-center">
                <div
                  className={`w-28 h-28 mx-auto mb-2 rounded-2xl flex items-center justify-center bg-white shadow-md border-2 ${activeStep === step.key ? 'border-purple-500' : 'border-indigo-200'} cursor-pointer hover:shadow-lg transition-shadow`}
                  onClick={() => setActiveStep(step.key)}
                >
                  {step.iconUrl || serviceIcons[step.title] ? (
                    <img
                      src={step.iconUrl || serviceIcons[step.title] || ''}
                      alt={step.title}
                      className="w-12 h-12"
                    />
                  ) : (
                    <span className="text-3xl">⚡</span>
                  )}
                </div>
                <h3 className="font-bold text-gray-800 text-base mb-1">{step.title}</h3>
                <p className="text-xs text-gray-500 mb-1">{step.role}</p>
                <span className="text-xs text-indigo-500">클릭하여 자세히</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* 단계별 상세 팝업/슬라이드 */}
      {activeStep && steps.find(s => s.key === activeStep) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative animate-fade-in">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setActiveStep(null)}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {(() => {
              const step = steps.find(s => s.key === activeStep)!;
              return (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    {step.iconUrl || serviceIcons[step.title] ? (
                      <img
                        src={step.iconUrl || serviceIcons[step.title] || ''}
                        alt={step.title}
                        className="w-12 h-12"
                      />
                    ) : (
                      <span className="text-3xl">⚡</span>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-1">{step.title}</h2>
                      <p className="text-gray-600 text-sm mb-1">{step.role}</p>
                      <p className="text-gray-500 text-xs">{step.description}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {step.preview && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-indigo-700 text-sm flex items-center gap-2 shadow-sm">
                        <ArrowRight className="w-5 h-5 text-indigo-400" />
                        <span>{step.preview}</span>
                      </div>
                    )}
                    {step.code && (
                      <div className="bg-gray-900 border-2 border-blue-400 rounded-xl overflow-hidden shadow-lg">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                          <span className="text-blue-300 text-xs font-medium flex items-center gap-1">
                            <Code className="w-4 h-4 mr-1" />
                            코드
                          </span>
                          <button
                            className="text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded px-2 py-1 flex items-center text-xs"
                            onClick={() => handleCopy(step.code!, step.key + '-code')}
                          >
                            {copied === step.key + '-code' ? (
                              <>
                                <Check className="w-4 h-4 mr-1 text-green-400" />
                                <span>복사됨</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-1" />
                                <span>복사</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-4 text-blue-100 text-xs overflow-x-auto whitespace-pre-wrap">
                          {step.code}
                        </pre>
                      </div>
                    )}
                    {step.guide && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm flex items-start gap-2 shadow-sm">
                        <BookOpen className="w-5 h-5 text-green-400 mt-1" />
                        <span>{step.guide}</span>
                      </div>
                    )}
                    {step.troubleshooting && step.troubleshooting.length > 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
                        <h3 className="font-bold text-gray-700 mb-2 flex items-center">
                          <AlertCircle className="w-5 h-5 mr-1" />
                          문제해결
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-gray-600 text-sm">
                          {step.troubleshooting.map((issue, idx) => (
                            <li key={idx}>
                              <b>{issue.problem}:</b> {issue.solution}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {step.implementationOptions && step.implementationOptions.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                        <h3 className="font-bold text-blue-700 mb-2 flex items-center">
                          <Play className="w-5 h-5 mr-1" />
                          구현 방법
                        </h3>
                        <ul className="list-disc pl-5 space-y-1 text-gray-600 text-sm">
                          {step.implementationOptions.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-6">
                    {step.code && (
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center"
                        onClick={() => handleCopy(step.code!, step.key + '-code')}
                      >
                        <Copy className="mr-2" size={18} /> 코드 복사
                      </button>
                    )}
                    {step.guide && (
                      <button
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center"
                        onClick={() => handleCopy(step.guide!, step.key + '-guide')}
                      >
                        <Copy className="mr-2" size={18} /> 가이드 복사
                      </button>
                    )}
                    <button
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium flex items-center"
                      onClick={() => setActiveStep(null)}
                    >
                      닫기
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </section>
  );
}
