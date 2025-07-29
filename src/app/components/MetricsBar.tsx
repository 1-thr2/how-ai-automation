import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Clock, DollarSign, Users } from 'lucide-react';

interface Metric {
  label: string;
  value: string;
  icon: React.ReactNode;
}

interface MetricsBarProps {
  metrics?: {
    timeSaved?: string;
    costReduction?: string;
    efficiency?: string;
    teamImpact?: string;
  };
}

export default function MetricsBar({ metrics }: MetricsBarProps) {
  if (!metrics) return null;

  const metricItems: Metric[] = [
    {
      label: '시간 절약',
      value: metrics.timeSaved || 'N/A',
      icon: <Clock className="w-5 h-5" />,
    },
    {
      label: '비용 절감',
      value: metrics.costReduction || 'N/A',
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      label: '효율성 향상',
      value: metrics.efficiency || 'N/A',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      label: '팀 영향도',
      value: metrics.teamImpact || 'N/A',
      icon: <Users className="w-5 h-5" />,
    },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metricItems.map((metric, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">{metric.icon}</div>
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="font-semibold">{metric.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
