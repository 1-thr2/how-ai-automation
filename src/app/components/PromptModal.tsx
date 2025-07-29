import React, { useState } from 'react';

interface PromptModalProps {
  prompt: string;
  isLoading: boolean;
  onClose: () => void;
}

const PromptModal: React.FC<PromptModalProps> = ({ prompt, isLoading, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openGpt = () => {
    const gptUrl = `https://chat.openai.com/?q=${encodeURIComponent(prompt)}`;
    window.open(gptUrl, '_blank');
  };

  return (
    <div className="result-modal" onClick={onClose}>
      <div className="result-modal-content" onClick={e => e.stopPropagation()}>
        <button className="result-close-btn" onClick={onClose}>×</button>
        <div className="result-modal-header">
          <div className="result-modal-title">🤖 GPT와 함께 설계하기</div>
          <div className="result-modal-subtitle">
            아래 프롬프트를 복사하여 ChatGPT에 붙여넣고, 더 구체적인 맞춤형 가이드를 받아보세요.
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
            <p className="ml-4 text-gray-600">최적의 프롬프트를 생성 중입니다...</p>
          </div>
        ) : (
          <>
            <div className="prompt-container bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-700 max-h-60 overflow-y-auto whitespace-pre-wrap">
              {prompt}
            </div>
            <div className="flex justify-center gap-4 mt-6">
              <button className="prompt-copy-btn" onClick={handleCopy} disabled={!prompt}>
                {copied ? '✅ 복사 완료!' : '📋 프롬프트 복사하기'}
              </button>
              <button className="prompt-gpt-btn" onClick={openGpt} disabled={!prompt}>
                🚀 ChatGPT로 이동
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PromptModal; 