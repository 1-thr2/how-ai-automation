# 🧩 컴포넌트 구조 문서 (에이전트 기반, wow 실용성/실행력/맞춤형 자동화 중심)

## 1. 전체 컴포넌트 트리/연결성

```
app/
├── page.tsx (메인 페이지, 전체 플로우/상태/입출력/연결)
├── layout.tsx (공통 레이아웃)
└── components/
    ├── TaskInput/ (업무 입력/후속질문/예시)
    ├── ResultsSection.tsx (최상위 결과 렌더링, 모든 카드/섹션/버튼/다운로드/공유)
    ├── FlowVisualization/ (자동화 플로우 시각화)
    ├── StepGuide/ (단계별 상세/코드/복사/다운로드/팁/PlanB/FAQ/실패사례)
    ├── CTASection/ (즉시 실행/복사/다운로드/공유)
    ├── AgentUX/ (통합 UX 가공, wow 카드/플로우/FAQ/PlanB 등)
    └── ... (확장 가능)
```

## 2. 각 컴포넌트 역할/데이터 매핑 (실행/복붙/실전/공유/확장 중심)

- **TaskInput**: 유저 입력/후속질문/예시 입력, 요구사항 구조화/보완질문과 연동
- **ResultsSection**: 모든 결과(ux.cards, flows, trends, requirements, intent 등)를 받아, 각 카드/섹션/버튼/다운로드/공유/확장까지 동적으로 조합/렌더링
- **FlowVisualization**: flows의 steps를 시각적으로만 보여줌(실행력 중심)
- **StepGuide**: flows의 steps 구조에 맞춰 단계별 코드/가이드/팁/PlanB/FAQ/실패사례/복사/다운로드 등만 남김
- **CTASection**: "지금 시작하기", "PDF 다운로드", "GPT 프롬프트 복사", "커뮤니티", "전문가 상담" 등 CTA 버튼
- **AgentUX**: 통합/UX 가공, wow 카드/플로우/FAQ/PlanB 등, 모든 결과를 일관된 UX/컴포넌트로 가공/통합

## 3. 데이터/컴포넌트 구조 원칙

- 각 결과 데이터(ux.cards, flows, trends, requirements, intent 등)는 ResultsSection, StepGuide, FlowVisualization 등 별도 컴포넌트/카드/섹션으로 분리되어, 실제 데이터에 따라 동적으로 조합/렌더링됨
- 값이 있으면 무조건 노출, 없으면 안 보임(실행력/실용성 중심)
- 새로운 데이터/필드가 추가되면 즉시 컴포넌트/카드로 확장 가능
- 모든 버튼/다운로드/공유/확장 기능은 실제 실행/협업/피드백 루프까지 지원

## 4. UX 흐름/감정 곡선/실전성

- 공감/문제 인식 → 기대/솔루션 제시 → 구체적 플로우/가이드 → 실행/즉시 시작 → 불안/실패 대비 → 신뢰/확장
- 각 단계별로 복붙/실행/다운로드/공유/실전팁/PlanB/FAQ/실패사례/스토리까지 모두 카드/섹션/버튼으로 제공
- 빈 상태/에러/실전성/확장성까지 모두 반영

## 5. 확장성/실전성/테스트

- 에이전트 기반 구조와 100% 일치, 단계별 결과/에러/확장성까지 모두 반영
- 새로운 데이터/필드/카드/버튼/다운로드/공유/확장 기능이 추가되어도 즉시 컴포넌트/카드로 확장 가능
- 각 에이전트별 결과/에러/빈 상태에 대한 단위/E2E 테스트 강화

## 6. 예시: ResultsSection 데이터 구조

```ts
{
  intent: { userGoal, mustHave, bestExecution, ... },
  requirements: { dataStructure, mustAsk, ... },
  trends: { trendSummary, bestTools, ... },
  flows: { flows: [ { type, title, steps: [ { step, code, ... } ], ... } ] },
  ux: {
    cards: [ { type, title, flow, copyPrompt, guide, story, planB, faq, failureCases, realTip } ],
    footer: { howToStart, pdfDownloadUrl, gptSharePrompt, community, expertConsultation }
  }
}
```

- 각 필드는 값이 있으면 무조건 노출, 없으면 안 보임
- flows/ux.cards/steps 등은 실제 업무/실행/복붙/실전/공유/확장 중심 구조로 설계됨

## 7. 상태 관리

- 각 에이전트 단계별 결과/에러/로딩/입력값 등 로컬/전역 상태로 관리

## 8. 스타일/반응형/접근성

- 디자인 시스템, 반응형, 접근성, 다크모드 등 기존 요구사항 유지

## 9. 테스트/문서화

- 각 에이전트별 결과/에러/빈 상태에 대한 단위/E2E 테스트 강화

## 10. 실전성/확장성

- 에이전트 기반 구조와 100% 일치, 단계별 결과/에러/확장성까지 모두 반영

## 11. 결과 데이터/컴포넌트 구조 원칙

- 각 결과 데이터(ux.cards, flows, trends, requirements, intent 등)는 ResultsSection, StepGuide, FlowVisualization 등 별도 컴포넌트/카드/섹션으로 분리되어, 실제 데이터에 따라 동적으로 조합/렌더링됨
- 값이 있으면 무조건 노출, 없으면 안 보임(실행력/실용성 중심)
- 새로운 데이터/필드가 추가되면 즉시 컴포넌트/카드로 확장 가능
- 모든 버튼/다운로드/공유/확장 기능은 실제 실행/협업/피드백 루프까지 지원

## [최신] 실용성/실행력/맞춤형 자동화 중심 컴포넌트 구조

### 1. 컴포넌트 트리/배치

- HeroSection: 공감/문제/솔루션 요약
- FlowVisualization: 자동화 플로우(한눈에 보기), 단계별 결과/효과
- CTASection: 즉시 실행/복사/튜토리얼/다운로드/공유
- StepGuide: 단계별 상세/코드/팁/문제해결(펼침/접기)
- MetricsBar: 실전 효과/지표/ROI/사례
- PlanBCard: 실패/불안 대비, 대안/실패사례
- FAQCard: 자주 묻는 질문/실패/불안 해소
- TipsCard: 실전팁/확장 아이디어
- ExpansionCard: 확장/업셀링/커뮤니티/전문가 지원
- CommunityCard: 커뮤니티 Q&A/전문가 지원 등

### 2. 각 컴포넌트 역할/데이터 매핑

- 각 데이터 필드(hero, flow, stepGuides, metrics, planB, faq, tips, expansion, community 등)와 1:1 매핑
- 값이 있으면 무조건 노출, 없으면 안 보임
- 새로운 데이터/필드가 추가되면 즉시 컴포넌트/카드로 확장 가능

## wow 실전성/실행력/맞춤형 자동화 중심 컴포넌트 구조

### 1. ResultsSection

- 전체 결과(ux.cards, flows, intent, metrics 등)를 받아 실전성 중심으로 렌더링
- 헤더: 실전 목표/실행 방식/지표
- CardTabs: 복붙/실행/가이드/PlanB/FAQ/팁 등 실전 카드 탭
- Footer: howToStart, PDF, GPT 프롬프트, 커뮤니티, 전문가 상담 등 실전 푸터

### 2. CardTabs

- ux.cards의 각 카드(복붙/실행/가이드/PlanB/FAQ/팁 등)를 탭으로 분리
- flows와 연동해 StepGuide, FlowVisualization 등 실전 단계별 가이드 제공
- PlanBCard, FAQCard, TipsCard 등 각 카드 컴포넌트로 분리

### 3. StepGuide

- flows의 steps 구조에 맞춰 단계별 코드/가이드/팁/PlanB/FAQ/실패사례/복사/다운로드 등만 남김
- 각 단계별로 복사/다운로드/실행/PlanB/FAQ/팁/실패사례 등 실전 정보만 노출

### 4. FlowVisualization

- flows의 steps를 시각적으로만 보여줌(실행력 중심)
- 각 단계별 타입/설명/실행 흐름만 표시

### 5. PlanBCard, FAQCard, TipsCard 등

- PlanBCard: PlanB/실패사례/대체안
- FAQCard: 자주 묻는 질문/답변
- TipsCard: 실전 팁/노하우
- ExpansionCard, CommunityCard 등 확장/커뮤니티/상담 기능도 별도 컴포넌트로 분리

### 6. MetricsBar

- 실전 효과/지표/ROI/사례 시각화

### 7. Button, Badge, Card 등 UI 컴포넌트

- Button: 복사/다운로드/실행 등 액션
- Badge: 단계/타입/상태 표시
- Card: 단계별/플로우별 카드 UI

### 8. 확장성/실전성 원칙

- 값이 있으면 무조건 노출, 없으면 미노출(실행력/실용성 중심)
- 새로운 데이터/필드/카드/버튼/다운로드/공유/확장 기능이 추가되어도 즉시 컴포넌트/카드로 확장 가능
- 모든 결과/버튼/다운로드/공유/확장 기능은 실제 실행/협업/피드백 루프까지 지원
