import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

interface TipsCardProps {
  realTip: string;
  tips?: string[];
}

export default function TipsCard({ realTip, tips }: TipsCardProps) {
  if (!realTip && (!tips || tips.length === 0)) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          실전 팁
        </CardTitle>
      </CardHeader>
      <CardContent>
        {realTip && (
          <div className="prose max-w-none mb-4">
            <p>{realTip}</p>
          </div>
        )}
        {tips && tips.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
            <b>💡 추가 팁:</b>
            <ul className="list-disc pl-6 mt-1">
              {tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
