'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLoader, FiCpu, FiSearch, FiCheckCircle } from 'react-icons/fi';
import LoadingProfileCard from './LoadingProfileCard';
import LoadingMiniGame from './LoadingMiniGame';
import LoadingTipCarousel from './LoadingTipCarousel';
// 게임 점수는 로컬스토리지 사용 (부차적 기능)


interface Tetromino {
  shape: number[][];
  color: string;
}

interface Position {
  x: number;
  y: number;
}

const LOADING_STAGES = [
  { icon: '🔍', text: '요구사항 분석 중...', desc: '업무 내용을 분석하고 있어요' },
  {
    icon: '🌐',
    text: '최신 도구 검색 중...',
    desc: `${new Date().getFullYear()}년 최신 자동화 도구를 찾는 중`,
  },
  { icon: '🤖', text: 'AI가 최적의 방법 찾는 중...', desc: 'GPT가 맞춤형 레시피 생성 중' },
  { icon: '✅', text: '코드 검증 중...', desc: '코드와 설정을 실시간 검증 중' },
];

const TIPS = [
  '💡 자동화로 평균 8시간/주를 절약할 수 있어요!',
  `💡 ${new Date().getFullYear()}년 최신 트렌드: n8n, Make.com, Zapier 활용`,
  '💡 1,328명이 이 방법으로 성공했어요!',
  '💡 반복 업무에서 해방, 더 중요한 일에 집중하세요.',
];

// 게임 데이터 저장 인터페이스
interface GameScore {
  score: number;
  nickname: string;
  timestamp: number;
  duration: number;
}

// 점수 등록 모달 컴포넌트
const ScoreRegistrationModal = ({ 
  isOpen, 
  score, 
  onSubmit, 
  onSkip 
}: { 
  isOpen: boolean; 
  score: number; 
  onSubmit: (nickname: string) => void;
  onSkip: () => void;
}) => {
  const [nickname, setNickname] = useState('');
  
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      onSubmit(nickname.trim());
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center"
        >
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">게임 종료!</h2>
          <p className="text-lg text-purple-600 font-bold mb-2">최종 점수: {score.toLocaleString()}점</p>
          <p className="text-gray-600 mb-6">랭킹에 등록하시겠어요?</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 10))}
              placeholder="이니셜 또는 닉네임 (최대 10자)"
              className="w-full px-4 py-2 border border-gray-300 rounded-full text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={10}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSkip}
                className="flex-1 bg-gray-200 text-gray-700 font-bold py-2 rounded-full hover:bg-gray-300 transition-colors"
              >
                건너뛰기
              </button>
              <button
                type="submit"
                disabled={!nickname.trim()}
                className="flex-1 bg-purple-600 text-white font-bold py-2 rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                등록하기
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};



// 기존 테트리스 미니게임 컴포넌트 
const TetrisMiniGame = ({ 
  onScoreUpdate, 
  onGameEnd 
}: { 
  onScoreUpdate?: (score: number) => void;
  onGameEnd?: (score: number) => void;
}) => {
  const ROWS = 15;
  const COLS = 10;
  const BLOCK_SIZE = 20;
  const [grid, setGrid] = useState<string[][]>(() =>
    Array.from({ length: ROWS }, () => Array(COLS).fill(''))
  );
  const [tetromino, setTetromino] = useState<Tetromino | null>(null);
  const [tetrominoPosition, setTetrominoPosition] = useState<Position>({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEndProcessed, setGameEndProcessed] = useState(false);

  const SHAPES = [
    [[1, 1, 1, 1]], // I
    [
      [1, 1],
      [1, 1],
    ], // O
    [
      [1, 1, 1],
      [0, 1, 0],
    ], // T
    [
      [1, 1, 1],
      [1, 0, 0],
    ], // L
    [
      [1, 1, 1],
      [0, 0, 1],
    ], // J
    [
      [1, 1, 0],
      [0, 1, 1],
    ], // Z
    [
      [0, 1, 1],
      [1, 1, 0],
    ], // S
  ];
  const COLORS = ['#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'];

  const createNewTetromino = () => {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    const shape = SHAPES[randomIndex];
    const color = COLORS[randomIndex];
    const x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
    const y = 0;

    if (checkCollision(shape, { x, y })) {
      console.log('🎮 게임 오버! checkCollision으로 감지');
      setGameOver(true);
      return;
    }

    setTetromino({ shape, color });
    setTetrominoPosition({ x, y });
  };

  const checkCollision = (shape: number[][], pos: Position): boolean => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newX = x + pos.x;
          const newY = y + pos.y;

          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }

          if (newY >= 0 && grid[newY][newX] !== '') {
            return true;
          }
        }
      }
    }
    return false;
  };

  const moveTetromino = (dx: number, dy: number): boolean => {
    if (!tetromino || gameOver) return false;

    const newPos = { x: tetrominoPosition.x + dx, y: tetrominoPosition.y + dy };

    if (!checkCollision(tetromino.shape, newPos)) {
      setTetrominoPosition(newPos);
      return false;
    }

    if (dy > 0) {
      const newGrid = [...grid];
      tetromino.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell !== 0) {
            const gridY = y + tetrominoPosition.y;
            const gridX = x + tetrominoPosition.x;
            if (gridY >= 0) {
              newGrid[gridY][gridX] = tetromino.color;
            }
          }
        });
      });

      let linesCleared = 0;
      const newGridAfterClearing = newGrid.reduce<string[][]>((acc, row) => {
        if (row.every(cell => cell !== '')) {
          linesCleared++;
          acc.unshift(Array(COLS).fill(''));
        } else {
          acc.push(row);
        }
        return acc;
      }, []);

      if (linesCleared > 0) {
        setScore(prev => prev + linesCleared * 100);
      }

      setGrid(newGridAfterClearing);
      createNewTetromino();
      return true;
    }

    return true;
  };

  const rotateTetromino = () => {
    if (!tetromino || gameOver) return;

    const rotated = tetromino.shape[0].map((_, i) => tetromino.shape.map(row => row[i]).reverse());

    if (!checkCollision(rotated, tetrominoPosition)) {
      setTetromino({ ...tetromino, shape: rotated });
    }
  };

  const startGame = () => {
    setGrid(Array.from({ length: ROWS }, () => Array(COLS).fill('')));
    setGameOver(false);
    setScore(0);
    setGameStarted(true);
    setGameEndProcessed(false);
    createNewTetromino();
  };

  // 게임 종료 시 점수 등록 처리
  useEffect(() => {
    if (gameOver && !gameEndProcessed) {
      console.log('🎮 게임 오버 감지! 점수:', score);
      setGameEndProcessed(true);
      onGameEnd?.(score);
    }
  }, [gameOver, gameEndProcessed, score, onGameEnd]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const interval = setInterval(() => {
      moveTetromino(0, 1);
    }, 100); // 7배 빠른 속도 (보통 700ms -> 100ms)

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, tetromino, grid, tetrominoPosition]); // 의존성 추가

  useEffect(() => {
    if (!gameStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveTetromino(-1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveTetromino(1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveTetromino(0, 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotateTetromino();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver, tetromino, grid, tetrominoPosition]); // 의존성 추가

  const renderGame = () => {
    const gameGrid = Array.from({ length: ROWS }, () => Array(COLS).fill(''));

    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== '') {
          gameGrid[y][x] = cell;
        }
      });
    });

    if (tetromino) {
      tetromino.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell !== 0) {
            const gridY = y + tetrominoPosition.y;
            const gridX = x + tetrominoPosition.x;
            if (gridY >= 0 && gridY < ROWS && gridX >= 0 && gridX < COLS) {
              gameGrid[gridY][gridX] = tetromino.color;
            }
          }
        });
      });
    }

    return (
      <div className="flex flex-col items-center mt-4">
        <div className="flex items-center mb-2">
          <div className="text-sm font-bold mr-4">점수: {score}</div>
          {gameOver && (
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-primary to-primary-light text-white px-3 py-1 rounded-full text-xs"
            >
              새 게임
            </button>
          )}
        </div>

        <div className="bg-primary/5 border-2 border-gray-200 rounded p-1">
          {gameGrid.map((row, y) => (
            <div key={y} className="flex">
              {row.map((cell, x) => (
                <div
                  key={x}
                  className="w-5 h-5 border border-gray-100"
                  style={{ backgroundColor: cell || '#FFFFFF' }}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => moveTetromino(-1, 0)}
            className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm"
          >
            ← 왼쪽
          </button>
          <button
            onClick={() => moveTetromino(0, 1)}
            className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm"
          >
            ↓ 아래
          </button>
          <button
            onClick={rotateTetromino}
            className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm"
          >
            ↻ 회전(↑)
          </button>
          <button
            onClick={() => moveTetromino(1, 0)}
            className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm"
          >
            오른쪽 →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="text-center">
      {!gameStarted ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-purple-800 mb-2">🎮 7배 빠른 테트리스</h3>
            <p className="text-gray-600 text-sm mb-3">
              일반 테트리스보다 7배 빠른 속도로 짜릿한 승부!
              <br />
              블록이 빠르게 떨어지니 순발력이 중요해요 ⚡
            </p>
          </div>
          <p className="text-sm text-gray-600">
            키보드 방향키로 조작하세요!
            <br />
            ↑: 회전, ←→: 이동, ↓: 빠르게 내리기
          </p>
          <button
            disabled={!gameStarted && gameOver}
            className={`bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-5 py-2 rounded-full font-semibold shadow-lg hover:scale-105 transition-all
              ${!gameStarted && gameOver ? 'opacity-60 cursor-not-allowed' : ''}`}
            onClick={startGame}
          >
            🚀 게임 시작하기
          </button>
        </div>
      ) : (
        renderGame()
      )}
    </div>
  );
};

// 자기소개 모달 컴포넌트
const ProfileModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
          
          {/* 캐릭터 이미지 */}
          <div className="text-center mb-6">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center overflow-hidden">
              <img 
                src="/character.png" 
                alt="김한슬 프로필" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 이미지 로드 실패시 이모지 표시
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement!.innerHTML = '<span class="text-4xl">👩🏻‍💼</span>';
                }}
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">안녕하세요! 👋</h2>
          </div>
          
          {/* 자기소개 */}
          <div className="text-center space-y-3 mb-8">
            <p className="text-lg font-semibold text-purple-700">
              모비데이즈 HRBP 김한슬입니다.
            </p>
            <p className="text-gray-600 leading-relaxed">
              AI, 자동화/효율화, HR, 마케팅에 관심이 많습니다.
              <br />
              관련해서 얘기나누고 싶은 분들은 언제든지 환영입니다!! ☕✨
            </p>
          </div>
          
          {/* 링크드인 버튼 */}
          <div className="text-center">
            <a
              href="https://www.linkedin.com/in/%ED%95%9C%EC%8A%AC-%EA%B9%80-a99b81226/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-full px-8 py-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              링크드인으로 바로가기
            </a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

interface LoadingScreenProps {
  stage?: 'first' | 'second'; // 첫 번째(후속질문) vs 두 번째(결과) 로딩
}

// 게임 데이터 저장 인터페이스
interface GameScore {
  score: number;
  nickname: string;
  timestamp: number;
  duration: number; // 게임 플레이 시간(초)
}



// 랭킹 표시 컴포넌트
const GameRanking = ({ onPlayGame }: { onPlayGame: () => void }) => {
  const [rankings, setRankings] = useState<GameScore[]>([]);

  useEffect(() => {
    // 로컬스토리지에서 점수 로드 (게임은 부차적 기능)
    const scores = JSON.parse(localStorage.getItem('tetrisScores') || '[]');
    setRankings(scores.slice(0, 5)); // 상위 5개만 표시
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl p-6 mb-6"
    >
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-purple-800 mb-2">🏆 7배 빠른 테트리스 랭킹</h3>
        <p className="text-gray-600 text-sm">
          일반 테트리스보다 7배 빠른 속도! ⚡
          <br />
          다른 사용자들과 실력을 겨뤄보세요!
        </p>
      </div>
      
      {rankings.length > 0 ? (
        <div className="space-y-2 mb-4">
          {rankings.map((score, index) => (
            <div key={index} className="flex justify-between items-center bg-white rounded-lg px-3 py-2">
              <div className="flex items-center">
                <span className="text-lg mr-2">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                </span>
                <span className="font-semibold">{score.nickname}</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-purple-600">{score.score.toLocaleString()}점</div>
                <div className="text-xs text-gray-500">{score.duration}초 플레이</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 mb-4">
          <div className="text-4xl mb-2">🎮</div>
          <p>아직 기록이 없어요!</p>
          <p className="text-sm">첫 번째 도전자가 되어보세요</p>
        </div>
      )}
      
      <div className="text-center space-y-2">
        <button
          onClick={onPlayGame}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-full transition-colors"
        >
          🚀 7배 빠른 테트리스 도전!
        </button>
        <div className="text-xs text-gray-500">
          ⚡ 7배 빠른 속도로 짜릿한 승부!
        </div>
      </div>
    </motion.div>
  );
};

export default function LoadingScreen({ stage = 'first' }: LoadingScreenProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const [showGame, setShowGame] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [userScore, setUserScore] = useState(0);
  const [showAutoPrompt, setShowAutoPrompt] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  // 자동 랭킹 표시 제거 - 사용자가 직접 클릭할 때만 표시
  // useEffect(() => {
  //   if (stage === 'second') {
  //     const timer = setTimeout(() => {
  //       setShowAutoPrompt(true);
  //     }, 3000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [stage]);

  // 기존 로딩 로직...
  useEffect(() => {
    const stageInterval = setInterval(() => {
      setCurrentStage(prev => (prev + 1) % LOADING_STAGES.length);
    }, 2000);

    const tipInterval = setInterval(() => {
      setTipIdx(prev => (prev + 1) % TIPS.length);
    }, 3000);

    return () => {
      clearInterval(stageInterval);
      clearInterval(tipInterval);
    };
  }, []);

  const handlePlayGame = () => {
    setShowRanking(false);
    setShowGame(true);
    setShowAutoPrompt(false);
  };

  // 게임 종료 시 점수 등록 모달 표시
  const handleGameEnd = (score: number) => {
    setFinalScore(score);
    setShowScoreModal(true);
  };

  // 점수 등록 처리 (로컬스토리지)
  const handleScoreSubmit = (nickname: string) => {
    const newScore: GameScore = {
      score: finalScore,
      nickname,
      timestamp: Date.now(),
      duration: 0 // 게임 시간은 별도로 추적 가능
    };

    // 기존 점수들 가져오기
    const existingScores = JSON.parse(localStorage.getItem('tetrisScores') || '[]');
    const updatedScores = [...existingScores, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // 상위 10개만 유지

    localStorage.setItem('tetrisScores', JSON.stringify(updatedScores));
    setShowScoreModal(false);
    setShowGame(false);
    setShowRanking(true);
  };

  // 점수 등록 건너뛰기
  const handleScoreSkip = () => {
    setShowScoreModal(false);
    setShowGame(false);
  };

  return (
    <div className="loading-container text-center max-w-4xl mx-auto py-16">
      {/* 기존 로딩 단계 표시... */}
      <div className="loading-stages mb-8">
        {/* 모든 로딩 단계: 가로 레이아웃으로 통일 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {LOADING_STAGES.map((stageItem, index) => (
            <motion.div
              key={index}
              className={`loading-stage p-4 rounded-xl ${
                index === currentStage
                  ? 'bg-purple-100 border-2 border-purple-300'
                  : 'bg-gray-50'
              }`}
              animate={{
                scale: index === currentStage ? 1.05 : 1,
                opacity: index === currentStage ? 1 : 0.6,
              }}
            >
              <div className="text-3xl mb-2">{stageItem.icon}</div>
              <div className="font-bold text-gray-800">{stageItem.text}</div>
              <div className="text-sm text-gray-600">{stageItem.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 스피너 */}
      <div className="loading-spinner w-16 h-16 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto my-8" />

      {/* 컨텐츠 영역 */}
      {showGame ? (
        <div className="loading-tip bg-purple-50 rounded-xl p-6 mb-6 relative">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            onClick={() => setShowGame(false)}
          >
            ✖ 닫기
          </button>
          <TetrisMiniGame 
            onScoreUpdate={setUserScore}
            onGameEnd={handleGameEnd}
          />
        </div>
      ) : showRanking ? (
        <GameRanking onPlayGame={handlePlayGame} />
      ) : (
        <div className="loading-tip bg-purple-50 rounded-xl p-6 mb-6 relative">
          <h4 className="text-purple-700 font-bold mb-2">알고 계셨나요?</h4>
          <p className="text-gray-700 text-base transition-all duration-500">{TIPS[tipIdx]}</p>
          <div className="flex justify-center gap-2 mt-3">
            {TIPS.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === tipIdx ? 'bg-primary' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          {/* 2번째 로딩에서만 게임 관련 버튼들 표시 */}
          {stage === 'second' && (
            <div className="text-center mt-4">
              <div className="space-y-3">
                <div>
                  <button
                    onClick={handlePlayGame}
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-full px-8 py-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
                    🎮 기다리는 동안 게임하기
                  </button>
                </div>
                <div>
                  <button
                    onClick={() => setShowRanking(true)}
                    className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium rounded-full px-6 py-2 shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm"
                  >
                    🏆 랭킹 보기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CTA 버튼 */}
      <div className="flex flex-wrap justify-center gap-4 mt-6">
        <button
          onClick={() => setShowProfileModal(true)}
          className="bg-white border-2 border-purple-500 text-purple-600 font-bold rounded-full px-6 py-2 shadow hover:bg-purple-50 hover:text-indigo-600 transition-all"
        >
          ✨ 만든이와 커피챗하기
        </button>
      </div>

      <div className="text-gray-400 text-xs mt-8">
        {stage === 'first' 
          ? '추가질문을 만드는데 약 20초 소요됩니다'
          : '솔직히 시간이 조금 걸립니다... 기다리는 동안, 게임한판 어떠신가요?'
        }
      </div>
      
      {/* 프로필 모달 */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />
      
      {/* 점수 등록 모달 */}
      <ScoreRegistrationModal
        isOpen={showScoreModal}
        score={finalScore}
        onSubmit={handleScoreSubmit}
        onSkip={handleScoreSkip}
      />
    </div>
  );
}
