/**
 * 🗄️ 실패 패턴 저장소 - 파일 기반 학습 시스템
 */

import fs from 'fs/promises';
import path from 'path';
import { FailurePattern, ContextualMatch } from './failure-patterns';

const PATTERNS_FILE = path.join(process.cwd(), 'data', 'learned-patterns.json');
const LOGS_FILE = path.join(process.cwd(), 'data', 'failure-logs.json');

/**
 * 학습된 실패 케이스 인터페이스
 */
export interface LearnedFailureCase {
  id: string;
  timestamp: string;
  userInput: string;
  proposedSolution: string;
  detectedPatterns: string[]; // pattern IDs
  userFeedback?: 'helpful' | 'not_helpful' | 'wrong';
  validationScore: number; // AI 검증 점수
  matchConfidence: number; // 패턴 매칭 신뢰도
  alternatives: string[];
  domain: string;
  frequency: number; // 얼마나 자주 발생하는 패턴인지
}

/**
 * 동적 학습 통계
 */
export interface LearningStats {
  totalCases: number;
  patternsLearned: number;
  averageConfidence: number;
  topFailureTypes: Array<{ type: string; count: number }>;
  learningTrend: Array<{ date: string; casesLearned: number }>;
  lastUpdated: string;
}

/**
 * 🔍 실패 케이스 저장 (즉시 학습)
 */
export async function saveFailureCase(
  userInput: string,
  proposedSolution: string,
  detectedMatches: ContextualMatch[],
  validationScore: number,
  alternatives: string[],
  domain: string = 'general'
): Promise<string> {
  try {
    // 데이터 디렉토리 확인/생성
    await ensureDataDirectory();

    const caseId = `failure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const failureCase: LearnedFailureCase = {
      id: caseId,
      timestamp: new Date().toISOString(),
      userInput,
      proposedSolution,
      detectedPatterns: detectedMatches.map(m => m.pattern.id),
      validationScore,
      matchConfidence: detectedMatches.length > 0 ? 
        detectedMatches.reduce((sum, m) => sum + m.matchScore, 0) / detectedMatches.length : 0,
      alternatives,
      domain,
      frequency: 1
    };

    // 기존 로그 읽기
    const existingLogs = await loadFailureLogs();
    
    // 유사한 케이스 확인 (중복 방지)
    const similarCase = existingLogs.find(log => 
      calculateSimilarity(log.userInput, userInput) > 0.8
    );

    if (similarCase) {
      // 기존 케이스 빈도 증가
      similarCase.frequency += 1;
      similarCase.timestamp = new Date().toISOString(); // 최근 발생 시점 업데이트
      console.log(`📈 [패턴 학습] 기존 케이스 빈도 증가: ${similarCase.id} (${similarCase.frequency}회)`);
    } else {
      // 새로운 케이스 추가
      existingLogs.push(failureCase);
      console.log(`📚 [패턴 학습] 새로운 실패 케이스 저장: ${caseId}`);
    }

    // 파일 저장
    await fs.writeFile(LOGS_FILE, JSON.stringify(existingLogs, null, 2));

    // 패턴 동적 업데이트 (빈도가 높은 케이스는 패턴으로 승격)
    await updateDynamicPatterns(existingLogs);

    return caseId;
  } catch (error) {
    console.error('❌ [패턴 학습] 실패 케이스 저장 실패:', error);
    return '';
  }
}

/**
 * 🧠 동적 패턴 업데이트 (빈도 기반)
 */
async function updateDynamicPatterns(failureLogs: LearnedFailureCase[]): Promise<void> {
  try {
    // 빈도가 3회 이상인 케이스들을 새로운 패턴으로 승격
    const frequentCases = failureLogs.filter(log => log.frequency >= 3);
    
    if (frequentCases.length === 0) return;

    const existingPatterns = await loadDynamicPatterns();
    let newPatternsCount = 0;

    for (const frequentCase of frequentCases) {
      // 이미 패턴으로 등록된 케이스인지 확인
      const existingPattern = existingPatterns.find(p => 
        p.examples.some(example => calculateSimilarity(example, frequentCase.userInput) > 0.8)
      );

      if (!existingPattern) {
        // 새로운 동적 패턴 생성
        const newPattern: FailurePattern = {
          id: `learned_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          pattern: {
            contexts: extractContexts(frequentCase.userInput),
            actions: extractActions(frequentCase.proposedSolution),
            tools: extractTools(frequentCase.proposedSolution),
            intent: inferIntent(frequentCase.userInput)
          },
          reason: `실제 사용자 요청에서 ${frequentCase.frequency}회 발생한 실패 패턴`,
          alternatives: frequentCase.alternatives,
          severity: frequentCase.validationScore < 30 ? 'critical' : 
                   frequentCase.validationScore < 60 ? 'warning' : 'info',
          lastUpdated: new Date().toISOString(),
          examples: [frequentCase.userInput],
          confidence: Math.min(0.9, 0.5 + (frequentCase.frequency * 0.1)) // 빈도 기반 신뢰도
        };

        existingPatterns.push(newPattern);
        newPatternsCount++;
        
        console.log(`🎯 [동적 패턴] 새 패턴 생성: ${newPattern.id} (빈도: ${frequentCase.frequency}회)`);
      }
    }

    if (newPatternsCount > 0) {
      await saveDynamicPatterns(existingPatterns);
      console.log(`✅ [동적 패턴] ${newPatternsCount}개 새 패턴 저장 완료`);
    }
  } catch (error) {
    console.error('❌ [동적 패턴] 패턴 업데이트 실패:', error);
  }
}

/**
 * 📊 학습 통계 생성
 */
export async function getLearningStats(): Promise<LearningStats> {
  try {
    const logs = await loadFailureLogs();
    const patterns = await loadDynamicPatterns();

    // 실패 유형별 통계
    const failureTypes = logs.reduce((acc, log) => {
      const primaryPattern = log.detectedPatterns[0] || 'unknown';
      acc[primaryPattern] = (acc[primaryPattern] || 0) + log.frequency;
      return acc;
    }, {} as Record<string, number>);

    const topFailureTypes = Object.entries(failureTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 날짜별 학습 트렌드 (최근 7일)
    const recentLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return logDate >= weekAgo;
    });

    const learningTrend = recentLogs.reduce((acc, log) => {
      const date = log.timestamp.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCases: logs.length,
      patternsLearned: patterns.length,
      averageConfidence: logs.length > 0 ? 
        logs.reduce((sum, log) => sum + log.matchConfidence, 0) / logs.length : 0,
      topFailureTypes,
      learningTrend: Object.entries(learningTrend).map(([date, casesLearned]) => ({ date, casesLearned })),
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ [학습 통계] 통계 생성 실패:', error);
    return {
      totalCases: 0,
      patternsLearned: 0,
      averageConfidence: 0,
      topFailureTypes: [],
      learningTrend: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * 🔄 동적 패턴 로드 (정적 + 학습된 패턴 합침)
 */
export async function loadAllPatterns(): Promise<FailurePattern[]> {
  try {
    // 정적 패턴 import
    const { SMART_FAILURE_PATTERNS } = await import('./failure-patterns');
    
    // 동적 패턴 로드
    const dynamicPatterns = await loadDynamicPatterns();
    
    console.log(`🔄 [패턴 로드] 정적: ${SMART_FAILURE_PATTERNS.length}개, 동적: ${dynamicPatterns.length}개`);
    
    return [...SMART_FAILURE_PATTERNS, ...dynamicPatterns];
  } catch (error) {
    console.error('❌ [패턴 로드] 패턴 로드 실패:', error);
    const { SMART_FAILURE_PATTERNS } = await import('./failure-patterns');
    return SMART_FAILURE_PATTERNS;
  }
}

// ===== 헬퍼 함수들 =====

async function ensureDataDirectory(): Promise<void> {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function loadFailureLogs(): Promise<LearnedFailureCase[]> {
  try {
    const data = await fs.readFile(LOGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function loadDynamicPatterns(): Promise<FailurePattern[]> {
  try {
    const data = await fs.readFile(PATTERNS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveDynamicPatterns(patterns: FailurePattern[]): Promise<void> {
  await fs.writeFile(PATTERNS_FILE, JSON.stringify(patterns, null, 2));
}

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  
  return intersection.length / union.length;
}

// 기존 failure-patterns.ts에서 가져온 헬퍼 함수들
function extractContexts(input: string): string[] {
  const contexts: string[] = [];
  if (input.includes('개인') || input.includes('나는')) contexts.push('개인 사용자');
  if (input.includes('자동') || input.includes('automation')) contexts.push('자동화');
  if (input.includes('데이터') || input.includes('정보')) contexts.push('데이터 처리');
  return contexts.length > 0 ? contexts : ['일반'];
}

function extractActions(solution: string): string[] {
  const actions: string[] = [];
  if (solution.includes('수집') || solution.includes('가져오기')) actions.push('데이터 수집');
  if (solution.includes('전송') || solution.includes('보내기')) actions.push('메시지 전송');
  if (solution.includes('분석') || solution.includes('처리')) actions.push('데이터 처리');
  return actions.length > 0 ? actions : ['일반 작업'];
}

function extractTools(solution: string): string[] {
  const tools: string[] = [];
  const toolPatterns = ['google', 'excel', 'api', '카카오', 'slack', 'webhook'];
  toolPatterns.forEach(tool => {
    if (solution.toLowerCase().includes(tool)) tools.push(tool);
  });
  return tools.length > 0 ? tools : ['기타'];
}

function inferIntent(input: string): string {
  if (input.includes('알림') || input.includes('통지')) return '알림 자동화';
  if (input.includes('분석') || input.includes('리포트')) return '데이터 분석';
  if (input.includes('수집') || input.includes('모니터링')) return '정보 수집';
  return '일반 자동화';
}