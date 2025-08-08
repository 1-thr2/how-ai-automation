/**
 * 프론트-백엔드 데이터 구조 자동 매핑 시스템
 * 🎯 목적: stepId, 카드 구조 등의 불일치를 자동으로 감지하고 매핑
 */

export interface FlowStep {
  id: string;
  title: string;
  index: number;
}

export interface GuideStep {
  stepId: string;
  title: string;
  description: string;
  actions?: string[];
  codeBlock?: string;
}

export interface Card {
  type: 'flow' | 'guide';
  id: string;
  title: string;
  steps?: string[];
  detailedSteps?: GuideStep[];
  codeBlocks?: any[];
}

/**
 * 🔧 Flow Step과 Guide Step 자동 매핑
 */
export function mapFlowToGuideSteps(
  selectedFlowStep: FlowStep,
  guideCards: Card[]
): GuideStep | null {
  
  const guideCard = guideCards.find(card => card.type === 'guide');
  
  if (!guideCard || !guideCard.detailedSteps) {
    console.log('❌ [매핑] guide 카드 또는 detailedSteps 없음');
    return null;
  }
  
  // 여러 매핑 전략 시도
  const mappingStrategies = [
    // 전략 1: 정확한 stepId 매핑 ("1", "2", "3"...)
    () => {
      const stepIndex = selectedFlowStep.index + 1; // 0-based → 1-based
      return guideCard.detailedSteps!.find(step => 
        step.stepId === stepIndex.toString()
      );
    },
    
    // 전략 2: id에서 숫자 추출 ("step-0" → "1")
    () => {
      const idMatch = selectedFlowStep.id.match(/\d+/);
      if (idMatch) {
        const extractedNumber = (parseInt(idMatch[0]) + 1).toString();
        return guideCard.detailedSteps!.find(step => 
          step.stepId === extractedNumber
        );
      }
      return null;
    },
    
    // 전략 3: 제목 유사도 매칭
    () => {
      return guideCard.detailedSteps!.find(step => 
        step.title && selectedFlowStep.title && 
        calculateTitleSimilarity(step.title, selectedFlowStep.title) > 0.6
      );
    },
    
    // 전략 4: 인덱스 기반 폴백
    () => {
      const steps = guideCard.detailedSteps!;
      if (selectedFlowStep.index < steps.length) {
        return steps[selectedFlowStep.index];
      }
      return null;
    }
  ];
  
  // 각 전략을 순차적으로 시도
  for (let i = 0; i < mappingStrategies.length; i++) {
    const result = mappingStrategies[i]();
    if (result) {
      console.log(`✅ [매핑] 전략 ${i + 1} 성공: ${selectedFlowStep.id} → stepId ${result.stepId}`);
      return result;
    }
  }
  
  console.log(`❌ [매핑] 모든 전략 실패: ${selectedFlowStep.id}`);
  return null;
}

/**
 * 🔍 제목 유사도 계산 (단순 버전)
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = title1.toLowerCase().split(/\s+/);
  const words2 = title2.toLowerCase().split(/\s+/);
  
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  
  return intersection.length / union.length;
}

/**
 * 📋 카드 구조 정규화
 */
export function normalizeCardStructure(rawCards: any[]): Card[] {
  return rawCards.map(card => {
    // 기본 구조 보장
    const normalized: Card = {
      type: card.type || 'guide',
      id: card.id || generateCardId(card.type),
      title: card.title || '제목 없음',
      steps: card.steps || [],
      detailedSteps: card.detailedSteps || [],
      codeBlocks: card.codeBlocks || []
    };
    
    // detailedSteps에 stepId 자동 생성 (없는 경우)
    if (normalized.detailedSteps) {
      normalized.detailedSteps = normalized.detailedSteps.map((step, index) => ({
        ...step,
        stepId: step.stepId || (index + 1).toString()
      }));
    }
    
    return normalized;
  });
}

/**
 * 🔧 카드 ID 자동 생성
 */
function generateCardId(type: string): string {
  return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 🧠 데이터 구조 호환성 검증
 */
export function validateDataCompatibility(
  flowSteps: FlowStep[],
  guideCards: Card[]
): {
  isCompatible: boolean;
  issues: string[];
  autoFixSuggestions: string[];
} {
  const issues: string[] = [];
  const autoFixSuggestions: string[] = [];
  
  const guideCard = guideCards.find(card => card.type === 'guide');
  
  if (!guideCard) {
    issues.push('guide 카드 없음');
    autoFixSuggestions.push('guide 카드 자동 생성 필요');
    return { isCompatible: false, issues, autoFixSuggestions };
  }
  
  if (!guideCard.detailedSteps || guideCard.detailedSteps.length === 0) {
    issues.push('detailedSteps 배열 없음');
    autoFixSuggestions.push('detailedSteps 배열 자동 생성 필요');
  }
  
  // stepId 일관성 검증
  const stepIds = guideCard.detailedSteps?.map(step => step.stepId) || [];
  const expectedIds = flowSteps.map((_, index) => (index + 1).toString());
  
  const missingIds = expectedIds.filter(id => !stepIds.includes(id));
  if (missingIds.length > 0) {
    issues.push(`누락된 stepId: ${missingIds.join(', ')}`);
    autoFixSuggestions.push('누락된 stepId 자동 생성 필요');
  }
  
  const isCompatible = issues.length === 0;
  
  return { isCompatible, issues, autoFixSuggestions };
}