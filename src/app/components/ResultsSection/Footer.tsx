import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Copy, BookOpen, HelpCircle } from 'lucide-react';
import type { AutomationFooter } from '@/types/automation';
import type { IntentAnalysisResult } from '@/lib/agents/intent-analysis';

interface FooterProps {
  footer: AutomationFooter;
  intent?: IntentAnalysisResult;
}

export default function Footer({ footer, intent }: FooterProps) {
  if (!footer) return null;

  return (
    <div className="text-center space-y-4 text-sm text-muted-foreground">
      {footer.howToStart && <p>{footer.howToStart}</p>}
      <div className="flex justify-center gap-4">
        {footer.pdfDownloadUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={footer.pdfDownloadUrl} download>
              <Download className="w-4 h-4 mr-2" /> PDF 다운로드
            </a>
          </Button>
        )}
        {footer.gptSharePrompt && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              footer.gptSharePrompt && navigator.clipboard.writeText(footer.gptSharePrompt)
            }
          >
            <Copy className="w-4 h-4 mr-2" /> GPT 프롬프트 복사
          </Button>
        )}
      </div>
    </div>
  );
}
