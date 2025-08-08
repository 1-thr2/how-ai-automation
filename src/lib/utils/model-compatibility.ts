/**
 * 모델별 지원 파라미터 자동 검증 및 조정 시스템
 * 🎯 목적: 하드코딩 없이 동적으로 모델 파라미터 호환성 확인
 */

export interface ModelConfig {
  model: string;
  supportedParams: string[];
  maxTokensParam: 'max_tokens' | 'max_completion_tokens';
  supportsSystemRole: boolean;
  supportsJsonMode: boolean;
}

/**
 * 📋 2025년 모델 호환성 매트릭스 (동적 업데이트 가능)
 */
export const MODEL_COMPATIBILITY: Record<string, ModelConfig> = {
  'gpt-4o': {
    model: 'gpt-4o',
    supportedParams: ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'max_tokens'],
    maxTokensParam: 'max_tokens',
    supportsSystemRole: true,
    supportsJsonMode: true
  },
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    supportedParams: ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'max_tokens'],
    maxTokensParam: 'max_tokens',
    supportsSystemRole: true,
    supportsJsonMode: true
  },
  'gpt-4.1': {
    model: 'gpt-4.1',
    supportedParams: ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'max_tokens'],
    maxTokensParam: 'max_tokens',
    supportsSystemRole: true,
    supportsJsonMode: true
  },
  'gpt-4.1-mini': {
    model: 'gpt-4.1-mini',
    supportedParams: ['temperature', 'top_p', 'frequency_penalty', 'presence_penalty', 'max_tokens'],
    maxTokensParam: 'max_tokens',
    supportsSystemRole: true,
    supportsJsonMode: true
  },
  'o3-mini': {
    model: 'o3-mini',
    supportedParams: ['max_completion_tokens'], // o3-mini는 제한적 파라미터 지원
    maxTokensParam: 'max_completion_tokens',
    supportsSystemRole: false, // o3-mini는 system role 제한적
    supportsJsonMode: true
  }
};

/**
 * 🔧 모델별 최적 파라미터 자동 생성
 */
export function generateOptimalParams(
  modelName: string,
  desiredParams: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    jsonMode?: boolean;
  }
): any {
  const config = MODEL_COMPATIBILITY[modelName];
  
  if (!config) {
    console.warn(`⚠️ [모델 호환성] 알 수 없는 모델: ${modelName}, 기본 설정 사용`);
    return {
      [MODEL_COMPATIBILITY['gpt-4o'].maxTokensParam]: desiredParams.maxTokens || 1000
    };
  }
  
  const params: any = {};
  
  // maxTokens 파라미터 (필수)
  if (desiredParams.maxTokens) {
    params[config.maxTokensParam] = desiredParams.maxTokens;
  }
  
  // 선택적 파라미터들 (모델 지원 여부에 따라)
  if (config.supportedParams.includes('temperature') && desiredParams.temperature !== undefined) {
    params.temperature = desiredParams.temperature;
  }
  
  if (config.supportedParams.includes('top_p') && desiredParams.topP !== undefined) {
    params.top_p = desiredParams.topP;
  }
  
  if (config.supportedParams.includes('frequency_penalty') && desiredParams.frequencyPenalty !== undefined) {
    params.frequency_penalty = desiredParams.frequencyPenalty;
  }
  
  if (config.supportedParams.includes('presence_penalty') && desiredParams.presencePenalty !== undefined) {
    params.presence_penalty = desiredParams.presencePenalty;
  }
  
  // JSON 모드
  if (config.supportsJsonMode && desiredParams.jsonMode) {
    params.response_format = { type: 'json_object' };
  }
  
  console.log(`✅ [모델 호환성] ${modelName}에 최적화된 파라미터:`, Object.keys(params));
  
  return params;
}

/**
 * 🧠 모델 파라미터 오류 자동 감지 및 복구
 */
export async function executeWithAutoRecovery(
  modelName: string,
  requestParams: any,
  executeFunction: (params: any) => Promise<any>
): Promise<any> {
  try {
    // 첫 번째 시도: 원본 파라미터
    return await executeFunction(requestParams);
    
  } catch (error: any) {
    if (error.message?.includes('Unsupported parameter') || error.message?.includes('temperature')) {
      console.log(`🔧 [자동 복구] ${modelName} 파라미터 오류 감지, 호환 파라미터로 재시도`);
      
      // 호환 파라미터로 자동 변환
      const compatibleParams = generateOptimalParams(modelName, {
        maxTokens: requestParams.max_tokens || requestParams.max_completion_tokens || 1000
      });
      
      // 메시지와 모델은 유지
      const recoveredParams = {
        model: requestParams.model,
        messages: requestParams.messages,
        ...compatibleParams
      };
      
      return await executeFunction(recoveredParams);
    }
    
    throw error; // 다른 오류는 그대로 전파
  }
}