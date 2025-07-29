import { NextResponse } from 'next/server';

// 에러 코드 정의
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// 에러 메시지 정의
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.VALIDATION_ERROR]: '입력값이 유효하지 않습니다.',
  [ErrorCode.API_ERROR]: 'API 요청 중 오류가 발생했습니다.',
  [ErrorCode.NETWORK_ERROR]: '네트워크 오류가 발생했습니다.',
  [ErrorCode.UNKNOWN_ERROR]: '알 수 없는 오류가 발생했습니다.',
};

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: any;
  };
}

// API 응답 생성 헬퍼
export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  error?: {
    code: ErrorCode;
    message: string;
    details?: any;
  }
): ApiResponse<T> => {
  return { success, data, error };
};

// 에러 로깅
const logError = (error: any, context?: string) => {
  console.error(`[${context || 'Error'}]`, error);
};

// 통합된 에러 처리 함수
export const handleError = (error: unknown, context?: string): ApiResponse<null> => {
  logError(error, context);

  if (error instanceof ValidationError) {
    return createApiResponse(false, null, {
      code: ErrorCode.VALIDATION_ERROR,
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof ApiError) {
    return createApiResponse(false, null, {
      code: ErrorCode.API_ERROR,
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof NetworkError) {
    return createApiResponse(false, null, {
      code: ErrorCode.NETWORK_ERROR,
      message: ErrorMessages[ErrorCode.NETWORK_ERROR],
    });
  }

  if (error instanceof AppError) {
    return createApiResponse(false, null, {
      code: (error.code as ErrorCode) || ErrorCode.UNKNOWN_ERROR,
      message: error.message,
    });
  }

  return createApiResponse(false, null, {
    code: ErrorCode.UNKNOWN_ERROR,
    message: ErrorMessages[ErrorCode.UNKNOWN_ERROR],
  });
};

// Next.js API 라우트용 에러 처리
export const handleApiError = (error: unknown) => {
  const response = handleError(error);
  return NextResponse.json(response, {
    status: error instanceof AppError ? error.statusCode : 500,
  });
};

// 커스텀 에러 클래스들
export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor() {
    super(ErrorMessages[ErrorCode.NETWORK_ERROR]);
    this.name = 'NetworkError';
  }
}

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorMessages = {
  NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.',
  INVALID_INPUT: '잘못된 입력값입니다.',
  UNAUTHORIZED: '인증이 필요합니다.',
  FORBIDDEN: '접근 권한이 없습니다.',
  INTERNAL_ERROR: '서버 오류가 발생했습니다.',
} as const;
