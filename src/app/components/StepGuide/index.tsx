'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Code,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { IntentAnalysisResult } from '@/lib/agents/intent-analysis';

interface Step {
  title: string;
  description: string;
  code?: string;
  guide?: string;
  tips?: string[];
  planB?: string;
  faq?: { question: string; answer: string }[];
  failureCases?: { scenario: string; solution: string }[];
}

interface StepGuideProps {
  steps: Step[];
  intent?: IntentAnalysisResult;
}

export default function StepGuide({ steps, intent }: StepGuideProps) {
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([]);
  const [expandedPlanBs, setExpandedPlanBs] = useState<number[]>([]);

  const toggleStep = (index: number) => {
    setExpandedSteps(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const toggleFaq = (index: number) => {
    setExpandedFaqs(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const togglePlanB = (index: number) => {
    setExpandedPlanBs(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('복사되었습니다!');
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  const downloadCode = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {steps.map((step, index) => (
        <Card key={index} className="p-6">
          {/* 스텝 헤더 */}
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleStep(index)}
          >
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-lg">
                {index + 1}
              </Badge>
              <h3 className="text-xl font-semibold">{step.title}</h3>
            </div>
            {expandedSteps.includes(index) ? <ChevronUp /> : <ChevronDown />}
          </div>

          {/* 스텝 내용 */}
          {expandedSteps.includes(index) && (
            <div className="mt-4 space-y-6">
              {/* 설명 */}
              <p className="text-muted-foreground">{step.description}</p>

              {/* 코드 */}
              {step.code && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Code className="w-5 h-5" />
                      <h4 className="font-medium">실행 코드</h4>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(step.code!)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        복사
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadCode(step.code!, `step-${index + 1}.txt`)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        다운로드
                      </Button>
                    </div>
                  </div>
                  <pre className="p-4 bg-muted rounded-lg overflow-x-auto">
                    <code>{step.code}</code>
                  </pre>
                </div>
              )}

              {/* 가이드 */}
              {step.guide && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="w-5 h-5" />
                    <h4 className="font-medium">실행 가이드</h4>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-line">{step.guide}</p>
                </div>
              )}

              {/* 팁 */}
              {step.tips && step.tips.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">실전 팁</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {step.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="text-muted-foreground">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Plan B */}
              {step.planB && (
                <div className="space-y-2">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => togglePlanB(index)}
                  >
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5" />
                      <h4 className="font-medium">Plan B</h4>
                    </div>
                    {expandedPlanBs.includes(index) ? <ChevronUp /> : <ChevronDown />}
                  </div>
                  {expandedPlanBs.includes(index) && (
                    <p className="text-muted-foreground">{step.planB}</p>
                  )}
                </div>
              )}

              {/* FAQ */}
              {step.faq && step.faq.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">자주 묻는 질문</h4>
                  <div className="space-y-2">
                    {step.faq.map((faq, faqIndex) => (
                      <div key={faqIndex} className="space-y-1">
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleFaq(faqIndex)}
                        >
                          <p className="font-medium">{faq.question}</p>
                          {expandedFaqs.includes(faqIndex) ? <ChevronUp /> : <ChevronDown />}
                        </div>
                        {expandedFaqs.includes(faqIndex) && (
                          <p className="text-muted-foreground">{faq.answer}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 실패 사례 */}
              {step.failureCases && step.failureCases.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">실패 사례 & 해결책</h4>
                  <div className="space-y-4">
                    {step.failureCases.map((failure, failureIndex) => (
                      <div key={failureIndex} className="space-y-1">
                        <p className="font-medium text-destructive">{failure.scenario}</p>
                        <p className="text-muted-foreground">{failure.solution}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
