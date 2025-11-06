/**
 * 구조화된 로깅 시스템
 *
 * 초보자를 위한 설명:
 * console.log 대신 이 로거를 사용하면:
 * 1. 로그 레벨 구분 (debug, info, warn, error)
 * 2. 시간 자동 기록
 * 3. 컨텍스트 정보 포함
 * 4. 프로덕션에서 불필요한 로그 자동 제거
 */

/**
 * 로그 레벨 정의
 *
 * DEBUG: 개발 중 디버깅용 상세 정보
 * INFO: 일반 정보성 메시지
 * WARN: 경고 (에러는 아니지만 주의 필요)
 * ERROR: 에러 발생
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 로그 레벨 문자열 매핑
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/**
 * 로그 레벨 이모지 (가독성 향상)
 */
const LOG_LEVEL_EMOJI: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '🔍',
  [LogLevel.INFO]: '💡',
  [LogLevel.WARN]: '⚠️',
  [LogLevel.ERROR]: '❌',
};

/**
 * 로그 레벨 색상 (터미널 출력용)
 */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.INFO]: '\x1b[32m',  // Green
  [LogLevel.WARN]: '\x1b[33m',  // Yellow
  [LogLevel.ERROR]: '\x1b[31m', // Red
};

const RESET_COLOR = '\x1b[0m';

/**
 * 로그 메타데이터 인터페이스
 */
interface LogMetadata {
  [key: string]: any;
}

/**
 * 로거 설정
 */
interface LoggerConfig {
  minLevel: LogLevel;        // 최소 로그 레벨
  enableColors: boolean;     // 색상 출력 활성화
  enableEmoji: boolean;      // 이모지 출력 활성화
  enableTimestamp: boolean;  // 타임스탬프 출력 활성화
  prettyPrint: boolean;      // JSON 예쁘게 출력
}

/**
 * 기본 로거 설정
 */
const DEFAULT_CONFIG: LoggerConfig = {
  // 개발 모드에서는 DEBUG, 프로덕션에서는 INFO
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableColors: process.env.NODE_ENV !== 'production',
  enableEmoji: true,
  enableTimestamp: true,
  prettyPrint: process.env.NODE_ENV !== 'production',
};

/**
 * 구조화된 로거 클래스
 */
class Logger {
  private config: LoggerConfig;
  private context: string;

  constructor(context: string = 'App', config: Partial<LoggerConfig> = {}) {
    this.context = context;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 로그 출력 (내부 메서드)
   */
  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    // 설정된 최소 레벨보다 낮으면 출력하지 않음
    if (level < this.config.minLevel) {
      return;
    }

    // 로그 객체 구성
    const logObject = {
      timestamp: this.config.enableTimestamp ? new Date().toISOString() : undefined,
      level: LOG_LEVEL_NAMES[level],
      context: this.context,
      message,
      ...metadata,
    };

    // 포맷팅
    const formattedLog = this.formatLog(level, logObject);

    // 출력
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
    }
  }

  /**
   * 로그 포맷팅
   */
  private formatLog(level: LogLevel, logObject: any): string {
    const emoji = this.config.enableEmoji ? LOG_LEVEL_EMOJI[level] : '';
    const color = this.config.enableColors ? LOG_LEVEL_COLORS[level] : '';
    const reset = this.config.enableColors ? RESET_COLOR : '';

    if (this.config.prettyPrint) {
      // 개발 모드: 읽기 쉽게
      const timestamp = logObject.timestamp ? `[${logObject.timestamp}]` : '';
      const context = `[${logObject.context}]`;
      const levelStr = `[${logObject.level}]`;

      let result = `${color}${emoji} ${timestamp} ${context} ${levelStr} ${logObject.message}${reset}`;

      // 메타데이터가 있으면 추가
      if (Object.keys(logObject).length > 4) {
        const metadata = { ...logObject };
        delete metadata.timestamp;
        delete metadata.level;
        delete metadata.context;
        delete metadata.message;

        result += `\n${JSON.stringify(metadata, null, 2)}`;
      }

      return result;
    } else {
      // 프로덕션: JSON 형태로 (로그 수집 도구 호환)
      return JSON.stringify(logObject);
    }
  }

  /**
   * 디버그 로그
   * 개발 중에만 보이는 상세 정보
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * 정보 로그
   * 일반적인 정보성 메시지
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * 경고 로그
   * 문제는 아니지만 주의가 필요한 상황
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * 에러 로그
   * 에러 발생 시 사용
   */
  error(message: string, error?: Error | any, metadata?: LogMetadata): void {
    const errorMetadata = error instanceof Error
      ? {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          ...metadata,
        }
      : {
          error,
          ...metadata,
        };

    this.log(LogLevel.ERROR, message, errorMetadata);
  }

  /**
   * 새로운 컨텍스트로 로거 생성
   * 예: logger.child('API') → [API] 태그 붙음
   */
  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`, this.config);
  }
}

/**
 * 기본 로거 인스턴스
 */
export const logger = new Logger('App');

/**
 * 특정 컨텍스트용 로거 생성 함수
 *
 * 사용 예:
 * const apiLogger = createLogger('API');
 * apiLogger.info('요청 처리 시작');
 */
export function createLogger(context: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(context, config);
}

/**
 * API 전용 로거 (미리 만들어둠)
 */
export const apiLogger = createLogger('API');

/**
 * 데이터베이스 전용 로거
 */
export const dbLogger = createLogger('DB');

/**
 * AI 에이전트 전용 로거
 */
export const agentLogger = createLogger('Agent');

/**
 * RAG 시스템 전용 로거
 */
export const ragLogger = createLogger('RAG');

/**
 * 메트릭 수집 전용 로거
 */
export const metricsLogger = createLogger('Metrics');

/**
 * 성능 측정 유틸리티
 *
 * 사용 예:
 * const timer = createTimer('API 호출');
 * // ... 작업 수행 ...
 * timer.end(); // "API 호출 완료: 123ms" 출력
 */
export function createTimer(label: string, context: string = 'Performance') {
  const timerLogger = createLogger(context);
  const startTime = Date.now();

  return {
    end: () => {
      const duration = Date.now() - startTime;
      timerLogger.info(`${label} 완료`, { durationMs: duration });
      return duration;
    },
    log: (message: string) => {
      const duration = Date.now() - startTime;
      timerLogger.debug(message, { durationMs: duration });
    },
  };
}

/**
 * 비동기 함수 실행 시간 측정
 *
 * 사용 예:
 * const result = await measureAsync('데이터 조회', async () => {
 *   return await fetchData();
 * });
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>,
  context: string = 'Performance'
): Promise<T> {
  const timer = createTimer(label, context);
  try {
    const result = await fn();
    timer.end();
    return result;
  } catch (error) {
    const duration = timer.end();
    const errorLogger = createLogger(context);
    errorLogger.error(`${label} 실패 (${duration}ms)`, error as Error);
    throw error;
  }
}

/**
 * 개발 모드에서만 실행
 *
 * 사용 예:
 * devOnly(() => {
 *   console.log('디버그 정보:', data);
 * });
 */
export function devOnly(fn: () => void): void {
  if (process.env.NODE_ENV === 'development') {
    fn();
  }
}

/**
 * 프로덕션 모드에서만 실행
 */
export function prodOnly(fn: () => void): void {
  if (process.env.NODE_ENV === 'production') {
    fn();
  }
}

export default logger;
