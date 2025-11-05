import React from 'react';
import ReactMarkdown from 'react-markdown';
import { LoadingSpinner } from './LoadingSpinner';

interface PdfAnswerProps {
    question: string;
    answer: string | null;
    fileName: string;
    isLoading: boolean;
    error: string | null;
}

export const PdfAnswer: React.FC<PdfAnswerProps> = ({ question, answer, fileName, isLoading, error }) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <LoadingSpinner />
                <p className="mt-4 text-slate-500 dark:text-slate-400 animate-pulse">
                    Reading your PDF and finding the answer...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-red-500">
                <p className="font-semibold">Oops! Something went wrong.</p>
                <p className="text-sm">{error}</p>
            </div>
        );
    }
    
    if (!answer) {
        return null; // Parent component handles the empty state
    }
    
    return (
        <div className="space-y-6 animate-fade-in">
            <section>
                <p className="text-sm text-slate-500 dark:text-slate-400">From: <span className="font-medium">{fileName}</span></p>
                <h3 className="text-xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{question}</h3>
            </section>
            
            <section>
                <div className="prose prose-slate dark:prose-invert max-w-none p-4 bg-slate-100 dark:bg-slate-800/60 rounded-lg shadow-inner">
                    <ReactMarkdown>{answer}</ReactMarkdown>
                </div>
            </section>
        </div>
    );
};
