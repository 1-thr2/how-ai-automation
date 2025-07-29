import { AutomationFlow, FlowStep } from '@/types/automation';

export const createAutomationFlow = (input: {
  title: string;
  description: string;
  steps: FlowStep[];
  tools?: Array<{
    name: string;
    icon: string;
    url: string;
    desc: string;
  }>;
}): AutomationFlow => {
  return {
    id: input.title.toLowerCase().replace(/\s+/g, '-'),
    title: input.title,
    description: input.description,
    steps: input.steps.map((step, index) => ({
      ...step,
      id: step.id || `step-${index + 1}`
    })),
    toolsFlow: input.tools || [],
    connections: [],
  };
};
