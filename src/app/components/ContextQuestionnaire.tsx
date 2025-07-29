import React, { useState } from 'react';

const TOOL_OPTIONS = [
  { value: 'gmail', label: 'Gmail' },
  { value: 'outlook', label: 'Outlook' },
  { value: 'slack', label: 'Slack' },
  { value: 'notion', label: 'Notion' },
  { value: 'google-sheets', label: 'Google Sheets' },
  { value: 'teams', label: 'Teams' },
  { value: 'etc', label: '기타(직접입력)' },
];

const RESULT_OPTIONS = [
  { value: 'slack', label: 'Slack' },
  { value: 'gmail', label: '이메일' },
  { value: 'notion', label: 'Notion' },
  { value: 'etc', label: '기타(직접입력)' },
];

export interface ContextAnswers {
  tools: string[];
  customTool?: string;
  result: string[];
  customResult?: string;
  companyPolicy?: string;
}

export default function ContextQuestionnaire({
  onSubmit,
}: {
  onSubmit: (answers: ContextAnswers) => void;
}) {
  const [tools, setTools] = useState<string[]>([]);
  const [customTool, setCustomTool] = useState('');
  const [result, setResult] = useState<string[]>([]);
  const [customResult, setCustomResult] = useState('');
  const [companyPolicy, setCompanyPolicy] = useState('');

  const handleToolChange = (value: string) => {
    setTools(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]));
  };
  const handleResultChange = (value: string) => {
    setResult(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ tools, customTool, result, customResult, companyPolicy });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-lg p-6 max-w-xl mx-auto mt-6"
    >
      <h3 className="text-lg font-bold mb-4">🔎 추가 정보 입력</h3>
      <div className="mb-4">
        <label className="font-semibold mb-2 block">
          1. 주로 사용하는 툴을 선택해 주세요{' '}
          <span className="text-xs text-gray-400">(복수 선택 가능)</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {TOOL_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-1">
              <input
                type="checkbox"
                value={opt.value}
                checked={tools.includes(opt.value)}
                onChange={() => handleToolChange(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        {tools.includes('etc') && (
          <input
            type="text"
            className="mt-2 border rounded px-2 py-1 w-full"
            placeholder="직접 입력: 예) ERP, 사내 그룹웨어 등"
            value={customTool}
            onChange={e => setCustomTool(e.target.value)}
          />
        )}
      </div>
      <div className="mb-4">
        <label className="font-semibold mb-2 block">2. 자동화 결과를 어디로 받고 싶으세요?</label>
        <div className="flex flex-wrap gap-3">
          {RESULT_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-1">
              <input
                type="checkbox"
                value={opt.value}
                checked={result.includes(opt.value)}
                onChange={() => handleResultChange(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        {result.includes('etc') && (
          <input
            type="text"
            className="mt-2 border rounded px-2 py-1 w-full"
            placeholder="직접 입력: 예) ERP, 사내 그룹웨어 등"
            value={customResult}
            onChange={e => setCustomResult(e.target.value)}
          />
        )}
      </div>
      <div className="mb-4">
        <label className="font-semibold mb-2 block">
          3. 회사에서 공식적으로 지원하는 툴/정책이 있나요?
        </label>
        <input
          type="text"
          className="border rounded px-2 py-1 w-full"
          placeholder="예) 구글 워크스페이스만 허용, 외부 메신저 금지 등"
          value={companyPolicy}
          onChange={e => setCompanyPolicy(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="w-full py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition-colors mt-2"
      >
        다음
      </button>
    </form>
  );
}
