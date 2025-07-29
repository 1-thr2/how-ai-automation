import OpenAI from 'openai';
import { AgentResponse, Card } from '@/lib/types/automation';
import { agentPrompts } from '@/lib/prompts/agent-prompts';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GPT 프롬프트 실행 함수
export async function executePrompt(
  prompt: string,
  systemMessage: string,
  temperature: number = 0.7
) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      temperature,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('GPT API Error:', error);
    throw new Error('GPT API 호출 중 오류가 발생했습니다.');
  }
}

// JSON 파싱 헬퍼 함수
export function parseJSON<T>(jsonString: string): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('JSON 파싱 오류:', error);
    throw new Error('JSON 파싱 중 오류가 발생했습니다.');
  }
}

// 에러 처리 헬퍼 함수
export function handleAgentError(error: unknown, agentName: string) {
  console.error(`${agentName} 에이전트 오류:`, error);
  return {
    error: {
      code: 'AGENT_ERROR',
      message: `${agentName} 에이전트 실행 중 오류가 발생했습니다.`,
      details: error instanceof Error ? error.message : '알 수 없는 오류',
    },
  };
}

// 결과 캐싱 헬퍼 함수
const cache = new Map<string, any>();

export function getCachedResult(key: string) {
  return cache.get(key);
}

export function setCachedResult(key: string, value: any) {
  cache.set(key, value);
}

// 입력 검증 헬퍼 함수
export function validateInput(input: any, requiredFields: string[]) {
  const missingFields = requiredFields.filter(field => !input[field]);
  if (missingFields.length > 0) {
    throw new Error(`필수 입력값이 누락되었습니다: ${missingFields.join(', ')}`);
  }
  return true;
}

// 에이전트 실행 함수
export async function executeAgent(agentName: string, params: string | Record<string, any>): Promise<AgentResponse> {
  const agent = agentPrompts[agentName];
  if (!agent) {
    throw new Error(`Agent ${agentName} not found`);
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  let systemPrompt = agent.system;
  let userPrompt = agent.user;

  // params가 string이면 그대로 사용, 객체면 변수 치환
  if (typeof params === 'string') {
    userPrompt = params;
  } else if (typeof params === 'object' && params !== null) {
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      systemPrompt = systemPrompt.replaceAll(placeholder, String(value ?? ''));
      userPrompt = userPrompt.replaceAll(placeholder, String(value ?? ''));
    });
  }

  // 실제 프롬프트 로그 출력
  console.log(`[${agentName}] systemPrompt:`, systemPrompt);
  console.log(`[${agentName}] userPrompt:`, userPrompt);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-0125-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('OpenAI API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(`API request failed: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    if (!content) {
      throw new Error('Empty response from OpenAI API');
    }

    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch (error) {
      console.error('Failed to parse agent response:', content);
      throw new Error(
        `Invalid agent response format: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } catch (error) {
    console.error('ExecuteAgent Error:', error);
    throw error;
  }
}
