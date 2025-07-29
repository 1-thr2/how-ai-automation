import React from 'react';
import type { FlowConnection } from '@/app/types/automation';

interface FlowConnectionsProps {
  connections: FlowConnection[];
}

const CARD_WIDTH = 180;
const CARD_GAP = 20;
const CARD_HEIGHT = 120;

const FlowConnections: React.FC<FlowConnectionsProps> = ({ connections }) => {
  return (
    <svg
      className="absolute left-0 top-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, height: CARD_HEIGHT + 60, width: '100%' }}
    >
      <style>
        {`
          @keyframes flowAnimation {
            0% { stroke-dashoffset: 10; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes arrowPulse {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 0.8; }
          }
          .flow-path {
            stroke-dasharray: 5,5;
            animation: flowAnimation 2s linear infinite;
          }
          .flow-arrow {
            animation: arrowPulse 1.5s ease-in-out infinite;
          }
        `}
      </style>
      {connections.map((connection, idx) => {
        const x1 = idx * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH;
        const x2 = (idx + 1) * (CARD_WIDTH + CARD_GAP);
        const y = CARD_HEIGHT / 2 + 30;
        
        // 베지어 곡선으로 부드러운 연결
        const controlPoint1 = x1 + 40;
        const controlPoint2 = x2 - 40;
        
        return (
          <g key={idx}>
            <path
              d={`M${x1},${y} C${controlPoint1},${y} ${controlPoint2},${y} ${x2},${y}`}
              stroke="#8B5CF6"
              strokeWidth={2}
              fill="none"
              className="flow-path"
            />
            <polygon 
              points={`${x2 - 8},${y - 6} ${x2},${y} ${x2 - 8},${y + 6}`} 
              fill="#8B5CF6"
              className="flow-arrow"
            />
          </g>
        );
      })}
    </svg>
  );
};

export default FlowConnections;
