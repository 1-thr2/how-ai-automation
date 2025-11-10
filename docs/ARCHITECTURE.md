# 🏗️ AI 자동화 레시피 생성 시스템 아키텍처

> 작성일: 2025-11-10
> 목적: 개발자/PM이 시스템 구조를 빠르게 이해하고 버그 수정 시 참고

---

## 📊 전체 데이터 플로우

```
사용자 입력
    ↓
/api/agent-orchestrator (route.ts)
    ↓
generate3StepAutomation (orchestrator-v2.ts)
    ├─ Step A: 빠른 플로우 초안 (executeStepA)
    │   └─ Blueprint: step_a_draft.md
    ├─ Step B: RAG 검증 (executeStepB)
    │   └─ RAG 시스템으로 도구/방법 검증
    └─ Step C: 상세 가이드 생성
        ├─ 복잡도 < 50%: executeStepC (Single-Pass)
        │   └─ Blueprint: step_c_wow.md
        └─ 복잡도 >= 50%: execute2PassStepC (2-Pass)
            ├─ Pass 1: Skeleton 생성 (카드 구조만)
            └─ Pass 2: enrichCardWithDetails (상세 내용 채우기)
                └─ Blueprint: step_c_wow.md
    ↓
cards 배열 반환
    ↓
WowAutomationResult.tsx (렌더링)
    └─ WowCardRenderer.tsx (각 카드 타입별 렌더링)
```

---

## 📁 핵심 파일 구조

### 🔵 **실제 사용 중인 파일**

#### API Layer
```
src/app/api/
├── agent-orchestrator/
│   └── route.ts                 ✅ 메인 엔드포인트
└── agent-followup/
    └── route.ts                 ✅ 후속 질문 생성
```

#### Agent Layer
```
src/lib/agents/
├── orchestrator-v2.ts           ✅ 메인 로직 (3-Step 시스템)
│   ├── generate3StepAutomation  - 메인 함수
│   ├── executeStepA             - 플로우 초안
│   ├── executeStepB             - RAG 검증
│   ├── executeStepC             - Single-Pass 가이드 생성
│   └── execute2PassStepC        - 2-Pass 가이드 생성
│
├── followup-v2.ts               ✅ 후속 질문 생성
├── intent-analyzer.ts           ✅ 사용자 의도 분석
└── failure-patterns.ts          ✅ 실패 패턴 감지
```

#### Blueprint/Prompt Files
```
src/lib/blueprints/
├── orchestrator/
│   ├── step_a_draft.md          ✅ Step A에서 사용 (1회)
│   ├── step_b_rag.md            🔴 사용 안 함 (레거시)
│   └── step_c_wow.md            ✅ Step C에서 사용 (4회)
│       └─ 역할: 가이드 생성 프롬프트 + JSON 스키마 정의
│
└── followup/
    ├── followup_base.md         ✅ 후속 질문 기본 프롬프트
    ├── followup_draft.md        ✅ 후속 질문 초안
    └── followup_refine.md       ✅ 후속 질문 정제
```

#### Frontend Components
```
src/app/components/
├── WowAutomationResult.tsx      ✅ 결과 전체 레이아웃
│   ├── 헤더 (동적 제목/설명)
│   ├── FlowDiagramSection (플로우 다이어그램)
│   ├── WowCardRenderer (카드 렌더링)
│   └── FAQ 모달
│
└── WowCardRenderer.tsx          ✅ 개별 카드 렌더러
    ├── guide 카드 (detailedSteps, codeBlocks, practicalTips)
    ├── faq 카드 (items 배열 파싱)
    ├── flow 카드 (steps 배열)
    └── expansion 카드 등
```

---

## 🔴 레거시 파일 (사용 안 함)

```
src/lib/blueprints/orchestrator/step_b_rag.md  ❌ orchestrator-v2.ts에서 호출 안 함
```

---

## 🐛 현재 버그 및 원인

### 1️⃣ **FAQ 카드가 안 나오는 문제**

#### 원인
`orchestrator-v2.ts`의 2가지 함수에서 **하드코딩된 JSON 템플릿**이 FAQ를 제외:

**executeStepC (Single-Pass)** - line 2182-2224
```typescript
const userPrompt = `...
JSON 형식으로 응답하세요:
{
  "cards": [
    { "type": "flow", ... },
    { "type": "guide", ... },  // guide만 생성
    { "type": "guide", ... }
  ]
}`;  // ❌ FAQ 카드가 템플릿에 없음!
```

**execute2PassStepC (2-Pass)** - line 2770-2821
```typescript
const skeletonPrompt = `...
{
  "cards": [
    { "type": "flow", ... },
    { "type": "guide", stepId: "1", ... },
    { "type": "guide", stepId: "2", ... },
    { "type": "guide", stepId: "3", ... },
    { "type": "needs_analysis", ... },
    { "type": "faq", ... }  // ✅ 여기는 있음!
  ]
}`;
```

**결론:**
- 복잡도 >= 50% (2-Pass): FAQ 생성됨 ✅
- 복잡도 < 50% (Single-Pass): FAQ 안 생성됨 ❌

#### 해결 방법
`executeStepC` 함수의 JSON 템플릿에 FAQ 카드 추가 (line 2220 근처)

---

### 2️⃣ **4단계 플로우인데 1-3단계만 가이드 나오는 문제**

#### 가능한 원인

**원인 1: GPT가 예시를 너무 따라함**
- line 2773-2818의 skeleton 템플릿이 3단계 예시만 제공
- GPT가 예시를 따라 항상 3개 guide만 생성할 가능성
- 하지만 line 2821에 경고문 있음 ("실제 Flow 단계 수에 맞춰...")

**원인 2: max_tokens 부족**
- line 2829: `max_tokens: 1200`
- 4단계 skeleton JSON 생성 시 토큰 부족해서 4번째 guide 잘릴 가능성

**원인 3: Pass 2에서 4번째 guide 처리 실패**
- Skeleton은 4개 만들었는데 enrichCardWithDetails에서 에러
- 로그 확인 필요

#### 해결 방법
1. max_tokens 증가 (1200 → 2000)
2. Skeleton 템플릿에 4-5단계 예시 추가
3. 로그로 실제 skeleton 개수 확인

---

### 3️⃣ **코드블록/실전팁 스타일 깨짐 문제**

#### 원인
`step_c_wow.md` 와 `WowCardRenderer.tsx` 간 **필드 불일치**:

**step_c_wow.md에 정의된 구조 (수정 전):**
```json
{
  "codeBlocks": [
    {
      "filename": "코드.gs",        // ❌ 프론트에서 사용 안 함
      "description": "코드 설명"     // ❌ 프론트는 title 기대
    }
  ]
}
```

**WowCardRenderer.tsx가 기대하는 구조:**
```tsx
block.title                      // ✅ 코드 제목
block.copyInstructions           // ✅ 붙여넣기 위치
block.saveLocation               // ✅ 저장 위치
```

**누락된 필드:**
- `practicalTips` - 백엔드 프롬프트에 정의 없음
- `commonMistakes` - 백엔드 프롬프트에 정의 없음

#### 해결 방법
`step_c_wow.md`의 codeBlocks 구조를 프론트엔드와 일치하도록 수정 ✅ (이미 완료)

---

## 🎯 step_c_wow.md의 역할 혼란

### 현재 상황
```
step_c_wow.md = "프롬프트" + "문서" + "스키마" 역할 혼재
```

**문제점:**
1. .md 파일이지만 프롬프트로 사용됨
2. JSON 스키마 정의가 .md 안에 있음
3. 코드의 하드코딩이 .md 내용을 덮어씀

**이상적 구조 (향후 리팩토링 시):**
```
/docs
  - guide-card-spec.md           (사람용 문서)

/src/lib/schemas
  - guide-card.schema.ts         (Zod 스키마)

/src/lib/prompts
  - guide-generation.ts          (프롬프트 빌더 함수)
```

---

## 🔧 Blueprint 사용 현황

| 파일명 | 사용 위치 | 사용 횟수 | 용도 |
|--------|----------|---------|------|
| `step_a_draft.md` | `executeStepA:96` | 1회 | 플로우 초안 생성 |
| `step_b_rag.md` | - | 0회 | ❌ 레거시 |
| `step_c_wow.md` | `executeStepC:2143`<br/>`execute2PassStepC:2902`<br/>`enrichCardWithDetails:2902` 내부<br/>`generateDynamicSteps...:3939`<br/>`generateRealisticAlt...:4177` | 4회 | 가이드/FAQ 생성 |

**step_c_wow.md가 4번 사용되는 이유:**
1. executeStepC (Single-Pass)
2. execute2PassStepC의 Pass 2 (enrichCardWithDetails)
3-4. 헬퍼 함수들 (동적 단계 생성, 대안 생성)

---

## 💡 개발 가이드

### 카드 구조 수정 시
1. `step_c_wow.md`에서 JSON 스키마 수정
2. `WowCardRenderer.tsx`에서 렌더링 로직 수정
3. **양쪽 필드명 일치 확인 필수!**

### FAQ 추가/수정 시
1. `step_c_wow.md`의 FAQ 섹션 수정 (line 398-543)
2. Single-Pass 템플릿에 FAQ 추가 필요 (`executeStepC:2220`)

### 단계 수 변경 시
1. `execute2PassStepC`의 skeleton 템플릿 예시 수정 (line 2773-2821)
2. max_tokens 조정 (현재 1200)

---

## 🚀 다음 단계 (권장 리팩토링)

### Phase 1: 긴급 버그 수정 (1-2시간)
- [ ] executeStepC에 FAQ 카드 템플릿 추가
- [ ] execute2PassStepC max_tokens 증가 (1200 → 2000)
- [ ] 4-5단계 skeleton 예시 추가

### Phase 2: 구조 명확화 (1-2일)
- [ ] step_c_wow.md를 3개로 분리
  - `docs/card-spec.md` (문서)
  - `src/lib/schemas/cards.ts` (Zod 스키마)
  - `src/lib/prompts/guide-generation.ts` (프롬프트)
- [ ] 하드코딩된 JSON 템플릿 제거
- [ ] Blueprint만 신뢰하는 구조로 변경

---

## 📝 참고사항

- **모델 선택**:
  - Skeleton: gpt-4o (line 2824)
  - Detail: gpt-4o-2024-11-20 (line 3017)
  - Single-Pass: gpt-4.1 (line 2227)

- **토큰 제한**:
  - Skeleton: max_tokens=1200
  - Guide detail: max_tokens=8000
  - Other cards: max_tokens=4000
  - Single-Pass: max_tokens=32000

- **복잡도 계산**: `calculateSolutionComplexity()` 함수
  - 50% 미만: Single-Pass
  - 50% 이상: 2-Pass
