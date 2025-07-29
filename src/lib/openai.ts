import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface OpenAIConfig {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  response_format?: { type: 'json_object' };
}

export async function callOpenAI(config: OpenAIConfig) {
  const response = await openai.chat.completions.create({
    model: config.model || 'gpt-4-turbo-preview',
    messages: config.messages,
    temperature: config.temperature || 0.7,
    response_format: config.response_format || { type: 'json_object' },
  });

  return response;
}
