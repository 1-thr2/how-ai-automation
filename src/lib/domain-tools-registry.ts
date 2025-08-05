/**
 * 📊 도메인별 대표 도구 레지스트리
 * 범용성 확보: 특정 도메인에 종속되지 않고 동적으로 최적 도구 선택
 */

export interface DomainTool {
  name: string;
  category: 'free' | 'freemium' | 'paid';
  difficulty: 'easy' | 'medium' | 'advanced';
  apiSupport: boolean;
  webhookSupport: boolean;
  pricing: string;
  setupTime: string;
  description: string;
  bestFor: string[];
}

export interface DomainToolRegistry {
  [domain: string]: {
    dataCollection: DomainTool[];
    automation: DomainTool[];
    reporting: DomainTool[];
    notification: DomainTool[];
  };
}

/**
 * 🎯 도메인별 도구 매핑
 */
export const DOMAIN_TOOLS: DomainToolRegistry = {
  // 📊 광고/마케팅 도메인
  advertising: {
    dataCollection: [
      {
        name: 'Google Ads API',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: false,
        pricing: '무료 (API 호출)',
        setupTime: '30분',
        description: '구글 광고 데이터 직접 수집',
        bestFor: ['구글광고', '검색광고', '디스플레이광고']
      },
      {
        name: 'Supermetrics',
        category: 'paid',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: true,
        pricing: '$99/월',
        setupTime: '10분',
        description: '다중 광고 플랫폼 통합 데이터 수집',
        bestFor: ['페이스북광고', '인스타그램광고', '구글광고', '네이버광고']
      },
      {
        name: 'Google Apps Script + Sheets',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '45분',
        description: '구글 생태계 완전 무료 데이터 수집',
        bestFor: ['구글광고', '애널리틱스', '시트통합']
      },
      {
        name: 'Google Alerts',
        category: 'free',
        difficulty: 'easy',
        apiSupport: false,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '5분',
        description: '브랜드 언급 무료 모니터링 서비스',
        bestFor: ['브랜드모니터링', 'sns언급감지', '뉴스모니터링', '무료감지']
      },
      {
        name: 'Mention.com',
        category: 'freemium',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 2개 키워드, $29/월~',
        setupTime: '10분',
        description: 'SNS/웹 브랜드 언급 전문 모니터링',
        bestFor: ['브랜드모니터링', 'sns감지', '소셜리스닝', '경쟁사분석']
      }
    ],
    automation: [
      {
        name: 'Zapier',
        category: 'freemium',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 100회/월, $20/월~',
        setupTime: '15분',
        description: '광고 플랫폼 간 데이터 자동 연동',
        bestFor: ['데이터동기화', '알림설정', '리포팅자동화']
      },
      {
        name: 'Google Apps Script',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '30분',
        description: '구글 생태계 맞춤 자동화',
        bestFor: ['시트자동화', '메일발송', '스케줄실행']
      }
    ],
    reporting: [
      {
        name: 'Google Data Studio',
        category: 'free',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '20분',
        description: '구글 생태계 통합 대시보드',
        bestFor: ['광고대시보드', '실시간차트', '자동리포트']
      },
      {
        name: 'Looker Studio',
        category: 'free',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '15분',
        description: 'Data Studio의 새로운 이름, 동일 기능',
        bestFor: ['시각화', '대시보드', '자동차트']
      }
    ],
    notification: [
      {
        name: 'Slack Webhooks',
        category: 'free',
        difficulty: 'easy',
        apiSupport: false,
        webhookSupport: true,
        pricing: '슬랙 플랜에 포함',
        setupTime: '5분',
        description: '슬랙으로 즉시 알림 발송',
        bestFor: ['팀알림', '예산경고', '성과공유']
      },
      {
        name: 'Gmail + Apps Script',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '15분',
        description: '이메일 자동 발송 시스템',
        bestFor: ['이메일알림', '자동리포트', '정기보고']
      }
    ]
  },

  // 👥 HR/인사 도메인
  hr: {
    dataCollection: [
      {
        name: 'Google Forms',
        category: 'free',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '10분',
        description: '직원 설문, 피드백 수집',
        bestFor: ['설문조사', '피드백수집', '지원서접수']
      },
      {
        name: 'Typeform',
        category: 'freemium',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 100응답/월, $25/월~',
        setupTime: '15분',
        description: '인터랙티브 설문 및 채용 폼',
        bestFor: ['채용설문', '온보딩폼', '만족도조사']
      }
    ],
    automation: [
      {
        name: 'Microsoft Power Automate',
        category: 'freemium',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: true,
        pricing: '오피스365 포함, $15/월~',
        setupTime: '20분',
        description: '오피스 생태계 HR 자동화',
        bestFor: ['문서자동화', '승인프로세스', '팀즈연동']
      },
      {
        name: 'Slack Workflow Builder',
        category: 'free',
        difficulty: 'easy',
        apiSupport: false,
        webhookSupport: true,
        pricing: '슬랙 플랜에 포함',
        setupTime: '10분',
        description: '슬랙 내장 워크플로우',
        bestFor: ['온보딩자동화', '휴가승인', '팀알림']
      }
    ],
    reporting: [
      {
        name: 'Google Sheets + Charts',
        category: 'free',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '15분',
        description: '직원 데이터 분석 대시보드',
        bestFor: ['인력현황', '근태분석', 'KPI추적']
      }
    ],
    notification: [
      {
        name: 'Teams Webhooks',
        category: 'free',
        difficulty: 'easy',
        apiSupport: false,
        webhookSupport: true,
        pricing: '팀즈 플랜에 포함',
        setupTime: '5분',
        description: '팀즈로 HR 알림 발송',
        bestFor: ['HR공지', '승인알림', '일정공유']
      }
    ]
  },

  // 💰 재무/회계 도메인
  finance: {
    dataCollection: [
      {
        name: 'Google Sheets API',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '30분',
        description: '재무 데이터 수집 및 관리',
        bestFor: ['예산관리', '지출추적', '매출분석']
      },
      {
        name: 'Plaid API',
        category: 'freemium',
        difficulty: 'advanced',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 100건/월, $0.35/건',
        setupTime: '60분',
        description: '은행 계좌 연동 데이터 수집',
        bestFor: ['계좌연동', '거래내역', '자산관리']
      }
    ],
    automation: [
      {
        name: 'Google Apps Script',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '45분',
        description: '재무 계산 및 보고서 자동화',
        bestFor: ['예산계산', '세금계산', '월말정산']
      }
    ],
    reporting: [
      {
        name: 'Google Data Studio',
        category: 'free',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '20분',
        description: '재무 대시보드 및 차트',
        bestFor: ['재무대시보드', 'P&L차트', '예산현황']
      }
    ],
    notification: [
      {
        name: 'Email + Apps Script',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '15분',
        description: '재무 알림 및 보고서 발송',
        bestFor: ['예산경고', '정기보고', '지출알림']
      }
    ]
  },

  // 🛒 커머스/이커머스 도메인
  ecommerce: {
    dataCollection: [
      {
        name: 'Shopify API',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 (API 호출)',
        setupTime: '30분',
        description: '쇼피파이 스토어 데이터 수집',
        bestFor: ['주문데이터', '고객정보', '재고관리']
      },
      {
        name: 'WooCommerce REST API',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 (워드프레스)',
        setupTime: '45분',
        description: '우커머스 스토어 데이터 연동',
        bestFor: ['주문관리', '상품관리', '고객관리']
      }
    ],
    automation: [
      {
        name: 'Zapier E-commerce Apps',
        category: 'freemium',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 100회/월, $20/월~',
        setupTime: '15분',
        description: '이커머스 플랫폼 간 자동화',
        bestFor: ['주문동기화', '재고업데이트', '고객알림']
      }
    ],
    reporting: [
      {
        name: 'Google Analytics 4',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '30분',
        description: '이커머스 성과 분석',
        bestFor: ['매출분석', '고객분석', '전환추적']
      }
    ],
    notification: [
      {
        name: 'Discord Webhooks',
        category: 'free',
        difficulty: 'easy',
        apiSupport: false,
        webhookSupport: true,
        pricing: '완전 무료',
        setupTime: '5분',
        description: '디스코드로 주문 알림',
        bestFor: ['주문알림', '재고경고', '매출공유']
      }
    ]
  },

  // 🌐 범용/기타 도메인 (모든 케이스에 적용 가능한 도구들)
  general: {
    dataCollection: [
      {
        name: 'Google Forms',
        category: 'free',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '10분',
        description: '데이터 수집용 범용 설문 도구',
        bestFor: ['설문조사', '데이터수집', '피드백', '신청서']
      },
      {
        name: 'Google Sheets',
        category: 'free',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '5분',
        description: '데이터 정리 및 관리용 스프레드시트',
        bestFor: ['데이터정리', '계산', '차트', '협업']
      },
      {
        name: 'Airtable',
        category: 'freemium',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 1200레코드, $10/월~',
        setupTime: '15분',
        description: '데이터베이스와 스프레드시트의 결합',
        bestFor: ['프로젝트관리', '데이터베이스', '협업', '자동화']
      }
    ],
    automation: [
      {
        name: 'IFTTT',
        category: 'freemium',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 5개, $2/월~',
        setupTime: '10분',
        description: '가장 간단한 범용 자동화 도구',
        bestFor: ['간단자동화', '알림', '연동', 'iot']
      },
      {
        name: 'Google Apps Script',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '30분',
        description: '구글 생태계 범용 자동화 스크립트',
        bestFor: ['구글서비스연동', '스케줄실행', '이메일자동화', '데이터처리']
      },
      {
        name: 'Zapier',
        category: 'freemium',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 100회/월, $20/월~',
        setupTime: '15분',
        description: '가장 많은 앱을 지원하는 범용 자동화',
        bestFor: ['앱연동', '데이터동기화', '워크플로우', '알림']
      },
      {
        name: 'Pipedream',
        category: 'freemium',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 100,000회/월',
        setupTime: '20분',
        description: '개발자 친화적 범용 자동화 플랫폼',
        bestFor: ['api연동', '커스텀로직', '실시간처리', '웹훅']
      }
    ],
    reporting: [
      {
        name: 'Google Data Studio',
        category: 'free',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '20분',
        description: '범용 데이터 시각화 및 대시보드',
        bestFor: ['대시보드', '차트', '리포트', '시각화']
      },
      {
        name: 'Notion',
        category: 'freemium',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: false,
        pricing: '무료 개인용, $8/월~',
        setupTime: '15분',
        description: '문서 기반 데이터 정리 및 보고',
        bestFor: ['문서작성', '데이터정리', '프로젝트관리', '협업']
      }
    ],
    notification: [
      {
        name: 'Discord Webhooks',
        category: 'free',
        difficulty: 'easy',
        apiSupport: false,
        webhookSupport: true,
        pricing: '완전 무료',
        setupTime: '5분',
        description: '디스코드를 활용한 범용 알림 시스템',
        bestFor: ['팀알림', '실시간알림', '봇알림', '커뮤니티']
      },
      {
        name: 'Email (Gmail/Outlook)',
        category: 'free',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '5분',
        description: '가장 기본적인 범용 알림 수단',
        bestFor: ['이메일알림', '정기보고', '개인알림', '공식알림']
      },
      {
        name: 'Slack Webhooks',
        category: 'freemium',
        difficulty: 'easy',
        apiSupport: false,
        webhookSupport: true,
        pricing: '무료 플랜 있음',
        setupTime: '5분',
        description: '슬랙 기반 팀 알림 시스템',
        bestFor: ['팀협업', '프로젝트알림', '업무알림', '실시간소통']
      }
    ]
  },

  // 🎧 고객 지원/서비스 도메인 (새로 추가)
  customer_support: {
    dataCollection: [
      {
        name: 'Gmail API',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: false,
        pricing: '무료 (API 할당량)',
        setupTime: '30분',
        description: '지메일 기반 고객 문의 자동 수집',
        bestFor: ['이메일문의', '고객지원', '자동분류']
      },
      {
        name: 'Google Forms',
        category: 'free',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '10분',
        description: '고객 문의/피드백 폼 자동 수집',
        bestFor: ['고객피드백', '문의접수', '만족도조사']
      },
      {
        name: 'Typeform',
        category: 'freemium',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 플랜 있음',
        setupTime: '15분',
        description: '고품질 고객 설문/문의 폼',
        bestFor: ['고객설문', '피드백수집', '만족도조사']
      }
    ],
    automation: [
      {
        name: 'Zapier Customer Support',
        category: 'freemium',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 플랜 있음',
        setupTime: '15분',
        description: '고객 지원 프로세스 자동화',
        bestFor: ['문의자동분류', '티켓생성', '우선순위설정']
      },
      {
        name: 'Google Apps Script',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '45분',
        description: '이메일 필터링 및 우선 처리 자동화',
        bestFor: ['긴급키워드감지', '자동분류', '우선순위처리']
      },
      {
        name: 'Make (Integromat)',
        category: 'freemium',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: true,
        pricing: '무료 1000회/월',
        setupTime: '30분',
        description: '복잡한 고객 지원 워크플로우',
        bestFor: ['다단계처리', '조건부라우팅', '에스컬레이션']
      }
    ],
    reporting: [
      {
        name: 'Google Data Studio',
        category: 'free',
        difficulty: 'medium',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '45분',
        description: '고객 지원 성과 대시보드',
        bestFor: ['응답시간분석', '만족도트렌드', 'KPI대시보드']
      },
      {
        name: 'Google Sheets',
        category: 'free',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '20분',
        description: '고객 문의 현황 리포트',
        bestFor: ['기본통계', '처리현황', '담당자별성과']
      }
    ],
    notification: [
      {
        name: 'Slack Webhooks',
        category: 'freemium',
        difficulty: 'easy',
        apiSupport: false,
        webhookSupport: true,
        pricing: '무료 플랜 있음',
        setupTime: '5분',
        description: '긴급 문의 즉시 팀 알림',
        bestFor: ['긴급알림', '팀협업', '실시간모니터링']
      },
      {
        name: 'Discord Webhooks',
        category: 'free',
        difficulty: 'easy',
        apiSupport: false,
        webhookSupport: true,
        pricing: '완전 무료',
        setupTime: '5분',
        description: '디스코드로 고객 문의 알림',
        bestFor: ['팀채널알림', '긴급문의', '실시간협업']
      },
      {
        name: 'Email Notifications',
        category: 'free',
        difficulty: 'easy',
        apiSupport: true,
        webhookSupport: false,
        pricing: '완전 무료',
        setupTime: '5분',
        description: '관리자/담당자 이메일 알림',
        bestFor: ['관리자알림', '담당자배정', '처리완료통지']
      }
    ]
  }
};

/**
 * 🎯 사용자 입력 기반 도메인 자동 감지
 */
export function detectDomain(userInput: string, followupAnswers?: any): string {
  const input = userInput.toLowerCase();
  const answers = JSON.stringify(followupAnswers || {}).toLowerCase();
  const content = `${input} ${answers}`;

  // 광고/마케팅 키워드 (SNS 모니터링 포함)
  const adKeywords = [
    '광고', '마케팅', '캠페인', 'roas', 'ctr', 'cpc', '페이스북', '구글광고', '네이버광고', '성과', '전환율',
    'sns', '소셜미디어', '브랜드', '언급', '모니터링', '인스타그램', '네이버 블로그', '트위터', '유튜브', 
    '홍보', 'pr', '브랜딩', '소셜마케팅', '바이럴', '인플루언서'
  ];
  if (adKeywords.some(keyword => content.includes(keyword))) {
    return 'advertising';
  }

  // HR/인사 키워드  
  const hrKeywords = ['직원', '인사', '채용', '면접', '온보딩', '퇴사', '휴가', '근태', '급여', '평가'];
  if (hrKeywords.some(keyword => content.includes(keyword))) {
    return 'hr';
  }

  // 재무/회계 키워드
  const financeKeywords = ['재무', '회계', '예산', '비용', '매출', '수익', '지출', '세금', '정산', '계좌'];
  if (financeKeywords.some(keyword => content.includes(keyword))) {
    return 'finance';
  }

  // 고객 지원/서비스 키워드 (새로 추가)
  const customerSupportKeywords = [
    '고객사', '고객 지원', '고객 서비스', '문의', '긴급', '우선 처리', '티켓', 'cs', 'support',
    '헬프데스크', '상담', '응답', '처리', '에스컬레이션', '지원팀', '서비스팀', '고객 문의',
    '민원', '컴플레인', '불만', '요청 사항', '질문', '답변', '실시간 지원', '챗봇'
  ];
  if (customerSupportKeywords.some(keyword => content.includes(keyword))) {
    return 'customer_support';
  }

  // 커머스 키워드 (고객 키워드 제거)
  const ecommerceKeywords = ['쇼핑몰', '주문', '상품', '재고', '배송', '판매', '온라인스토어', '쇼피파이', '우커머스', '결제', '장바구니'];
  if (ecommerceKeywords.some(keyword => content.includes(keyword))) {
    return 'ecommerce';
  }

  // 기본값: 범용
  return 'general';
}

/**
 * 🛠️ 도메인별 최적 도구 추천
 */
export function getOptimalToolsForDomain(
  domain: string, 
  category: 'dataCollection' | 'automation' | 'reporting' | 'notification',
  preferFree: boolean = true
): DomainTool[] {
  const domainTools = DOMAIN_TOOLS[domain];
  if (!domainTools) return [];

  const tools = domainTools[category] || [];
  
  // 무료 도구 우선 정렬
  return tools.sort((a, b) => {
    if (preferFree) {
      if (a.category === 'free' && b.category !== 'free') return -1;
      if (a.category !== 'free' && b.category === 'free') return 1;
    }
    
    // 난이도 순 정렬 (easy > medium > advanced)
    const difficultyOrder = { easy: 0, medium: 1, advanced: 2 };
    return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
  });
}

/**
 * 📊 도메인별 통계
 */
export function getDomainToolStats(domain: string) {
  const domainTools = DOMAIN_TOOLS[domain];
  if (!domainTools) return null;

  const allTools = [
    ...domainTools.dataCollection,
    ...domainTools.automation,
    ...domainTools.reporting,
    ...domainTools.notification
  ];

  const freeTools = allTools.filter(tool => tool.category === 'free');
  const easyTools = allTools.filter(tool => tool.difficulty === 'easy');
  const apiSupportTools = allTools.filter(tool => tool.apiSupport);

  return {
    totalTools: allTools.length,
    freeTools: freeTools.length,
    easyTools: easyTools.length,
    apiSupportTools: apiSupportTools.length,
    averageSetupTime: calculateAverageSetupTime(allTools)
  };
}

function calculateAverageSetupTime(tools: DomainTool[]): number {
  const times = tools.map(tool => {
    const match = tool.setupTime.match(/(\d+)/);
    return match ? parseInt(match[1]) : 30;
  });
  
  return Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
}