import React, { useState } from 'react';
import { FiChevronDown, FiHelpCircle } from 'react-icons/fi';
import type { FAQItem } from '@/app/types/automation';

interface FAQSectionProps {
  faq: FAQItem[];
}

const FAQSection: React.FC<FAQSectionProps> = ({ faq }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const filteredFaq = faq.filter(item => 
    (('q' in item) ? item.q : item.question) && 
    (('a' in item) ? item.a : item.answer)
  );

  return (
    <section className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center">
        <FiHelpCircle className="text-violet-500 mr-2" />
        <h2 className="text-xl font-bold text-gray-800">자주 묻는 질문</h2>
      </div>
      <div className="p-6 space-y-3">
        {filteredFaq.map((item, idx) => (
          <div key={idx} className="rounded-lg bg-violet-50">
            <button
              className="w-full flex justify-between items-center px-4 py-3 font-semibold text-violet-800 focus:outline-none"
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              aria-expanded={openIdx === idx}
            >
              <span>{item.question}</span>
              <FiChevronDown
                className={`ml-2 transition-transform ${openIdx === idx ? 'rotate-180' : ''}`}
              />
            </button>
            {openIdx === idx && (
              <div className="px-4 pb-4 text-gray-700 text-sm animate-fade-in">{item.answer}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQSection;
