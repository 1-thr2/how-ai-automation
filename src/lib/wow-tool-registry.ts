/**
 * 🚀 WOW 툴 레지스트리 시스템
 * 인입값 키워드 분석으로 최적의 "와우" 툴을 자동 선택
 */

export interface WowTool {
  name: string;
  type:
    | 'slide_gen'
    | 'video_gen'
    | 'dashboard'
    | 'landing_gen'
    | 'creative_gen'
    | 'avatar_video'
    | 'audio_gen'
    | 'chatbot_gen'
    | 'workflow';
  wowScore: number; // 1-10, 높을수록 더 "와우"한 경험
  bestFor: string[]; // 키워드 매칭용
  description: string;
  how: string; // 간단한 사용법
  url: string;
  pricing: string;
  koreanSupport: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  setupTime: string; // 예: "5분", "30분"
}

/**
 * 🎯 WOW 툴 레지스트리 - 2025년 최신 도구들
 * 💰 무료 도구 우선 배치
 */
export const WOW_TOOL_REGISTRY: WowTool[] = [
  // 🆓 무료 도구들 (최우선)
  {
    name: 'Google Apps Script',
    type: 'workflow',
    wowScore: 9,
    bestFor: ['구글', '무료', '워크스페이스', '시트', '드라이브', 'gmail', '자동화'],
    description: '구글 생태계 완전 무료 자동화',
    how: '스크립트 에디터 → 코드 작성 → 트리거 설정 → 실행',
    url: 'https://script.google.com',
    pricing: '완전 무료',
    koreanSupport: true,
    difficulty: 'medium',
    setupTime: '30분',
  },
  {
    name: 'Zapier 무료 플랜',
    type: 'workflow',
    wowScore: 8,
    bestFor: ['자동화', '연동', '간단한', '미국', '앱연동', '트리거', '액션'],
    description: '앱 간 자동화 연결 (무료 100회/월)',
    how: 'Zap 생성 → 트리거 앱 → 액션 앱 → 테스트',
    url: 'https://zapier.com',
    pricing: '무료 100회/월, 유료 $20/월',
    koreanSupport: false,
    difficulty: 'easy',
    setupTime: '15분',
  },
  // 🎬 비디오 생성
  {
    name: 'Runway ML',
    type: 'video_gen',
    wowScore: 9,
    bestFor: ['영상', '비디오', '쇼츠', 'shorts', '광고', '하이라이트', '편집'],
    description: 'AI 기반 영상 생성 및 편집 - 텍스트로 영상 제작',
    how: '텍스트 입력 → AI 영상 생성 → 자막/BGM 추가 → MP4 익스포트',
    url: 'https://runwayml.com',
    pricing: '무료 3회/월, 유료 $12/월',
    koreanSupport: false,
    difficulty: 'easy',
    setupTime: '10분',
  },
  {
    name: 'HeyGen',
    type: 'avatar_video',
    wowScore: 8,
    bestFor: ['아바타', '스크립트', '소개', '교육', '프레젠테이션', '음성', '더빙'],
    description: 'AI 아바타로 스크립트 영상 제작',
    how: '스크립트 입력 → 아바타 선택 → 한국어 음성 → MP4 렌더링',
    url: 'https://heygen.com',
    pricing: '무료 1분/월, 유료 $24/월',
    koreanSupport: true,
    difficulty: 'easy',
    setupTime: '5분',
  },

  // 📊 슬라이드 생성
  {
    name: 'Zenspark',
    type: 'slide_gen',
    wowScore: 9,
    bestFor: ['ppt', '슬라이드', '발표', '프레젠테이션', '피치', 'deck', '제안서'],
    description: 'AI 기반 PPT 자동 생성 - 프롬프트로 완성 슬라이드 제작',
    how: '프롬프트 입력 → AI 슬라이드 생성 → 디자인 조정 → PPTX 다운로드',
    url: 'https://zenspark.ai',
    pricing: '무료 5개/월, 유료 $15/월',
    koreanSupport: true,
    difficulty: 'easy',
    setupTime: '5분',
  },
  {
    name: 'Beautiful.AI',
    type: 'slide_gen',
    wowScore: 7,
    bestFor: ['디자인', '템플릿', '브랜딩', '비즈니스', '보고서'],
    description: '스마트 디자인 규칙으로 자동 PPT 생성',
    how: '템플릿 선택 → 내용 입력 → 자동 디자인 → 익스포트',
    url: 'https://beautiful.ai',
    pricing: '무료 3개/월, 유료 $12/월',
    koreanSupport: false,
    difficulty: 'easy',
    setupTime: '10분',
  },

  // 📊 대시보드 생성
  {
    name: 'Hex',
    type: 'dashboard',
    wowScore: 8,
    bestFor: ['대시보드', 'bi', '분석', 'sql', '데이터', '차트', '시각화'],
    description: '노코드 데이터 대시보드 생성',
    how: '데이터 연결 → SQL/Python 셀 → 차트 생성 → 공유 URL',
    url: 'https://hex.tech',
    pricing: '무료 플랜, 유료 $20/월',
    koreanSupport: false,
    difficulty: 'medium',
    setupTime: '30분',
  },
  {
    name: 'Metabase',
    type: 'dashboard',
    wowScore: 7,
    bestFor: ['오픈소스', 'sql', '무료', '셀프호스팅', '비즈니스', 'kpi'],
    description: '오픈소스 BI 대시보드 도구',
    how: 'DB 연결 → 쿼리 작성 → 차트 생성 → 대시보드 구성',
    url: 'https://metabase.com',
    pricing: '완전 무료 (오픈소스)',
    koreanSupport: false,
    difficulty: 'medium',
    setupTime: '60분',
  },

  // 🌐 랜딩페이지 생성
  {
    name: 'Durable',
    type: 'landing_gen',
    wowScore: 8,
    bestFor: ['랜딩', '웹사이트', 'd2c', '스타트업', '론칭', '원페이지'],
    description: 'AI로 30초만에 완성 웹사이트 생성',
    how: '비즈니스 설명 → AI 사이트 생성 → 커스터마이징 → 퍼블리시',
    url: 'https://durable.co',
    pricing: '무료 체험, 유료 $12/월',
    koreanSupport: false,
    difficulty: 'easy',
    setupTime: '10분',
  },
  {
    name: 'Typedream',
    type: 'landing_gen',
    wowScore: 7,
    bestFor: ['노션', '드래그드롭', '블로그', '포트폴리오', '간단한'],
    description: '노션처럼 쉬운 웹사이트 빌더',
    how: '템플릿 선택 → 노션 스타일 편집 → 도메인 연결',
    url: 'https://typedream.com',
    pricing: '무료 플랜, 유료 $10/월',
    koreanSupport: false,
    difficulty: 'easy',
    setupTime: '20분',
  },

  // 🎨 크리에이티브 생성
  {
    name: 'Bannerbear',
    type: 'creative_gen',
    wowScore: 7,
    bestFor: ['썸네일', '배너', '일괄', 'bulk', '템플릿', '자동'],
    description: '템플릿 기반 이미지 일괄 생성',
    how: '템플릿 생성 → CSV 데이터 업로드 → 일괄 이미지 생성',
    url: 'https://bannerbear.com',
    pricing: '무료 30개/월, 유료 $49/월',
    koreanSupport: false,
    difficulty: 'medium',
    setupTime: '30분',
  },
  {
    name: 'Canva Magic',
    type: 'creative_gen',
    wowScore: 6,
    bestFor: ['디자인', '소셜', '포스터', '쉬움', '템플릿'],
    description: 'AI 기반 디자인 자동 생성',
    how: '텍스트 입력 → Magic Design → 템플릿 선택 → 다운로드',
    url: 'https://canva.com',
    pricing: '무료 플랜, 유료 $15/월',
    koreanSupport: true,
    difficulty: 'easy',
    setupTime: '5분',
  },

  // 🎵 오디오 생성
  {
    name: 'ElevenLabs',
    type: 'audio_gen',
    wowScore: 8,
    bestFor: ['음성', 'tts', '더빙', '팟캐스트', '광고', '내레이션'],
    description: 'AI 음성 합성 - 자연스러운 한국어 TTS',
    how: '텍스트 입력 → 목소리 선택 → 한국어 생성 → MP3 다운로드',
    url: 'https://elevenlabs.io',
    pricing: '무료 10분/월, 유료 $5/월',
    koreanSupport: true,
    difficulty: 'easy',
    setupTime: '5분',
  },
  {
    name: 'Murf.ai',
    type: 'audio_gen',
    wowScore: 7,
    bestFor: ['비즈니스', '교육', '프레젠테이션', 'e러닝'],
    description: '비즈니스 전용 AI 음성 생성',
    how: '스크립트 입력 → 비즈니스 톤 선택 → 한국어 생성',
    url: 'https://murf.ai',
    pricing: '무료 10분/월, 유료 $23/월',
    koreanSupport: true,
    difficulty: 'easy',
    setupTime: '10분',
  },

  // 💬 챗봇 생성
  {
    name: 'Landbot',
    type: 'chatbot_gen',
    wowScore: 7,
    bestFor: ['챗봇', '대화', '고객', '상담', '자동응답', '웹사이트'],
    description: '드래그앤드롭 챗봇 빌더',
    how: '플로우 설계 → 질문/답변 설정 → 웹사이트 임베드',
    url: 'https://landbot.io',
    pricing: '무료 100대화/월, 유료 $30/월',
    koreanSupport: false,
    difficulty: 'medium',
    setupTime: '45분',
  },
  {
    name: 'Chatbase',
    type: 'chatbot_gen',
    wowScore: 8,
    bestFor: ['gpt', '문서', '학습', '업무', 'pdf', '지식베이스'],
    description: '문서 기반 GPT 챗봇 생성',
    how: 'PDF/텍스트 업로드 → GPT 학습 → 챗봇 생성 → 임베드',
    url: 'https://chatbase.co',
    pricing: '무료 30메시지/월, 유료 $19/월',
    koreanSupport: true,
    difficulty: 'easy',
    setupTime: '15분',
  },

  // 🔄 기존 워크플로우 툴들
  {
    name: 'Make.com',
    type: 'workflow',
    wowScore: 6,
    bestFor: ['자동화', '연동', 'api', '스케줄', '트리거', '액션', '통합'],
    description: '시각적 자동화 워크플로우',
    how: '시나리오 생성 → 모듈 연결 → 트리거 설정 → 실행',
    url: 'https://make.com',
    pricing: '무료 1000회/월, 유료 $9/월',
    koreanSupport: false,
    difficulty: 'medium',
    setupTime: '60분',
  },
  {
    name: 'Zapier',
    type: 'workflow',
    wowScore: 5,
    bestFor: ['간단한', '미국', '앱연동', '트리거', '액션'],
    description: '앱 간 자동화 연결',
    how: 'Zap 생성 → 트리거 앱 → 액션 앱 → 테스트',
    url: 'https://zapier.com',
    pricing: '무료 100회/월, 유료 $20/월',
    koreanSupport: false,
    difficulty: 'easy',
    setupTime: '30분',
  },
  {
    name: 'Google Apps Script',
    type: 'workflow',
    wowScore: 4,
    bestFor: ['구글', '무료', '워크스페이스', '시트', '드라이브', 'gmail'],
    description: '구글 생태계 자동화',
    how: '스크립트 에디터 → 코드 작성 → 트리거 설정 → 실행',
    url: 'https://script.google.com',
    pricing: '완전 무료',
    koreanSupport: true,
    difficulty: 'hard',
    setupTime: '90분',
  },
];

/**
 * 🎯 키워드 기반 최적 툴 선택 함수
 */
export function selectOptimalTool(userInput: string, followupAnswers?: any): WowTool {
  const input = userInput.toLowerCase();
  const tools = WOW_TOOL_REGISTRY;

  // 🎯 한국어 키워드 추출 (2글자 이상 한글)
  const koreanKeywords = userInput.match(/[가-힣]{2,}/g) || [];
  console.log(`🔍 추출된 한국어 키워드: [${koreanKeywords.join(', ')}]`);

  // 🎯 워크플로우 우선 판단 키워드
  const workflowKeywords = [
    '자동화',
    '연동',
    '업데이트',
    '알림',
    '모니터링',
    '수집',
    '전송',
    '스케줄',
    '매일',
    '실시간',
    '시트',
    'slack',
    'dm',
    'roas',
    '성과',
    '데이터',
  ];
  const hasWorkflowContext = workflowKeywords.some(
    keyword => input.includes(keyword) || koreanKeywords.some(k => k.includes(keyword))
  );

  console.log(`🔍 워크플로우 컨텍스트: ${hasWorkflowContext ? '감지됨' : '없음'}`);

  // 키워드 매칭 및 스코어링
  const toolScores = tools.map(tool => {
    let score = 0;

    // 영문 키워드 매칭
    const englishMatchCount = tool.bestFor.filter(keyword =>
      input.includes(keyword.toLowerCase())
    ).length;

    // 한국어 키워드 매칭 (한국어 키워드는 가중치 2배)
    const koreanMatchCount = koreanKeywords.filter(korKeyword =>
      tool.bestFor.some(
        toolKeyword => korKeyword.includes(toolKeyword) || toolKeyword.includes(korKeyword)
      )
    ).length;

    const totalMatchCount = englishMatchCount + koreanMatchCount * 2;

    // 🎯 워크플로우 컨텍스트가 있으면 워크플로우 타입 대폭 우선
    if (hasWorkflowContext && tool.type === 'workflow') {
      score = (totalMatchCount + 10) * tool.wowScore; // 워크플로우 타입에 +10 보너스
    } else if (hasWorkflowContext && tool.type !== 'workflow') {
      score = Math.max(0, totalMatchCount - 5) * tool.wowScore; // 비워크플로우 타입에 -5 패널티
    } else {
      // 스코어 계산: (매칭 키워드 수 × WOW 점수)
      score = totalMatchCount * tool.wowScore;
    }

    // 한국어 지원 보너스
    if (tool.koreanSupport) score += 1;

    // 쉬운 난이도 보너스 (초보자 친화적)
    if (tool.difficulty === 'easy') score += 2;

    return { tool, score, matchCount: totalMatchCount };
  });

  console.log(
    `🔍 상위 3개 툴 스코어:`,
    toolScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => `${item.tool.name}(${item.tool.type}): ${item.score}점`)
  );

  // 가장 높은 스코어의 툴 선택
  const bestMatch = toolScores
    .filter(item => item.score > 0) // 매칭된 것만
    .sort((a, b) => b.score - a.score)[0];

  // 매칭된 툴이 없으면 기본값 (Make.com)
  if (!bestMatch) {
    return tools.find(tool => tool.name === 'Make.com')!;
  }

  return bestMatch.tool;
}

/**
 * 🔍 툴 타입별 필터링
 */
export function getToolsByType(type: WowTool['type']): WowTool[] {
  return WOW_TOOL_REGISTRY.filter(tool => tool.type === type);
}

/**
 * 📊 인기도 기반 툴 추천
 */
export function getTopWowTools(limit: number = 5): WowTool[] {
  return WOW_TOOL_REGISTRY.filter(tool => tool.wowScore >= 7)
    .sort((a, b) => b.wowScore - a.wowScore)
    .slice(0, limit);
}

/**
 * 🔧 난이도별 툴 필터링
 */
export function getToolsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): WowTool[] {
  return WOW_TOOL_REGISTRY.filter(tool => tool.difficulty === difficulty);
}
