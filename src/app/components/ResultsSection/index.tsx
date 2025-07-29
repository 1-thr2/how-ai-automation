import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Copy,
  BookOpen,
  Play,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Lightbulb,
  Download,
  BarChart3,
} from 'lucide-react';
import StepGuide from '../StepGuide';
import FlowVisualization from '../FlowVisualization';
import type { AutomationResult } from '@/types/automation';

interface ResultsSectionProps {
  data: AutomationResult;
}

export default function ResultsSection({ data }: ResultsSectionProps) {
  if (!data) return null;

  const { ux, flows, intent, requirements, trends } = data;
  const cards = ux?.cards || [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* 헤더 섹션 */}
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-4 text-gray-900">
          {intent?.userGoal || cards[0]?.title || '자동화 결과'}
        </h1>
        <div className="text-lg text-gray-700 mb-2">
          반복되는 고객 문의, 이제 AI가 24시간 자동으로 응답합니다.
          <br />
          담당자는 더 중요한 일에 집중, 고객은 빠른 답변에 만족!
        </div>
        <div className="text-sm text-gray-500">
          복잡한 설정 없이, 바로 적용 가능한 자동화 레시피만 모았습니다.
        </div>
      </div>

      {/* WOW 대시보드/트렌드/실적 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 기대 효과 카드 */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col items-center shadow-sm">
          <span className="text-2xl font-bold text-green-600 mb-1">
            {trends?.timeSaved || '월 20'}
          </span>
          <span className="text-sm text-gray-500 mb-2">시간 절약</span>
          <span className="text-gray-700 text-sm">매월 절약 시간</span>
        </div>
        {/* ROI/난이도 카드 */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-col items-center shadow-sm">
          <span className="text-2xl font-bold text-blue-600 mb-1">{trends?.roi || 'ROI 300%'}</span>
          <span className="text-sm text-gray-500 mb-2">ROI</span>
          <span className="text-gray-700 text-sm">투자 대비 효과</span>
        </div>
        {/* 난이도/설정 카드 */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center shadow-sm">
          <span className="text-2xl font-bold text-slate-600 mb-1">
            {trends?.difficulty || '초급'}
          </span>
          <span className="text-sm text-gray-500 mb-2">설정 난이도</span>
          <span className="text-gray-700 text-sm">누구나 쉽게 시작</span>
        </div>
      </div>

      {/* 자동화 옵션 탭 */}
      <Tabs defaultValue={cards[0]?.type || '복붙'} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-[#F8F6FF] p-1 rounded-xl">
          {cards.map(card => (
            <TabsTrigger
              key={card.type}
              value={card.type}
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg"
            >
              {card.type}
            </TabsTrigger>
          ))}
        </TabsList>

        {cards.map(card => (
          <TabsContent key={card.type} value={card.type} className="space-y-6 mt-6">
            {/* 플로우 다이어그램 */}
            <Card className="border-none shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Play className="w-5 h-5 text-primary" />
                  한눈에 보는 자동화 플로우
                </CardTitle>
              </CardHeader>
              <CardContent>
                {card.flow && card.flow.length > 0 ? (
                  <FlowVisualization steps={card.flow} />
                ) : (
                  <div className="text-gray-400 text-sm">플로우 데이터가 없습니다.</div>
                )}
              </CardContent>
            </Card>

            {/* 트렌드 */}
            <Card className="border-none shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  트렌드
                </CardTitle>
              </CardHeader>
              <CardContent>
                {card.trends && Object.keys(card.trends).length > 0 ? (
                  <div className="text-gray-800 text-sm whitespace-pre-line">
                    {typeof card.trends === 'string'
                      ? card.trends
                      : JSON.stringify(card.trends, null, 2)}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">트렌드 데이터가 없습니다.</div>
                )}
              </CardContent>
            </Card>

            {/* 실제 사례 */}
            <Card className="border-none shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ArrowRight className="w-5 h-5 text-primary" />
                  실제 사례
                </CardTitle>
              </CardHeader>
              <CardContent>
                {card.realCase ? (
                  <div className="text-gray-800 text-sm whitespace-pre-line">{card.realCase}</div>
                ) : (
                  <div className="text-gray-400 text-sm">실제 사례 데이터가 없습니다.</div>
                )}
              </CardContent>
            </Card>

            {/* 대시보드 */}
            <Card className="border-none shadow-lg rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  대시보드
                </CardTitle>
              </CardHeader>
              <CardContent>
                {card.dashboard && Object.keys(card.dashboard).length > 0 ? (
                  <div className="text-gray-800 text-sm whitespace-pre-line">
                    {typeof card.dashboard === 'string'
                      ? card.dashboard
                      : JSON.stringify(card.dashboard, null, 2)}
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">대시보드 데이터가 없습니다.</div>
                )}
              </CardContent>
            </Card>

            {/* 복붙/실행 섹션 */}
            {card.copyPrompt && (
              <Card className="border-none shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Copy className="w-5 h-5 text-primary" />
                    복붙/실행
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative bg-gray-800 rounded-lg overflow-hidden mb-6">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-700">
                      <span className="text-gray-300 text-sm">실행 코드</span>
                      <button
                        className="text-gray-300 hover:text-white"
                        onClick={() =>
                          card.copyPrompt && navigator.clipboard.writeText(card.copyPrompt)
                        }
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                    <pre className="p-4 text-gray-300 text-sm overflow-x-auto whitespace-pre-wrap">
                      {card.copyPrompt}
                    </pre>
                  </div>
                  <div className="flex gap-3">
                    {ux?.footer?.pdfDownloadUrl ? (
                      <Button variant="outline" className="flex-1 hover:bg-gray-100" asChild>
                        <a href={ux.footer.pdfDownloadUrl} download>
                          <Download className="w-4 h-4 mr-2" /> PDF로 저장
                        </a>
                      </Button>
                    ) : null}
                    {ux?.footer?.gptSharePrompt && (
                      <Button
                        variant="outline"
                        className="flex-1 hover:bg-gray-100"
                        onClick={() =>
                          ux.footer?.gptSharePrompt &&
                          navigator.clipboard.writeText(ux.footer.gptSharePrompt)
                        }
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        GPT 프롬프트 복사
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 가이드/단계별 상세 */}
            {card.flow && card.flow.length > 0 && flows?.flows && flows.flows.length > 0 && (
              <Card className="border-none shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <BookOpen className="w-5 h-5 text-primary" />
                    단계별 가이드
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StepGuide
                    steps={(flows.flows.find((f: any) => f.type === card.type)?.steps || []).map(
                      step => ({
                        title: step.title,
                        description: step.preview || '',
                        type: card.type,
                        code: step.code,
                        explanation: step.guide,
                      })
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* PlanB/실패사례 */}
            {(card.planB || (card.failureCases && card.failureCases.length > 0)) && (
              <Card className="border-none shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    PlanB/실패사례
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {card.planB && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <h4 className="font-semibold mb-2 text-slate-800">PlanB</h4>
                      <p className="text-sm text-slate-700">{card.planB}</p>
                    </div>
                  )}
                  {card.failureCases && card.failureCases.length > 0 && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                      <h4 className="font-semibold mb-2 text-red-800">실패사례</h4>
                      <ul className="space-y-3">
                        {card.failureCases.map((failure: string, index: number) => (
                          <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            {failure}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* FAQ */}
            {card.faq && card.faq.length > 0 && (
              <Card className="border-none shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    자주 묻는 질문
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {card.faq.map((item: any, index: number) => (
                      <div key={index} className="bg-[#F8F6FF] rounded-xl p-4">
                        <h4 className="font-semibold mb-2">Q. {item.q}</h4>
                        <p className="text-sm text-gray-700">A. {item.a}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 실전팁/확장아이디어 */}
            {(card.tips || card.expansionIdeas) && (
              <Card className="border-none shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    실전팁/확장아이디어
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {card.tips && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                      <h4 className="font-semibold mb-2 text-emerald-800">실전팁</h4>
                      <p className="text-sm text-emerald-700">{card.tips}</p>
                    </div>
                  )}
                  {card.expansionIdeas && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <h4 className="font-semibold mb-2 text-blue-800">확장아이디어</h4>
                      <p className="text-sm text-blue-700">{card.expansionIdeas}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* 푸터 */}
      {ux?.footer && (
        <div className="text-center space-y-4">
          {ux.footer.howToStart && <p className="text-sm text-gray-600">{ux.footer.howToStart}</p>}
          <div className="flex justify-center gap-4">
            {ux.footer.pdfDownloadUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a href={ux.footer.pdfDownloadUrl} download>
                  <Download className="w-4 h-4 mr-2" /> PDF 다운로드
                </a>
              </Button>
            ) : null}
            {ux.footer.gptSharePrompt && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  ux.footer?.gptSharePrompt &&
                  navigator.clipboard.writeText(ux.footer.gptSharePrompt)
                }
              >
                <Copy className="w-4 h-4 mr-2" /> GPT 프롬프트 복사
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
