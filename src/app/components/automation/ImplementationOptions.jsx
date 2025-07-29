import React from 'react';
import Image from 'next/image';

/**
 * 난이도별 구현 방법 컴포넌트
 * 스크린샷과 일치하는 고맥락 실리콘밸리 스타일의 UI
 */
const ImplementationOptions = () => {
  const options = [
    {
      id: 'beginner',
      level: '초급',
      code: 'No-Code',
      icon: '🌱',
      title: '초급 (No-Code)',
      tools: 'Zapier, IFTTT',
      setupTime: '15분',
      cost: '월 $20',
      recommended: false,
      details: ['도구: Zapier, IFTTT', '설정 시간: 15분', '비용: 월 $20', '필요 기술: 없음'],
    },
    {
      id: 'intermediate',
      level: '중급',
      code: 'Low-Code',
      icon: '🌿',
      title: '중급 (Low-Code)',
      tools: 'n8n, Make.com',
      setupTime: '1시간',
      cost: '무료 ~ 월 $10',
      recommended: true,
      details: [
        '도구: n8n, Make.com',
        '설정 시간: 1시간',
        '비용: 무료 ~ 월 $10',
        '필요 기술: 간단한 조건문',
      ],
    },
    {
      id: 'advanced',
      level: '고급',
      code: 'Custom',
      icon: '🌳',
      title: '고급 (Custom)',
      tools: 'Python, API 직접 연동',
      setupTime: '1주',
      cost: '호스팅비만',
      recommended: false,
      details: [
        '도구: Python, API 직접 연동',
        '개발 시간: 1주',
        '비용: 호스팅비만',
        '필요 기술: 코딩 경험 필요',
      ],
    },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
      <h2 className="text-2xl font-semibold flex items-center gap-2 mb-6">
        <span className="text-2xl">🎮</span>
        <span>난이도별 구현 방법</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {options.map(option => (
          <div
            key={option.id}
            className={`border-2 ${option.recommended ? 'border-purple-600 bg-purple-50' : 'border-gray-200'} 
                        rounded-xl p-6 relative transition-all hover:-translate-y-1 hover:shadow-lg`}
          >
            {option.recommended && (
              <div className="absolute top-4 right-4 bg-purple-600 text-white text-sm font-semibold px-2 py-1 rounded-full">
                추천
              </div>
            )}

            {option.recommended && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-xl"></div>
            )}

            <div className="flex items-center gap-4 mb-4">
              <span className="text-3xl">{option.icon}</span>
              <h3 className="text-xl font-semibold">{option.title}</h3>
            </div>

            <ul className="mb-6 space-y-2">
              {option.details.map((detail, idx) => (
                <li key={idx} className="flex items-start text-gray-700 text-sm">
                  <span className="text-purple-600 mr-2 font-bold">•</span>
                  {detail}
                </li>
              ))}
            </ul>

            <button
              className={`w-full py-3 px-4 rounded-lg text-base font-semibold transition-all
                         ${
                           option.recommended
                             ? 'bg-purple-600 text-white hover:bg-purple-700'
                             : 'border-2 border-purple-600 text-purple-600 hover:bg-purple-50'
                         }`}
              onClick={() => {
                alert(`${option.title} 방법을 선택하셨습니다. 준비 중인 기능입니다.`);
              }}
            >
              이 방법으로 시작
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImplementationOptions;
