# Next.js 14 업그레이드 가이드

## 🎯 초보자를 위한 설명

**Next.js란?**
- React 기반 웹 프레임워크
- 현재 버전: 13.5.6
- 최신 버전: 14.x (2024년 기준)

**왜 업그레이드하나요?**
1. 🚀 **성능 개선**: Turbopack (더 빠른 빌드)
2. 🔒 **보안 패치**: 최신 보안 업데이트
3. ✨ **새 기능**: Server Actions, Partial Prerendering
4. 🐛 **버그 수정**: 기존 버그 해결

## ⚠️ 주의사항

**업그레이드 전 필수 확인:**
1. ✅ Git 커밋 완료 (혹시 문제 생기면 되돌리기 위해)
2. ✅ 로컬 환경에서 먼저 테스트
3. ✅ 의존성 호환성 확인

**위험도:** 🟡 중간
- 대부분 자동으로 호환됨
- 일부 Breaking Changes 있을 수 있음

## 📋 업그레이드 단계

### 1단계: Git 백업

```bash
# 현재 작업 커밋
git add .
git commit -m "업그레이드 전 백업"

# 새 브랜치 생성 (안전하게)
git checkout -b upgrade/nextjs-14
```

### 2단계: 의존성 업그레이드

```bash
# Next.js 및 React 업그레이드
npm install next@latest react@latest react-dom@latest

# 또는 특정 버전
npm install next@14 react@18.3.1 react-dom@18.3.1
```

### 3단계: 코드 마이그레이션 (자동)

Next.js 14는 codemod(자동 변환 도구)를 제공합니다:

```bash
# App Router 관련 코드 자동 변환
npx @next/codemod@latest upgrade latest
```

선택지:
- `app-dir-migration`: Pages Router → App Router 마이그레이션
- `new-link`: Link 컴포넌트 업데이트
- `next-image-to-legacy-image`: Image 컴포넌트 업데이트

### 4단계: 타입 에러 확인

```bash
# TypeScript 타입 체크
npm run type-check
```

에러가 나면 하나씩 수정

### 5단계: 로컬 테스트

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 확인
# http://localhost:3005
```

**테스트 체크리스트:**
- [ ] 메인 페이지 로딩 확인
- [ ] 설문 페이지 동작 확인
- [ ] API 엔드포인트 동작 확인 (/api/agent-orchestrator)
- [ ] 결과 페이지 렌더링 확인
- [ ] 공유 링크 기능 확인

### 6단계: 빌드 테스트

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 실행
npm start
```

에러 없이 빌드되고 실행되는지 확인

### 7단계: 테스트 실행

```bash
# 단위 테스트
npm test

# 커버리지 확인
npm run test:coverage
```

## 🔧 예상 문제 및 해결

### 문제 1: Image 컴포넌트 에러

```
Error: Invalid src prop
```

**원인:** Next.js 14에서 Image 컴포넌트 요구사항 변경

**해결:**
```tsx
// 이전 (Next.js 13)
<Image src="/image.png" width={500} height={300} />

// Next.js 14
<Image src="/image.png" width={500} height={300} alt="설명" />
```

`alt` 속성이 필수가 되었습니다.

### 문제 2: Metadata API 변경

```
Error: generateMetadata is not a function
```

**원인:** 메타데이터 생성 방식 변경

**해결:**
```typescript
// 이전
export const metadata = { ... }

// Next.js 14 (동적 메타데이터)
export async function generateMetadata({ params }) {
  return {
    title: 'My Page',
  }
}
```

### 문제 3: Server Actions 관련 경고

```
Warning: Server Actions are experimental
```

**원인:** Server Actions 기능 사용 시

**해결:**
```javascript
// next.config.js
module.exports = {
  experimental: {
    serverActions: true, // 명시적으로 활성화
  },
}
```

### 문제 4: 빌드 에러

```
Error: Module not found
```

**원인:** 의존성 버전 충돌

**해결:**
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

## 📊 주요 변경사항

### 1. Turbopack (선택사항)

더 빠른 개발 서버:

```bash
# Turbopack 사용
npm run dev -- --turbo
```

**package.json에 추가:**
```json
{
  "scripts": {
    "dev": "next dev -p 3005 --turbo"
  }
}
```

### 2. Partial Prerendering (실험적)

```javascript
// next.config.js
module.exports = {
  experimental: {
    ppr: true, // 부분 사전 렌더링
  },
}
```

### 3. Server Actions

```typescript
// app/actions.ts
'use server'

export async function createAutomation(formData: FormData) {
  // 서버에서만 실행되는 액션
  const userInput = formData.get('userInput')
  // ...
}
```

## 🚀 업그레이드 후 최적화

### 1. 이미지 최적화

```typescript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'], // 최신 포맷 지원
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
}
```

### 2. 번들 크기 분석

```bash
# 번들 분석
ANALYZE=true npm run build
```

### 3. 캐싱 최적화

```typescript
// app/api/route.ts
export const revalidate = 3600 // 1시간 캐싱
```

## 🔄 롤백 (문제 발생 시)

업그레이드 후 문제가 생기면:

```bash
# 1. 변경사항 취소
git reset --hard HEAD

# 2. 또는 이전 브랜치로 돌아가기
git checkout main

# 3. node_modules 재설치
rm -rf node_modules
npm install
```

## 📋 체크리스트

업그레이드 완료 후 확인:

- [ ] `npm run dev` 정상 실행
- [ ] `npm run build` 성공
- [ ] `npm test` 통과
- [ ] 메인 기능 동작 확인
- [ ] API 엔드포인트 정상 작동
- [ ] 에러 로그 확인 (콘솔)
- [ ] 성능 측정 (빌드 시간, 로딩 속도)
- [ ] 프로덕션 배포 테스트 (Vercel)

## 🎓 추가 학습 자료

- [Next.js 14 공식 발표](https://nextjs.org/blog/next-14)
- [업그레이드 가이드](https://nextjs.org/docs/app/building-your-application/upgrading)
- [Breaking Changes](https://nextjs.org/docs/app/building-your-application/upgrading/version-14)

## 💡 업그레이드 권장 시점

**지금 바로 하면 좋은 경우:**
- 새 기능이 필요한 경우
- 보안 취약점이 발견된 경우
- Turbopack으로 빌드 속도 개선 필요

**나중에 해도 되는 경우:**
- 현재 안정적으로 작동 중
- 큰 기능 개발 중 (충돌 위험)
- 시간 여유가 없는 경우

## 🤝 도움말

업그레이드 중 문제가 생기면:
1. GitHub Issues에서 비슷한 문제 검색
2. Next.js Discord 커뮤니티 질문
3. Stack Overflow 검색

---

**중요:** 업그레이드는 선택사항입니다. 현재 버전(13.5.6)도 안정적으로 작동합니다.
시간 여유가 있을 때 천천히 진행하세요!
