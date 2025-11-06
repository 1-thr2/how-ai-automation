const nextJest = require('next/jest')

/**
 * Jest 설정 파일
 *
 * 초보자를 위한 설명:
 * Jest = JavaScript 테스트 도구
 * 이 파일은 Jest가 어떻게 테스트를 실행할지 설정합니다
 */

const createJestConfig = nextJest({
  // Next.js 앱의 경로 (package.json이 있는 곳)
  dir: './',
})

/** @type {import('jest').Config} */
const config = {
  // 테스트 파일이 브라우저처럼 작동하도록 설정
  testEnvironment: 'jest-environment-jsdom',

  // 테스트 실행 전에 실행할 설정 파일들
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // 테스트 대상 파일 패턴
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],

  // 모듈 경로 별칭 (tsconfig.json과 동일하게)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // 테스트 커버리지 수집 대상
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],

  // 테스트에서 무시할 폴더
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/.backup/',
  ],

  // 모듈 변환 무시 패턴
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
}

// Next.js 설정을 Jest에 통합
module.exports = createJestConfig(config)
