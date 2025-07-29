import React, { useState } from 'react';
import styles from '../styles/DynamicQuestionnaire.module.css';

export interface DynamicQuestion {
  id: string;
  type: 'text' | 'multiple';
  question: string;
  required: boolean;
  options?: string[];
  description?: string;
}

export interface DynamicAnswers {
  [key: string]: string | string[];
}

interface DynamicQuestionnaireProps {
  questions: DynamicQuestion[];
  onSubmit: (answers: DynamicAnswers) => void;
  onCancel?: () => void;
}

const DynamicQuestionnaire: React.FC<DynamicQuestionnaireProps> = ({
  questions,
  onSubmit,
  onCancel,
}) => {
  const [answers, setAnswers] = useState<DynamicAnswers>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [currentIdx, setCurrentIdx] = useState(0);

  // questions 배열이 비어있거나 유효하지 않은 경우 처리
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return (
      <div className={styles.questionnaireContainer}>
        <p className={styles.errorMessage}>질문을 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const total = questions.length;
  const isLast = currentIdx === total - 1;
  const isFirst = currentIdx === 0;

  // currentQuestion이 유효하지 않은 경우 처리
  if (!currentQuestion) {
    return (
      <div className={styles.questionnaireContainer}>
        <p className={styles.errorMessage}>현재 질문을 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  const handleInputChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const validateCurrent = (): boolean => {
    if (currentQuestion.required) {
      if (currentQuestion.type === 'multiple') {
        if (
          !answers[currentQuestion.id] ||
          (answers[currentQuestion.id] as string[]).length === 0
        ) {
          setErrors({ [currentQuestion.id]: '최소 1개 이상 선택해주세요.' });
          return false;
        }
      } else if (!answers[currentQuestion.id]) {
        setErrors({ [currentQuestion.id]: '이 질문에 답변해주세요.' });
        return false;
      }
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (!validateCurrent()) return;
    if (!isLast) setCurrentIdx(idx => idx + 1);
    else onSubmit(answers);
  };

  const handlePrev = () => {
    setErrors({});
    if (!isFirst) setCurrentIdx(idx => idx - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleNext();
  };

  return (
    <div className={styles.questionnaireContainer}>
      {/* 진행도 바 */}
      <div className={styles.progressBarContainer}>
        <div
          className={styles.progressBar}
          style={{ width: `${((currentIdx + 1) / total) * 100}%` }}
        ></div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.questionContainer}>
          {/* 질문 */}
          <div>
            <label className={styles.questionLabel}>
              {currentQuestion.question}
              {currentQuestion.required && <span className={styles.requiredAsterisk}>*</span>}
            </label>

            {/* 설명 */}
            {currentQuestion.description && (
              <div className={styles.description}>{currentQuestion.description}</div>
            )}

            {/* 입력 필드 */}
            {currentQuestion.type === 'text' && (
              <input
                type="text"
                value={(answers[currentQuestion.id] as string) || ''}
                onChange={e => handleInputChange(currentQuestion.id, e.target.value)}
                className={styles.inputField}
                placeholder="답변을 입력해주세요"
              />
            )}

            {currentQuestion.type === 'multiple' && currentQuestion.options && (
              <div className={styles.optionsContainer}>
                {currentQuestion.options.map((option, idx) => (
                  <div
                    key={`${currentQuestion.id}-${option}-${idx}`}
                    className={styles.optionContainer}
                  >
                    <label className={styles.optionLabel}>
                      <input
                        type="checkbox"
                        name={currentQuestion.id}
                        value={option}
                        checked={
                          Array.isArray(answers[currentQuestion.id]) &&
                          (answers[currentQuestion.id] as string[]).includes(option)
                        }
                        onChange={e => {
                          const currentAnswers = (answers[currentQuestion.id] as string[]) || [];
                          const newAnswers = e.target.checked
                            ? [...currentAnswers, option]
                            : currentAnswers.filter(ans => ans !== option);
                          handleInputChange(currentQuestion.id, newAnswers);
                        }}
                        className={styles.checkbox}
                      />
                      <span className={styles.optionText}>{option}</span>
                    </label>
                    {option === '직접입력' &&
                      Array.isArray(answers[currentQuestion.id]) &&
                      (answers[currentQuestion.id] as string[]).includes('직접입력') && (
                        <div className={styles.directInputContainer}>
                          <input
                            type="text"
                            value={(answers[`${currentQuestion.id}-direct`] as string) || ''}
                            onChange={e =>
                              handleInputChange(`${currentQuestion.id}-direct`, e.target.value)
                            }
                            className={styles.directInput}
                            placeholder="직접 입력해주세요"
                          />
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}

            {errors[currentQuestion.id] && (
              <p className={styles.errorMessage}>{errors[currentQuestion.id]}</p>
            )}
          </div>
        </div>

        <div className={styles.buttonContainer}>
          {onCancel && (
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              취소
            </button>
          )}
          <button
            type="button"
            onClick={handlePrev}
            className={styles.prevButton}
            disabled={isFirst}
          >
            이전
          </button>
          <button type="submit" className={styles.submitButton}>
            {isLast ? '제출' : '다음'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DynamicQuestionnaire;
