import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface PlanBCardProps {
  planB: string;
  failureCases?: string[];
}

export default function PlanBCard({ planB, failureCases }: PlanBCardProps) {
  if (!planB && (!failureCases || failureCases.length === 0)) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          PlanB/실패사례
        </CardTitle>
      </CardHeader>
      <CardContent>
        {planB && (
          <div className="prose max-w-none mb-4">
            <h4>PlanB</h4>
            <p>{planB}</p>
          </div>
        )}
        {failureCases && failureCases.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">실패사례</h4>
            <ul className="space-y-2">
              {failureCases.map((failure, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {failure}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
