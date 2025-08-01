/**
 * 🌐 범용 코드 템플릿 (general 도메인용)
 */

import { CodeTemplate } from './code-templates';

export const GENERAL_TEMPLATES: { [useCase: string]: CodeTemplate[] } = {
  dataCollection: [
    {
      id: 'universal-data-collector',
      name: '범용 데이터 수집 시스템',
      description: '구글 폼과 시트를 활용한 범용 데이터 수집 및 자동 처리',
      language: 'javascript',
      framework: 'apps-script',
      difficulty: 'easy',
      setupTime: '20분',
      dependencies: ['Google Forms', 'Google Sheets'],
      variables: {
        FORM_TITLE: '폼 제목',
        NOTIFICATION_EMAIL: '알림받을 이메일',
        SHEET_NAME: '시트 이름'
      },
      code: `function createUniversalDataCollector() {
  // 🔧 사용자 설정 변수들
  const FORM_TITLE = '{{FORM_TITLE}}'; // 예: '고객 문의 접수'
  const NOTIFICATION_EMAIL = '{{NOTIFICATION_EMAIL}}'; // 알림받을 이메일
  const SHEET_NAME = '{{SHEET_NAME}}'; // 예: '문의접수현황'
  
  console.log('📝 범용 데이터 수집 시스템 생성 시작...');
  
  try {
    // 1. 구글 폼 생성
    const form = FormApp.create(FORM_TITLE);
    
    // 2. 기본 질문들 추가
    form.addTextItem().setTitle('이름').setRequired(true);
    form.addTextItem().setTitle('이메일').setRequired(true);
    form.addTextItem().setTitle('연락처').setRequired(false);
    form.addParagraphTextItem().setTitle('문의 내용').setRequired(true);
    form.addMultipleChoiceItem()
      .setTitle('우선순위')
      .setChoices([
        form.createChoice('긴급'),
        form.createChoice('보통'),
        form.createChoice('낮음')
      ])
      .setRequired(true);
    
    // 3. 응답 시트 생성 및 연결
    const sheet = SpreadsheetApp.create(\`\${FORM_TITLE} - 응답 데이터\`);
    form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
    
    // 4. 자동 처리 트리거 설정
    ScriptApp.newTrigger('processNewResponse')
      .forForm(form)
      .onFormSubmit()
      .create();
    
    console.log('✅ 범용 데이터 수집 시스템 생성 완료');
    
    // 5. 완료 알림 발송
    GmailApp.sendEmail(
      NOTIFICATION_EMAIL,
      \`📝 \${FORM_TITLE} 생성 완료\`,
      \`데이터 수집 시스템이 성공적으로 생성되었습니다.\\n\\n📝 폼 URL: \${form.getPublishedUrl()}\\n📊 데이터 시트: \${sheet.getUrl()}\`
    );
    
    return {
      formUrl: form.getPublishedUrl(),
      sheetUrl: sheet.getUrl()
    };
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 📨 새로운 응답 자동 처리
function processNewResponse(e) {
  console.log('📨 새로운 응답 처리 시작...');
  
  const NOTIFICATION_EMAIL = '{{NOTIFICATION_EMAIL}}';
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return;
  
  const responseData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  const name = responseData[1] || '이름 없음';
  const priority = responseData[5] || '보통';
  
  // 긴급한 경우 즉시 알림
  if (priority === '긴급') {
    GmailApp.sendEmail(
      NOTIFICATION_EMAIL,
      \`🚨 [긴급] \${name}님 문의\`,
      \`긴급 문의가 접수되었습니다. 즉시 확인이 필요합니다!\\n\\n내용: \${responseData[4]}\`
    );
  }
  
  console.log(\`✅ 응답 처리 완료: \${name} (\${priority})\`);
}`,
      instructions: [
        '1. script.google.com 접속 → "새 프로젝트" 클릭',
        '2. 위 코드를 전체 복사해서 붙여넣기',
        '3. FORM_TITLE, NOTIFICATION_EMAIL, SHEET_NAME 변수 설정',
        '4. "createUniversalDataCollector" 함수 실행',
        '5. 권한 승인 후 생성된 폼 URL 공유',
        '6. 완료! 모든 응답이 자동으로 처리됩니다'
      ]
    }
  ]
};