# 📡 API 명세서 (에이전트 기반, wow 실용성/실행력/맞춤형 자동화 중심)

## 1. 에이전트 오케스트레이터 API (핵심)

### POST /api/agent-orchestrator

에이전트 기반으로 인텐트 분석 → 요구사항/데이터 구조 → 트렌드/도구/실전팁 → 플로우 설계 → UX 가공까지 단계별로 처리하는 wow 자동화 API입니다.

#### 요청

```typescript
interface AgentOrchestratorRequest {
  userInput: string; // 사용자의 자연어 업무 설명
  context?: any; // (선택) 추가 컨텍스트
}
```

#### 응답

```typescript
interface AgentOrchestratorResponse {
  result: {
    intent: IntentAnalysisResult;
    requirements: RequirementsResult;
    trends: TrendAnalysisResult;
    flows: FlowDesignResult;
    ux: UXResult;
  };
}
```

- 각 단계별 결과는 실행/복붙/실전/공유/확장 중심 데이터만 포함
- 값이 있으면 무조건 노출, 없으면 안 보임(실행력/실용성 중심)
- 새로운 데이터/필드가 추가되면 즉시 확장 가능

#### 예시

```bash
curl -X POST /api/agent-orchestrator \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "매주 AI 콘텐츠를 슬랙방에 올리고 싶어요",
    "context": { "team": "마케팅" }
  }'
```

#### 응답 예시

```json
{
  "result": {
    "intent": { ... },
    "requirements": { ... },
    "trends": { ... },
    "flows": { ... },
    "ux": { ... }
  }
}
```

## 2. 각 에이전트별 역할/프롬프트/입출력 구조

- 인텐트 분석: 실행 목표/핵심 요구/복붙 프롬프트 등
- 요구사항/데이터 구조: 데이터 구조/실전 예시/복붙 프롬프트 등
- 트렌드/도구/실전팁: 최신 트렌드/도구/실전팁/PlanB/복붙 프롬프트 등
- 플로우 설계: 플로우/단계별 코드/가이드/실전팁/PlanB/FAQ/실패사례/복붙 프롬프트 등
- UX 가공: 카드/실행/공유/확장/다운로드/복붙 프롬프트 등

## 3. 에러/확장성/보안

- 모든 API는 에러/빈값/예외 상황에 대해 사용자 친화적 메시지 제공
- 새로운 데이터/필드/카드/버튼/다운로드/공유/확장 기능이 추가되어도 즉시 확장 가능
- HTTPS, 인증, Rate Limiting, 버전 관리 등 확장성/보안 고려

## 4. 리스크/불안요소와 대응책

| 리스크/불안요소  | 대응 설계                                       |
| ---------------- | ----------------------------------------------- |
| 단계별 에러/빈값 | fallback/재시도/보완질문 자동화, 에러 메시지 UX |
| 속도/비용 증가   | 캐싱/병렬화/최소화, 단계별 비용 모니터링        |
| 컨텍스트 손실    | 각 단계별 입출력 명확화, 중간 결과 로깅         |
| 통합/정합성      | 통합 에이전트에서 데이터 정합성/UX 일관성 보장  |
| 디버깅/운영      | 단계별 로깅/모니터링/에러 트래킹 체계화         |

## 5. 확장성/와우포인트

- 각 에이전트별로 역할/프롬프트/모델/후처리 분리, wow한 결과 품질과 실무적 안정성 동시 달성

## 6. 템플릿 목록/상세 API

### GET /api/templates

- 사용 가능한 모든 자동화 템플릿 반환

### GET /api/templates/:id

- 특정 템플릿 상세 정보 반환

## 7. 에러 처리

모든 API는 다음과 같은 에러 응답 형식을 따릅니다:

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### 주요 에러 코드

- `INVALID_REQUEST`: 잘못된 요청 형식
- `TEMPLATE_NOT_FOUND`: 템플릿을 찾을 수 없음
- `ANALYSIS_FAILED`: 업무 분석 실패
- `SERVER_ERROR`: 서버 내부 오류

## 8. 보안/버전/확장성

- 모든 API는 HTTPS만 허용
- API 키 인증(향후)
- 요청 제한(Rate Limiting)
- 버전: `/api/v1/automation-recipe` 등
- 향후: 사용자 인증, 히스토리, 피드백, 커뮤니티 등 확장 가능

## 9. 데이터 플로우(필수)

```
사용자 입력 → 에이전트 오케스트레이터로 트렌드/도구/사례 분석 →
요구사항 구조화/보완질문 →
자동화 플로우 설계 →
단계별 코드/가이드/FAQ/PlanB/확장 →
통합/UX 가공 →
최종 결과
```

## 10. 기타

- 연도 하드코딩 금지, 항상 실시간 처리
- 모든 결과/에러/빈 상태/예외 상황에 대해 사용자 친화적 메시지 제공

## 11. 향후 계획

### 11.1 추가될 API

- 사용자 인증 API
- 히스토리 저장 API
- 피드백 API

### 11.2 개선 사항

- OpenAI API 연동
- 캐싱 구현
- 실시간 분석 기능
