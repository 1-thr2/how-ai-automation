import React from 'react';

export default function LoadingMiniGame() {
  return (
    <div className="minigame-section">
      <div className="minigame-title">기다리는 동안 미니게임 한 판?</div>
      {/* 사과게임 또는 테트리스 오픈소스 iframe 예시 */}
      <iframe
        src="https://playtetris.io/" // 또는 사과게임 오픈소스 주소
        width="320"
        height="480"
        title="테트리스"
        style={{ border: 'none', borderRadius: '16px', margin: '0 auto', display: 'block' }}
      />
      <div className="minigame-caption">점수 인증하면 소정의 선물도?! (이벤트 예고)</div>
    </div>
  );
}
