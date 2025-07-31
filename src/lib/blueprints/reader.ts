import fs from 'fs';
import path from 'path';

/**
 * Blueprint 파일을 읽어오는 유틸리티
 */
export class BlueprintReader {
  private static cache: Map<string, string> = new Map();
  
  /**
   * Blueprint 파일 읽기 (캐싱 포함)
   */
  static async read(blueprintPath: string): Promise<string> {
    if (this.cache.has(blueprintPath)) {
      return this.cache.get(blueprintPath)!;
    }
    
    try {
      // 🔍 Vercel 환경 디버깅
      const cwd = process.cwd();
      const fullPath = path.join(cwd, 'src', 'lib', 'blueprints', blueprintPath);
      
      console.log(`🔍 [Blueprint Debug] CWD: ${cwd}`);
      console.log(`🔍 [Blueprint Debug] Full Path: ${fullPath}`);
      console.log(`🔍 [Blueprint Debug] Exists: ${fs.existsSync(fullPath)}`);
      
      // 대안 경로들도 시도
      const alternatives = [
        path.join(cwd, 'src', 'lib', 'blueprints', blueprintPath),
        path.join(__dirname, '..', 'blueprints', blueprintPath),
        path.join(__dirname, '../../../src/lib/blueprints', blueprintPath),
        path.join(cwd, 'blueprints', blueprintPath)
      ];
      
      for (const altPath of alternatives) {
        console.log(`🔍 [Blueprint Debug] Trying: ${altPath} - Exists: ${fs.existsSync(altPath)}`);
        if (fs.existsSync(altPath)) {
          console.log(`✅ [Blueprint Debug] Found at: ${altPath}`);
          const content = fs.readFileSync(altPath, 'utf-8');
          this.cache.set(blueprintPath, content);
          return content;
        }
      }
      
      throw new Error(`모든 경로에서 파일을 찾을 수 없음: ${blueprintPath}`);
    } catch (error) {
      console.error(`❌ Blueprint 읽기 실패: ${blueprintPath}`, error);
      throw new Error(`Blueprint 파일을 찾을 수 없습니다: ${blueprintPath}`);
    }
  }
  
  /**
   * 후속질문 관련 블루프린트들 가져오기
   */
  static async getFollowupBlueprints() {
    const [base, draft, refine] = await Promise.all([
      this.read('followup/followup_base.md'),
      this.read('followup/followup_draft.md'),
      this.read('followup/followup_refine.md')
    ]);
    
    return { base, draft, refine };
  }
  
  /**
   * 캐시 초기화 (개발/테스트용)
   */
  static clearCache() {
    this.cache.clear();
  }
}

/**
 * 토큰 수 추정 (간단한 구현)
 */
export function estimateTokens(text: string): number {
  // 대략적인 토큰 수 계산 (1 토큰 ≈ 4글자)
  return Math.ceil(text.length / 4);
}

/**
 * 토큰 기반 모델 선택
 */
export function selectModel(estimatedTokens: number) {
  const config = {
    // gpt-4o-mini 우선 사용 (비용 효율적)
    defaultModel: 'gpt-4o-mini',
    fallbackModel: 'gpt-4o-2024-11-20',
    
    // 토큰 임계값
    tokenThresholds: {
      mini: 2000,    // 2000토큰 이하는 mini
      upgrade: 3000  // 3000토큰 이상은 4o로 업그레이드
    }
  };
  
  if (estimatedTokens <= config.tokenThresholds.mini) {
    return config.defaultModel;
  } else if (estimatedTokens >= config.tokenThresholds.upgrade) {
    console.log(`🔄 토큰 수 ${estimatedTokens} > ${config.tokenThresholds.upgrade}, ${config.fallbackModel}로 업그레이드`);
    return config.fallbackModel;
  } else {
    return config.defaultModel;
  }
}