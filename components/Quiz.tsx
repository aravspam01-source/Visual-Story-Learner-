import React, { useState, useMemo } from 'react';
import { QuizItem } from '../types';

interface QuizProps {
  items: QuizItem[];
}

// FIX: Export the Quiz component so it can be imported in other files.
export const Quiz: React.FC<QuizProps> = ({ items }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const score = useMemo(() => {
    if (!isSubmitted) return 0;
    return items.reduce((total, item, index) => {
      return selectedAnswers[index] === item.correctAnswerIndex ? total + 1 : total;
    }, 0);
  }, [isSubmitted, items, selectedAnswers]);

  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const getOptionClasses = (questionIndex: number, optionIndex: number) => {
    if (!isSubmitted) {
      return selectedAnswers[questionIndex] === optionIndex
        ? 'ring-2 ring-indigo-500 bg-indigo-100 dark:bg-indigo-900/50'
        : 'hover:bg-slate-200 dark:hover:bg-slate-700';
    }

    const isCorrect = items[questionIndex].correctAnswerIndex === optionIndex;
    const isSelected = selectedAnswers[questionIndex] === optionIndex;

    if (isCorrect) {
      return 'bg-green-100 dark:bg-green-900/50 ring-2 ring-green-500 text-green-800 dark:text-green-200';
    }
    if (isSelected && !isCorrect) {
      return 'bg-red-100 dark:bg-red-900/50 ring-2 ring-red-500 text-red-800 dark:text-red-200';
    }
    return 'bg-slate-100 dark:bg-slate-800 opacity-70';
  };
  
  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitted(true);
  };
  
  const handleReset = () => {
      setSelectedAnswers({});
      setIsSubmitted(false);
  }

  return (
    <div className="w-full">
      {isSubmitted ? (
        <div className="text-center p-6">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Quiz Complete!</h3>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-300">
            You scored <span className="font-bold text-indigo-600 dark:text-indigo-400">{score}</span> out of <span className="font-bold">{items.length}</span>
          </p>
          <div className="mt-4 text-3xl">
             {score === items.length ? '🎉' : score > items.length / 2 ? '👍' : '🤔'}
          </div>
           <button 
                onClick={handleReset}
                className="mt-6 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
           >
             Try Again
           </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit}>
        <div className="space-y-8">
          {items.map((item, qIndex) => (
            <div key={qIndex} className={`p-4 rounded-lg transition-opacity ${isSubmitted ? 'opacity-90' : ''}`}>
              <p className="font-semibold text-lg text-slate-700 dark:text-slate-300 mb-4">{qIndex + 1}. {item.question}</p>
              <div className="space-y-3">
                {item.options.map((option, oIndex) => (
                  <button
                    type="button"
                    key={oIndex}
                    onClick={() => handleSelectAnswer(qIndex, oIndex)}
                    disabled={isSubmitted}
                    className={`w-full text-left p-3 rounded-lg border border-slate-300 dark:border-slate-600 transition-all duration-200 disabled:cursor-not-allowed ${getOptionClasses(qIndex, oIndex)}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {!isSubmitted && (
            <div className="mt-8 text-center">
                <button 
                    type="submit"
                    disabled={Object.keys(selectedAnswers).length !== items.length}
                    className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
                >
                    Check My Answers
                </button>
            </div>
        )}
      </form>
    </div>
  );
};