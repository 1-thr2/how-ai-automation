import React, { useRef, useLayoutEffect, useState } from 'react';
import FlowNodeCard from './FlowNodeCard';

const FLOW_LAYOUT = [
  { top: 180, left: 120 }, // 좌상단(예: Google Ads)
  { top: 320, left: 120 }, // 좌하단(예: Facebook Ads)
  { top: 250, left: 400 }, // 중앙 허브(예: Google Sheets)
  { top: 180, left: 680 }, // 우상단(예: 리포트)
  { top: 320, left: 680 }, // 우하단(예: 알림)
];

const CARD_COLORS = [
  'border-indigo-500',
  'border-violet-500',
  'border-emerald-500',
  'border-green-500',
  'border-amber-500',
];

interface FlowDiagramLayoutProps {
  flowDiagram: any[];
}

const FlowDiagramLayout = ({ flowDiagram }: FlowDiagramLayoutProps) => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [cardCenters, setCardCenters] = useState<{ x: number; y: number }[]>([]);

  useLayoutEffect(() => {
    const centers = cardRefs.current.map(node => {
      if (!node) return { x: 0, y: 0 };
      const rect = node.getBoundingClientRect();
      const parentRect = node.parentElement?.getBoundingClientRect();
      return {
        x: rect.left - (parentRect?.left || 0) + rect.width / 2,
        y: rect.top - (parentRect?.top || 0) + rect.height / 2,
      };
    });
    setCardCenters(centers);
  }, [flowDiagram.length]);

  // SVG 곡선 연결선: 좌/우 → 중앙, 중앙 → 우측(2개)
  const renderConnections = () => (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      {/* 좌상단 → 중앙 */}
      {cardCenters[0] && cardCenters[2] && (
        <path
          d={`M${cardCenters[0].x},${cardCenters[0].y} Q${cardCenters[2].x - 100},${cardCenters[0].y} ${cardCenters[2].x},${cardCenters[2].y}`}
          fill="none"
          stroke="#6366F1"
          strokeWidth="3"
          strokeDasharray="7,5"
        />
      )}
      {/* 좌하단 → 중앙 */}
      {cardCenters[1] && cardCenters[2] && (
        <path
          d={`M${cardCenters[1].x},${cardCenters[1].y} Q${cardCenters[2].x - 100},${cardCenters[1].y} ${cardCenters[2].x},${cardCenters[2].y}`}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="3"
          strokeDasharray="7,5"
        />
      )}
      {/* 중앙 → 우상단 */}
      {cardCenters[2] && cardCenters[3] && (
        <path
          d={`M${cardCenters[2].x},${cardCenters[2].y} Q${cardCenters[2].x + 100},${cardCenters[2].y - 80} ${cardCenters[3].x},${cardCenters[3].y}`}
          fill="none"
          stroke="#10B981"
          strokeWidth="3"
        />
      )}
      {/* 중앙 → 우하단 */}
      {cardCenters[2] && cardCenters[4] && (
        <path
          d={`M${cardCenters[2].x},${cardCenters[2].y} Q${cardCenters[2].x + 100},${cardCenters[2].y + 80} ${cardCenters[4].x},${cardCenters[4].y}`}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="3"
        />
      )}
    </svg>
  );

  return (
    <div className="relative min-h-[500px]">
      {renderConnections()}
      {flowDiagram.slice(0, 5).map((step: any, idx: number) => (
        <div
          key={idx}
          ref={el => {
            cardRefs.current[idx] = el;
          }}
          style={{
            position: 'absolute',
            top: FLOW_LAYOUT[idx]?.top,
            left: FLOW_LAYOUT[idx]?.left,
            zIndex: 10,
          }}
        >
          <FlowNodeCard {...step} />
        </div>
      ))}
    </div>
  );
};

export default FlowDiagramLayout;
