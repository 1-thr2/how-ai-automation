import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI } from '@/lib/openai';
import { AutomationData } from '@/app/types/automation';
import { handleError, handleApiError } from '@/lib/error-handler';
import { saveAutomationRequest } from '@/lib/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🎯 현실적 절충안: 3단계 하이브리드 방식 (기존 방식 유지 + 부분 최적화)
export async function POST(req: Request) {
  let userInput = '';
  let followupAnswers = {};
  let startTime = Date.now();
  
  try {
    const requestData = await req.json();
    userInput = requestData.userInput;
    followupAnswers = requestData.followupAnswers;
    
    console.log('🚀 [하이브리드] 3단계 자동화 생성 시작');
    console.log('📝 사용자 입력:', userInput);
    console.log('📋 후속 답변:', followupAnswers);

    startTime = Date.now();
    let allCards = [];

    // 🔄 1단계: 니즈 분석 + 플로우 생성 (gpt-4o-2024-11-20 - 품질 우선)
    console.log('[1단계] 니즈 분석 + 플로우 생성 (gpt-4o-2024-11-20 - 품질 우선)');
    const stage1Response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-11-20',
      messages: [
        {
          role: 'system',
          content: `당신은 2025년 자동화 전문가입니다. 사용자 요청을 분석하여 투입대비 산출을 고려한 최적 자동화 수준을 추천하세요.

# 핵심 원칙: 사용자가 원하는 것이 아닌, 투입대비 산출 기준으로 AI가 추천

## 자동화 수준 분석 기준:
1. **빈도 분석**: 일회성 vs 주기적 vs 실시간
2. **데이터량**: 소량 vs 중간 vs 대량
3. **복잡도**: 단순 vs 중간 vs 복잡
4. **팀 규모**: 개인 vs 팀 vs 조직
5. **기술 수준**: 초보 vs 중급 vs 고급

## 자동화 수준별 투입대비 산출:

### 🟢 수동 처리 (ROI 측정 단계)
- **투입**: 30분-1시간/회
- **적용**: 월 1-2회 or 일회성 or 데이터 소량
- **장점**: 즉시 시작, 학습 비용 없음
- **단점**: 반복 시 비효율

### 🟡 반자동화 (효율성 증대)
- **투입**: 설정 1-2시간 + 주 5-10분 관리
- **적용**: 주 1회 이상 or 패턴 반복 or 중간 데이터량
- **장점**: 80% 시간 절약, 안정성
- **단점**: 초기 설정 필요

### 🔴 완전자동화 (스케일링)
- **투입**: 설정 3-5시간 + 월 10-20분 관리
- **적용**: 일일 반복 or 대량 데이터 or 팀 공유
- **장점**: 95% 시간 절약, 확장성
- **단점**: 높은 초기 투자

# 반드시 JSON 형태로 응답:
{
  "cards": [
    {
      "type": "needs_analysis",
      "title": "🎯 진짜 니즈 발견",
      "surfaceRequest": "사용자가 말한 것",
      "realNeed": "실제로 필요한 것",
      "recommendedLevel": "수동/반자동/완전자동",
      "expectedBenefit": "예상 효과 (시간 절약, 정확도 향상 등)",
      "investmentRequired": "필요한 투입 (시간, 학습 등)",
      "whyThisLevel": "이 수준을 추천하는 이유"
    },
    {
      "type": "flow",
      "title": "🚀 추천 자동화 플로우",
      "subtitle": "투입대비 산출 최적화된 단계별 실행 계획",
      "automationLevel": "추천된 자동화 수준",
      "expectedROI": "예상 투입대비 산출",
      "steps": [
        {
          "id": "1",
          "icon": "🔧",
          "title": "구체적 결과 중심 단계명",
          "subtitle": "사용자가 느낄 편리함",
          "duration": "예상 시간",
          "automationType": "수동/반자동/완전자동",
          "inputData": "이 단계에서 처리할 입력 데이터",
          "outputData": "이 단계에서 생성되는 구체적 결과물 (파일명, URL, 데이터 형태)",
          "nextStepConnection": "다음 단계에서 이 결과물을 어떻게 활용하는지",
          "toolRecommendation": {
            "primary": "최적 효율성 우선 + 후속답변 기반 최적 도구",
            "reason": "최적 효율성 + 통합 워크플로우 + 사용자 적합성",
            "alternatives": ["간단한 대안 1-2개"],
            "whyNotOthers": "다른 방법들을 안 추천하는 이유"
          }
        },
        {
          "id": "2",
          "icon": "📊",
          "title": "두 번째 단계명",
          "subtitle": "사용자가 느낄 편리함",
          "duration": "예상 시간",
          "automationType": "수동/반자동/완전자동",
          "inputData": "1단계에서 생성된 구체적 결과물",
          "outputData": "이 단계에서 생성되는 구체적 결과물",
          "nextStepConnection": "3단계에서 이 결과물을 어떻게 활용하는지"
        },
        {
          "id": "3",
          "icon": "🎯",
          "title": "세 번째 단계명",
          "subtitle": "사용자가 느낄 편리함",
          "duration": "예상 시간",
          "automationType": "수동/반자동/완전자동",
          "inputData": "2단계에서 생성된 구체적 결과물",
          "outputData": "최종 목표 달성을 위한 결과물",
          "nextStepConnection": "최종 목표 완성"
        }
      ]
    }
  ]
}`
        },
        {
          role: 'user',
          content: `사용자 요청: "${userInput}"
사용자 후속답변: ${JSON.stringify(followupAnswers || {})}

# 🎯 진짜 니즈 발굴 및 wow 경험 설계

## 핵심 원칙: 후속답변으로 숨은 욕망 파악
후속답변은 표면적 요청 뒤에 숨은 진짜 니즈를 보여줍니다:

**예시 분석**:
- 표면 요청: "스프레드시트 시각화"
- 후속답변: {data_source: '수동 입력', success_criteria: '시간 절약'}
- **진짜 니즈**: 매번 수동으로 차트 만드는 게 번거로워서 → 자동화된 대시보드로 실시간 모니터링하고 싶음
- **wow 포인트**: 단순 차트가 아니라 "데이터 변화 시 자동 알림 + 트렌드 분석 + 팀 공유"까지

## 니즈 발굴 질문들:
1. **왜 이걸 원하는가?** (진짜 목적)
2. **누구를 위한 것인가?** (이해관계자)
3. **언제 사용하는가?** (사용 맥락)
4. **무엇이 불편한가?** (현재 문제점)
5. **어떤 결과를 원하는가?** (기대 효과)

## 후속답변 → 니즈 매핑:
- data_source: '수동 입력' → 반복 작업 자동화 욕구
- current_workflow: '분석하지 않음' → 인사이트 도출 욕구
- success_criteria: '시간 절약' → 효율성 + 더 중요한 일에 집중 욕구

## wow 경험 설계:
표면적 요청을 **10배 더 가치있는 시스템**으로 확장:
- 단순 차트 → 실시간 대시보드 + 자동 알림
- 일회성 분석 → 지속적 모니터링 + 트렌드 예측
- 개인 사용 → 팀 협업 + 의사결정 지원

## 🚨 단계 설계 원칙 (필수):
- **하나의 통합 플랫폼**: 모든 단계가 하나의 자동화 플랫폼(Zapier, Make.com 등)에서 연결된 워크플로우 (개별 분리 금지)
- **실제 데이터 연결**: 1단계 출력 → 2단계 입력 → 3단계 입력의 구체적 데이터 흐름
- **하나의 트리거**: 전체 자동화가 하나의 이벤트로 시작되어 끝까지 연결
- **최적 효율성**: 가장 빠르고 쉬운 방법 우선 (AI 도구가 더 효율적이면 AI 도구 선택)
- **단계명**: 사용자가 느낄 가치 중심 (기술용어 금지)
- **내용**: 후속답변의 맥락을 깊이 반영

## 🔗 **연결된 자동화 설계 필수사항**:
- ❌ 금지: "개별 Zapier 3개 만들기", "따로따로 설정하기"
- ✅ 필수: "하나의 Zapier에서 단계별 연결", "데이터가 자동으로 다음 단계로 전달"
- ✅ 예시: "1단계에서 수집된 데이터 → 2단계 AI 분석 → 3단계 슬랙 전송 (모두 하나의 워크플로우)"

## 🎯 개인 맞춤형 최적 솔루션 선택:
후속답변을 바탕으로 **이 사용자에게 가장 적합한 하나의 방법**을 선택하세요:

### 🔍 **사용자 분석 기준**:
- **기술 수준**: 후속답변에서 드러나는 기술적 친숙도
- **현재 도구**: 사용자가 언급한 기존 도구들
- **목표**: 시간 절약 vs 품질 향상 vs 완전 자동화
- **환경**: 개인 vs 팀 vs 기업

### 🛠️ **사용자 요청에 맞는 최적 도구 선택** (제한 없음):

#### 💰 **비용 효율성 우선 원칙**
- **무료 도구 우선 탐색** → **저비용 도구** → **유료 도구** (필요시에만)
- **모든 도구는 사용자 요청에 딱 맞는 것**으로 선택 (제한 없음)

#### 🎯 **요청 유형별 최적 도구 예시** (이것만이 아님):

**📊 데이터/분석**: 젠스파크, 클로드, ChatGPT, 구글 시트, Apps Script, Airtable, Zapier
**🎨 디자인/이미지**: Canva, Midjourney, DALL-E, Figma, 런웨이, 레오나르도 AI
**📹 영상 제작**: 런웨이, Luma AI, Pika Labs, CapCut, 클립챔프, InVideo
**🌐 웹 개발**: Apps Script, Bubble, Webflow, Glide, Carrd, Framer
**📝 문서/콘텐츠**: Notion AI, 워드프레스, 카피AI, Jasper, 구글 독스
**🔗 자동화**: Zapier, Make.com, Power Automate, IFTTT, Integromat
**📱 앱 개발**: Bubble, Glide, Adalo, FlutterFlow, App Sheet
**🎵 음성/오디오**: Murf, Descript, Otter.ai, ElevenLabs
**💬 챗봇**: 챗플로우, 보이스플로우, ManyChat, Landbot
**📊 대시보드**: Apps Script + HTML/CSS/JS, 태블로, 파워BI, 루커

#### 🚨 **중요**: 사용자 요청에 따라 위 목록 외 **다른 어떤 도구든 선택 가능**

#### 💡 **Apps Script 웹뷰 대시보드 예시**:
- **HTML/CSS/JS 코드 완전 제공** 필수
- **구글 시트 연결** + **실시간 데이터 업데이트**
- **웹 퍼블리싱 방법**까지 포함

#### 🎨 **창작 도구 활용 시**:
- **구체적 프롬프트** 제공 (미드저니, DALL-E 등)
- **스타일 가이드** 포함
- **품질 최적화 팁** 제공

### 📋 **선택 기준** (우선순위 순):
1. **💰 비용 효율성**: 무료 > 저비용 > 유료 (비용 명시 필수)
2. **⚡ 즉시 실행**: 바로 사용 가능한지 (설정 복잡도)
3. **🎯 WOW 결과**: 사용자가 감탄할 만한 결과물
4. **🔗 통합 가능성**: 기존 도구와 연결 용이성
5. **🇰🇷 한국 환경**: 한국어 지원, 국내 도구 우선

**결과**: 여러 방법을 나열하지 말고, **이 사용자에게 딱 맞는 하나의 최적 솔루션**을 제시`
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });

    // 1단계 결과 파싱
    const stage1Content = stage1Response.choices[0]?.message?.content;
    let stage1Cards: any[] = [];
    try {
      if (stage1Content) {
        const jsonMatch = stage1Content.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonContent = jsonMatch ? jsonMatch[1] : stage1Content;
        const parsed = JSON.parse(jsonContent);
        stage1Cards = parsed.cards || [];
    allCards.push(...stage1Cards);
        console.log(`[1단계] 완료 - 생성된 카드 수: ${stage1Cards.length}`);
      }
  } catch (error) {
      console.error('[1단계] 파싱 오류:', error);
    }

    // 플로우에서 단계 추출
    const flowCard = stage1Cards.find((card: any) => card.type === 'flow');
    const steps = flowCard?.steps || [];
    console.log(`[2단계] 시작 - ${steps.length}개 단계에 대한 상세 가이드 생성`);
    console.log(`[2단계] 생성된 단계들:`, steps.map((s: any) => `${s.id}. ${s.title}`));

    // 🔄 2단계: 각 단계별 상세 가이드 생성 (gpt-4o-2024-11-20 - 최고 품질)
    const guideCards = [];
    
    // 1단계와 2단계 사이 RPM 한도 회피를 위한 딜레이
    console.log(`[2단계] 1단계 완료 후 RPM 한도 회피를 위해 1초 대기...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`[2단계] ${i + 1}번째 단계 가이드 생성: ${step.title} (stepId: ${step.id})`);
      
      // RPM 한도 회피를 위해 1초 대기 (기존 2초 → 1초 최적화)
      if (i > 0) {
        console.log(`[2단계] RPM 한도 회피를 위해 1초 대기...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 이전 단계들의 결과물 수집
      const previousSteps = steps.slice(0, i);
      const previousGuides = guideCards.filter(card => 
        previousSteps.some((prevStep: any) => prevStep.id === card.stepId)
      );

      try {
        const guideResponse = await openai.chat.completions.create({
          model: 'gpt-4o-2024-11-20', // 최고 품질 모델
          messages: [
            {
              role: 'system',
              content: `당신은 컴퓨터 왕초보도 100% 따라할 수 있는 초극상세 자동화 가이드 전문가입니다.

🚨 **절대 원칙**: 
1. 오직 JSON 형태로만 응답하세요
2. 모든 단계는 "1. 브라우저 열기 → 2. 주소 입력 → 3. 버튼 클릭" 수준의 디테일
3. API, 토큰, 파라미터 등 기술용어는 반드시 구체적 위치와 방법 명시
4. "설정하세요", "추가하세요" 같은 추상적 표현 금지

# 🚨 **왕초보 기준 가이드 작성법**:

## 필수 포함사항:
- **정확한 URL**: https://로 시작하는 완전한 주소
- **정확한 버튼명**: "파란색 '로그인' 버튼", "오른쪽 상단 '계정 설정' 링크"
- **정확한 입력값**: 어디에 무엇을 입력하는지
- **정확한 위치**: "화면 왼쪽", "페이지 하단", "팝업창 중앙"
- **확인 방법**: "성공시 초록색 메시지 표시", "설정 완료시 체크마크 나타남"

## 자동화 수준별 상세 수준:
- **수동**: 모든 클릭과 입력을 단계별로
- **반자동**: 설정값의 정확한 위치와 값까지  
- **완전자동**: 테스트 방법과 에러 해결까지

## 🚨 **왕초보 기준 설명 예시**:

### ❌ **나쁜 예시 (추상적)**:
- "네이버 광고 API에 접속하여 API 키를 생성합니다"
- "앱을 생성하고 광고 API를 활성화합니다"  
- "인증 토큰과 파라미터를 추가합니다"

### ✅ **좋은 예시 (무료 AI 도구 활용)**:
- "1. 크롬 브라우저를 열고 주소창에 https://jensspark.com 입력 후 Enter
   2. 화면 중앙의 '무료로 시작하기' 버튼 클릭 (회원가입 불필요)
   3. 텍스트 입력창에 '지난달 캠페인 데이터로 10슬라이드 발표자료 만들어줘' 입력
   4. 아래 '데이터 첨부' 버튼을 클릭하여 엑셀 파일 업로드
   5. 오른쪽 하단의 파란색 '생성하기' 버튼 클릭
   6. 30초 후 완성된 슬라이드가 화면에 나타남
   7. 화면 오른쪽 상단 '다운로드' 버튼으로 PPT 파일 저장
   💰 비용: 완전 무료 (월 제한 없음)"

### ✅ **유료 도구 사용시 비용 표시 예시**:
- "💰 OpenAI API 사용시: 슬라이드 1개당 약 100-500원 소요
   📊 예상 비용: 10슬라이드 = 약 1,000-5,000원
   ⚠️ 대안: 젠스파크 무료 버전으로 동일한 결과 가능"

## 🔗 **연결된 워크플로우 설계 필수 원칙**:

### 💰 **비용 우선 고려사항**:
1. **무료 도구 우선**: 젠스파크, 클로드 무료, ChatGPT 무료 등 활용
2. **유료 도구 사용시**: 반드시 구체적 비용 명시 (월/회당 비용)
3. **대안 제시**: 유료 방법과 무료 방법 모두 제공

### ⚡ **실용성 기준**:
1. **즉시 사용 가능**: 복잡한 설정 없이 바로 실행
2. **한국어 지원**: 한국 사용자 최적화된 도구 우선
3. **WOW 결과**: 사용자가 놀랄만한 퀄리티

### 🔗 **연결 방식**:
1. **간단한 연결**: 파일 다운로드 → 업로드 방식도 허용
2. **자동화 플랫폼**: 필요시에만 Zapier/Make.com 활용
3. **명확한 데이터 흐름**: 이전 단계 출력 → 현재 단계 입력 → 다음 단계 입력의 구체적 경로
3. **실제 연결 구현**: "웹훅 URL", "필터 조건", "데이터 매핑" 등 구체적 연결 방법 명시
4. **전체 맥락 인식**: 현재 단계가 전체 워크플로우에서 어떤 역할인지 명시
5. **최적 효율성**: 가장 빠르고 쉬운 방법 (AI 도구가 더 효율적이면 당연히 AI 도구 선택)

## 🚨 **이 단계의 역할과 연결성**:
- **입력**: 이전 단계에서 받는 구체적 데이터/파일/신호
- **처리**: 이 단계에서 수행하는 변환/분석/작업
- **출력**: 다음 단계로 전달하는 구체적 데이터/파일/신호
- **연결방법**: Zapier/Make.com에서 어떻게 데이터를 받고 전달하는지

# MUST RETURN ONLY VALID JSON (NO OTHER TEXT):
{
  "cards": [
    {
      "type": "guide",
      "stepId": "${step.id}",
      "title": "${step.title}",
      "subtitle": "초보자도 따라할 수 있는 설명",
      "basicConcept": "이 단계의 목적과 필요성",
      "automationLevel": "이 단계의 자동화 수준",
      "content": {
        "fromPreviousStep": "이전 단계에서 생성된 구체적 결과물을 현재 단계 입력으로 활용하는 방법 (예: '1단계에서 생성된 웹훅 URL을 2단계 알림 설정의 endpoint 필드에 입력')",
        "continuousWorkflow": "하나의 Zapier/Make.com 워크플로우에서 이 단계가 연결되는 구체적 방법 (예: 'Filter 조건으로 이전 데이터 필터링 → OpenAI 액션으로 분석 → 다음 단계 Slack 액션으로 전달')",
        "workflowConnection": "전체 워크플로우에서의 데이터 흐름: [이전단계 출력] → [현재단계 처리] → [다음단계 입력]",
        "toolChoice": {
          "recommended": "추천 도구 (무료 AI 도구 우선, 즉시 사용 가능한 것)",
          "reason": "💰 비용 효율성 + ⚡ 즉시 실행 + 🎯 WOW 결과 + 🇰🇷 한국어 지원",
          "costInfo": "💰 비용: 무료 / 월 X,XXX원 / 사용당 XXX원 (반드시 명시)",
          "alternatives": [
            {
              "tool": "무료 대안 도구",
              "pros": "완전 무료, 즉시 사용",
              "cons": "기능 제한 등",
              "cost": "💰 무료",
              "whenToUse": "예산이 제한적이거나 간단한 작업"
            },
            {
              "tool": "유료 고급 도구",
              "pros": "고급 기능, 높은 품질",
              "cons": "비용 발생",
              "cost": "💰 월 XX,XXX원 또는 사용당 XXX원",
              "whenToUse": "고품질이 필요하고 예산이 있을 때만"
            }
          ]
        },
        "detailedSteps": [
          {
            "number": 1,
            "title": "구체적인 행동 제목",
            "description": "🚨 왕초보도 100% 따라할 수 있는 매우 상세한 클릭 가이드:\\n\\n1. [정확한 브라우저 행동]: 크롬 브라우저를 열고 주소창에 [정확한 URL] 입력\\n2. [정확한 클릭 위치]: 화면에서 [정확한 버튼명/링크명] 클릭 (예: 오른쪽 상단 파란색 '로그인' 버튼)\\n3. [정확한 입력값]: [구체적인 필드]에 [정확한 값] 입력\\n4. [정확한 설정값]: [구체적인 옵션]에서 [정확한 선택지] 선택\\n5. [정확한 저장 방법]: [구체적인 저장 버튼] 클릭하여 완료\\n\\n⚠️ 중요: API 키, 토큰, 파라미터 등 기술용어는 반드시 구체적인 값과 위치를 명시하세요.",
            "expectedScreen": "이 단계를 완료했을 때 화면에 정확히 무엇이 보이는지",
            "checkpoint": "성공했는지 확인하는 구체적인 방법 (예: '화면에 초록색으로 성공 메시지가 표시됨')"
          },
          {
            "number": 2,
            "title": "두 번째 세부 단계",
            "description": "🚨 이전 단계 결과를 활용한 구체적 행동:\\n\\n1. 이전 단계에서 생성된 [구체적 결과물]을 복사\\n2. [정확한 위치]에서 [정확한 버튼] 클릭\\n3. [구체적인 필드명]에 복사한 값 붙여넣기\\n4. [추가 설정]을 [정확한 값]으로 변경\\n5. [최종 확인 버튼] 클릭",
            "expectedScreen": "두 번째 단계 완료 후 보이는 화면",
            "checkpoint": "올바르게 설정되었는지 확인하는 방법"
          },
          {
            "number": 3,
            "title": "최종 완료 및 테스트",
            "description": "🚨 설정 완료 및 작동 확인:\\n\\n1. [최종 설정 화면]에서 모든 값이 올바른지 확인\\n2. [테스트 버튼] 클릭하여 실제 작동 테스트\\n3. 테스트 결과 확인 및 문제 해결\\n4. [활성화/저장 버튼] 클릭하여 자동화 시작\\n5. 실제 결과물 확인 방법",
            "expectedScreen": "모든 설정이 완료되고 자동화가 작동하는 화면",
            "checkpoint": "자동화가 성공적으로 작동하는지 확인하는 방법"
          }
        ],
        "automationBenefits": [
          "이 방법을 쓰면 얻는 구체적 이익 (시간/비용/정확도를 숫자로)"
        ],
        "practicalTips": [
          "🚨 왕초보 필수 팁: 구체적인 행동과 함께 (예: 'API 키는 메모장에 바로 저장하세요 - 나중에 찾기 어려움')"
        ],
        "commonMistakes": [
          {
            "mistake": "구체적인 실수 상황",
            "why": "왜 이 실수가 발생하는지",
            "solution": "정확한 해결 방법 (클릭/입력/설정 위치 포함)",
            "prevention": "다음에 실수하지 않는 방법"
          }
        ]
      }
    }
  ]
}`
            },
            {
              role: 'user',
              content: `# 🔄 플로우 연결성 정보
전체 플로우: ${JSON.stringify(steps.map((s: any) => ({ id: s.id, title: s.title })))}
현재 단계: ${step.id}번째 - ${step.title}
이전 단계들: ${previousSteps.map((s: any) => s.title).join(' → ') || '없음'}

# 📋 이전 단계 결과물 (연결 활용)
${previousGuides.length > 0 ? 
  previousGuides.map(guide => 
`- ${guide.title}: ${guide.content?.detailedSteps?.[0]?.title || '설정 완료'}
  → 결과물: ${guide.content?.detailedSteps?.[0]?.expectedScreen || '설정된 시스템'}`
).join('\n') : '첫 번째 단계 - 이전 결과물 없음'}

# 🎯 현재 단계 정보
단계 정보: ${step.title} (${step.id}번째 단계)
단계 설명: ${step.subtitle}
전체 목표: "${userInput}"
사용자 후속답변: ${JSON.stringify(followupAnswers || {})}

# 🚨 워크플로우 연결성 절대 원칙 (필수):

## ❌ **절대 금지되는 표현들**:
- "새로운 워크플로우 생성", "새로운 Zapier 만들기", "별도 자동화"
- "처음부터 시작", "새 시나리오", "독립적으로 설정"
- "개별적으로", "따로 만들기", "분리된 자동화"

## ✅ **반드시 사용해야 하는 표현들**:
- "이전 단계에서 이어서", "기존 워크플로우에 추가", "연결된 다음 단계"
- "이전 단계 출력을 입력으로 활용", "하나의 플로우에서 계속"

## 🔗 **단계별 연결 방식**:
1. **1단계**: 워크플로우 시작 + 첫 번째 액션
2. **2단계**: 1단계와 같은 워크플로우에서 + (Plus) 버튼으로 두 번째 액션 추가
3. **3단계**: 2단계와 같은 워크플로우에서 + (Plus) 버튼으로 세 번째 액션 추가

## 🎯 **이 단계의 역할** (${step.id}번째 단계):
- **워크플로우 위치**: ${step.id === '1' ? '워크플로우 시작' : `이전 ${step.id-1}단계에서 이어서 ${step.id}번째 액션 추가`}
- **데이터 입력**: ${step.id === '1' ? '트리거 이벤트' : '이전 단계 출력 데이터'}
- **연결 방법**: ${step.id === '1' ? '워크플로우 생성' : '+ (Plus) 버튼으로 액션 추가'}
- **데이터 출력**: 다음 단계로 전달할 구체적 데이터

# 🚨 **왕초보 가이드 필수사항**:
- **극도로 상세한 설명**: "어느 메뉴 → 몇 번째 버튼 → 어떤 필드에 무엇 입력" 수준의 완벽한 설명
- **개발자 도구 초보자 가이드**: F12 누르는 것부터 시작해서 정확한 탭과 클릭 위치까지 스크린샷처럼 설명
- **API URL 찾기 완전 가이드**: Network 탭에서 어떤 항목을 클릭해야 하는지 단계별 상세 설명
- **정확한 버튼명과 위치**: "화면 오른쪽 상단의 파란색 '로그인' 버튼" 수준의 정확한 위치
- **성공 확인 방법**: 어떤 메시지가 어디에 나타나야 성공인지까지 명시

## 🔍 **개발자 도구 왕초보 가이드 예시**:
1. 키보드에서 F12 키를 누르면 화면 아래쪽이나 오른쪽에 개발자 도구 창이 나타남
2. 상단 탭 중에서 'Network' (또는 '네트워크') 탭을 클릭
3. Network 탭 화면에서 'XHR' 버튼을 클릭 (Ajax 요청만 필터링)
4. 웹페이지에서 새로고침(F5)을 눌러서 데이터 로딩
5. Network 탭에 나타나는 목록 중 'api', 'ajax', 'data' 키워드가 포함된 항목 클릭
6. 오른쪽 패널에서 'Request URL' 항목을 찾아서 마우스 우클릭 → '복사' 선택

## 📋 **상세 설명 기준**:
- 모든 기술적 단계는 "어떤 키를 누르고 → 어느 위치의 무슨 버튼을 클릭하고 → 어떤 결과가 나타나는지" 완벽 설명
- 스크린샷이 없어도 글만 보고 100% 따라할 수 있는 수준

이 단계에 대한 도구 추천 + 왕초보도 100% 따라할 수 있는 초극상세 실행 가이드를 생성하세요.`
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        });

        const guideContent = guideResponse.choices[0]?.message?.content;
        try {
          if (guideContent) {
            // 🔧 더 안전한 JSON 파싱 로직
            let jsonContent = '';
            
            // ```json으로 감싸진 경우 추출
            const jsonMatch = guideContent.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              jsonContent = jsonMatch[1].trim();
            } else {
              // JSON 블록이 없으면 전체 내용에서 JSON 찾기
              const startIndex = guideContent.indexOf('{');
              const lastIndex = guideContent.lastIndexOf('}');
              if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
                jsonContent = guideContent.substring(startIndex, lastIndex + 1);
              } else {
                throw new Error('JSON 구조를 찾을 수 없습니다');
              }
            }
            
            // 🚀 JSON 파싱 (강화된 에러 처리)
            let parsed;
            try {
              parsed = JSON.parse(jsonContent);
            } catch (firstError) {
              console.log(`[2단계] 첫 번째 JSON 파싱 실패, 강화된 정리 후 재시도...`);
              try {
                const cleanedJson = jsonContent
                  .replace(/[\u201C\u201D]/g, '"')  // 스마트 따옴표 → 일반 따옴표
                  .replace(/[\u2018\u2019]/g, "'")  // 스마트 아포스트로피 → 일반 아포스트로피
                  .replace(/\n\s*\n/g, '\n')       // 연속 줄바꿈 정리
                  .replace(/\\n/g, '\\\\n')        // 이스케이프된 줄바꿈 처리
                  .replace(/"/g, '\\"')            // 내부 따옴표 이스케이프
                  .replace(/\\\\"/g, '"')          // 시작/끝 따옴표는 복원
                  .trim();
                
                // 더 안전한 JSON 재구성
                const safeJson = cleanedJson
                  .replace(/,(\s*[}\]])/g, '$1')   // trailing comma 제거
                  .replace(/([^\\])\\([^"\\\/bfnrtu])/g, '$1\\\\$2'); // 잘못된 이스케이프 처리
                
                parsed = JSON.parse(safeJson);
              } catch (secondError) {
                console.log(`[2단계] 두 번째 JSON 파싱도 실패, 폴백 가이드 생성...`);
                console.log(`[2단계] 원본 응답 길이: ${guideContent.length}`);
                console.log(`[2단계] 원본 응답 시작: ${guideContent.substring(0, 200)}`);
                console.log(`[2단계] 원본 응답 끝: ${guideContent.substring(Math.max(0, guideContent.length - 200))}`);
                
                // 완전 폴백: 기본 가이드 생성
                parsed = {
                  cards: [{
                    type: 'guide',
                    stepId: step.id,
                    title: step.title,
                    subtitle: '상세 가이드 생성 중 오류가 발생했습니다',
                    basicConcept: `${step.title} 단계를 위한 기본 가이드입니다.`,
                    automationLevel: '수동',
                    content: {
                      detailedSteps: [{
                        number: 1,
                        title: `${step.title} 설정`,
                        description: `${step.title}을(를) 설정합니다. 상세 가이드는 곧 업데이트될 예정입니다.`,
                        expectedScreen: `${step.title} 설정 완료 화면`,
                        checkpoint: `${step.title}이(가) 올바르게 설정되었는지 확인`
                      }],
                      practicalTips: ['상세 가이드는 곧 추가될 예정입니다'],
                      commonMistakes: []
                    }
                  }]
                };
              }
            }
            
            const stepGuides = parsed.cards || [];
            if (stepGuides.length > 0) {
            guideCards.push(...stepGuides);
              console.log(`[2단계] ${i + 1}번째 단계 가이드 생성 ✅ (${stepGuides.length}개 카드)`);
              console.log(`[2단계] 생성된 가이드: ${stepGuides[0].title}`);
          } else {
              console.log(`[2단계] ${i + 1}번째 단계: cards 배열이 비어있음`);
            }
          }
        } catch (error) {
          console.error(`[2단계] ${i + 1}번째 단계 파싱 오류:`, error);
          console.error(`[2단계] 원본 응답 길이:`, guideContent?.length);
          console.error(`[2단계] 원본 응답 시작:`, guideContent?.substring(0, 200));
          console.error(`[2단계] 원본 응답 끝:`, guideContent?.substring(-200));
          
          // 🔄 파싱 실패시 기본 가이드 카드 생성 (최후의 수단)
          const fallbackGuide = {
            type: 'guide',
            stepId: step.id,
            title: step.title,
            subtitle: '상세 가이드 생성 중 오류가 발생했습니다',
            basicConcept: `${step.title} 단계를 위한 기본 가이드입니다.`,
            automationLevel: '수동',
            content: {
              detailedSteps: [
                {
                number: 1,
                  title: `${step.title} 준비하기`,
                  description: '이 단계에 대한 상세 가이드는 현재 준비 중입니다. 곧 업데이트 예정입니다.',
                  expectedScreen: '설정 화면',
                  checkpoint: '기본 설정 완료'
                }
              ],
              practicalTips: ['상세 가이드는 곧 추가될 예정입니다'],
              commonMistakes: []
            }
          };
          guideCards.push(fallbackGuide);
          console.log(`[2단계] ${i + 1}번째 단계: 폴백 가이드 생성됨`);
        }
      } catch (error) {
        console.error(`[2단계] ${i + 1}번째 단계 생성 오류:`, error);
      }
    }

    allCards.push(...guideCards);
    console.log(`[2단계] 최종 생성된 가이드 카드 수: ${guideCards.length}/${steps.length}`);
        console.log(`[2단계] 생성된 가이드 카드들:`, guideCards.map((card: any) => ({
          stepId: card.stepId,
          title: card.title,
      hasDetailedSteps: !!(card.content?.detailedSteps?.length > 0)
        })));

    // 🔄 3단계: FAQ + 확장 아이디어 (gpt-4o-mini - 비용절약)
    console.log('[3단계] FAQ + 확장 아이디어 (gpt-4o-mini - 비용절약)');
    const stage3Response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 실전 자동화 전문가입니다. FAQ와 확장 아이디어를 생성하세요.

# 반드시 JSON 형태로 응답:
{
  "cards": [
    {
      "type": "faq",
      "title": "❓ 자주 묻는 질문",
      "items": [
        {
          "question": "실제 상황별 질문",
          "answer": "구체적이고 실용적인 답변"
        }
      ]
    },
    {
      "type": "expansion", 
      "title": "🚀 확장 아이디어",
      "subtitle": "더 큰 가치 창출",
      "possibilities": [
        "현재 자동화를 더 큰 시스템으로 확장하는 방법들 (AI 도구 활용 중심)"
      ],
      "futureVision": [
        "GPT-4o/Claude 3.5 Sonnet 등 최신 AI로 더 스마트하게 발전시키는 방향"
      ]
    },
    {
      "type": "method_recommendation",
      "title": "🛠️ 추천 방법",
      "subtitle": "상황별 최적 방법",
      "methods": [
        {
          "name": "방법명",
          "description": "설명",
          "pros": ["장점들"],
          "cons": ["단점들"],
          "difficulty": "쉬움/보통/어려움"
        }
      ]
    },
    {
      "type": "share",
      "title": "📤 공유하기",
      "subtitle": "결과 공유 및 협업",
      "shareOptions": [
        "공유 방법들"
      ]
    }
  ]
}`
        },
        {
          role: 'user',
          content: `전체 목표: ${userInput}
생성된 플로우: ${JSON.stringify(flowCard?.steps || [])}
후속 답변: ${JSON.stringify(followupAnswers || {})}

# 🛠️ 다양한 솔루션 접근법 중심 지침:

## FAQ 작성 시 (반드시 사용자 요청 맞춤형):
- **사용자 요청과 직접 관련된 실전 질문만** 작성
- **구체적인 상황별 문제와 해결책** 중심
- **일반적인 질문 금지** (예: "기술 지식 없어도...", "예산 제한..." 등)

### 🎯 **요청별 맞춤 FAQ 예시**:
- **슬라이드 제작 요청**: "데이터가 실시간으로 바뀌면 슬라이드도 자동 업데이트되나요?"
- **메일 정리 요청**: "VIP 고객 메일은 어떻게 우선 처리하나요?"
- **데이터 분석 요청**: "새로운 데이터 컬럼이 추가되면 분석도 자동 반영되나요?"
- **영상 제작 요청**: "브랜드 컬러와 폰트를 자동으로 적용할 수 있나요?"

### 🚨 **중요**: 반드시 **구체적 업무 상황**에서 나올 수 있는 질문만 작성

## 확장 아이디어 작성 시 (사용자 요청 기반):
- **현재 자동화 → 사용자 업무와 연관된 더 큰 시스템**으로 확장
- **사용자의 실제 업무 환경**에서 연결 가능한 아이디어
- **후속 답변에서 언급된 도구/환경**을 활용한 확장

### 🎯 **요청별 맞춤 확장 예시**:
- **캠페인 슬라이드 요청** → **마케팅 성과 대시보드** + **경쟁사 분석** + **예측 모델**
- **고객 메일 정리 요청** → **CS 인텔리전스 시스템** + **감정 분석** + **자동 우선순위**
- **재고 관리 요청** → **실시간 재주문 시스템** + **수요 예측** + **공급업체 자동 협상**
- **콘텐츠 제작 요청** → **브랜드 일관성 시스템** + **콘텐츠 성과 분석** + **트렌드 감지**

## 추천 방법 작성 시 (최적 방법 1개 + 간단한 대안 1-2개):
- **🏆 최적 방법**: 후속답변 기반으로 이 사용자에게 가장 적합한 방법
- **🔄 간단한 대안**: 1-2개의 대안만 간략히 제시
- **❌ 안 추천하는 방법**: 왜 다른 방법들은 이 사용자에게 적합하지 않은지

## 🔧 **Apps Script 대시보드/웹뷰 제작 시**:
### 반드시 완전한 코드 제공:
- **HTML 템플릿**: 완전한 웹페이지 구조
- **CSS 스타일**: 반응형 디자인 + 모바일 최적화
- **JavaScript**: 구글 시트 연동 + 실시간 데이터 업데이트
- **Apps Script 서버 코드**: 데이터 처리 + 웹앱 배포
- **배포 가이드**: 웹앱 URL 생성 + 권한 설정

### 코드 예시 구조:
// Code.gs (Apps Script)
function doGet() { return HtmlService.createTemplateFromFile('index').evaluate(); }
function getSheetData() { /* 데이터 로직 */ }

// index.html
<!DOCTYPE html><html><head>/* CSS */</head><body>/* HTML + JS */</body></html>

실전 FAQ, 확장 아이디어, 추천 방법, 공유 옵션, 그리고 필요시 완전한 코드를 생성하세요.`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    // 3단계 결과 파싱
    const stage3Content = stage3Response.choices[0]?.message?.content;
    try {
      if (stage3Content) {
        const jsonMatch = stage3Content.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonContent = jsonMatch ? jsonMatch[1] : stage3Content;
        const parsed = JSON.parse(jsonContent);
        const stage3Cards = parsed.cards || [];
        allCards.push(...stage3Cards);
        console.log(`[3단계] 완료 - 생성된 카드 수: ${stage3Cards.length}`);
      }
    } catch (error) {
      console.error('[3단계] 파싱 오류:', error);
    }

    const processingTime = Date.now() - startTime;
    console.log(`[하이브리드] 완료 - 생성된 카드 수: ${allCards.length}`);
    console.log(`[💰 비용 최적화] 1단계: gpt-4o-2024-11-20 ($2.50/$10.00), 2단계: gpt-4o-2024-11-20 ($2.50/$10.00), 3단계: gpt-4o-mini ($0.15/$0.60)`);
    console.log(`[⚡ 속도 최적화] 1,2단계: 1초딜레이 (4o RPM한도 회피), 3단계: 빠른응답 (mini 높은RPM)`);
    console.log(`[🎨 품질 최적화] 플로우+가이드는 최고품질 모델, FAQ만 효율적 처리`);
    console.log(`[하이브리드] [최종 cards 수]: ${allCards.length}`);
    console.log(`[하이브리드] [카드 타입들]:`, allCards.map((card: any) => card.type));

    // 🎯 메타데이터 추가
    const response_data = {
      cards: allCards,
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime: processingTime,
        approach: '3단계_하이브리드_최적화',
        stages: {
          stage1: 'gpt-4o-2024-11-20 (니즈+플로우)',
          stage2: 'gpt-4o-2024-11-20 (상세가이드)',
          stage3: 'gpt-4o-mini (FAQ+확장)'
        },
        costOptimization: '33%절약 (FAQ만 mini 사용)',
        speedOptimization: '1초대기 (4o RPM한도 회피)',
        qualityMaintained: '플로우+가이드는 최고품질 유지'
      }
    };

    // 💾 Supabase에 자동화 요청 데이터 저장 (백그라운드)
    try {
      await saveAutomationRequest({
        user_input: userInput,
        followup_answers: followupAnswers,
        generated_cards: allCards,
        user_session_id: `session_${Date.now()}`, // 임시 세션 ID
        processing_time_ms: processingTime,
        success: true
      });
      console.log('✅ 자동화 요청 데이터 저장 완료');
    } catch (saveError) {
      console.error('⚠️ 자동화 요청 저장 실패 (응답은 정상 진행):', saveError);
      // 저장 실패해도 응답은 정상 반환
    }

    return NextResponse.json(response_data);

  } catch (error) {
    console.error('❌ 자동화 생성 실패:', error);
    
    // 💾 실패한 요청도 Supabase에 저장 (분석용)
    try {
      await saveAutomationRequest({
        user_input: userInput || 'Unknown input',
        followup_answers: followupAnswers || {},
        generated_cards: [],
        user_session_id: `session_${Date.now()}`,
        processing_time_ms: Date.now() - startTime,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('✅ 실패한 요청 데이터 저장 완료');
    } catch (saveError) {
      console.error('⚠️ 실패 요청 저장 실패:', saveError);
    }
    
    return handleApiError(error);
  }
} 