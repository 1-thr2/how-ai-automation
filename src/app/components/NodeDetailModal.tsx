'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NodeDetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function NodeDetailModal({ open, onClose, title, subtitle, children }: NodeDetailModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-0 md:p-0 shadow-2xl max-w-xl w-full relative animate-fadeIn overflow-hidden">
        <button
          className="absolute top-6 right-6 w-10 h-10 bg-[#F8F9FA] rounded-full flex items-center justify-center text-2xl text-gray-400 hover:bg-[#E1E3E8] transition z-10"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
        <div className="px-8 pt-10 pb-6 md:px-12 md:pt-14 md:pb-8">
          <div className="text-xl md:text-2xl font-extrabold text-center mb-2 flex items-center justify-center gap-2">
            {title}
          </div>
          {subtitle && <div className="text-base text-gray-500 text-center mb-8">{subtitle}</div>}
          <div className="space-y-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
