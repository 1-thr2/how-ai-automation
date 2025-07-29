'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameOverlayProps {
  isVisible: boolean;
  onResume: () => void;
  onClose: () => void;
  gameScore: number;
}

export default function GameOverlay({ isVisible, onResume, onClose, gameScore }: GameOverlayProps) {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
        >
          <div className="text-center">
            <div className="text-4xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">자동화 결과 준비 완료!</h2>
            <p className="text-gray-600 mb-4">게임을 계속하시겠어요, 아니면 결과를 확인하시겠어요?</p>
            
            <div className="bg-purple-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-purple-600 font-medium">현재 게임 점수</div>
              <div className="text-2xl font-bold text-purple-800">{gameScore.toLocaleString()}점</div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={onResume}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-full transition-colors"
              >
                🎮 게임 계속하기
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 rounded-full transition-colors"
              >
                📊 결과 확인하기
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mt-4">
              게임은 일시정지 상태로 유지됩니다
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 