import React, { useState, useEffect } from 'react';

const tips = [
  '“자동화는 작은 것부터! 매일 10분 아끼는 루틴을 찾아보세요.”',
  '“${new Date().getFullYear()}년 실리콘밸리 HR 자동화 트렌드: AI+노코드 툴 활용이 대세!”',
  '“실패해도 괜찮아요. Plan B(백업 플랜)도 함께 준비해두세요.”',
  '“자주 묻는 질문: 자동화가 실패하면 어떻게 하나요? → 로그/알림 설정이 답!”',
  '“업무 자동화로 연간 100시간 이상 절약한 사례가 속출 중!”',
];

export default function LoadingTipCarousel() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIdx(prev => (prev + 1) % tips.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="tip-carousel">
      <div className="tip-title">💡 자동화 꿀팁/트렌드</div>
      <div className="tip-card">{tips[idx]}</div>
      <div className="tip-indicator">
        {tips.map((_, i) => (
          <span key={i} className={i === idx ? 'active' : ''}>
            ●
          </span>
        ))}
      </div>
    </div>
  );
}
