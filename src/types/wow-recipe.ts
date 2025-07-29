// 실제 API 응답(JSON) 기반 wow 레시피 타입

export interface WowStep {
  id: string;
  title: string;
  description: string;
  tool?: string;
  estimatedTime?: string;
  difficulty?: number;
  detailedDescription?: string;
  code?: string;
  language?: string;
  screenshots?: string[];
  commonIssues?: Array<{ problem: string; solution: string }>;
}

export interface WowRecipe {
  title: string;
  totalTimeSaved?: string;
  monthlyROI?: string;
  difficulty?: number | string;
  steps: WowStep[];
  planB?: string;
  faq?: Array<{ q: string; a: string }>;
  tips?: string;
  successCase?: string;
  expansion?: string[];
}
