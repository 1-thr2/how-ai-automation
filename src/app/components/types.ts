export interface DynamicQuestion {
  id: string;
  type: 'text' | 'single' | 'multiple';
  question: string;
  required: boolean;
  options?: string[];
  example?: string;
  description?: string;
  placeholder?: string;
  followupQuestions?: {
    question: string;
    example: string;
    purpose: string;
  }[];
}

export interface DynamicAnswers {
  [key: string]: string | string[];
}
