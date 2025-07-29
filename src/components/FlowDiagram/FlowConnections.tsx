import React from 'react';
import { FlowStep } from '@/lib/types/automation';
import styles from './FlowConnections.module.css';

interface FlowConnectionsProps {
  steps: FlowStep[];
}

export default function FlowConnections({ steps }: FlowConnectionsProps) {
  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      {steps.map((step, index) => {
        if (index === steps.length - 1) return null;
        
        const startX = (index * 100) + 50;
        const endX = ((index + 1) * 100) + 50;
        const y = 30;
        
        return (
          <path
            key={`connection-${step.id}`}
            d={`M ${startX} ${y} C ${(startX + endX) / 2} ${y}, ${(startX + endX) / 2} ${y}, ${endX} ${y}`}
            stroke="#6C5CE7"
            strokeWidth="2"
            fill="none"
            className="animate-draw"
          />
        );
      })}
    </svg>
  );
}

// 스타일은 FlowDiagramSection.tsx에서 전역으로 관리
