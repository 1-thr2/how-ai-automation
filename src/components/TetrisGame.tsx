import React, { useEffect, useRef, useState } from 'react';
import styles from '../styles/TetrisGame.module.css';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;

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
  ], // S
  [
    [0, 1, 1],
    [1, 1, 0],
  ], // Z
];

const COLORS = [
  '#FF0D72', // I
  '#0DC2FF', // O
  '#0DFF72', // T
  '#F538FF', // L
  '#FF8E0D', // J
  '#FFE138', // S
  '#3877FF', // Z
];

interface TetrisGameProps {
  onScoreChange: (score: number) => void;
}

const TetrisGame: React.FC<TetrisGameProps> = ({ onScoreChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [board, setBoard] = useState<number[][]>([]);
  const [currentPiece, setCurrentPiece] = useState<{
    shape: number[][];
    x: number;
    y: number;
    color: string;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    initializeBoard();
    spawnPiece();
    const gameLoop = setInterval(update, 1000);
    return () => clearInterval(gameLoop);
  }, []);

  const initializeBoard = () => {
    const newBoard = Array(BOARD_HEIGHT)
      .fill(0)
      .map(() => Array(BOARD_WIDTH).fill(0));
    setBoard(newBoard);
  };

  const spawnPiece = () => {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    const newPiece = {
      shape: SHAPES[randomIndex],
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(SHAPES[randomIndex][0].length / 2),
      y: 0,
      color: COLORS[randomIndex],
    };
    setCurrentPiece(newPiece);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw board
    board.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          ctx.fillStyle = COLORS[value - 1];
          ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
        }
      });
    });

    // Draw current piece
    if (currentPiece) {
      ctx.fillStyle = currentPiece.color;
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            ctx.fillRect(
              (currentPiece.x + x) * BLOCK_SIZE,
              (currentPiece.y + y) * BLOCK_SIZE,
              BLOCK_SIZE - 1,
              BLOCK_SIZE - 1
            );
          }
        });
      });
    }
  };

  const update = () => {
    if (gameOver) return;

    if (currentPiece) {
      if (canMove(currentPiece.x, currentPiece.y + 1)) {
        setCurrentPiece({ ...currentPiece, y: currentPiece.y + 1 });
      } else {
        mergePiece();
        clearLines();
        spawnPiece();
      }
    }
    draw();
  };

  const canMove = (x: number, y: number, shape = currentPiece?.shape) => {
    if (!shape) return false;

    return shape.every((row, dy) => {
      return row.every((value, dx) => {
        const newX = x + dx;
        const newY = y + dy;
        return (
          value === 0 ||
          (newX >= 0 &&
            newX < BOARD_WIDTH &&
            newY < BOARD_HEIGHT &&
            (newY < 0 || board[newY][newX] === 0))
        );
      });
    });
  };

  const mergePiece = () => {
    if (!currentPiece) return;

    const newBoard = board.map(row => [...row]);
    currentPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          const boardY = currentPiece.y + y;
          const boardX = currentPiece.x + x;
          if (boardY >= 0) {
            newBoard[boardY][boardX] = SHAPES.indexOf(currentPiece.shape) + 1;
          }
        }
      });
    });
    setBoard(newBoard);
  };

  const clearLines = () => {
    const newBoard = board.filter(row => !row.every(cell => cell !== 0));
    const linesCleared = BOARD_HEIGHT - newBoard.length;

    if (linesCleared > 0) {
      const newScore = score + linesCleared * 100;
      setScore(newScore);
      onScoreChange(newScore);

      const emptyRows = Array(linesCleared)
        .fill(0)
        .map(() => Array(BOARD_WIDTH).fill(0));
      setBoard([...emptyRows, ...newBoard]);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (!currentPiece || gameOver) return;

    switch (e.key) {
      case 'ArrowLeft':
        if (canMove(currentPiece.x - 1, currentPiece.y)) {
          setCurrentPiece({ ...currentPiece, x: currentPiece.x - 1 });
        }
        break;
      case 'ArrowRight':
        if (canMove(currentPiece.x + 1, currentPiece.y)) {
          setCurrentPiece({ ...currentPiece, x: currentPiece.x + 1 });
        }
        break;
      case 'ArrowDown':
        if (canMove(currentPiece.x, currentPiece.y + 1)) {
          setCurrentPiece({ ...currentPiece, y: currentPiece.y + 1 });
        }
        break;
      case 'ArrowUp':
        const rotated = currentPiece.shape[0].map((_, i) =>
          currentPiece.shape.map(row => row[i]).reverse()
        );
        if (canMove(currentPiece.x, currentPiece.y, rotated)) {
          setCurrentPiece({ ...currentPiece, shape: rotated });
        }
        break;
    }
    draw();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []); // 🔥 currentPiece 제거하여 무한루프 방지

  return (
    <div className={styles.tetrisGame}>
      <canvas
        ref={canvasRef}
        width={BOARD_WIDTH * BLOCK_SIZE}
        height={BOARD_HEIGHT * BLOCK_SIZE}
        className={styles.border}
      />
      <div className={styles.scoreContainer}>
        <p className={styles.scoreText}>스코어: {score}</p>
        {gameOver && <p className={styles.gameOverText}>게임 오버!</p>}
      </div>
    </div>
  );
};

export default TetrisGame;
