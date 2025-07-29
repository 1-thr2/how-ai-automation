export interface AutomationTemplate {
  id: string;
  title: string;
  description: string;
  category: 'marketing' | 'data' | 'communication' | 'reporting';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeToImplement: string;
  tools: {
    name: string;
    type: 'api' | 'service' | 'library';
    version?: string;
    cost: 'free' | 'paid' | 'freemium';
    docs: string;
  }[];
  steps: {
    title: string;
    description: string;
    code?: string;
    estimatedTime: string;
  }[];
  metrics?: {
    name: string;
    description: string;
    unit: string;
  }[];
  prerequisites: string[];
  alternatives: {
    name: string;
    pros: string[];
    cons: string[];
  }[];
}

export const automationTemplates: AutomationTemplate[] = [
  {
    id: 'marketing-report',
    title: '마케팅 성과 리포트 자동화',
    description:
      'Google Ads, Facebook Ads, TikTok Ads의 데이터를 자동으로 수집하고 통합하여 일일/주간/월간 리포트를 생성합니다.',
    category: 'marketing',
    difficulty: 'intermediate',
    timeToImplement: '4-6시간',
    tools: [
      {
        name: 'Google Ads API',
        type: 'api',
        version: 'v14',
        cost: 'free',
        docs: 'https://developers.google.com/google-ads/api/docs/start',
      },
      {
        name: 'Facebook Marketing API',
        type: 'api',
        version: 'v18.0',
        cost: 'free',
        docs: 'https://developers.facebook.com/docs/marketing-apis',
      },
      {
        name: 'BigQuery',
        type: 'service',
        cost: 'paid',
        docs: 'https://cloud.google.com/bigquery/docs',
      },
      {
        name: 'Looker Studio',
        type: 'service',
        cost: 'free',
        docs: 'https://support.google.com/looker-studio',
      },
    ],
    steps: [
      {
        title: 'API 인증 설정',
        description: '각 광고 플랫폼의 API 키와 인증 정보를 설정합니다.',
        code: `// Google Ads API 설정
const googleAdsClient = new GoogleAdsClient({
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  developer_token: process.env.DEVELOPER_TOKEN
});

// Facebook Marketing API 설정
const fb = require('facebook-nodejs-business-sdk');
const api = fb.FacebookAdsApi.init(process.env.FB_ACCESS_TOKEN);`,
        estimatedTime: '30분',
      },
      {
        title: '데이터 수집 스크립트 작성',
        description: '각 플랫폼에서 광고 성과 데이터를 수집하는 스크립트를 작성합니다.',
        code: `// Google Ads 데이터 수집
async function fetchGoogleAdsData() {
  const query = \`
    SELECT 
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date DURING LAST_7_DAYS
  \`;
  
  const response = await googleAdsClient.query(query);
  return processAdsData(response);
}

// Facebook Ads 데이터 수집
async function fetchFacebookAdsData() {
  const fields = [
    'campaign_name',
    'impressions',
    'clicks',
    'spend',
    'conversions',
    'conversion_value'
  ];
  
  const response = await api.call(
    'GET',
    ['act_' + process.env.FB_AD_ACCOUNT_ID, 'insights'],
    { fields, time_range: { since: '7days_ago' } }
  );
  
  return processFacebookData(response);
}`,
        estimatedTime: '2시간',
      },
    ],
    metrics: [
      {
        name: 'CPC',
        description: '클릭당 비용',
        unit: '원',
      },
      {
        name: 'CTR',
        description: '클릭률',
        unit: '%',
      },
      {
        name: 'ROAS',
        description: '광고 투자 수익률',
        unit: '%',
      },
      {
        name: 'CAC',
        description: '고객 획득 비용',
        unit: '원',
      },
    ],
    prerequisites: [
      'Google Ads API 액세스 권한',
      'Facebook Marketing API 액세스 권한',
      'BigQuery 프로젝트 설정',
      'Looker Studio 계정',
    ],
    alternatives: [
      {
        name: 'Supermetrics',
        pros: ['쉬운 설정', '다양한 데이터 소스 지원', '자동 리포트 생성'],
        cons: ['월 구독료 발생', 'API 호출 제한', '커스터마이징 제한'],
      },
      {
        name: 'Funnel.io',
        pros: ['실시간 데이터 동기화', '고급 데이터 변환 기능', '맞춤형 리포트 템플릿'],
        cons: ['높은 구독료', '복잡한 초기 설정', '제한된 API 액세스'],
      },
    ],
  },
];
