import React from 'react';

export default function LoadingProfileCard() {
  return (
    <div className="profile-card">
      <img src="/profile.png" alt="프로필" className="profile-img" />
      <div className="profile-info">
        <div className="profile-name">안녕하세요. 모비데이즈 HRBP 김한슬입니다.</div>
        <div className="profile-desc">
          모비데이즈가 궁금하다면,
          <br />
          또는 HR·자동화·조직문화에
          <br />
          대해 이야기 나누고 싶다면
          <br />
          언제든 커피챗 열려 있습니다!
        </div>
        <a href="https://linkedin.com/in/yourprofile" target="_blank" className="coffeechat-btn">
          ☕ 커피챗 하기
        </a>
        <div className="coffeechat-caption">
          * HRBP/모비데이즈/자동화 관련 무엇이든 편하게 문의 주세요!
        </div>
      </div>
    </div>
  );
}
