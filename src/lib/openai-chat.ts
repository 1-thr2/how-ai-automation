import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function openaiChat(messages: Message[]) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error('API 응답이 비어있습니다.');
    }

    return response;
  } catch (error) {
    console.error('OpenAI API 오류:', error);
    throw new Error('OpenAI API 호출 중 오류가 발생했습니다.');
  }
}
