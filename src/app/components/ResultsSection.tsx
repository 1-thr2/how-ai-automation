import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
} from 'lucide-react';
import { AutomationCard } from '@/app/types/automation';
import StepGuide from './StepGuide';
import FlowVisualization from './FlowVisualization';

interface ResultsSectionProps {
  data: any;
}

export default function ResultsSection({ data }: ResultsSectionProps) {
  if (!data) return null;
  const { ux, flows, intent, requirements, trends } = data;
  const cards: AutomationCard[] = ux?.cards || [];

  return (
    <div className="space-y-8">
      {/* 헤더: 제목만 */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">
          {intent?.userGoal || cards[0]?.title || '자동화 결과'}
        </h2>
      </div>

      {/* 자동화 옵션 탭 */}
      <Tabs defaultValue={cards[0]?.description || '복붙'} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {cards.map((card: AutomationCard) => (
            <TabsTrigger key={card.title} value={card.description}>
              {card.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {cards.map((card: AutomationCard) => (
          <TabsContent key={card.type} value={card.type} className="space-y-4">
            {/* 플로우 시각화 */}
            {card.flow && card.flow.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>자동화 플로우</CardTitle>
                </CardHeader>
                <CardContent>
                  <FlowVisualization steps={card.flow.map((step: string) => ({ step }))} />
                </CardContent>
              </Card>
            )}

            {/* 복붙/실행 섹션 */}
            {card.copyPrompt && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Copy className="w-5 h-5" />
                    복붙/실행
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <pre className="whitespace-pre-wrap">{card.copyPrompt}</pre>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => navigator.clipboard.writeText(card.copyPrompt)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    복사하기
                  </Button>
                  {ux?.footer?.pdfDownloadUrl && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={ux.footer.pdfDownloadUrl} download>
                        <Download className="w-4 h-4 mr-2" /> PDF로 저장
                      </a>
                    </Button>
                  )}
                  {ux?.footer?.gptSharePrompt && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigator.clipboard.writeText(ux.footer.gptSharePrompt)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      GPT 프롬프트 복사
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 가이드/단계별 상세 */}
            {card.flow && card.flow.length > 0 && flows?.flows && flows.flows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    단계별 가이드
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StepGuide
                    steps={flows.flows.find((f: any) => f.type === card.type)?.steps || []}
                  />
                </CardContent>
              </Card>
            )}

            {/* 실전 스토리 */}
            {card.story && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRight className="w-5 h-5" />
                    실전 스토리
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">{card.story}</div>
                </CardContent>
              </Card>
            )}

            {/* PlanB/실패사례 */}
            {(card.planB || (card.failureCases && card.failureCases.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    PlanB/실패사례
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {card.planB && (
                    <div className="prose max-w-none mb-4">
                      <h4>PlanB</h4>
                      <p>{card.planB}</p>
                    </div>
                  )}
                  {card.failureCases && card.failureCases.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">실패사례</h4>
                      <ul className="space-y-2">
                        {card.failureCases.map((failure: string, index: number) => (
                          <li key={index} className="text-sm text-muted-foreground">
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    자주 묻는 질문
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {card.faq.map((item: any, index: number) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger>{item.q}</AccordionTrigger>
                        <AccordionContent>{item.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* 실전 팁 */}
            {card.realTip && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    실전 팁
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">{card.realTip}</div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* 푸터: 실제 값이 있을 때만 노출 */}
      {ux?.footer && (
        <div className="text-center space-y-4 text-sm text-muted-foreground">
          {ux.footer.howToStart && <p>{ux.footer.howToStart}</p>}
          <div className="flex justify-center gap-4">
            {ux.footer.pdfDownloadUrl && (
              <Button variant="link" size="sm" asChild>
                <a href={ux.footer.pdfDownloadUrl} download>
                  <Download className="w-4 h-4 mr-2" /> PDF 다운로드
                </a>
              </Button>
            )}
            {ux.footer.gptSharePrompt && (
              <Button
                variant="link"
                size="sm"
                onClick={() => navigator.clipboard.writeText(ux.footer.gptSharePrompt)}
              >
                <Copy className="w-4 h-4 mr-2" /> GPT 프롬프트 복사
              </Button>
            )}
            {ux.footer.community && (
              <Button variant="link" size="sm">
                <BookOpen className="w-4 h-4 mr-2" />
                커뮤니티
              </Button>
            )}
            {ux.footer.expertConsultation && (
              <Button variant="link" size="sm">
                <HelpCircle className="w-4 h-4 mr-2" />
                전문가 상담
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
