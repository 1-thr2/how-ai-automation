'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SurveyState {
  category: string;
  tools: string;
  description: string;
  userLevel: string;
  // 필요시 후속질문 등 추가
}

interface SurveyContextType extends SurveyState {
  setCategory: (v: string) => void;
  setTools: (v: string) => void;
  setDescription: (v: string) => void;
  setUserLevel: (v: string) => void;
  reset: () => void;
}

const AutomationSurveyContext = createContext<SurveyContextType | undefined>(undefined);

export function AutomationSurveyProvider({ children }: { children: ReactNode }) {
  const [category, setCategory] = useState('');
  const [tools, setTools] = useState('');
  const [description, setDescription] = useState('');
  const [userLevel, setUserLevel] = useState('');

  function reset() {
    setCategory('');
    setTools('');
    setDescription('');
    setUserLevel('');
  }

  return (
    <AutomationSurveyContext.Provider
      value={{
        category,
        tools,
        description,
        userLevel,
        setCategory,
        setTools,
        setDescription,
        setUserLevel,
        reset,
      }}
    >
      {children}
    </AutomationSurveyContext.Provider>
  );
}

export function useAutomationSurvey() {
  const ctx = useContext(AutomationSurveyContext);
  if (!ctx) throw new Error('useAutomationSurvey must be used within AutomationSurveyProvider');
  return ctx;
}
