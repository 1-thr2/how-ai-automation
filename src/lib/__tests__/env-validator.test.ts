/**
 * 환경변수 검증 로직 테스트
 *
 * 초보자를 위한 설명:
 * 이 파일은 env-validator.ts가 제대로 작동하는지 확인합니다.
 *
 * 테스트 구조:
 * describe() = 테스트 그룹 (비슷한 테스트들을 묶음)
 * it() 또는 test() = 개별 테스트
 * expect() = 예상 결과 검증
 */

import { getEnvStatus, getEnvOrDefault, getEnvOrThrow } from '../env-validator';

describe('환경변수 검증 유틸리티', () => {
  // 각 테스트 전에 환경변수 백업
  const originalEnv = process.env;

  beforeEach(() => {
    // 테스트마다 환경변수 초기화
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // 모든 테스트 후 원래 환경변수 복원
    process.env = originalEnv;
  });

  describe('getEnvStatus', () => {
    it('환경변수 상태를 올바르게 반환해야 함', () => {
      // 테스트용 환경변수 설정
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJtest';

      const status = getEnvStatus();

      // 검증: 필수 환경변수가 모두 설정됨
      expect(status.required.OPENAI_API_KEY).toBe(true);
      expect(status.required.NEXT_PUBLIC_SUPABASE_URL).toBe(true);
      expect(status.required.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(true);
      expect(status.allRequiredSet).toBe(true);
    });

    it('누락된 환경변수를 감지해야 함', () => {
      // OPENAI_API_KEY 제거
      delete process.env.OPENAI_API_KEY;

      const status = getEnvStatus();

      // 검증: OPENAI_API_KEY가 없음을 감지
      expect(status.required.OPENAI_API_KEY).toBe(false);
      expect(status.allRequiredSet).toBe(false);
    });

    it('선택적 환경변수를 올바르게 확인해야 함', () => {
      process.env.TAVILY_API_KEY = 'tvly-test';

      const status = getEnvStatus();

      // 검증: 선택적 환경변수 상태
      expect(status.optional.TAVILY_API_KEY).toBe(true);
    });
  });

  describe('getEnvOrThrow', () => {
    it('환경변수가 있으면 값을 반환해야 함', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';

      const result = getEnvOrThrow('OPENAI_API_KEY');

      expect(result).toBe('sk-test-key');
    });

    it('환경변수가 없으면 에러를 던져야 함', () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => {
        getEnvOrThrow('OPENAI_API_KEY');
      }).toThrow('환경변수 OPENAI_API_KEY가 설정되지 않았습니다');
    });

    it('커스텀 에러 메시지를 사용할 수 있어야 함', () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => {
        getEnvOrThrow('OPENAI_API_KEY', '커스텀 에러 메시지');
      }).toThrow('커스텀 에러 메시지');
    });
  });

  describe('getEnvOrDefault', () => {
    it('환경변수가 있으면 그 값을 반환해야 함', () => {
      process.env.DASHBOARD_PASSWORD = 'my-password';

      const result = getEnvOrDefault('DASHBOARD_PASSWORD', 'default-password');

      expect(result).toBe('my-password');
    });

    it('환경변수가 없으면 기본값을 반환해야 함', () => {
      delete process.env.DASHBOARD_PASSWORD;

      const result = getEnvOrDefault('DASHBOARD_PASSWORD', 'default-password');

      expect(result).toBe('default-password');
    });
  });
});
