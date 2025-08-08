/**
 * 🧠 스마트 실패 패턴 학습 시스템
 * 단순 키워드가 아닌 맥락 기반 패턴 매칭
 */

export interface FailurePattern {
  id: string;
  pattern: {
    // 맥락 기반 매칭
    contexts: string[];           // 어떤 상황에서
    actions: string[];           // 어떤 행동을 할 때
    tools: string[];             // 어떤 도구를 사용할 때
    intent: string;              // 사용자의 의도
  };
  reason: string;                // 왜 실패하는가
  alternatives: string[];        // 현실적 대안들
  severity: 'critical' | 'warning' | 'info';
  lastUpdated: string;
  examples: string[];            // 실제 실패 사례들
  confidence: number;            // 패턴 신뢰도 (0-1)
}

export interface ContextualMatch {
  pattern: FailurePattern;
  matchScore: number;
  matchReasons: string[];
  userInput: string;
  detectedContext: string;
}

/**
 * 실패 패턴 데이터베이스 (맥락 기반)
 */
export const SMART_FAILURE_PATTERNS: FailurePattern[] = [
  {
    id: 'kakao-personal-api',
    pattern: {
      contexts: ['개인 사용자', '자동 알림', '메시지 전송', '봇 개발'],
      actions: ['메시지 보내기', '알림 전송', '자동 답장', 'API 호출'],
      tools: ['카카오톡', 'kakao', '카톡'],
      intent: '개인적인 메시징 자동화'
    },
    reason: '2022년부터 카카오톡 개인 API가 비즈니스 계정으로만 제한됨. 개인 개발자는 접근 불가.',
    alternatives: [
      '텔레그램 봇 API (개인 사용 가능)',
      '이메일 자동 전송 (Gmail API)',
      'Slack 웹훅 (팀 커뮤니케이션)',
      'Discord 봇 (커뮤니티용)'
    ],
    severity: 'critical',
    lastUpdated: '2025-01-02',
    examples: [
      '카카오톡으로 자동 알림 보내기',
      '카톡 메시지 자동 답장',
      '일정 알림을 카카오톡으로'
    ],
    confidence: 0.95
  },
  {
    id: 'social-media-crawling',
    pattern: {
      contexts: ['데이터 수집', '소셜미디어 분석', '마케팅 데이터'],
      actions: ['크롤링', '스크래핑', '데이터 추출', '자동 수집'],
      tools: ['인스타그램', 'facebook', '네이버 블로그', '유튜브'],
      intent: '소셜미디어 데이터 자동 수집'
    },
    reason: '대부분의 소셜미디어 플랫폼이 크롤링을 이용약관으로 금지. 법적 위험 + IP 차단 위험.',
    alternatives: [
      '공식 API 사용 (제한적이지만 안전)',
      '공개 데이터셋 활용 (Kaggle 등)',
      'RSS 피드 활용 (공개된 정보만)',
      '수동 데이터 입력 + AI 분석'
    ],
    severity: 'critical',
    lastUpdated: '2025-01-02',
    examples: [
      '인스타그램 댓글 크롤링해서 분석',
      '네이버 블로그 글 자동 수집',
      '페이스북 포스팅 데이터 긁어오기'
    ],
    confidence: 0.90
  },
  {
    id: 'real-estate-scraping',
    pattern: {
      contexts: ['부동산 데이터', '매물 정보', '가격 분석', '시장 조사'],
      actions: ['크롤링', '데이터 수집', '매물 정보 추출', '가격 모니터링'],
      tools: ['네이버 부동산', '직방', '다방', '부동산 사이트'],
      intent: '부동산 정보 자동 수집 및 분석'
    },
    reason: '부동산 사이트들의 이용약관 위반 + 개인정보 포함된 데이터 + 법적 문제.',
    alternatives: [
      '공공데이터포털 부동산 API (공식 데이터)',
      '국토교통부 실거래가 API (무료)',
      '한국부동산원 통계 API',
      '부동산 RSS 피드 (공개 정보만)',
      '수동 조사 + 스프레드시트 분석'
    ],
    severity: 'critical',
    lastUpdated: '2025-01-02',
    examples: [
      '네이버 부동산 매물 크롤링',
      '직방 가격 정보 자동 수집',
      '부동산 가격 변동 모니터링'
    ],
    confidence: 0.88
  },
  {
    id: 'linkedin-personal-data',
    pattern: {
      contexts: ['링크드인 분석', '프로필 데이터', '네트워킹 자동화'],
      actions: ['프로필 수집', '메시지 자동화', '연결 요청', '데이터 추출'],
      tools: ['linkedin', '링크드인'],
      intent: '링크드인 개인 데이터 자동화'
    },
    reason: 'LinkedIn은 개인 API 접근을 매우 제한. 대부분의 자동화가 이용약관 위반.',
    alternatives: [
      'LinkedIn 공식 API (제한적 기능)',
      '수동 네트워킹 + CRM 관리',
      '이메일 기반 아웃리치',
      '공개 프로필 정보만 활용'
    ],
    severity: 'warning',
    lastUpdated: '2025-01-02',
    examples: [
      '링크드인 프로필 자동 수집',
      '링크드인 메시지 자동 전송',
      '연결 요청 자동화'
    ],
    confidence: 0.85
  },
  {
    id: 'generic-placeholder-solution',
    pattern: {
      contexts: ['자동화 가이드', '단계별 설명', '코드 예시'],
      actions: ['코드 생성', '가이드 작성', '예시 제공'],
      tools: ['any'],
      intent: '구체적 솔루션 요청'
    },
    reason: '플레이스홀더나 TODO가 포함된 미완성 솔루션. 사용자가 실제로 구현할 수 없음.',
    alternatives: [
      '구체적인 코드와 단계 제공',
      '실제 작동하는 예시 포함',
      '스크린샷과 함께 상세 가이드',
      '테스트 가능한 소규모 시작점'
    ],
    severity: 'warning',
    lastUpdated: '2025-01-02',
    examples: [
      '여기에 코드를 추가하세요',
      'TODO: 구현 필요',
      '이 부분은 사용자가 직접'
    ],
    confidence: 0.92
  }
];

/**
 * 🔍 맥락 기반 패턴 매칭 (정적 + 동적 패턴)
 */
export async function findContextualPatterns(
  userInput: string,
  proposedSolution: string,
  followupAnswers?: any
): Promise<ContextualMatch[]> {
  const matches: ContextualMatch[] = [];
  const combinedText = `${userInput} ${proposedSolution}`.toLowerCase();

  // 🔄 정적 + 동적 패턴 모두 로드
  const { loadAllPatterns } = await import('./failure-pattern-storage');
  const allPatterns = await loadAllPatterns();
  
  console.log(`🔍 [패턴 매칭] 총 ${allPatterns.length}개 패턴으로 분석 (정적: ${SMART_FAILURE_PATTERNS.length}개, 동적: ${allPatterns.length - SMART_FAILURE_PATTERNS.length}개)`);

  for (const pattern of allPatterns) {
    const matchScore = calculateContextualMatch(
      combinedText,
      pattern,
      userInput,
      followupAnswers
    );

    if (matchScore > 0.3) { // 30% 이상 매칭되면 위험 패턴으로 간주
      const matchReasons = getMatchReasons(combinedText, pattern);
      const detectedContext = detectPrimaryContext(combinedText, pattern);

      matches.push({
        pattern,
        matchScore,
        matchReasons,
        userInput,
        detectedContext
      });
    }
  }

  // 매칭 점수 순으로 정렬
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * 🧮 맥락 기반 매칭 점수 계산
 */
function calculateContextualMatch(
  text: string,
  pattern: FailurePattern,
  originalInput: string,
  followupAnswers?: any
): number {
  let score = 0;
  let maxScore = 0;

  // 1. 도구 매칭 (가장 높은 가중치)
  const toolWeight = 0.4;
  maxScore += toolWeight;
  const toolMatches = pattern.pattern.tools.filter(tool => 
    text.includes(tool.toLowerCase())
  );
  if (toolMatches.length > 0) {
    score += toolWeight * (toolMatches.length / pattern.pattern.tools.length);
  }

  // 2. 행동 매칭
  const actionWeight = 0.3;
  maxScore += actionWeight;
  const actionMatches = pattern.pattern.actions.filter(action => 
    text.includes(action.toLowerCase()) || originalInput.includes(action)
  );
  if (actionMatches.length > 0) {
    score += actionWeight * (actionMatches.length / pattern.pattern.actions.length);
  }

  // 3. 컨텍스트 매칭
  const contextWeight = 0.2;
  maxScore += contextWeight;
  const contextMatches = pattern.pattern.contexts.filter(context => 
    text.includes(context.toLowerCase()) || 
    isContextImplied(originalInput, context)
  );
  if (contextMatches.length > 0) {
    score += contextWeight * (contextMatches.length / pattern.pattern.contexts.length);
  }

  // 4. 의도 매칭 (의미론적)
  const intentWeight = 0.1;
  maxScore += intentWeight;
  if (isIntentMatching(originalInput, pattern.pattern.intent)) {
    score += intentWeight;
  }

  // 정규화된 점수 반환
  return maxScore > 0 ? (score / maxScore) * pattern.confidence : 0;
}

/**
 * 🔍 컨텍스트가 암시되는지 확인
 */
function isContextImplied(input: string, context: string): boolean {
  const contextImplications: Record<string, string[]> = {
    '개인 사용자': ['내가', '나는', '개인적으로', '혼자'],
    '자동 알림': ['알림', '알려주', '통지', 'notification'],
    '데이터 수집': ['수집', '모으기', '가져오기', '크롤링'],
    '소셜미디어 분석': ['sns', '소셜', '인스타', '페이스북'],
    '부동산 데이터': ['부동산', '매물', '집값', '아파트'],
    '메시지 전송': ['메시지', '메세지', '전송', '보내기']
  };

  const implications = contextImplications[context] || [];
  return implications.some(impl => input.toLowerCase().includes(impl));
}

/**
 * 🎯 의도 매칭 확인
 */
function isIntentMatching(input: string, intent: string): boolean {
  // 간단한 의미론적 매칭 (키워드 기반)
  const intentKeywords: Record<string, string[]> = {
    '개인적인 메시징 자동화': ['메시지', '알림', '자동', '톡'],
    '소셜미디어 데이터 자동 수집': ['데이터', '수집', 'sns', '분석'],
    '부동산 정보 자동 수집 및 분석': ['부동산', '매물', '분석', '모니터링'],
    '링크드인 개인 데이터 자동화': ['링크드인', '프로필', '네트워킹'],
    '구체적 솔루션 요청': ['어떻게', '방법', '단계', '가이드']
  };

  const keywords = intentKeywords[intent] || [];
  return keywords.some(keyword => input.toLowerCase().includes(keyword));
}

/**
 * 📝 매칭 이유 추출
 */
function getMatchReasons(text: string, pattern: FailurePattern): string[] {
  const reasons: string[] = [];

  pattern.pattern.tools.forEach(tool => {
    if (text.includes(tool.toLowerCase())) {
      reasons.push(`"${tool}" 도구 감지`);
    }
  });

  pattern.pattern.actions.forEach(action => {
    if (text.includes(action.toLowerCase())) {
      reasons.push(`"${action}" 행동 패턴 감지`);
    }
  });

  return reasons;
}

/**
 * 🎯 주요 컨텍스트 감지
 */
function detectPrimaryContext(text: string, pattern: FailurePattern): string {
  for (const context of pattern.pattern.contexts) {
    if (text.includes(context.toLowerCase()) || 
        isContextImplied(text, context)) {
      return context;
    }
  }
  return pattern.pattern.contexts[0] || '일반';
}

/**
 * ⚠️ 위험 패턴 조기 감지 (빠른 체크)
 */
export function quickDangerCheck(userInput: string): {
  hasDanger: boolean;
  warnings: string[];
  quickAlternatives: string[];
} {
  const warnings: string[] = [];
  const quickAlternatives: string[] = [];
  const input = userInput.toLowerCase();

  // 즉시 감지 가능한 위험 패턴들
  const quickChecks = [
    {
      patterns: ['카카오톡', '카톡'],
      actions: ['알림', '메시지', '자동'],
      warning: '카카오톡 개인 API는 2022년부터 제한됨',
      alternative: '텔레그램 봇 또는 이메일 알림 사용 권장'
    },
    {
      patterns: ['크롤링', 'crawling', '스크래핑'],
      actions: ['수집', '가져오기'],
      warning: '크롤링은 법적 위험과 이용약관 위반 가능성',
      alternative: '공식 API 또는 공공데이터 활용 권장'
    },
    {
      patterns: ['네이버 부동산', '직방', '다방'],
      actions: ['데이터', '정보', '수집'],
      warning: '부동산 사이트 크롤링은 이용약관 위반',
      alternative: '공공데이터포털 부동산 API 사용 권장'
    }
  ];

  for (const check of quickChecks) {
    const hasPattern = check.patterns.some(p => input.includes(p));
    const hasAction = check.actions.some(a => input.includes(a));
    
    if (hasPattern && hasAction) {
      warnings.push(check.warning);
      quickAlternatives.push(check.alternative);
    }
  }

  return {
    hasDanger: warnings.length > 0,
    warnings,
    quickAlternatives
  };
}

/**
 * 📚 실패 패턴 학습 (새로운 패턴 추가)
 */
export function learnFromFailure(
  userInput: string,
  failedSolution: string,
  failureReason: string,
  alternatives: string[]
): FailurePattern {
  // 실제 구현에서는 데이터베이스에 저장
  const newPattern: FailurePattern = {
    id: `learned_${Date.now()}`,
    pattern: {
      contexts: extractContexts(userInput),
      actions: extractActions(failedSolution),
      tools: extractTools(failedSolution),
      intent: inferIntent(userInput)
    },
    reason: failureReason,
    alternatives,
    severity: 'warning',
    lastUpdated: new Date().toISOString(),
    examples: [userInput],
    confidence: 0.7 // 초기 신뢰도
  };

  console.log('📚 [패턴 학습] 새로운 실패 패턴 학습:', newPattern.id);
  return newPattern;
}

// 헬퍼 함수들 (간단한 구현)
function extractContexts(input: string): string[] {
  const contexts: string[] = [];
  if (input.includes('개인') || input.includes('나는')) contexts.push('개인 사용자');
  if (input.includes('자동') || input.includes('automation')) contexts.push('자동화');
  if (input.includes('데이터') || input.includes('정보')) contexts.push('데이터 처리');
  return contexts.length > 0 ? contexts : ['일반'];
}

function extractActions(solution: string): string[] {
  const actions: string[] = [];
  if (solution.includes('수집') || solution.includes('가져오기')) actions.push('데이터 수집');
  if (solution.includes('전송') || solution.includes('보내기')) actions.push('메시지 전송');
  if (solution.includes('분석') || solution.includes('처리')) actions.push('데이터 처리');
  return actions.length > 0 ? actions : ['일반 작업'];
}

function extractTools(solution: string): string[] {
  const tools: string[] = [];
  const toolPatterns = ['google', 'excel', 'api', '카카오', 'slack', 'webhook'];
  toolPatterns.forEach(tool => {
    if (solution.toLowerCase().includes(tool)) tools.push(tool);
  });
  return tools.length > 0 ? tools : ['기타'];
}

function inferIntent(input: string): string {
  if (input.includes('알림') || input.includes('통지')) return '알림 자동화';
  if (input.includes('분석') || input.includes('리포트')) return '데이터 분석';
  if (input.includes('수집') || input.includes('모니터링')) return '정보 수집';
  return '일반 자동화';
}