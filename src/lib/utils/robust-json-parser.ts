/**
 * 🔧 Robust JSON Parser
 * GPT 응답의 다양한 형태를 안전하게 파싱
 */

export function parseRobustJSON(content: string, fallback: any = {}): any {
  if (!content || typeof content !== 'string') {
    return fallback;
  }

  try {
    // 1단계: 기본 정리
    let cleaned = content.trim();
    
    // 2단계: ```json 코드블록 제거
    if (cleaned.includes('```json')) {
      cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    }
    
    // 3단계: 일반 ``` 코드블록 제거
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```\s*/g, '').replace(/```\s*$/g, '');
    }
    
    // 4단계: 개행과 과도한 공백 정리
    cleaned = cleaned
      .replace(/\r\n/g, '\n')  // Windows 개행 통일
      .replace(/\n+/g, '\n')   // 연속 개행 정리
      .replace(/\s+/g, ' ')    // 연속 공백 정리
      .trim();
    
    // 5단계: JSON 시작/끝 부분 찾기
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
    
    // 6단계: 기본 파싱 시도
    const parsed = JSON.parse(cleaned);
    
    console.log('✅ [JSON Parser] 파싱 성공');
    return parsed;
    
  } catch (firstError) {
    console.warn(`⚠️ [JSON Parser] 1차 파싱 실패: ${firstError.message}`);
    
    // 7단계: 더 공격적인 정리 후 재시도
    try {
      let aggressive = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*$/g, '')
        .replace(/```/g, '')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // JSON 부분만 추출
      const startBrace = aggressive.indexOf('{');
      const endBrace = aggressive.lastIndexOf('}');
      
      if (startBrace !== -1 && endBrace !== -1) {
        aggressive = aggressive.substring(startBrace, endBrace + 1);
        
        const parsed = JSON.parse(aggressive);
        console.log('✅ [JSON Parser] 2차 파싱 성공');
        return parsed;
      }
      
    } catch (secondError) {
      console.warn(`⚠️ [JSON Parser] 2차 파싱도 실패: ${secondError.message}`);
      
      // 8단계: 배열 형태 시도 (일부 응답이 배열로 올 수 있음)
      try {
        const arrayStart = content.indexOf('[');
        const arrayEnd = content.lastIndexOf(']');
        
        if (arrayStart !== -1 && arrayEnd !== -1) {
          const arrayContent = content.substring(arrayStart, arrayEnd + 1);
          const parsed = JSON.parse(arrayContent);
          
          console.log('✅ [JSON Parser] 배열 파싱 성공');
          return Array.isArray(parsed) ? { items: parsed } : parsed;
        }
        
      } catch (arrayError) {
        console.error(`❌ [JSON Parser] 모든 파싱 시도 실패`);
        console.error(`원본 내용 (첫 200자): ${content.substring(0, 200)}`);
      }
    }
  }
  
  // 모든 시도 실패시 fallback 반환
  console.warn(`🔄 [JSON Parser] fallback 사용: ${JSON.stringify(fallback)}`);
  return fallback;
}