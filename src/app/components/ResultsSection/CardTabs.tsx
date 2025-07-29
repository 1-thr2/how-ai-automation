import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Download, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FlowVisualization from '../FlowVisualization';
import StepGuide from '../StepGuide';
import PlanBCard from '../Cards/PlanBCard';
import FAQCard from '../Cards/FAQCard';
import TipsCard from '../Cards/TipsCard';
import type { AutomationCard, AutomationFooter } from '@/types/automation';
import type { IntentAnalysisResult } from '@/lib/agents/intent-analysis';

interface CardTabsProps {
  cards: AutomationCard[];
  flows: { flows: { type: string; title: string; steps: any[] }[] };
  footer: AutomationFooter;
  intent?: IntentAnalysisResult;
}

export default function CardTabs({ cards, flows, footer, intent }: CardTabsProps) {
  if (!Array.isArray(cards) || cards.length === 0) return null;
  const safeFlows = flows && Array.isArray(flows.flows) ? flows : { flows: [] };
  const safeFooter = footer || {};

  return (
    <Tabs defaultValue={cards[0]?.type || '복붙'} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        {cards.map(card => (
          <TabsTrigger key={card.type} value={card.type}>
            {card.type}
          </TabsTrigger>
        ))}
      </TabsList>

      {cards.map(card => (
        <TabsContent key={card.type} value={card.type} className="space-y-4">
          {/* 플로우 시각화 */}
          {Array.isArray(card.flow) && card.flow.length > 0 && (
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
                {safeFooter.pdfDownloadUrl && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={safeFooter.pdfDownloadUrl} download>
                      <Download className="w-4 h-4 mr-2" /> PDF로 저장
                    </a>
                  </Button>
                )}
                {safeFooter.gptSharePrompt && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigator.clipboard.writeText(safeFooter.gptSharePrompt!)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    GPT 프롬프트 복사
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* 가이드/단계별 상세 */}
          {Array.isArray(card.flow) &&
            card.flow.length > 0 &&
            safeFlows.flows &&
            safeFlows.flows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    단계별 가이드
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StepGuide
                    steps={safeFlows.flows.find((f: any) => f.type === card.type)?.steps || []}
                  />
                </CardContent>
              </Card>
            )}

          {/* PlanB/실패사례 */}
          <PlanBCard planB={card.planB} failureCases={card.failureCases} />

          {/* FAQ */}
          <FAQCard faq={card.faq} />

          {/* 실전 팁 */}
          <TipsCard realTip={card.realTip} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
