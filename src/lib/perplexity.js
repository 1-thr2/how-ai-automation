/**
 * Perplexity API 클라이언트
 * https://docs.perplexity.ai/
 */

import axios from 'axios';

const PERPLEXITY_API_KEY = process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Perplexity API를 사용한 실시간 검색
export async function searchLatestInfo(query) {
  try {
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY가 설정되지 않았습니다.');
    }

    const response = await axios.post(
      PERPLEXITY_API_URL,
      {
        model: 'sonar-medium-online',
        messages: [
          {
            role: 'user',
            content: `${query} ${new Date().getFullYear()} 최신 자동화 방법`,
          },
        ],
        search_recency: 'week',
      },
      {
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Perplexity API 응답이 올바르지 않습니다.');
    }

    return {
      content: response.data.choices[0].message.content,
      sources: (response.data.sources || []).map(source => ({
        title: source.title || '',
        url: source.url || '',
        content: source.content || '',
      })),
    };
  } catch (error) {
    console.error('Perplexity 검색 오류:', error);
    if (error.response) {
      console.error('API 응답:', error.response.data);
      throw new Error(`Perplexity API 오류: ${error.response.status} ${error.response.statusText}`);
    }
    throw new Error('최신 정보 검색 중 오류가 발생했습니다.');
  }
}

// Tavlly API는 아직 구현이 안 되어 있어 Perplexity로 대체
export async function searchWithTavlly(query) {
  // 실제 Tavlly API가 구현되면 교체
  return searchLatestInfo(query);
}

export default {
  searchLatestInfo,
  searchWithTavlly,
};
