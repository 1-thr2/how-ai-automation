/**
 * JSON 생성 품질 자동 검증 및 수정 시스템
 * 🎯 목적: 백엔드에서 생성된 JSON의 구문 오류를 자동으로 감지하고 수정
 */

/**
 * 🔧 위험한 JSON 패턴들 자동 감지 및 수정
 */
export function sanitizeJSONString(jsonString: string): string {
  let sanitized = jsonString;
  
  // 1. 잘못된 Unicode escape 문자 수정
  sanitized = sanitized.replace(/\\u0000[a-zA-Z]/g, ''); // \u0000a → 제거
  
  // 2. 잘못된 escape 문자 수정
  sanitized = sanitized.replace(/\\([^"\\\/bfnrt])/g, '$1'); // 불필요한 백슬래시 제거
  
  // 3. 문자열 내부의 따옴표 escape 처리
  sanitized = sanitized.replace(/(?<!\\)"/g, '\\"'); // 이미 escape되지 않은 따옴표 처리
  sanitized = sanitized.replace(/\\\\"/g, '\\"'); // 이중 escape 수정
  
  // 4. JSON 구조 복구
  if (!sanitized.trim().startsWith('{')) {
    sanitized = '{' + sanitized;
  }
  if (!sanitized.trim().endsWith('}')) {
    sanitized = sanitized + '}';
  }
  
  // 5. 마지막 콤마 제거
  sanitized = sanitized.replace(/,(\s*[}\]])/g, '$1');
  
  return sanitized;
}

/**
 * 🧠 JSON 파싱 시도 및 자동 복구
 */
export function parseJSONWithRecovery(jsonString: string): any {
  // 1차 시도: 원본 그대로
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.log('🔧 [JSON 복구] 1차 파싱 실패, 자동 복구 시도...');
  }
  
  // 2차 시도: 기본 sanitization
  try {
    const sanitized = sanitizeJSONString(jsonString);
    return JSON.parse(sanitized);
  } catch (error) {
    console.log('🔧 [JSON 복구] 2차 파싱 실패, 고급 복구 시도...');
  }
  
  // 3차 시도: 구조적 복구
  try {
    const structurallyRecovered = recoverJSONStructure(jsonString);
    return JSON.parse(structurallyRecovered);
  } catch (error) {
    console.error('❌ [JSON 복구] 모든 복구 시도 실패:', error);
    return null;
  }
}

/**
 * 🏗️ JSON 구조 복구 (cards 배열 구조 강제)
 */
function recoverJSONStructure(jsonString: string): string {
  // cards 배열이 없으면 생성
  if (!jsonString.includes('"cards"')) {
    // 단일 객체를 cards 배열로 감싸기
    const cleanedContent = jsonString.replace(/^{/, '').replace(/}$/, '');
    return `{"cards": [{${cleanedContent}}]}`;
  }
  
  return jsonString;
}

/**
 * 📋 코드 블록 내 특수문자 자동 escape
 */
export function escapeCodeBlockContent(codeContent: string): string {
  return codeContent
    .replace(/\\/g, '\\\\') // 백슬래시 escape
    .replace(/"/g, '\\"')   // 따옴표 escape
    .replace(/\n/g, '\\n')  // 개행 문자 escape
    .replace(/\r/g, '\\r')  // 캐리지 리턴 escape
    .replace(/\t/g, '\\t'); // 탭 문자 escape
}

/**
 * 🔍 JSON 품질 검증 스코어
 */
export function validateJSONQuality(jsonString: string): {
  score: number;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;
  
  // Unicode escape 문제 감지
  if (/\\u0000[a-zA-Z]/.test(jsonString)) {
    issues.push('잘못된 Unicode escape 문자 발견');
    recommendations.push('Unicode escape 문자 제거 필요');
    score -= 20;
  }
  
  // 문자열 escape 문제 감지
  if (/(?<!\\)"/.test(jsonString)) {
    issues.push('Escape되지 않은 따옴표 발견');
    recommendations.push('문자열 내 따옴표 escape 처리 필요');
    score -= 15;
  }
  
  // cards 구조 검증
  if (!jsonString.includes('"cards"')) {
    issues.push('cards 배열 구조 누락');
    recommendations.push('응답을 cards 배열로 구조화 필요');
    score -= 25;
  }
  
  // 기본 JSON 구문 검증
  try {
    JSON.parse(jsonString);
  } catch (error) {
    issues.push('JSON 구문 오류');
    recommendations.push('JSON 구문 검증 및 수정 필요');
    score -= 40;
  }
  
  return {
    score: Math.max(0, score),
    issues,
    recommendations
  };
}