/**
 * 🔍 주간 실패 패턴 검토 도구
 * - Supabase에서 데이터 추출
 * - Claude와 함께 패턴 분석
 * - 사람이 최종 검토 후 파일 업데이트
 */

// 환경변수 로드 (Next.js 외부에서 실행시)
require('dotenv').config({ path: '.env.local' });

import { supabase, getRecentAutomationRequests } from '../lib/supabase';
import { openai } from '../lib/openai';
import fs from 'fs/promises';
import path from 'path';

interface WeeklyReviewData {
  period: { from: string; to: string };
  totalRequests: number;
  failureRate: number;
  topFailurePatterns: Array<{
    pattern: string;
    count: number;
    examples: string[];
    userInputs: string[];
  }>;
  suggestedPatterns: Array<{
    id: string;
    pattern: {
      contexts: string[];
      actions: string[];
      tools: string[];
      intent: string;
    };
    reason: string;
    alternatives: string[];
    severity: 'critical' | 'warning' | 'info';
    examples: string[];
    confidence: number;
  }>;
  reviewNotes: string[];
}

/**
 * 🔍 주간 데이터 추출 및 분석
 */
export async function runWeeklyReview(): Promise<WeeklyReviewData> {
  console.log('📊 [주간 리뷰] 시작...');
  
  // 1. 지난 주 데이터 추출
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const { data: weeklyData, error } = await supabase
    .from('automation_requests')
    .select('*')
    .gte('created_at', weekAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Supabase 데이터 추출 실패: ${error.message}`);
  }

  console.log(`📥 [주간 리뷰] ${weeklyData.length}건 데이터 추출 완료`);

  // 2. 실패 케이스 분석
  const failedRequests = weeklyData.filter(req => !req.success || req.error_message);
  const failureRate = weeklyData.length > 0 ? (failedRequests.length / weeklyData.length) * 100 : 0;

  console.log(`❌ [주간 리뷰] 실패율: ${failureRate.toFixed(1)}% (${failedRequests.length}/${weeklyData.length})`);

  // 3. 패턴 분석을 위한 Claude 호출
  const patternAnalysis = await analyzeFailurePatternsWithClaude(failedRequests, weeklyData);

  const reviewData: WeeklyReviewData = {
    period: {
      from: weekAgo.toISOString(),
      to: new Date().toISOString()
    },
    totalRequests: weeklyData.length,
    failureRate,
    topFailurePatterns: await extractTopFailurePatterns(failedRequests),
    suggestedPatterns: patternAnalysis.suggestedPatterns,
    reviewNotes: patternAnalysis.reviewNotes
  };

  // 4. 리뷰 파일 생성
  await saveReviewFile(reviewData);
  
  console.log('✅ [주간 리뷰] 완료 - review-YYYY-MM-DD.json 파일 확인하세요');
  return reviewData;
}

/**
 * 🧠 Claude를 활용한 패턴 분석
 */
async function analyzeFailurePatternsWithClaude(
  failedRequests: any[],
  allRequests: any[]
): Promise<{
  suggestedPatterns: any[];
  reviewNotes: string[];
}> {
  if (failedRequests.length === 0) {
    return { suggestedPatterns: [], reviewNotes: ['이번 주는 실패 케이스가 없습니다.'] };
  }

  // 실패 케이스들을 요약해서 Claude에게 전달
  const failureSummary = failedRequests.slice(0, 10).map(req => ({
    userInput: req.user_input,
    errorMessage: req.error_message,
    generatedCards: req.generated_cards ? '생성됨' : '생성 실패'
  }));

  const analysisPrompt = `
당신은 자동화 시스템의 실패 패턴을 분석하는 전문가입니다.

**이번 주 데이터**:
- 총 요청: ${allRequests.length}건
- 실패: ${failedRequests.length}건 (${((failedRequests.length / allRequests.length) * 100).toFixed(1)}%)

**주요 실패 케이스들**:
${failureSummary.map((f, i) => `${i+1}. 요청: "${f.userInput.substring(0, 100)}..."
   에러: ${f.errorMessage || '결과 생성 실패'}`).join('\n')}

**분석 요청**:
1. 반복되는 실패 패턴이 있나요?
2. 새로운 문제 유형이 등장했나요?
3. 기존 패턴 데이터베이스에 추가할 만한 패턴이 있나요?

**응답 형식**:
{
  "suggestedPatterns": [
    {
      "id": "새로운패턴ID",
      "pattern": {
        "contexts": ["컨텍스트1", "컨텍스트2"],
        "actions": ["행동1", "행동2"],
        "tools": ["도구1", "도구2"],
        "intent": "사용자 의도"
      },
      "reason": "왜 실패하는지 설명",
      "alternatives": ["대안1", "대안2"],
      "severity": "critical|warning|info",
      "examples": ["실제 사용자 입력 예시"],
      "confidence": 0.8
    }
  ],
  "reviewNotes": [
    "이번 주 주요 발견사항",
    "권장사항",
    "개선 방향"
  ]
}

**중요**: 진짜 패턴만 제안하세요. 단발성 에러는 제외하고, 3회 이상 반복되거나 앞으로도 발생할 가능성이 높은 패턴만 포함하세요.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // 정교한 분석을 위해 강력한 모델 사용
      messages: [
        {
          role: 'system',
          content: '당신은 신중하고 정확한 패턴 분석 전문가입니다. 노이즈를 제거하고 진짜 패턴만 식별합니다.'
        },
        { role: 'user', content: analysisPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.1, // 일관된 분석을 위해 낮은 temperature
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log(`🧠 [Claude 분석] ${analysis.suggestedPatterns?.length || 0}개 패턴 제안, ${analysis.reviewNotes?.length || 0}개 노트`);
    
    return {
      suggestedPatterns: analysis.suggestedPatterns || [],
      reviewNotes: analysis.reviewNotes || []
    };
  } catch (error) {
    console.error('❌ [Claude 분석] 실패:', error);
    return {
      suggestedPatterns: [],
      reviewNotes: ['Claude 분석 실패 - 수동 검토 필요']
    };
  }
}

/**
 * 📊 상위 실패 패턴 추출
 */
async function extractTopFailurePatterns(failedRequests: any[]): Promise<Array<{
  pattern: string;
  count: number;
  examples: string[];
  userInputs: string[];
}>> {
  const patternMap = new Map<string, { count: number; examples: string[]; userInputs: string[] }>();

  failedRequests.forEach(req => {
    const input = req.user_input.toLowerCase();
    let patternKey = 'unknown';

    // 간단한 패턴 분류
    if (input.includes('카카오톡') || input.includes('카톡')) {
      patternKey = 'kakao_messaging';
    } else if (input.includes('크롤링') || input.includes('스크래핑')) {
      patternKey = 'web_scraping';
    } else if (input.includes('부동산') || input.includes('매물')) {
      patternKey = 'real_estate';
    } else if (input.includes('인스타') || input.includes('페이스북')) {
      patternKey = 'social_media';
    } else if (req.error_message?.includes('API')) {
      patternKey = 'api_error';
    } else if (req.error_message?.includes('timeout')) {
      patternKey = 'timeout_error';
    }

    if (!patternMap.has(patternKey)) {
      patternMap.set(patternKey, { count: 0, examples: [], userInputs: [] });
    }

    const pattern = patternMap.get(patternKey)!;
    pattern.count++;
    if (pattern.examples.length < 3) {
      pattern.examples.push(req.error_message || '에러 메시지 없음');
      pattern.userInputs.push(req.user_input);
    }
  });

  return Array.from(patternMap.entries())
    .map(([pattern, data]) => ({ pattern, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/**
 * 💾 리뷰 파일 저장
 */
async function saveReviewFile(reviewData: WeeklyReviewData): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const fileName = `review-${today}.json`;
  const filePath = path.join(process.cwd(), 'data', 'weekly-reviews', fileName);

  // 디렉토리 확인/생성
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  // JSON 파일 저장
  await fs.writeFile(filePath, JSON.stringify(reviewData, null, 2));

  // 사람이 읽기 쉬운 마크다운 요약도 생성
  const markdownSummary = generateMarkdownSummary(reviewData);
  const mdFilePath = filePath.replace('.json', '.md');
  await fs.writeFile(mdFilePath, markdownSummary);

  console.log(`📁 [리뷰 파일] 저장 완료: ${fileName}`);
}

/**
 * 📝 마크다운 요약 생성
 */
function generateMarkdownSummary(reviewData: WeeklyReviewData): string {
  const fromDate = new Date(reviewData.period.from).toLocaleDateString('ko-KR');
  const toDate = new Date(reviewData.period.to).toLocaleDateString('ko-KR');

  return `# 주간 실패 패턴 리뷰

**기간**: ${fromDate} ~ ${toDate}

## 📊 요약 통계
- **총 요청**: ${reviewData.totalRequests}건
- **실패율**: ${reviewData.failureRate.toFixed(1)}%

## 🚨 주요 실패 패턴

${reviewData.topFailurePatterns.map(pattern => `
### ${pattern.pattern} (${pattern.count}건)
**예시 사용자 입력**:
${pattern.userInputs.slice(0, 2).map(input => `- "${input.substring(0, 100)}..."`).join('\n')}

**에러 메시지**:
${pattern.examples.slice(0, 2).map(error => `- ${error.substring(0, 100)}...`).join('\n')}
`).join('\n')}

## 🧠 Claude 제안 패턴

${reviewData.suggestedPatterns.map((pattern, i) => `
### ${i + 1}. ${pattern.id}
- **심각도**: ${pattern.severity}
- **신뢰도**: ${Math.round(pattern.confidence * 100)}%
- **이유**: ${pattern.reason}
- **대안**: ${pattern.alternatives.join(', ')}
- **예시**: ${pattern.examples.join(', ')}
`).join('\n')}

## 📝 검토 노트

${reviewData.reviewNotes.map(note => `- ${note}`).join('\n')}

---

## ✅ 다음 액션

1. **검토 필요**: 위 제안 패턴들을 검토하세요
2. **승인된 패턴**: \`src/lib/agents/failure-patterns.ts\`에 추가
3. **커밋**: 변경사항을 Git에 커밋
4. **배포**: 업데이트된 패턴이 서비스에 반영

**검토 체크리스트**:
- [ ] 제안된 패턴이 실제로 문제가 되는가?
- [ ] 대안이 현실적이고 실행 가능한가?
- [ ] 기존 패턴과 중복되지 않는가?
- [ ] 심각도가 적절하게 설정되었는가?
`;
}

/**
 * 🎯 메인 실행 함수 (스크립트로 실행 가능)
 */
if (require.main === module) {
  runWeeklyReview()
    .then(() => {
      console.log('🎉 주간 리뷰 완료!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 주간 리뷰 실패:', error);
      process.exit(1);
    });
}