# CI/CD 파이프라인 가이드

## 🎯 초보자를 위한 설명

**CI/CD란?**
- **CI (Continuous Integration)**: 코드 변경 시 자동으로 테스트
- **CD (Continuous Deployment)**: 테스트 통과 시 자동으로 배포
- 즉, 코드 푸시 → 자동 테스트 → 자동 배포

**왜 필요한가요?**
1. 🐛 **버그 조기 발견**: 푸시 즉시 테스트
2. 🚀 **빠른 배포**: 수동 작업 없이 자동 배포
3. 🔒 **안정성**: 테스트 통과한 코드만 배포
4. 👥 **협업**: 팀원 모두 같은 프로세스

## 📋 설정된 파이프라인

### 1. CI 파이프라인 (`.github/workflows/ci.yml`)

코드 푸시나 PR 생성 시 자동 실행:

```
코드 푸시/PR 생성
    ↓
① 린트 & 타입 체크
    ├─ ESLint 검사
    ├─ TypeScript 타입 체크
    └─ Prettier 포맷 체크
    ↓
② 테스트 실행
    ├─ 단위 테스트
    └─ 커버리지 생성
    ↓
③ 빌드 테스트
    ├─ Next.js 빌드
    └─ 빌드 크기 분석
    ↓
④ 보안 검사
    ├─ npm audit
    └─ Snyk 취약점 체크
    ↓
⑤ 결과 요약
```

### 2. CD 파이프라인 (`.github/workflows/deploy.yml`)

main 브랜치에 머지 시 자동 배포:

```
main 브랜치 푸시
    ↓
① 배포 전 검증
    ├─ 프로덕션 빌드 테스트
    └─ 테스트 실행
    ↓
② Vercel 배포
    ├─ Vercel CLI 설치
    ├─ 프로젝트 빌드
    └─ 프로덕션 배포
    ↓
③ 배포 후 검증
    └─ 웹사이트 헬스 체크
    ↓
④ 배포 알림
    ├─ Slack (옵션)
    └─ Discord (옵션)
```

## 🔧 초기 설정

### 1. GitHub Secrets 설정

GitHub 저장소 → Settings → Secrets and variables → Actions

**필수 Secrets:**

```
OPENAI_API_KEY               = sk-proj-...
NEXT_PUBLIC_SUPABASE_URL     = https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
```

**선택적 Secrets:**

```
TAVILY_API_KEY               = tvly-...
VERCEL_TOKEN                 = (Vercel 배포용)
CODECOV_TOKEN                = (코드 커버리지용)
SNYK_TOKEN                   = (보안 검사용)
SLACK_WEBHOOK_URL            = (Slack 알림용)
DISCORD_WEBHOOK              = (Discord 알림용)
```

### 2. Vercel 설정 (배포용)

1. Vercel 계정 생성: https://vercel.com
2. GitHub 저장소 연결
3. Vercel 토큰 발급:
   - Vercel Dashboard → Settings → Tokens
   - "Create Token" 클릭
   - 생성된 토큰을 GitHub Secrets에 `VERCEL_TOKEN`으로 추가

### 3. 브랜치 보호 설정 (권장)

GitHub 저장소 → Settings → Branches → Add rule

```
Branch name pattern: main

☑ Require a pull request before merging
☑ Require status checks to pass before merging
  - lint
  - test
  - build
☑ Require conversation resolution before merging
```

이렇게 설정하면 main 브랜치에 직접 푸시 불가, PR 필수!

## 🚀 사용 방법

### 일반적인 워크플로우

```bash
# 1. 새 기능 브랜치 생성
git checkout -b feature/my-new-feature

# 2. 코드 작성
# ... 개발 ...

# 3. 변경사항 커밋
git add .
git commit -m "feat: 새 기능 추가"

# 4. 브랜치 푸시
git push origin feature/my-new-feature
```

**자동으로 실행됨:**
- ✅ CI 파이프라인이 자동으로 실행
- ✅ 린트, 테스트, 빌드, 보안 검사

```bash
# 5. GitHub에서 Pull Request 생성
# → CI 결과가 PR에 표시됨

# 6. 리뷰 후 main에 머지
# → CD 파이프라인 자동 실행
# → Vercel에 자동 배포!
```

### 수동 배포

긴급 상황 시 수동 배포:

1. GitHub 저장소 → Actions 탭
2. "Deploy to Production" 선택
3. "Run workflow" 클릭
4. 브랜치 선택 후 실행

## 📊 CI 결과 확인

### GitHub Actions 탭

1. 저장소 → Actions 탭
2. 최근 실행 목록 확인
3. 특정 실행 클릭 → 상세 로그 확인

### PR에서 확인

Pull Request를 열면 하단에 CI 상태 표시:

```
✅ lint — Passed (45s)
✅ test — Passed (1m 23s)
✅ build — Passed (2m 15s)
⚠️ security — Warning (npm audit found 2 low vulnerabilities)
```

### 이메일 알림

GitHub Settings → Notifications에서 설정:
- ✅ Failed workflows only (실패 시만)
- ☑ Successful workflows (성공도 알림)

## 🐛 문제 해결

### 문제 1: CI 빌드 실패

```
Error: OPENAI_API_KEY is not defined
```

**원인:** GitHub Secrets 미설정

**해결:**
1. 저장소 → Settings → Secrets
2. OPENAI_API_KEY 등 필수 secrets 추가

### 문제 2: 테스트 실패

```
FAIL src/lib/__tests__/env-validator.test.ts
```

**원인:** 로컬에서는 성공했지만 CI 환경에서 실패

**해결:**
```bash
# 로컬에서 CI 환경 재현
NODE_ENV=test npm test

# 또는 Docker 사용
docker run -it --rm -v $(pwd):/app -w /app node:20 npm test
```

### 문제 3: 배포 실패

```
Error: Vercel token is invalid
```

**원인:** Vercel 토큰 만료 또는 잘못됨

**해결:**
1. Vercel에서 새 토큰 발급
2. GitHub Secrets의 VERCEL_TOKEN 업데이트

### 문제 4: 타임아웃

```
Error: The job running on runner has exceeded the maximum execution time of 60 minutes
```

**원인:** 빌드 시간이 너무 오래 걸림

**해결:**
```yaml
# .github/workflows/ci.yml
jobs:
  build:
    timeout-minutes: 30 # 기본 60분에서 조정
```

## 💡 최적화 팁

### 1. 캐싱으로 속도 향상

```yaml
- name: Node.js 설정
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm' # npm 캐싱 활성화
```

### 2. 병렬 실행

현재 설정은 이미 병렬 실행:
- lint, test, build, security 동시 실행

### 3. 조건부 실행

```yaml
# docs/ 폴더만 변경되면 빌드 스킵
- name: 변경 파일 확인
  uses: dorny/paths-filter@v2
  id: changes
  with:
    filters: |
      src:
        - 'src/**'
        - 'package.json'

- name: 빌드
  if: steps.changes.outputs.src == 'true'
  run: npm run build
```

### 4. PR 코멘트로 결과 표시

```yaml
- name: 테스트 커버리지 코멘트
  uses: romeovs/lcov-reporter-action@v0.3.1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    lcov-file: ./coverage/lcov.info
```

## 🎓 추가 학습 자료

- [GitHub Actions 공식 문서](https://docs.github.com/en/actions)
- [Vercel 배포 가이드](https://vercel.com/docs/deployments/git)
- [CI/CD 베스트 프랙티스](https://www.atlassian.com/continuous-delivery/principles/continuous-integration-vs-delivery-vs-deployment)

## 📋 체크리스트

설정 완료 확인:

- [ ] GitHub Secrets 추가 (OPENAI_API_KEY 등)
- [ ] Vercel 프로젝트 연결
- [ ] VERCEL_TOKEN Secret 추가
- [ ] 브랜치 보호 규칙 설정 (선택)
- [ ] 테스트 PR 생성하여 CI 작동 확인
- [ ] main 브랜치 머지하여 CD 작동 확인

## 🚨 보안 주의사항

1. **Secrets 절대 코드에 포함 금지**
   ```yaml
   # ❌ 절대 이렇게 하지 마세요
   env:
     API_KEY: sk-proj-abc123...

   # ✅ 이렇게 하세요
   env:
     API_KEY: ${{ secrets.OPENAI_API_KEY }}
   ```

2. **Public 저장소 주의**
   - Public 저장소에서는 누구나 Actions 로그 볼 수 있음
   - Secrets는 로그에 `***`로 마스킹되지만 주의 필요

3. **포크 PR 제한**
   ```yaml
   # 포크에서 온 PR은 Secrets 접근 불가 (보안)
   if: github.event.pull_request.head.repo.full_name == github.repository
   ```

---

**중요:** CI/CD 설정은 선택사항입니다. 수동 배포가 편하면 그대로 사용해도 됩니다!
