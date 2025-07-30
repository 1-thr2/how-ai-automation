import { getAutomationByShareId } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import WowAutomationResult from '@/app/components/WowAutomationResult';
import { Card } from '@/lib/types/automation';

// 메타데이터 설정 (검색엔진 차단)
export const metadata = {
  title: '공유된 자동화 레시피',
  description: '쉽고 실용적인 자동화 가이드',
  robots: 'noindex, nofollow' // 검색엔진 차단
};

interface SharedPageProps {
  params: {
    id: string;
  };
}

export default async function SharedPage({ params }: SharedPageProps) {
  const { id } = params;
  
  // 공유 링크로 자동화 데이터 조회
  const sharedData = await getAutomationByShareId(id);
  
  if (!sharedData || !sharedData.automation_requests) {
    notFound();
  }

  const automationData = sharedData.automation_requests;
  
  // 카드 데이터 정리
  const cards: Card[] = (automationData.generated_cards || []).map((c: any) => {
    if (!c.type) {
      if (c.title?.includes('플로우')) return { ...c, type: 'flow' };
      if (c.code) return { ...c, type: 'code' };
      if (c.title?.toLowerCase().includes('faq') || c.questions || c.items) return { ...c, type: 'faq' };
      return { ...c, type: 'guide' };
    }
    return c;
  });

  // 결과 데이터 구성
  const result = {
    context: {
      userInput: automationData.user_input,
      followupAnswers: automationData.followup_answers || {}
    },
    cards,
    error: '',
    fallbackExample: '',
    followupQuestions: [],
    raw: undefined
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 공유 페이지 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                공유된 자동화 레시피
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(automationData.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}에 생성됨
              </p>
            </div>
            <div className="text-sm text-gray-400">
              <span className="bg-gray-100 px-2 py-1 rounded">
                🔗 공유 링크
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 자동화 결과 컨텐츠 */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <WowAutomationResult 
          cards={cards} 
          result={result}
          isSharedView={true} // 공유 뷰임을 표시
        />
      </div>

      {/* 푸터 */}
      <div className="bg-gray-50 border-t mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              이런 자동화 레시피를 직접 만들어보고 싶으신가요?
            </p>
            <a 
              href="/"
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
            >
              🚀 나만의 자동화 만들기
            </a>
          </div>
          
          <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
            <p>이 레시피는 AI가 분석하여 생성한 맞춤형 자동화 가이드입니다</p>
          </div>
        </div>
      </div>
    </main>
  );
}