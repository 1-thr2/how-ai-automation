import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';

interface Step {
  title: string;
  description: string;
  type: string;
  code?: string;
  language?: string;
  explanation?: string;
}

interface ManualStep {
  title: string;
  description: string;
  code?: string;
  language?: string;
}

interface StepGuideProps {
  steps: Step[];
  manualSteps?: ManualStep[];
}

export default function StepGuide({ steps, manualSteps = [] }: StepGuideProps) {
  if (!steps.length && !manualSteps.length) return null;

  return (
    <div className="space-y-6">
      {/* 자동화 단계 */}
      {steps.length > 0 && (
        <div className="space-y-4">
          {steps.map((step, index) => (
            <Card key={index} className="border-none shadow-lg rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#F8F6FF] rounded-full flex items-center justify-center text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-700 mb-4">{step.description}</p>
                    {step.code && (
                      <div className="space-y-2">
                        <div className="bg-[#F8F6FF] rounded-xl p-4">
                          <pre className="whitespace-pre-wrap text-sm">{step.code}</pre>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(step.code!)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            코드 복사
                          </Button>
                          {step.language && (
                            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                              {step.language}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {step.explanation && (
                      <p className="text-sm text-gray-600 mt-2">{step.explanation}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 수동 단계 */}
      {manualSteps.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">수동 단계</h3>
          {manualSteps.map((step, index) => (
            <Card key={index} className="border-none shadow-lg rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#F8F6FF] rounded-full flex items-center justify-center text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-700 mb-4">{step.description}</p>
                    {step.code && (
                      <div className="space-y-2">
                        <div className="bg-[#F8F6FF] rounded-xl p-4">
                          <pre className="whitespace-pre-wrap text-sm">{step.code}</pre>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(step.code!)}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            코드 복사
                          </Button>
                          {step.language && (
                            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                              {step.language}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
