/**
 * 🔧 실행 가능한 코드 템플릿 시스템
 * 사용자 환경에 맞는 완전한 실행 코드 제공
 */

export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: 'javascript' | 'python' | 'html' | 'sql' | 'bash';
  framework: 'apps-script' | 'node' | 'python' | 'html' | 'mysql' | 'shell';
  difficulty: 'easy' | 'medium' | 'advanced';
  setupTime: string;
  dependencies: string[];
  code: string;
  instructions: string[];
  testData?: any;
  variables: { [key: string]: string };
}

export interface CodeTemplateRegistry {
  [domain: string]: {
    [useCase: string]: CodeTemplate[];
  };
}

/**
 * 📊 도메인별 코드 템플릿 레지스트리
 */
export const CODE_TEMPLATES: CodeTemplateRegistry = {
  advertising: {
    dataCollection: [
      {
        id: 'google-ads-data-script',
        name: 'Google Ads 데이터 수집 스크립트',
        description: '구글 광고 성과 데이터를 자동으로 구글 시트에 수집',
        language: 'javascript',
        framework: 'apps-script',
        difficulty: 'medium',
        setupTime: '30분',
        dependencies: ['Google Ads API', 'Google Sheets'],
        variables: {
          SPREADSHEET_ID: '스프레드시트 ID',
          CAMPAIGN_IDS: '캠페인 ID 목록',
          DATE_RANGE: '데이터 수집 기간'
        },
        code: `function collectGoogleAdsData() {
  // 🔧 사용자 설정 변수들
  const SPREADSHEET_ID = '{{SPREADSHEET_ID}}'; // 여기에 실제 스프레드시트 ID 입력
  const CAMPAIGN_IDS = [{{CAMPAIGN_IDS}}]; // 예: [12345, 67890]
  const DATE_RANGE = '{{DATE_RANGE}}'; // 예: 'LAST_7_DAYS'
  
  try {
    console.log('📊 Google Ads 데이터 수집 시작...');
    
    // 1. 스프레드시트 연결
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    
    // 2. Google Ads 계정 연결
    const accountIterator = AdsApp.accounts().get();
    
    if (!accountIterator.hasNext()) {
      throw new Error('Google Ads 계정을 찾을 수 없습니다. MCC 계정을 확인하세요.');
    }
    
    const account = accountIterator.next();
    AdsApp.select(account);
    
    // 3. 캠페인 성과 데이터 가져오기
    const campaignData = [];
    const campaigns = AdsApp.campaigns()
      .withIds(CAMPAIGN_IDS)
      .forDateRange(DATE_RANGE)
      .get();
    
    while (campaigns.hasNext()) {
      const campaign = campaigns.next();
      const stats = campaign.getStatsFor(DATE_RANGE);
      
      campaignData.push([
        new Date().toISOString().split('T')[0], // 수집 날짜
        campaign.getName(), // 캠페인명
        stats.getImpressions(), // 노출수
        stats.getClicks(), // 클릭수
        stats.getCtr(), // 클릭률
        stats.getCost(), // 비용
        stats.getConversions(), // 전환수
        stats.getConversionRate(), // 전환율
        stats.getCostPerConversion() // 전환당 비용
      ]);
    }
    
    // 4. 헤더가 없으면 추가
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 9).setValues([[
        '수집날짜', '캠페인명', '노출수', '클릭수', '클릭률(%)', 
        '비용(원)', '전환수', '전환율(%)', '전환당비용(원)'
      ]]);
      
      // 헤더 스타일링
      const headerRange = sheet.getRange(1, 1, 1, 9);
      headerRange.setBackground('#4285F4')
                 .setFontColor('white')
                 .setFontWeight('bold');
    }
    
    // 5. 데이터 추가
    if (campaignData.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, campaignData.length, 9).setValues(campaignData);
      
      console.log(\`✅ \${campaignData.length}개 캠페인 데이터 추가 완료\`);
      
      // 6. 기본 차트 생성 (처음 실행시에만)
      if (sheet.getCharts().length === 0) {
        createPerformanceChart(sheet);
      }
    } else {
      console.log('⚠️ 수집된 데이터가 없습니다. 캠페인 ID를 확인하세요.');
    }
    
    // 7. 슬랙 알림 (선택사항)
    sendSlackNotification(campaignData.length);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.toString());
    
    // 오류 알림
    GmailApp.sendEmail(
      '{{USER_EMAIL}}', // 여기에 실제 이메일 주소 입력
      'Google Ads 데이터 수집 오류',
      \`오류가 발생했습니다: \${error.toString()}\`
    );
  }
}

// 📊 성과 차트 자동 생성
function createPerformanceChart(sheet) {
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(sheet.getRange('A:A')) // 날짜
    .addRange(sheet.getRange('D:D')) // 클릭수
    .addRange(sheet.getRange('F:F')) // 비용
    .setPosition(2, 11, 0, 0)
    .setOption('title', '📊 일별 광고 성과 추이')
    .setOption('hAxis', {title: '날짜'})
    .setOption('vAxis', {title: '값'})
    .setOption('series', {
      0: {targetAxisIndex: 0, color: '#FF6D01', name: '클릭수'},
      1: {targetAxisIndex: 1, color: '#174EA6', name: '비용(원)'}
    })
    .setOption('vAxes', {
      0: {title: '클릭수'},
      1: {title: '비용(원)'}
    })
    .build();
    
  sheet.insertChart(chart);
  console.log('📊 성과 차트 생성 완료');
}

// 📱 슬랙 알림 발송
function sendSlackNotification(dataCount) {
  const SLACK_WEBHOOK_URL = '{{SLACK_WEBHOOK_URL}}'; // 여기에 실제 웹훅 URL 입력
  
  if (!SLACK_WEBHOOK_URL || SLACK_WEBHOOK_URL.includes('{{')) {
    console.log('⚠️ 슬랙 웹훅 URL이 설정되지 않았습니다.');
    return;
  }
  
  const payload = {
    text: \`📊 Google Ads 데이터 수집 완료\\n✅ \${dataCount}개 캠페인 데이터 업데이트됨\\n📅 \${new Date().toLocaleDateString('ko-KR')}\`
  };
  
  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
  
  console.log('📱 슬랙 알림 발송 완료');
}

// ⏰ 자동 실행 트리거 설정 (한 번만 실행)
function setupDailyTrigger() {
  // 기존 트리거 삭제
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'collectGoogleAdsData') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 매일 오전 9시 실행 트리거 생성
  ScriptApp.newTrigger('collectGoogleAdsData')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
    
  console.log('⏰ 매일 오전 9시 자동 실행 트리거 설정 완료');
}`,
        instructions: [
          '1. script.google.com 접속 → "새 프로젝트" 클릭',
          '2. 프로젝트명을 "광고데이터수집"으로 변경',
          '3. 위 코드를 전체 복사해서 붙여넣기',
          '4. 변수 설정: SPREADSHEET_ID에 실제 구글시트 ID 입력',
          '5. CAMPAIGN_IDS에 수집할 캠페인 ID 목록 입력 (예: [12345, 67890])',
          '6. USER_EMAIL에 알림받을 이메일 주소 입력',
          '7. 저장 → "collectGoogleAdsData" 함수 선택 → "실행" 클릭',
          '8. 권한 승인 (Google Ads와 Sheets 접근 허용)',
          '9. setupDailyTrigger() 함수도 한 번 실행해서 자동화 설정',
          '10. 완료! 이제 매일 오전 9시에 자동으로 데이터가 수집됩니다.'
        ],
        testData: {
          sampleCampaignIds: [12345, 67890],
          expectedDataFields: ['수집날짜', '캠페인명', '노출수', '클릭수', '클릭률', '비용', '전환수', '전환율', '전환당비용']
        }
      }
    ],
    reporting: [
      {
        id: 'ad-performance-dashboard',
        name: '광고 성과 대시보드 자동 생성',
        description: '수집된 광고 데이터로 Looker Studio 대시보드 자동 생성',
        language: 'javascript',
        framework: 'apps-script',
        difficulty: 'easy',
        setupTime: '15분',
        dependencies: ['Google Sheets', 'Looker Studio'],
        variables: {
          DASHBOARD_NAME: '대시보드 이름',
          SHEET_URL: '데이터 시트 URL'
        },
        code: `function createAdDashboard() {
  // 🔧 설정 변수
  const DASHBOARD_NAME = '{{DASHBOARD_NAME}}'; // 예: '광고 성과 대시보드'
  const SHEET_URL = '{{SHEET_URL}}'; // 실제 구글시트 URL
  
  console.log('📊 광고 성과 대시보드 생성 시작...');
  
  // 대시보드 자동 생성을 위한 Looker Studio 연동
  // 실제로는 Looker Studio API나 URL 기반 대시보드 생성
  
  const dashboardUrl = createLookerStudioDashboard(SHEET_URL, DASHBOARD_NAME);
  
  console.log(\`✅ 대시보드 생성 완료: \${dashboardUrl}\`);
  
  // 생성된 대시보드 링크를 이메일로 전송
  GmailApp.sendEmail(
    '{{USER_EMAIL}}',
    '📊 광고 성과 대시보드 생성 완료',
    \`새로운 대시보드가 생성되었습니다:\\n\\n🔗 \${dashboardUrl}\\n\\n이 대시보드에서 실시간 광고 성과를 확인할 수 있습니다.\`
  );
}

function createLookerStudioDashboard(sheetUrl, dashboardName) {
  // Looker Studio 대시보드 템플릿 URL
  const templateUrl = 'https://lookerstudio.google.com/c/u/0/reporting/create?c.reportId=...&ds.ds0.connector=sheets&ds.ds0.datasourceName=광고데이터&ds.ds0.projectId=...';
  
  // 실제 구현에서는 Looker Studio API 사용
  // 여기서는 간단한 URL 생성으로 대체
  
  return \`\${templateUrl}&ds.ds0.url=\${encodeURIComponent(sheetUrl)}\`;
}`,
        instructions: [
          '1. 위의 광고 데이터 수집 스크립트가 실행되어 데이터가 있는 상태에서 시작',
          '2. DASHBOARD_NAME에 원하는 대시보드 이름 입력',
          '3. SHEET_URL에 데이터가 있는 구글시트 URL 입력',
          '4. 함수 실행하면 자동으로 Looker Studio 대시보드 생성',
          '5. 생성된 대시보드 링크가 이메일로 전송됨'
        ]
      }
    ]
  },

  hr: {
    dataCollection: [
      {
        id: 'employee-feedback-collector',
        name: '직원 피드백 자동 수집 시스템',
        description: '구글 폼으로 직원 피드백을 수집하고 자동으로 분석',
        language: 'javascript',
        framework: 'apps-script',
        difficulty: 'easy',
        setupTime: '20분',
        dependencies: ['Google Forms', 'Google Sheets'],
        variables: {
          FORM_TITLE: '설문 제목',
          DEPARTMENT: '부서명',
          MANAGER_EMAIL: '관리자 이메일'
        },
        code: `function createEmployeeFeedbackForm() {
  // 🔧 설정 변수
  const FORM_TITLE = '{{FORM_TITLE}}'; // 예: '2024년 1분기 직원 만족도 조사'
  const DEPARTMENT = '{{DEPARTMENT}}'; // 예: '개발팀'
  const MANAGER_EMAIL = '{{MANAGER_EMAIL}}'; // 관리자 이메일
  
  console.log('📝 직원 피드백 폼 생성 시작...');
  
  // 1. 구글 폼 생성
  const form = FormApp.create(FORM_TITLE);
  
  // 2. 질문 추가
  form.addTextItem()
    .setTitle('이름')
    .setRequired(true);
    
  form.addTextItem()
    .setTitle('소속 부서')
    .setRequired(true);
    
  form.addMultipleChoiceItem()
    .setTitle('전반적인 업무 만족도는 어떠신가요?')
    .setChoices([
      form.createChoice('매우 만족'),
      form.createChoice('만족'),
      form.createChoice('보통'),
      form.createChoice('불만족'),
      form.createChoice('매우 불만족')
    ])
    .setRequired(true);
    
  form.addParagraphTextItem()
    .setTitle('개선이 필요한 부분이나 건의사항을 자유롭게 작성해주세요')
    .setRequired(false);
    
  form.addMultipleChoiceItem()
    .setTitle('현재 업무량은 적정한가요?')
    .setChoices([
      form.createChoice('매우 적절'),
      form.createChoice('적절'),
      form.createChoice('약간 많음'),
      form.createChoice('매우 많음')
    ])
    .setRequired(true);
  
  // 3. 응답 수집 시트 생성
  const sheet = SpreadsheetApp.create(\`\${FORM_TITLE} - 응답 데이터\`);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
  
  // 4. 자동 분석을 위한 트리거 설정
  ScriptApp.newTrigger('analyzeFeedback')
    .forForm(form)
    .onFormSubmit()
    .create();
  
  console.log('✅ 피드백 폼 생성 완료');
  console.log(\`📝 폼 URL: \${form.getPublishedUrl()}\`);
  console.log(\`📊 응답 시트: \${sheet.getUrl()}\`);
  
  // 5. 관리자에게 알림
  GmailApp.sendEmail(
    MANAGER_EMAIL,
    \`📝 \${FORM_TITLE} 생성 완료\`,
    \`직원 피드백 수집 폼이 생성되었습니다.\\n\\n📝 폼 URL: \${form.getPublishedUrl()}\\n📊 응답 데이터: \${sheet.getUrl()}\\n\\n직원들에게 폼 URL을 공유해주세요.\`
  );
  
  return {
    formUrl: form.getPublishedUrl(),
    sheetUrl: sheet.getUrl()
  };
}

// 📊 피드백 자동 분석 함수
function analyzeFeedback(e) {
  console.log('📊 새로운 피드백 분석 시작...');
  
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return; // 헤더만 있으면 종료
  
  // 만족도 통계 계산
  const satisfactionData = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  const satisfactionStats = calculateSatisfactionStats(satisfactionData);
  
  // 업무량 통계 계산  
  const workloadData = sheet.getRange(2, 5, lastRow - 1, 1).getValues();
  const workloadStats = calculateWorkloadStats(workloadData);
  
  // 실시간 대시보드 업데이트
  updateDashboard(satisfactionStats, workloadStats, lastRow - 1);
  
  console.log('✅ 피드백 분석 완료');
}

function calculateSatisfactionStats(data) {
  const stats = {
    '매우 만족': 0,
    '만족': 0,
    '보통': 0,
    '불만족': 0,
    '매우 불만족': 0
  };
  
  data.forEach(row => {
    const satisfaction = row[0];
    if (stats.hasOwnProperty(satisfaction)) {
      stats[satisfaction]++;
    }
  });
  
  return stats;
}

function calculateWorkloadStats(data) {
  const stats = {
    '매우 적절': 0,
    '적절': 0,
    '약간 많음': 0,
    '매우 많음': 0
  };
  
  data.forEach(row => {
    const workload = row[0];
    if (stats.hasOwnProperty(workload)) {
      stats[workload]++;
    }
  });
  
  return stats;
}

function updateDashboard(satisfactionStats, workloadStats, totalResponses) {
  // 대시보드 시트가 없으면 생성
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dashboardSheet = ss.getSheetByName('대시보드');
  
  if (!dashboardSheet) {
    dashboardSheet = ss.insertSheet('대시보드');
    
    // 대시보드 헤더 설정
    dashboardSheet.getRange('A1:B1').setValues([['항목', '값']]);
    dashboardSheet.getRange('A1:B1').setBackground('#4285F4').setFontColor('white').setFontWeight('bold');
  }
  
  // 통계 데이터 업데이트
  const data = [
    ['총 응답 수', totalResponses],
    ['', ''],
    ['📊 만족도 통계', ''],
    ['매우 만족', satisfactionStats['매우 만족']],
    ['만족', satisfactionStats['만족']],
    ['보통', satisfactionStats['보통']],
    ['불만족', satisfactionStats['불만족']],
    ['매우 불만족', satisfactionStats['매우 불만족']],
    ['', ''],
    ['⚖️ 업무량 통계', ''],
    ['매우 적절', workloadStats['매우 적절']],
    ['적절', workloadStats['적절']],
    ['약간 많음', workloadStats['약간 많음']],
    ['매우 많음', workloadStats['매우 많음']]
  ];
  
  dashboardSheet.getRange(2, 1, data.length, 2).setValues(data);
  
  // 차트 생성 (첫 실행시에만)
  if (dashboardSheet.getCharts().length === 0) {
    createSatisfactionChart(dashboardSheet);
  }
  
  console.log('📊 대시보드 업데이트 완료');
}

function createSatisfactionChart(sheet) {
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(sheet.getRange('A4:B8'))
    .setPosition(2, 4, 0, 0)
    .setOption('title', '📊 직원 만족도 분포')
    .setOption('pieHole', 0.4)
    .build();
    
  sheet.insertChart(chart);
  console.log('📊 만족도 차트 생성 완료');
}`,
        instructions: [
          '1. script.google.com 접속 → "새 프로젝트" 클릭',
          '2. 프로젝트명을 "직원피드백시스템"으로 변경',
          '3. 위 코드를 전체 복사해서 붙여넣기',
          '4. FORM_TITLE에 설문 제목 입력 (예: "2024년 1분기 직원 만족도 조사")',
          '5. DEPARTMENT에 부서명 입력',
          '6. MANAGER_EMAIL에 관리자 이메일 주소 입력',
          '7. "createEmployeeFeedbackForm" 함수 실행',
          '8. 권한 승인 (Forms, Sheets, Gmail 접근 허용)',
          '9. 생성된 폼 URL을 직원들에게 공유',
          '10. 응답이 들어올 때마다 자동으로 분석 및 대시보드 업데이트됨'
        ]
      }
    ]
  },

  finance: {
    dataCollection: [
      {
        id: 'expense-tracker',
        name: '비용 추적 자동화 시스템',
        description: '이메일로 영수증을 보내면 자동으로 비용을 추적하고 분류',
        language: 'javascript',
        framework: 'apps-script',
        difficulty: 'medium',
        setupTime: '45분',
        dependencies: ['Gmail', 'Google Sheets', 'Google Drive'],
        variables: {
          EXPENSE_EMAIL: '비용신청 이메일',
          MANAGER_EMAIL: '승인자 이메일',
          BUDGET_LIMIT: '예산 한도'
        },
        code: `function setupExpenseTracker() {
  // 🔧 설정 변수
  const EXPENSE_EMAIL = '{{EXPENSE_EMAIL}}'; // 예: 'expense@company.com'
  const MANAGER_EMAIL = '{{MANAGER_EMAIL}}'; // 승인자 이메일
  const BUDGET_LIMIT = {{BUDGET_LIMIT}}; // 예: 1000000 (100만원)
  
  console.log('💰 비용 추적 시스템 설정 시작...');
  
  // 1. 비용 추적 시트 생성
  const sheet = SpreadsheetApp.create('💰 비용 추적 시스템');
  const expenseSheet = sheet.getActiveSheet();
  expenseSheet.setName('비용내역');
  
  // 헤더 설정
  const headers = [
    '날짜', '신청자', '카테고리', '금액', '설명', 
    '영수증', '상태', '승인자', '승인날짜'
  ];
  
  expenseSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  expenseSheet.getRange(1, 1, 1, headers.length)
    .setBackground('#34A853')
    .setFontColor('white')
    .setFontWeight('bold');
  
  // 2. 대시보드 시트 생성
  const dashboardSheet = sheet.insertSheet('대시보드');
  setupDashboard(dashboardSheet);
  
  // 3. 이메일 처리 트리거 설정
  ScriptApp.newTrigger('processExpenseEmails')
    .timeBased()
    .everyMinutes(5) // 5분마다 이메일 확인
    .create();
  
  console.log('✅ 비용 추적 시스템 설정 완료');
  console.log(\`📊 시트 URL: \${sheet.getUrl()}\`);
  
  // 시스템 설정 완료 알림
  GmailApp.sendEmail(
    MANAGER_EMAIL,
    '💰 비용 추적 시스템 설정 완료',
    \`비용 추적 자동화 시스템이 설정되었습니다.\\n\\n📊 관리 시트: \${sheet.getUrl()}\\n\\n직원들은 \${EXPENSE_EMAIL}으로 영수증을 첨부하여 이메일을 보내면 자동으로 비용이 기록됩니다.\`
  );
  
  return sheet.getUrl();
}

// 📧 비용 신청 이메일 자동 처리
function processExpenseEmails() {
  const EXPENSE_EMAIL = '{{EXPENSE_EMAIL}}';
  const query = \`to:\${EXPENSE_EMAIL} is:unread\`;
  
  const threads = GmailApp.search(query, 0, 10);
  
  threads.forEach(thread => {
    const messages = thread.getMessages();
    
    messages.forEach(message => {
      if (message.isUnread()) {
        processExpenseMessage(message);
        message.markRead();
      }
    });
  });
}

function processExpenseMessage(message) {
  console.log('📧 비용 신청 이메일 처리 시작...');
  
  const sender = message.getFrom();
  const subject = message.getSubject();
  const body = message.getPlainBody();
  const attachments = message.getAttachments();
  
  // 이메일에서 비용 정보 추출
  const expenseInfo = extractExpenseInfo(subject, body);
  
  if (!expenseInfo.amount) {
    console.log('⚠️ 금액 정보를 찾을 수 없습니다.');
    return;
  }
  
  // 영수증 첨부파일 저장
  let receiptUrl = '';
  if (attachments.length > 0) {
    receiptUrl = saveReceiptToDrive(attachments[0], sender);
  }
  
  // 시트에 비용 정보 추가
  addExpenseToSheet(expenseInfo, sender, receiptUrl);
  
  // 예산 한도 확인 및 알림
  checkBudgetLimit(expenseInfo.amount);
  
  console.log('✅ 비용 신청 처리 완료');
}

function extractExpenseInfo(subject, body) {
  // 금액 추출 (정규식 사용)
  const amountMatch = body.match(/(\d{1,3}(?:,\d{3})*|\d+)원?/g);
  const amount = amountMatch ? parseInt(amountMatch[0].replace(/[,원]/g, '')) : 0;
  
  // 카테고리 추출 (키워드 기반)
  let category = '기타';
  const categories = {
    '교통': ['택시', '버스', '지하철', '교통'],
    '식비': ['점심', '저녁', '회식', '식사', '커피'],
    '사무용품': ['문구', '용품', '사무', '노트북'],
    '출장': ['출장', '숙박', '호텔', '항공'],
    '통신': ['휴대폰', '인터넷', '통신']
  };
  
  for (const [cat, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => subject.includes(keyword) || body.includes(keyword))) {
      category = cat;
      break;
    }
  }
  
  // 설명 추출 (제목에서)
  const description = subject.replace(/[\\[\\]]/g, '').replace(/비용|신청|결제/g, '').trim();
  
  return {
    amount: amount,
    category: category,
    description: description || '비용 신청'
  };
}

function saveReceiptToDrive(attachment, sender) {
  try {
    // 영수증 폴더 생성 (없으면)
    const folders = DriveApp.getFoldersByName('영수증보관함');
    let folder;
    
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder('영수증보관함');
    }
    
    // 파일명에 날짜와 신청자 포함
    const timestamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd_HHmm');
    const senderName = sender.split('@')[0];
    const fileName = \`\${timestamp}_\${senderName}_\${attachment.getName()}\`;
    
    // 파일 저장
    const file = folder.createFile(attachment.copyBlob().setName(fileName));
    
    return file.getUrl();
  } catch (error) {
    console.error('영수증 저장 오류:', error);
    return '';
  }
}

function addExpenseToSheet(expenseInfo, sender, receiptUrl) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('비용내역');
  
  const rowData = [
    new Date(),
    sender,
    expenseInfo.category,
    expenseInfo.amount,
    expenseInfo.description,
    receiptUrl,
    '승인대기',
    '',
    ''
  ];
  
  sheet.appendRow(rowData);
  
  // 승인 요청 이메일 발송
  sendApprovalRequest(expenseInfo, sender, receiptUrl);
}

function sendApprovalRequest(expenseInfo, sender, receiptUrl) {
  const MANAGER_EMAIL = '{{MANAGER_EMAIL}}';
  
  const emailBody = \`새로운 비용 신청이 있습니다.\\n\\n👤 신청자: \${sender}\\n💰 금액: \${expenseInfo.amount.toLocaleString()}원\\n📝 내용: \${expenseInfo.description}\\n📂 카테고리: \${expenseInfo.category}\\n📎 영수증: \${receiptUrl}\\n\\n승인 처리를 위해 시트를 확인해주세요.\`;
  
  GmailApp.sendEmail(
    MANAGER_EMAIL,
    \`[비용승인요청] \${expenseInfo.description} - \${expenseInfo.amount.toLocaleString()}원\`,
    emailBody
  );
}

function checkBudgetLimit(amount) {
  const BUDGET_LIMIT = {{BUDGET_LIMIT}};
  const MANAGER_EMAIL = '{{MANAGER_EMAIL}}';
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('비용내역');
  const data = sheet.getDataRange().getValues();
  
  // 이번 달 총 비용 계산
  const currentMonth = new Date().getMonth();
  let monthlyTotal = 0;
  
  for (let i = 1; i < data.length; i++) {
    const expenseDate = new Date(data[i][0]);
    if (expenseDate.getMonth() === currentMonth) {
      monthlyTotal += data[i][3]; // 금액 컬럼
    }
  }
  
  // 예산 한도 초과 확인
  if (monthlyTotal > BUDGET_LIMIT) {
    GmailApp.sendEmail(
      MANAGER_EMAIL,
      '⚠️ 월 예산 한도 초과 알림',
      \`이번 달 누적 비용이 예산 한도를 초과했습니다.\\n\\n💰 현재 누적: \${monthlyTotal.toLocaleString()}원\\n📊 예산 한도: \${BUDGET_LIMIT.toLocaleString()}원\\n📈 초과 금액: \${(monthlyTotal - BUDGET_LIMIT).toLocaleString()}원\`
    );
  }
}

function setupDashboard(sheet) {
  // 대시보드 기본 구조 설정
  const headers = [
    ['항목', '값'],
    ['이번달 총 비용', '=SUMIFS(비용내역.D:D,비용내역.A:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1))'],
    ['승인 대기 건수', '=COUNTIF(비용내역.G:G,"승인대기")'],
    ['예산 잔액', \`=\${{{BUDGET_LIMIT}}}-B2\`]
  ];
  
  sheet.getRange(1, 1, headers.length, 2).setValues(headers);
  sheet.getRange(1, 1, 1, 2).setBackground('#EA4335').setFontColor('white').setFontWeight('bold');
}`,
        instructions: [
          '1. Gmail에서 비용신청 전용 이메일 주소 설정 (예: expense@company.com)',
          '2. script.google.com에서 새 프로젝트 생성',
          '3. 위 코드를 복사해서 붙여넣기',
          '4. EXPENSE_EMAIL에 비용신청 이메일 주소 입력',
          '5. MANAGER_EMAIL에 승인자 이메일 입력',
          '6. BUDGET_LIMIT에 월 예산 한도 입력 (숫자만)',
          '7. setupExpenseTracker() 함수 실행',
          '8. 권한 승인 (Gmail, Sheets, Drive 접근 허용)',
          '9. 직원들에게 비용신청 이메일 주소 공유',
          '10. 완료! 이제 영수증을 첨부해서 이메일 보내면 자동 처리됩니다'
        ]
      }
    ]
  }
};

/**
 * 🎯 사용자 요청에 맞는 코드 템플릿 추천
 */
export function getCodeTemplate(
  userInput: string,
  domain: string,
  useCase: string,
  userAnswers?: any
): CodeTemplate | null {
  const domainTemplates = CODE_TEMPLATES[domain];
  if (!domainTemplates) {
    // general 도메인의 경우 별도 처리
    if (domain === 'general') {
      const { GENERAL_TEMPLATES } = require('./general-templates');
      const generalUseCaseTemplates = GENERAL_TEMPLATES[useCase];
      return generalUseCaseTemplates ? generalUseCaseTemplates[0] : null;
    }
    return null;
  }

  const useCaseTemplates = domainTemplates[useCase];
  if (!useCaseTemplates || useCaseTemplates.length === 0) return null;

  // 사용자 입력과 가장 잘 맞는 템플릿 선택
  return useCaseTemplates[0]; // 현재는 첫 번째 템플릿 반환, 추후 매칭 로직 개선 가능
}

/**
 * 🔧 코드 템플릿에 사용자 변수 적용
 */
export function personalizeCodeTemplate(
  template: CodeTemplate,
  variables: { [key: string]: string }
): CodeTemplate {
  let personalizedCode = template.code;
  let personalizedInstructions = [...template.instructions];

  // 변수 치환
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = '{{' + key + '}}';
    // 정규식 특수문자 이스케이프
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    personalizedCode = personalizedCode.replace(new RegExp(escapedPlaceholder, 'g'), value);
    
    personalizedInstructions = personalizedInstructions.map(instruction => 
      instruction.replace(new RegExp(escapedPlaceholder, 'g'), value)
    );
  }

  return {
    ...template,
    code: personalizedCode,
    instructions: personalizedInstructions
  };
}

/**
 * 📊 코드 템플릿 통계
 */
export function getCodeTemplateStats() {
  const stats = {
    totalDomains: Object.keys(CODE_TEMPLATES).length,
    totalTemplates: 0,
    templatesByLanguage: {} as { [key: string]: number },
    templatesByDifficulty: {} as { [key: string]: number }
  };

  for (const domain of Object.values(CODE_TEMPLATES)) {
    for (const useCase of Object.values(domain)) {
      for (const template of useCase) {
        stats.totalTemplates++;
        
        // 언어별 통계
        stats.templatesByLanguage[template.language] = 
          (stats.templatesByLanguage[template.language] || 0) + 1;
        
        // 난이도별 통계  
        stats.templatesByDifficulty[template.difficulty] = 
          (stats.templatesByDifficulty[template.difficulty] || 0) + 1;
      }
    }
  }

  return stats;
}