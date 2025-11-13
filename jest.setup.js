/**
 * Jest 설정 파일
 *
 * 초보자를 위한 설명:
 * 모든 테스트가 실행되기 전에 한 번만 실행되는 파일입니다.
 * 여기서 테스트 환경을 준비합니다.
 */

// React Testing Library 확장 매처 import
import '@testing-library/jest-dom'

// 환경변수 모킹 (테스트용 가짜 값)
process.env = {
  ...process.env,
  OPENAI_API_KEY: 'sk-test-mock-key-for-testing',
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJtest-mock-key',
  TAVILY_API_KEY: 'tvly-test-mock-key',
  DASHBOARD_PASSWORD: 'test123',
  NODE_ENV: 'test',
}

// fetch API 모킹 (Node.js 18 미만에서 필요)
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn()
}

// console.error/warn 모킹 (테스트 중 불필요한 로그 숨기기)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}
