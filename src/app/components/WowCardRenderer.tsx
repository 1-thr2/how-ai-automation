import React from 'react';
import { Card } from '@/lib/types/automation';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, Play, Eye, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface WowCardRendererProps {
  card: Card;
}

export default function WowCardRenderer({ card }: WowCardRendererProps) {
  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('클립보드에 복사되었습니다!', {
      duration: 2000,
      position: 'bottom-center',
      style: {
        background: '#10B981',
        color: '#fff',
        fontWeight: '600',
        padding: '12px 20px',
        borderRadius: '8px',
      },
      icon: '✅',
    });
  };

  // 카드 타입별 렌더링
  switch (card.type) {
    // 🎯 맞춤형 툴 추천 카드
    case 'tool_recommendation':
      const toolCard = card as any; // ToolRecommendationCard 타입
      return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white text-xl">
              🏆
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{toolCard.title}</h3>
              <p className="text-gray-600">{toolCard.subtitle}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-lg">{toolCard.selectedTool.name}</h4>
              <div className="flex items-center gap-2">
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">
                  WOW {toolCard.selectedTool.wowScore}/10
                </span>
              </div>
            </div>
            <p className="text-gray-700 mb-3">{toolCard.selectedTool.reasoning}</p>
            <Button onClick={() => handleOpenUrl(toolCard.selectedTool.url)} className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              {toolCard.selectedTool.name} 시작하기
            </Button>
          </div>

          {toolCard.alternatives?.length > 0 && (
            <div className="text-sm">
              <p className="font-medium text-gray-700 mb-2">다른 옵션들:</p>
              {toolCard.alternatives.map((alt: any, index: number) => (
                <div key={index} className="text-gray-600 mb-1">
                  • {alt.name}: {alt.whyNotSelected}
                </div>
              ))}
            </div>
          )}
        </div>
      );

    // 📊 슬라이드 생성 가이드
    case 'slide_guide':
      const slideCard = card as any; // SlideGuideCard 타입
      return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
              📊
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{slideCard.title}</h3>
              <p className="text-gray-600">{slideCard.subtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-600">예상 슬라이드 수</p>
              <p className="text-xl font-bold text-blue-600">{slideCard.slideCount}장</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-600">소요 시간</p>
              <p className="text-xl font-bold text-green-600">{slideCard.estimatedTime}</p>
            </div>
          </div>

          {slideCard.importBlocks?.slide_prompt && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">📝 최적화된 프롬프트</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(slideCard.importBlocks.slide_prompt)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  복사
                </Button>
              </div>
              <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                {slideCard.importBlocks.slide_prompt}
              </pre>
            </div>
          )}

          <div className="space-y-3">
            {slideCard.detailedSteps?.map((step: any, index: number) => (
              <div key={index} className="flex gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {step.number}
                </div>
                <div>
                  <h5 className="font-medium text-gray-900">{step.title}</h5>
                  <p className="text-gray-600 text-sm mt-1">{step.description}</p>
                  {step.expectedScreen && (
                    <p className="text-blue-600 text-sm mt-1">👀 {step.expectedScreen}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    // 🎬 영상 생성 가이드
    case 'video_guide':
      const videoCard = card as any; // VideoGuideCard 타입
      return (
        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white text-xl">
              🎬
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{videoCard.title}</h3>
              <p className="text-gray-600">{videoCard.subtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-600">영상 유형</p>
              <p className="text-lg font-bold text-red-600 capitalize">{videoCard.videoType}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-600">출력 형식</p>
              <p className="text-lg font-bold text-purple-600 uppercase">
                {videoCard.outputFormat}
              </p>
            </div>
          </div>

          {videoCard.importBlocks?.video_prompt && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">🎯 영상 프롬프트</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(videoCard.importBlocks.video_prompt)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  복사
                </Button>
              </div>
              <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                {videoCard.importBlocks.video_prompt}
              </pre>
            </div>
          )}

          <div className="space-y-3">
            {videoCard.detailedSteps?.map((step: any, index: number) => (
              <div key={index} className="flex gap-3">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {step.number}
                </div>
                <div>
                  <h5 className="font-medium text-gray-900">{step.title}</h5>
                  <p className="text-gray-600 text-sm mt-1">{step.description}</p>
                  {step.expectedScreen && (
                    <p className="text-red-600 text-sm mt-1">👀 {step.expectedScreen}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    // 🌐 랜딩페이지 생성 가이드
    case 'landing_guide':
      const landingCard = card as any; // LandingGuideCard 타입
      return (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-xl">
              🌐
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{landingCard.title}</h3>
              <p className="text-gray-600">{landingCard.subtitle}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">페이지 유형</p>
                <p className="font-semibold capitalize">{landingCard.pageType}</p>
              </div>
              <Button
                onClick={() => handleOpenUrl(landingCard.liveUrl || '#')}
                disabled={!landingCard.liveUrl}
              >
                <Eye className="w-4 h-4 mr-2" />
                미리보기
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {landingCard.detailedSteps?.map((step: any, index: number) => (
              <div key={index} className="flex gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {step.number}
                </div>
                <div>
                  <h5 className="font-medium text-gray-900">{step.title}</h5>
                  <p className="text-gray-600 text-sm mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    // 💬 챗봇 생성 가이드
    case 'chatbot_guide':
      const chatbotCard = card as any; // ChatbotGuideCard 타입
      return (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xl">
              💬
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{chatbotCard.title}</h3>
              <p className="text-gray-600">{chatbotCard.subtitle}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">챗봇 유형</p>
                <p className="font-semibold capitalize">{chatbotCard.botType}</p>
              </div>
              <Button
                onClick={() => handleOpenUrl(chatbotCard.liveUrl || '#')}
                disabled={!chatbotCard.liveUrl}
              >
                <Play className="w-4 h-4 mr-2" />
                테스트
              </Button>
            </div>
          </div>

          {chatbotCard.importBlocks?.embed_code && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">🔗 임베드 코드</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(chatbotCard.importBlocks.embed_code)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  복사
                </Button>
              </div>
              <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                {chatbotCard.importBlocks.embed_code}
              </pre>
            </div>
          )}

          <div className="space-y-3">
            {chatbotCard.detailedSteps?.map((step: any, index: number) => (
              <div key={index} className="flex gap-3">
                <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {step.number}
                </div>
                <div>
                  <h5 className="font-medium text-gray-900">{step.title}</h5>
                  <p className="text-gray-600 text-sm mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    // 📊 대시보드 생성 가이드
    case 'dashboard_guide':
      const dashboardCard = card as any; // DashboardGuideCard 타입
      return (
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-xl">
              📊
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{dashboardCard.title}</h3>
              <p className="text-gray-600">{dashboardCard.subtitle}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">데이터 소스</p>
                <p className="font-medium">{dashboardCard.dataSource?.join(', ')}</p>
              </div>
              <Button
                onClick={() => handleOpenUrl(dashboardCard.shareUrl || '#')}
                disabled={!dashboardCard.shareUrl}
              >
                <Eye className="w-4 h-4 mr-2" />
                대시보드 보기
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {dashboardCard.detailedSteps?.map((step: any, index: number) => (
              <div key={index} className="flex gap-3">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {step.number}
                </div>
                <div>
                  <h5 className="font-medium text-gray-900">{step.title}</h5>
                  <p className="text-gray-600 text-sm mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    // 🎨 크리에이티브 생성 가이드
    case 'creative_guide':
      const creativeCard = card as any; // CreativeGuideCard 타입
      return (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-6 border border-pink-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center text-white text-xl">
              🎨
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{creativeCard.title}</h3>
              <p className="text-gray-600">{creativeCard.subtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-600">크리에이티브 유형</p>
              <p className="text-lg font-bold text-pink-600 capitalize">
                {creativeCard.creativeType}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-600">출력 파일 수</p>
              <p className="text-lg font-bold text-purple-600">
                {creativeCard.outputFiles?.length || 1}개
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {creativeCard.detailedSteps?.map((step: any, index: number) => (
              <div key={index} className="flex gap-3">
                <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {step.number}
                </div>
                <div>
                  <h5 className="font-medium text-gray-900">{step.title}</h5>
                  <p className="text-gray-600 text-sm mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    // 🎵 오디오 생성 가이드
    case 'audio_guide':
      const audioCard = card as any; // AudioGuideCard 타입
      return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xl">
              🎵
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{audioCard.title}</h3>
              <p className="text-gray-600">{audioCard.subtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-600">오디오 유형</p>
              <p className="text-lg font-bold text-indigo-600 capitalize">{audioCard.audioType}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-gray-600">출력 형식</p>
              <p className="text-lg font-bold text-purple-600 uppercase">
                {audioCard.outputFormat}
              </p>
            </div>
          </div>

          {audioCard.importBlocks?.script_text && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">📝 스크립트 텍스트</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(audioCard.importBlocks.script_text)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  복사
                </Button>
              </div>
              <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                {audioCard.importBlocks.script_text}
              </pre>
            </div>
          )}

          <div className="space-y-3">
            {audioCard.detailedSteps?.map((step: any, index: number) => (
              <div key={index} className="flex gap-3">
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {step.number}
                </div>
                <div>
                  <h5 className="font-medium text-gray-900">{step.title}</h5>
                  <p className="text-gray-600 text-sm mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    // 🔄 자동화 플로우 (원본 스타일 적용)
    case 'flow':
      const flowCard = card as any;
      return (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
              🔄
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {flowCard.title || '자동화 플로우'}
              </h3>
              <p className="text-gray-600">{flowCard.subtitle || '단계별 자동화 워크플로우'}</p>
            </div>
          </div>

          {flowCard.content && <div className="text-gray-700 mb-4">{flowCard.content}</div>}

          {flowCard.steps && flowCard.steps.length > 0 && (
            <div className="space-y-3 mb-4">
              {flowCard.steps.map((step: any, index: number) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">{step.title || step}</div>
                      {step.description && (
                        <div className="text-sm text-gray-600">{step.description}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {flowCard.flowMap && flowCard.flowMap.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-3 text-gray-800">워크플로우 구성</h4>
              <div className="space-y-2">
                {flowCard.flowMap.map((step: string, index: number) => (
                  <div key={index} className="flex items-center gap-3 bg-white rounded-lg p-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="text-gray-800">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {flowCard.engine && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-800 mb-2">추천 플랫폼</h4>
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {flowCard.engine}
                </span>
              </div>
            </div>
          )}

          {/* 🔧 대안 도구 표시 (연동 불가능한 도구가 있는 경우) */}
          {flowCard.unsupportedTools && flowCard.unsupportedTools.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-yellow-600 text-lg">⚠️</span>
                <div>
                  <h4 className="font-medium text-yellow-800 mb-1">연동 제한사항</h4>
                  <p className="text-sm text-yellow-700 mb-2">
                    다음 도구들은 직접 연동이 제한됩니다: {flowCard.unsupportedTools.join(', ')}
                  </p>
                </div>
              </div>

              {flowCard.alternativeTools && flowCard.alternativeTools.length > 0 && (
                <div>
                  <h5 className="font-medium text-yellow-800 mb-2">💡 권장 대안 (💰 무료 우선)</h5>
                  <div className="space-y-2">
                    {flowCard.alternativeTools.map((alt: any, index: number) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{alt.name}</div>
                            <div className="text-sm text-gray-600">{alt.purpose}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {/* 💰 가격 정보 표시 */}
                              {alt.pricing && (
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    alt.pricing.includes('무료') ||
                                    alt.pricing.toLowerCase().includes('free')
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-orange-100 text-orange-800'
                                  }`}
                                >
                                  {alt.pricing.includes('무료') ||
                                  alt.pricing.toLowerCase().includes('free')
                                    ? '🆓 '
                                    : '💰 '}
                                  {alt.pricing}
                                </span>
                              )}
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  alt.difficulty === 'easy'
                                    ? 'bg-green-100 text-green-800'
                                    : alt.difficulty === 'medium'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {alt.difficulty === 'easy'
                                  ? '쉬움'
                                  : alt.difficulty === 'medium'
                                    ? '보통'
                                    : '어려움'}
                              </span>
                            </div>
                          </div>
                          {alt.url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenUrl(alt.url)}
                              className="ml-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {flowCard.integrationWarning && (
                <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
                  <p className="text-sm text-yellow-800">{flowCard.integrationWarning}</p>
                </div>
              )}
            </div>
          )}

          {flowCard.description && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">{flowCard.description}</p>
            </div>
          )}
        </div>
      );

    // 🔮 WOW 결과 미리보기
    case 'wow_preview':
      const previewCard = card as any; // WowPreviewCard 타입
      return (
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center text-white text-xl">
              🔮
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{previewCard.title}</h3>
              <p className="text-gray-600">{previewCard.subtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-red-600 mb-2">Before</h4>
              <p className="text-sm text-gray-600">{previewCard.beforeAfter?.before}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-green-600 mb-2">After</h4>
              <p className="text-sm text-gray-600">{previewCard.beforeAfter?.after}</p>
            </div>
          </div>

          {previewCard.mockups && previewCard.mockups.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-3">미리보기</h4>
              <div className="grid grid-cols-1 gap-3">
                {previewCard.mockups.map((mockup: any, index: number) => (
                  <div key={index} className="bg-white rounded-lg p-3 border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{mockup.description}</span>
                      <Button size="sm" variant="outline" onClick={() => handleOpenUrl(mockup.url)}>
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>⏰ 가치 실현 시간:</strong> {previewCard.timeToValue}
            </p>
          </div>
        </div>
      );

    // 🎯 니즈 분석 카드 (기존 flow 스타일 적용)
    case 'needs_analysis':
      const needsCard = card as any;
      return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
              🎯
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{needsCard.title}</h3>
              <p className="text-gray-600">{needsCard.subtitle}</p>
            </div>
          </div>

          {needsCard.content && <div className="text-gray-700 mb-4">{needsCard.content}</div>}

          {needsCard.surfaceRequest && needsCard.realNeed && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-red-600 mb-2">표면적 요청</h4>
                <p className="text-sm text-gray-600">{needsCard.surfaceRequest}</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-blue-600 mb-2">진짜 니즈</h4>
                <p className="text-sm text-blue-700 font-medium">{needsCard.realNeed}</p>
              </div>
            </div>
          )}
        </div>
      );

    // 🚀 확장 아이디어 카드 (원본 스타일 적용)
    case 'expansion':
      const expansionCard = card as any;
      return (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-xl">
              🚀
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {expansionCard.title || '확장 아이디어'}
              </h3>
              <p className="text-gray-600">{expansionCard.subtitle || '추가 발전 방향'}</p>
            </div>
          </div>

          {expansionCard.content && (
            <div className="text-gray-700 mb-4">{expansionCard.content}</div>
          )}

          {expansionCard.ideas && Array.isArray(expansionCard.ideas) && (
            <div className="space-y-3">
              {expansionCard.ideas.map((idea: any, index: number) => {
                // 방어 코드: idea가 유효한지 확인
                if (!idea) {
                  return null;
                }

                // idea가 문자열인지 객체인지 확인
                const ideaTitle =
                  typeof idea === 'string'
                    ? idea
                    : idea.title || idea.idea || `아이디어 ${index + 1}`;
                const ideaDescription = typeof idea === 'object' ? idea.description : null;

                return (
                  <div
                    key={`idea-${index}`}
                    className="bg-white rounded-lg p-4 border border-green-100"
                  >
                    <div className="font-semibold text-gray-900 mb-2">{ideaTitle}</div>
                    {ideaDescription && (
                      <div className="text-sm text-gray-600">{ideaDescription}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );

    // 📋 Guide 카드 (상세 가이드)
    case 'guide':
      const guideCard = card as any;
      return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
              📋
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{guideCard.title || '가이드'}</h3>
              <p className="text-gray-600">{guideCard.subtitle || '상세 안내'}</p>
            </div>
          </div>

          {guideCard.basicConcept && (
            <div className="bg-white rounded-lg p-4 mb-4 border border-blue-100">
              <h4 className="font-semibold text-gray-900 mb-2">💡 핵심 개념</h4>
              <p className="text-gray-700">{guideCard.basicConcept}</p>
            </div>
          )}

          {/* 💡 실용적 분류 접근 (메시지 분류 관련 가이드인 경우) */}
          {guideCard.title &&
            (guideCard.title.includes('분류') ||
              guideCard.title.includes('메시지') ||
              guideCard.title.includes('고객')) && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 mb-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600 text-lg">💡</span>
                  <h4 className="font-semibold text-blue-900">간단하고 효과적인 분류</h4>
                </div>
                <p className="text-sm text-blue-700 mb-2">
                  키워드 기반 자동 분류로도 충분히 효과적인 결과를 얻을 수 있습니다.
                </p>
                <div className="bg-white rounded p-3 border border-blue-200">
                  <div className="text-xs text-blue-600 font-medium mb-1">분류 예시:</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">"로그인", "오류":</span>
                      <span className="text-blue-600 font-medium">→ 기술지원 채널</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">"결제", "환불":</span>
                      <span className="text-green-600 font-medium">→ 고객지원 채널</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">기타 문의:</span>
                      <span className="text-gray-600 font-medium">→ 일반 문의 채널</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {guideCard.detailedSteps && Array.isArray(guideCard.detailedSteps) && (
            <div className="space-y-4 mb-4">
              <h4 className="font-semibold text-gray-900">📝 상세 단계</h4>
              {guideCard.detailedSteps.map((step: any, index: number) => {
                // 방어 코드: step이 객체인지 확인
                if (!step || typeof step !== 'object') {
                  return null;
                }

                return (
                  <div
                    key={`step-${index}`}
                    className="bg-white rounded-lg p-4 border border-blue-100"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                        {step.number || index + 1}
                      </span>
                      <h5 className="font-semibold text-gray-900">
                        {step.title || `단계 ${index + 1}`}
                      </h5>
                    </div>
                    <div className="text-sm text-gray-700 mb-3 whitespace-pre-line">
                      {step.description || '설명이 없습니다.'}
                    </div>
                    {step.expectedScreen && (
                      <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                        <span className="text-green-700 text-xs font-medium">🖥️ 예상 화면: </span>
                        <span className="text-green-600 text-xs">{step.expectedScreen}</span>
                      </div>
                    )}
                    {step.checkpoint && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <span className="text-blue-700 text-xs font-medium">✅ 성공 확인: </span>
                        <span className="text-blue-600 text-xs">{step.checkpoint}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 💻 수정 필요한 변수들 (Toss-style UX) */}
          {guideCard.userEditables && guideCard.userEditables.length > 0 && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-600 text-xl">💻</span>
                <h4 className="font-semibold text-blue-900">
                  코드에서 수정해야 할 부분 (꼭 확인하세요!)
                </h4>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                아래 변수들을 여러분의 상황에 맞게 수정하세요. 복사-붙여넣기 후 이 값들만 바꾸면 됩니다.
              </p>
              <div className="space-y-3">
                {guideCard.userEditables.map((editable: any, index: number) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-4 border border-blue-200 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="bg-blue-100 text-blue-900 px-2 py-1 rounded text-sm font-mono font-bold">
                            {editable.variable}
                          </code>
                          {editable.getFrom && (
                            <a
                              href={editable.getFrom}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              여기서 가져오기
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{editable.description}</p>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">📍 위치:</span>
                            <code className="text-xs text-gray-600 font-mono">
                              {editable.location}
                            </code>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">💡 예시:</span>
                            <code className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-mono">
                              {editable.example}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🎯 완벽한 복붙 가이드 블록들 */}
          {guideCard.codeBlocks && guideCard.codeBlocks.length > 0 && (
            <div className="space-y-4 mb-6">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-green-600">📋</span>
                복사+붙여넣기 가이드 (클릭 한 번으로 완성!)
              </h4>
              {guideCard.codeBlocks.map((block: any, index: number) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-green-900">{block.title}</h5>
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(block.code);
                        // TODO: Toast 알림 추가
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      📋 복사
                    </Button>
                  </div>

                  {/* 코드 블록 */}
                  <div className="bg-gray-900 rounded-lg p-3 mb-3 overflow-x-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400 font-mono">
                        {block.language || 'code'}
                      </span>
                    </div>
                    <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                      {block.code}
                    </pre>
                  </div>

                  {/* 붙여넣기 위치 안내 */}
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-600">📍</span>
                      <span className="text-sm font-medium text-green-900">붙여넣기 위치:</span>
                    </div>
                    <p className="text-sm text-green-700">{block.copyInstructions}</p>
                    <div className="text-xs text-green-600 mt-1">
                      💾 저장 위치: {block.saveLocation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {guideCard.commonMistakes &&
            Array.isArray(guideCard.commonMistakes) &&
            guideCard.commonMistakes.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 mb-4 border border-red-200">
                <h4 className="font-semibold text-red-900 mb-2">⚠️ 자주하는 실수</h4>
                <ul className="space-y-1">
                  {guideCard.commonMistakes.map((mistake: string, index: number) => (
                    <li key={`mistake-${index}`} className="text-sm text-red-700">
                      • {mistake || '내용이 없습니다.'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {guideCard.practicalTips &&
            Array.isArray(guideCard.practicalTips) &&
            guideCard.practicalTips.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-2">💡 실용적 팁</h4>
                <ul className="space-y-1">
                  {guideCard.practicalTips.map((tip: string, index: number) => (
                    <li key={`tip-${index}`} className="text-sm text-yellow-700">
                      • {tip || '내용이 없습니다.'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* 🆘 ChatGPT 탈출구 (Toss-style UX) */}
          {guideCard.chatGptEscape && (
            <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-purple-600 text-xl">🆘</span>
                <h4 className="font-semibold text-purple-900">
                  {guideCard.chatGptEscape.trigger || '잘 모르겠어요?'}
                </h4>
              </div>
              <p className="text-sm text-purple-700 mb-3">
                ChatGPT에 바로 물어볼 수 있는 최적화된 프롬프트를 준비했어요. 복사해서 붙여넣기만 하세요!
              </p>
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-purple-900">
                    📋 ChatGPT 프롬프트
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleCopy(guideCard.chatGptEscape.prompt)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    복사
                  </Button>
                </div>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {guideCard.chatGptEscape.prompt}
                </pre>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-purple-600">
                <span>💡</span>
                <span>
                  ChatGPT에 붙여넣으면 바로 도움을 받을 수 있어요
                </span>
              </div>
            </div>
          )}
        </div>
      );

    // ❓ FAQ 카드 (기존 스타일 적용)
    case 'faq':
      const faqCard = card as any;
      
      // 🔧 FAQ 데이터 추출 및 파싱
      let faqItems: any[] = [];
      
      // 1순위: 직접 배열이 있는 경우
      if (faqCard.faqs && Array.isArray(faqCard.faqs)) {
        faqItems = faqCard.faqs;
      } else if (faqCard.questions && Array.isArray(faqCard.questions)) {
        faqItems = faqCard.questions;
      } else if (faqCard.items && Array.isArray(faqCard.items)) {
        faqItems = faqCard.items;
      }
      // 2순위: content 필드에서 JSON 파싱 시도
      else if (faqCard.content && typeof faqCard.content === 'string') {
        console.log('🔍 [FAQ 카드] content 원본:', faqCard.content.substring(0, 200) + '...');
        
        try {
          // 1) JSON 문자열에서 items 배열 추출 시도
          if (faqCard.content.includes('"items"')) {
            console.log('🔍 [FAQ 카드] "items" 키워드 발견, 배열 추출 시도');
            
            // items 배열만 추출하는 더 강력한 정규식
            const itemsMatch = faqCard.content.match(/"items"\s*:\s*(\[[\s\S]*?\](?:\s*,\s*\{[\s\S]*?\})*)/);
            if (itemsMatch) {
              console.log('🔍 [FAQ 카드] items 배열 매칭:', itemsMatch[1].substring(0, 100) + '...');
              try {
                faqItems = JSON.parse(itemsMatch[1]);
                console.log('✅ [FAQ 카드] items 배열 파싱 성공:', faqItems.length, '개');
              } catch (e) {
                console.log('❌ [FAQ 카드] items 배열 파싱 실패:', e);
              }
            }
            
            // items 배열 추출이 실패했으면 다른 방법 시도
            if (!faqItems || faqItems.length === 0) {
              // question/answer 쌍들을 직접 추출
              const questionMatches = faqCard.content.match(/"question"\s*:\s*"([^"]+)"/g);
              const answerMatches = faqCard.content.match(/"answer"\s*:\s*"([^"]+)"/g);
              
              if (questionMatches && answerMatches && questionMatches.length === answerMatches.length) {
                faqItems = questionMatches.map((qMatch, index) => {
                  const question = qMatch.match(/"question"\s*:\s*"([^"]+)"/)?.[1] || '';
                  const answer = answerMatches[index]?.match(/"answer"\s*:\s*"([^"]+)"/)?.[1] || '';
                  return { question, answer };
                });
                console.log('✅ [FAQ 카드] question/answer 직접 추출 성공:', faqItems.length, '개');
              }
            }
          }
          // 2) 전체 JSON 파싱 시도
          else if (faqCard.content.startsWith('{') || faqCard.content.startsWith('[')) {
            const parsed = JSON.parse(faqCard.content);
            if (Array.isArray(parsed)) {
              faqItems = parsed;
            } else if (parsed.items && Array.isArray(parsed.items)) {
              faqItems = parsed.items;
            }
            console.log('✅ [FAQ 카드] content 전체 JSON 파싱 성공:', faqItems.length, '개');
          }
        } catch (error) {
          console.log('📝 [FAQ 카드] JSON 파싱 실패:', error);
        }
      }
      
      // 3순위: 기본 FAQ 제공
      if (!faqItems || faqItems.length === 0) {
        faqItems = [
          {
            question: "설정이 어려워 보이는데 정말 쉬운가요?",
            answer: "네! 단계별 가이드를 따라하시면 누구나 쉽게 완성할 수 있습니다."
          },
          {
            question: "오류가 발생하면 어떻게 해야 하나요?",
            answer: "각 단계의 문제 해결 가이드에서 상세한 해결 방법을 확인하실 수 있습니다."
          },
          {
            question: "추가 비용이 발생하나요?",
            answer: "대부분의 자동화는 무료 도구로 구현 가능하며, 유료 도구 사용 시 미리 안내해드립니다."
          }
        ];
      }
      
      return (
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-xl">
              ❓
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {faqCard.title || '자주 묻는 질문'}
              </h3>
              <p className="text-gray-600">{faqCard.subtitle || 'FAQ'}</p>
            </div>
          </div>

          {/* FAQ content는 JSON이 포함된 경우 숨김 */}
          {faqCard.content && !faqCard.content.includes('"items"') && !faqCard.content.startsWith('{') && !faqCard.content.startsWith('[') && (
            <div className="text-gray-700 mb-4">{faqCard.content}</div>
          )}

          <div className="space-y-4">
            {faqItems.map((faq: any, index: number) => {
              // 방어 코드: faq가 유효한지 확인
              if (!faq) {
                return null;
              }

              // 다양한 프로퍼티명 지원
              const question = faq.question || faq.q || faq.title || '질문이 없습니다.';
              const answer = faq.answer || faq.a || faq.content || '답변이 없습니다.';

              return (
                <div
                  key={`faq-${index}`}
                  className="bg-white rounded-lg p-4 border border-orange-100"
                >
                  <div className="font-semibold text-gray-900 mb-2">
                    Q. {question.replace(/^["']|["']$/g, '')}
                  </div>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    A. {answer.replace(/^["']|["']$/g, '')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

    // 🔗 공유 카드 (원본 스타일 적용)
    case 'share':
      const shareCard = card as any;
      return (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white text-xl">
              🔗
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{shareCard.title}</h3>
              <p className="text-gray-600">{shareCard.subtitle}</p>
            </div>
          </div>

          {shareCard.content && <div className="text-gray-700 mb-4">{shareCard.content}</div>}

          {shareCard.shareOptions && (
            <div className="space-y-3">
              {shareCard.shareOptions.map((option: string, index: number) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-purple-100">
                  <div className="text-sm text-gray-700">{option}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    // 기본 케이스 (기존 카드들)
    default:
      return (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-gray-600">
            '{card.type}' 카드 타입은 아직 WOW 렌더링이 지원되지 않습니다.
          </p>
        </div>
      );
  }
}
