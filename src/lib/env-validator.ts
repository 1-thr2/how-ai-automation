import { z } from 'zod';

/**
 * 환경변수 스키마 정의
 *
 * 초보자를 위한 설명:
 * - z.string(): 문자열이어야 함
 * - .min(1): 최소 1글자 이상 (빈 문자열 불가)
 * - .optional(): 선택사항 (없어도 됨)
 * - .default(): 기본값 설정
 */
const envSchema = z.object({
  // ============================================
  // 필수 환경변수
  // ============================================

  // OpenAI API 키 (필수)
  // 예: sk-proj-abc123...
  OPENAI_API_KEY: z
    .string()
    .min(1, '❌ OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요.')
    .startsWith('sk-', '❌ OPENAI_API_KEY 형식이 올바르지 않습니다. "sk-"로 시작해야 합니다.'),

  // Supabase URL (필수)
  // 예: https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, '❌ NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다.')
    .url('❌ NEXT_PUBLIC_SUPABASE_URL은 유효한 URL이어야 합니다.')
    .includes('supabase.co', { message: '❌ NEXT_PUBLIC_SUPABASE_URL은 Supabase URL이어야 합니다.' }),

  // Supabase 익명 키 (필수)
  // 예: eyJhbGci...
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, '❌ NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.')
    .startsWith('eyJ', '❌ NEXT_PUBLIC_SUPABASE_ANON_KEY 형식이 올바르지 않습니다. JWT 토큰이어야 합니다.'),

  // ============================================
  // 선택적 환경변수
  // ============================================

  // Tavily API 키 (선택사항 - RAG 검색용)
  // 없으면 RAG 기능이 제한되지만 앱은 작동함
  TAVILY_API_KEY: z
    .string()
    .optional(),

  // 대시보드 비밀번호 (선택사항)
  // 개발 모드에서는 기본값 'admin123' 사용
  DASHBOARD_PASSWORD: z
    .string()
    .optional(),

  // Supabase 서비스 역할 키 (선택사항)
  // 고급 기능에만 필요
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .optional(),

  // Judge0 API (코드 검증용, 선택사항)
  JUDGE0_API_KEY: z
    .string()
    .optional(),

  JUDGE0_API_URL: z
    .string()
    .url()
    .optional(),

  // 실행 환경
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

/**
 * 환경변수 타입 추론
 * TypeScript가 자동으로 타입을 알 수 있게 함
 */
export type Env = z.infer<typeof envSchema>;

/**
 * 환경변수 검증 및 파싱
 *
 * 사용법:
 * ```typescript
 * import { env } from '@/lib/env-validator';
 *
 * const apiKey = env.OPENAI_API_KEY; // ✅ 타입 안전
 * ```
 */
export function validateEnv(): Env {
  try {
    // 환경변수 검증
    const parsed = envSchema.parse(process.env);

    console.log('✅ [환경변수] 검증 성공');

    // 선택적 환경변수 경고
    if (!parsed.TAVILY_API_KEY) {
      console.warn('⚠️ [환경변수] TAVILY_API_KEY가 설정되지 않음 - RAG 검색 기능이 제한됩니다.');
    }

    if (!parsed.DASHBOARD_PASSWORD && parsed.NODE_ENV !== 'development') {
      console.warn('⚠️ [환경변수] DASHBOARD_PASSWORD가 설정되지 않음 - 프로덕션에서는 설정을 권장합니다.');
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // 검증 실패 시 상세한 에러 메시지 출력
      console.error('❌ [환경변수] 검증 실패:');
      console.error('');

      error.errors.forEach((err) => {
        const field = err.path.join('.');
        console.error(`  ${err.message}`);
        console.error(`  필드: ${field}`);
        console.error('');
      });

      console.error('💡 해결 방법:');
      console.error('  1. 프로젝트 루트에 .env.local 파일을 생성하세요');
      console.error('  2. .env.example 파일을 참고하여 필수 값을 입력하세요');
      console.error('  3. 명령어: cp .env.example .env.local');
      console.error('');

      // 개발 모드에서는 에러를 던지고, 프로덕션에서는 프로세스 종료
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }

      throw new Error('환경변수 검증 실패');
    }

    throw error;
  }
}

/**
 * 환경변수 안전 접근 헬퍼 함수
 *
 * 초보자를 위한 설명:
 * 이 함수는 환경변수에 안전하게 접근하게 해줍니다.
 * 만약 환경변수가 없으면 기본값을 반환하거나 에러를 발생시킵니다.
 */
export function getEnvOrThrow(key: keyof Env, errorMessage?: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(
      errorMessage || `환경변수 ${key}가 설정되지 않았습니다.`
    );
  }

  return value;
}

/**
 * 환경변수 안전 접근 (기본값 제공)
 */
export function getEnvOrDefault(key: keyof Env, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * 환경변수 검증 상태 확인
 *
 * 초보자를 위한 설명:
 * 이 함수는 현재 설정된 환경변수들의 상태를 보여줍니다.
 * 대시보드나 디버깅할 때 유용합니다.
 */
export function getEnvStatus() {
  return {
    // 필수 환경변수
    required: {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },

    // 선택적 환경변수
    optional: {
      TAVILY_API_KEY: !!process.env.TAVILY_API_KEY,
      DASHBOARD_PASSWORD: !!process.env.DASHBOARD_PASSWORD,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      JUDGE0_API_KEY: !!process.env.JUDGE0_API_KEY,
    },

    // 실행 환경
    environment: process.env.NODE_ENV || 'development',

    // 전체 상태
    allRequiredSet: !!(
      process.env.OPENAI_API_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  };
}

// 환경변수 검증 실행 및 export
// 이 파일을 import하면 자동으로 검증이 실행됩니다
let env: Env;

try {
  env = validateEnv();
} catch (error) {
  // 개발 모드에서는 경고만 표시
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ [환경변수] 검증 실패했지만 개발 모드에서 계속 실행합니다.');
    env = {} as Env; // 빈 객체로 초기화
  } else {
    // 프로덕션에서는 에러 발생
    throw error;
  }
}

export { env };
