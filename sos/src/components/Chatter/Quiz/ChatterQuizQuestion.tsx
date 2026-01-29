/**
 * ChatterQuizQuestion - Single quiz question component
 * Displays a question with multiple choice answers
 */

import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { ChatterQuizQuestion as QuizQuestionType } from '@/types/chatter';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

interface ChatterQuizQuestionProps {
  question: QuizQuestionType;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswerId: string | null;
  onSelectAnswer: (answerId: string) => void;
  showResult?: boolean;
  isCorrect?: boolean;
}

const ChatterQuizQuestion: React.FC<ChatterQuizQuestionProps> = ({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswerId,
  onSelectAnswer,
  showResult = false,
  isCorrect,
}) => {
  return (
    <div className={`${UI.card} p-6`}>
      {/* Question Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            Question {questionNumber}/{totalQuestions}
          </span>
          {showResult && (
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
              isCorrect
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {isCorrect ? 'Correct' : 'Incorrect'}
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {question.question}
        </h3>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option) => {
          const isSelected = selectedAnswerId === option.id;
          const isCorrectAnswer = showResult && option.isCorrect;
          const isWrongSelection = showResult && isSelected && !option.isCorrect;

          return (
            <button
              key={option.id}
              onClick={() => !showResult && onSelectAnswer(option.id)}
              disabled={showResult}
              className={`w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all ${
                showResult
                  ? isCorrectAnswer
                    ? 'bg-green-50 border-2 border-green-500 dark:bg-green-900/20 dark:border-green-400'
                    : isWrongSelection
                      ? 'bg-red-50 border-2 border-red-500 dark:bg-red-900/20 dark:border-red-400'
                      : 'bg-gray-50 border-2 border-transparent dark:bg-white/5'
                  : isSelected
                    ? 'bg-red-50 border-2 border-red-500 dark:bg-red-900/20 dark:border-red-400'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10'
              }`}
            >
              {/* Selection Indicator */}
              <div className="flex-shrink-0">
                {showResult ? (
                  isCorrectAnswer ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : isWrongSelection ? (
                    <div className="w-5 h-5 rounded-full border-2 border-red-500 bg-red-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✕</span>
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                  )
                ) : isSelected ? (
                  <CheckCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                )}
              </div>

              {/* Option Text */}
              <span className={`flex-1 font-medium ${
                showResult
                  ? isCorrectAnswer
                    ? 'text-green-700 dark:text-green-400'
                    : isWrongSelection
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300'
                  : isSelected
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-gray-700 dark:text-gray-300'
              }`}>
                {option.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChatterQuizQuestion;
