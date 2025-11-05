
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <svg
              className="w-8 h-8 text-indigo-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v11.494m-9-5.747h18M5.468 12.001a8.967 8.967 0 0113.064 0M1.343 8.35a15.966 15.966 0 0121.314 0"
              />
            </svg>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Visual Story Learner
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};
