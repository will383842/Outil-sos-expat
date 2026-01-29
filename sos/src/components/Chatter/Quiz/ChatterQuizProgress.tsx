/**
 * ChatterQuizProgress - Quiz progress and timer display
 * Shows progress bar, remaining time, and answered count
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface ChatterQuizProgressProps {
  currentQuestion: number;
  totalQuestions: number;
  answeredCount: number;
  timeLimit: number; // in seconds
  startedAt: string; // ISO timestamp
  onTimeUp?: () => void;
}

const ChatterQuizProgress: React.FC<ChatterQuizProgressProps> = ({
  currentQuestion,
  totalQuestions,
  answeredCount,
  timeLimit,
  startedAt,
  onTimeUp,
}) => {
  const [remainingTime, setRemainingTime] = useState(timeLimit);
  const [isLowTime, setIsLowTime] = useState(false);

  // Timer countdown
  useEffect(() => {
    const startTime = new Date(startedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, timeLimit - elapsed);

      setRemainingTime(remaining);
      setIsLowTime(remaining <= 60); // Last minute warning

      if (remaining === 0 && onTimeUp) {
        onTimeUp();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startedAt, timeLimit, onTimeUp]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = (currentQuestion / totalQuestions) * 100;
  const answeredPercent = (answeredCount / totalQuestions) * 100;

  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-4">
      {/* Timer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${isLowTime ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
          <span className={`text-lg font-bold ${isLowTime ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
            {formatTime(remainingTime)}
          </span>
        </div>

        {isLowTime && (
          <div className="flex items-center gap-1 text-red-500 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <FormattedMessage id="chatter.quiz.hurry" defaultMessage="Dépêchez-vous !" />
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>
            <FormattedMessage
              id="chatter.quiz.question"
              defaultMessage="Question {current}/{total}"
              values={{ current: currentQuestion, total: totalQuestions }}
            />
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Answered Count */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>
            <FormattedMessage
              id="chatter.quiz.answered"
              defaultMessage="{count} répondue(s)"
              values={{ count: answeredCount }}
            />
          </span>
        </div>
        <span className="text-gray-500 dark:text-gray-400">
          <FormattedMessage
            id="chatter.quiz.remaining"
            defaultMessage="{count} restante(s)"
            values={{ count: totalQuestions - answeredCount }}
          />
        </span>
      </div>
    </div>
  );
};

export default ChatterQuizProgress;
