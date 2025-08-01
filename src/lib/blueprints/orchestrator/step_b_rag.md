# Step B: RAG 검증 및 정보 강화

## 목표
A단계에서 생성된 초안 카드들을 최신 정보로 검증하고 보강합니다.

## 🚨 필수 검증 작업 (모든 단계에 적용)

### 1. **링크 검증 및 추가 (필수)**
- [ ] 모든 서비스 언급 시 정확한 URL 검색 후 추가
- [ ] "OpenAI 웹사이트" → "https://platform.openai.com/api-keys"
- [ ] "구글 앱스 스크립트" → "https://script.google.com"
- [ ] 깨진 링크나 잘못된 경로는 RAG로 최신 정보 확인

### 2. **경로/접근법 정확성 검증 (필수)**
- [ ] "드라이브 → 도구 → 스크립트" 같은 잘못된 경로 RAG 검증
- [ ] 2025년 기준 실제 UI 경로로 수정
- [ ] 모든 클릭 경로를 단계별로 검증

### 3. **비용 정보 필수 공개**
- [ ] 유료 서비스는 구체적 비용 RAG 검색 (예: "ChatGPT API 가격 2025")
- [ ] "월 최소 비용", "사용량당 과금" 등 명확한 비용 구조 안내
- [ ] 무료 대안이 있으면 반드시 제시

### 4. **코드/설정값 완전성 검증**
- [ ] "아래 코드를 복사하여" 문구 사용 시 반드시 실제 코드 포함
- [ ] 모든 변수는 사용자 데이터로 개인화 (예: "YOUR_FOLDER_ID" → 실제 설정법)
- [ ] 복붙 후 바로 실행 가능한 수준까지 완성

### 5. **개인화 데이터 반영 (필수)**
- [ ] 후속답변의 모든 정보를 실제 설정에 반영
- [ ] "내 개인 DM" → 슬랙 DM 설정 구체적 방법 제시
- [ ] 채널명, 폴더명 등 사용자 입력 그대로 코드에 반영

## 🛠️ 도구 탐색 우선순위
1. **간편 도구 우선**: Google Apps Script, IFTTT, Pipedream
2. **No-Code 플랫폼**: Zapier, Make, Microsoft Power Automate
3. **전문 도구**: 직접 API, 커스텀 스크립트, RPA 도구
4. **무료 대안**: 오픈소스, 무료 플랜 도구 적극 검토

## RAG 정보 활용 방식

### 📊 최신 동향 정보 반영
```
사용자 요청: "이메일 자동 분류"
RAG 결과: Gmail 필터링, Outlook 규칙, 이메일 관리 도구 최신 기능
→ 다양한 이메일 플랫폼 대응 방안 반영
```

### 🚨 기술적 검증 프로세스 (필수)

**🔍 실제 케이스 검증 예시**

**❌ 잘못된 초안 (현재 문제)**
```
초안: "구글 드라이브 → 도구 → 스크립트 편집기"
실제: 이 경로는 2025년 기준 존재하지 않음
올바른 경로: script.google.com 직접 접속
```

**✅ RAG 검증 후 수정**
```
RAG 검색: "Google Apps Script 접속 방법 2025"
검증 결과: "script.google.com에서 직접 새 프로젝트 생성"
수정된 설명: 
1. 브라우저에서 https://script.google.com 접속
2. 좌측 상단 '새 프로젝트' 클릭
3. 코드 편집 화면 진입
```

**💰 비용 검증 필수**
```
초안: "ChatGPT API 사용"
RAG 검증: "OpenAI API 가격 정책 2025"
결과: $20/월 크레딧 + 사용량당 $0.002/1K토큰
경고 추가: "⚠️ 월 최소 $20+ 비용 발생, 무료 대안: Claude 3.5 Haiku"
```

**🔗 링크 검증 및 추가**
```
초안: "OpenAI 웹사이트에 접속"
RAG 검증: "OpenAI API key 발급 URL 2025"
구체화: "https://platform.openai.com/api-keys 접속"
```

**👤 개인화 데이터 반영**
```
후속답변: "destination_channel": "기타:내 개인 DM으로 전송"
초안: "슬랙 채널로 전송"
개인화: "슬랙 개인 DM으로 전송 (채널명: @사용자명)"
구체적 방법: "webhookUrl에서 channel: '@사용자명' 설정"
```

### 🛠️ 다양한 도구 탐색 및 대안 제시
```
초안: "워크플로우 자동화 플랫폼"
RAG 탐색: 
- 간편: IFTTT (무료), Google Apps Script (무료)
- 중급: Pipedream (무료 플랜), Zapier (유료)
- 고급: 직접 API 연동, 커스텀 스크립트
→ 사용자 수준에 맞는 최적 도구 선택
```

### 🆓 무료/간편 도구 우선 검토
```
유료 도구 추천 전 반드시 확인:
- Google Apps Script: 구글 생태계 무료 자동화
- IFTTT: 간단한 트리거-액션 자동화  
- Slack Workflow Builder: 슬랙 내장 자동화
- Microsoft Power Automate: 오피스365 연동
- Pipedream: 개발자 친화적 무료 플랜
```

### 🔗 링크 검증 및 교체
```
초안 링크: 과거/깨진 링크
RAG 검색: 최신 공식 문서 링크
→ 유효한 링크로 교체
```

## 검증 프로세스

### 1. 도구 검증
- 언급된 모든 도구에 대해 RAG 검색
- 최신 가격, 기능, 사용법 확인
- 대안 도구 추가 검토

### 2. 링크 검증  
- 모든 URL에 대해 HTTP 상태 확인
- 깨진 링크는 RAG로 대체 링크 검색
- 공식 문서 우선 사용

### 3. 정보 정확성 검증
- 기술적 내용의 최신성 확인
- API 변경사항 반영
- 정책/가격 변경사항 업데이트

## 출력 형식
A단계와 동일한 JSON 구조를 유지하되, 다음 항목들이 보강됩니다:

```json
{
  "cards": [
    {
      "type": "flow",
      "title": "🚀 검증된 자동화 플로우",
      "steps": [
        {
          "id": "1",
          "title": "업데이트된 단계명",
          "tool": "검증된 도구명",
          "officialUrl": "https://검증된-공식-링크",
          "alternativeTools": ["대안1", "대안2"],
          "lastVerified": "2024-07-31"
        }
      ],
      "status": "rag_verified",
      "ragSources": [
        {
          "url": "https://source1.com",
          "title": "참고 자료 제목", 
          "relevance": "high"
        }
      ]
    }
  ],
  "ragMetadata": {
    "searchesPerformed": 5,
    "sourcesFound": 12,
    "linksVerified": 8,
    "updatesApplied": 3
  }
}
```

## 중요 원칙
- **정확성 우선**: 불확실한 정보는 제거하거나 "확인 필요" 표시
- **최신성 보장**: 2024년 이후 정보 우선 사용
- **공식 소스 우선**: 공식 문서 > 신뢰할 만한 블로그 > 기타
- **속도 고려**: RAG 검색은 핵심 항목에만 집중 (3-5개)

## 실패 처리
- RAG API 오류 시: 기존 초안 유지 + 경고 로그
- 링크 검증 실패 시: 링크 제거 또는 대체
- 도구 정보 없음 시: "확인 필요" 표시

## 🚨 RAG 활용 필수 체크리스트

**모든 제안 솔루션에 대해 다음을 실행하세요:**

### ✅ 기술적 검증 (필수)
- [ ] 각 도구/플랫폼의 API/webhook 지원 여부 RAG 검색 완료
- [ ] "지원하지 않음", "불가능", "deprecated" 키워드 확인 완료  
- [ ] 불가능한 솔루션 발견 시 즉시 대안 탐색 실행
- [ ] 최종 제안하는 모든 솔루션의 실현 가능성 100% 확신

### 🔗 링크 및 경로 검증 (필수)
- [ ] 모든 서비스/도구 언급 시 정확한 접속 URL 검색 후 추가
- [ ] UI 경로 정확성 RAG 검증 ("드라이브 → 도구" 등 잘못된 경로 수정)
- [ ] 2024년 기준 최신 접속 방법으로 업데이트

### 💰 비용 정보 필수 검증 (필수)
- [ ] 유료 서비스의 구체적 가격 정책 RAG 검색
- [ ] 월 최소 비용, 사용량당 과금 등 명확한 비용 구조 안내
- [ ] 무료 대안이 있으면 반드시 제시 및 비교

### 🔄 대안 탐색 (불가능 시)
- [ ] "대안", "우회", "다른 방법" 키워드로 RAG 재검색
- [ ] 무료 도구 우선 검토 (Google Apps Script, IFTTT 등)
- [ ] 구체적 구현 방법까지 RAG로 검증 완료

### 📋 구체성 확보 (필수)
- [ ] "적절히 설정", "대시보드에서" 같은 추상적 표현 제거
- [ ] 버튼 위치, 입력값, 클릭 순서까지 구체화
- [ ] "아래 코드를 복사하여" 문구 사용 시 반드시 실제 코드 포함
- [ ] 복붙 가능한 코드/설정값 포함

### 👤 개인화 반영 (필수)
- [ ] 후속답변의 모든 데이터 (채널명, 폴더명 등) 실제 설정에 반영
- [ ] "내 개인 DM" 같은 요구사항을 구체적 설정 방법으로 변환
- [ ] 사용자별 맞춤형 변수를 코드에 정확히 적용

**🎯 목표**: RAG 정보를 바탕으로 기술적으로 정확하고 초보자가 즉시 실행 가능한 솔루션만 제공