import React, { useRef, useState } from 'react';
import { Code, Zap, Sparkles } from 'lucide-react';
import FlowNodeCard from './FlowNodeCard';
import FlowConnections from './FlowConnections';

const FlowDiagram = () => {
  const [activeStep, setActiveStep] = useState<string | null>(null);

  // Refs for flow nodes
  const googleAdsRef = useRef<HTMLDivElement>(null);
  const facebookAdsRef = useRef<HTMLDivElement>(null);
  const sheetsRef = useRef<HTMLDivElement>(null);
  const reportsRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Define connections between nodes
  const connections = [
    {
      from: googleAdsRef,
      to: sheetsRef,
      color: '#6366F1',
      label: '자동 수집',
    },
    {
      from: facebookAdsRef,
      to: sheetsRef,
      color: '#3B82F6',
      label: '자동 수집',
    },
    {
      from: sheetsRef,
      to: reportsRef,
      color: '#10B981',
      label: '통합 분석',
    },
    {
      from: reportsRef,
      to: notificationsRef,
      color: '#F59E0B',
      label: '알림 발송',
    },
  ];

  return (
    <div className="relative min-h-[800px] mb-16">
      {/* Top Row - Data Sources */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-12 z-10">
        <FlowNodeCard
          ref={googleAdsRef}
          title="Google Ads"
          icon="🔍"
          color="indigo"
          description="광고 데이터 수집"
          onClick={() => setActiveStep('google')}
          active={activeStep === 'google'}
        >
          <div className="text-sm text-indigo-600 font-medium">매일 자동 수집</div>
        </FlowNodeCard>

        <FlowNodeCard
          ref={facebookAdsRef}
          title="Facebook Ads"
          icon="📱"
          color="blue"
          description="광고 데이터 수집"
          onClick={() => setActiveStep('facebook')}
          active={activeStep === 'facebook'}
        >
          <div className="text-sm text-blue-600 font-medium">매일 자동 수집</div>
        </FlowNodeCard>
      </div>

      {/* Center Hub - Data Integration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <FlowNodeCard
          ref={sheetsRef}
          title="Google Sheets"
          icon="📊"
          color="emerald"
          description="데이터 통합 & 분석"
          onClick={() => setActiveStep('sheets')}
          active={activeStep === 'sheets'}
          large
        >
          <div className="text-sm text-emerald-600 font-medium">실시간 통합 분석</div>
        </FlowNodeCard>
      </div>

      {/* Bottom Row - Actions & Results */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-8 z-10">
        <FlowNodeCard
          ref={reportsRef}
          title="리포트 & 대시보드"
          icon="📈"
          color="green"
          description="시각화 & 인사이트"
          onClick={() => setActiveStep('reports')}
          active={activeStep === 'reports'}
        >
          <div className="text-sm text-green-600 font-medium">자동 리포트 생성</div>
        </FlowNodeCard>

        <FlowNodeCard
          ref={notificationsRef}
          title="알림 설정"
          icon="🔔"
          color="amber"
          description="이메일/슬랙 발송"
          onClick={() => setActiveStep('notifications')}
          active={activeStep === 'notifications'}
        >
          <div className="text-sm text-slate-600 font-medium">실시간 알림</div>
        </FlowNodeCard>
      </div>

      {/* SVG Connections */}
      <FlowConnections connections={connections} />
    </div>
  );
};

export default FlowDiagram;
