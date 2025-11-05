import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { StoryOutput } from './components/StoryOutput';
import { generateVisualStory, translateStory, answerFromPdf, generateQuiz } from './services/geminiService';
import { StoryResult, LanguageCode, QuizItem } from './types';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { PdfAnswer } from './components/PdfAnswer';
import { LoadingSpinner } from './components/LoadingSpinner';


type AppMode = 'story' | 'pdf';
type OutputMode = 'empty' | 'story' | 'pdf';

const App: React.FC = () => {
  // General state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AppMode>('story');
  const [outputMode, setOutputMode] = useState<OutputMode>('empty');

  // Story mode state
  const [inputText, setInputText] = useState<string>('');
  const [storyResult, setStoryResult] = useState<StoryResult | null>(null);
  
  // PDF mode state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string | null>(null);
  const [isParsingPdf, setIsParsingPdf] = useState<boolean>(false);
  const [pdfQuestion, setPdfQuestion] = useState<string>('');
  const [pdfAnswer, setPdfAnswer] = useState<string | null>(null);

  // Translation state
  const [translatedResult, setTranslatedResult] = useState<StoryResult | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  
  // Quiz state
  const [quiz, setQuiz] = useState<QuizItem[] | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);
  const [quizError, setQuizError] = useState<string | null>(null);


  const resetOutputs = () => {
    setStoryResult(null);
    setTranslatedResult(null);
    setTranslationError(null);
    setPdfAnswer(null);
    setQuiz(null);
    setQuizError(null);
    setError(null);
    setOutputMode('empty');
  };

  const handleGenerateStory = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    setIsLoading(true);
    resetOutputs();
    
    try {
      const result = await generateVisualStory(inputText);
      setStoryResult(result);
      setOutputMode('story');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfFile(file);
    setIsParsingPdf(true);
    setPdfText(null);
    setError(null);

    try {
      // @ts-ignore
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib) throw new Error("PDF library not loaded.");
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // @ts-ignore
        fullText += textContent.items.map((item) => item.str).join(' ') + '\n';
      }
      setPdfText(fullText);
    } catch (err) {
      setError(err instanceof Error ? `Failed to parse PDF: ${err.message}` : 'Failed to parse PDF.');
      setPdfFile(null);
    } finally {
      setIsParsingPdf(false);
    }
  };
  
  const handleAskPdf = async () => {
      if (!pdfText || !pdfQuestion.trim() || isLoading) return;
      
      setIsLoading(true);
      resetOutputs();

      try {
          const result = await answerFromPdf(pdfText, pdfQuestion);
          setPdfAnswer(result);
          setOutputMode('pdf');
      } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred while getting the answer.');
      } finally {
          setIsLoading(false);
      }
  };


  const handleTranslate = useCallback(async (languageCode: LanguageCode) => {
    if (!storyResult || isTranslating) return;

    setIsTranslating(true);
    setTranslationError(null);
    const resultToTranslate = translatedResult || storyResult;

    try {
      const result = await translateStory(resultToTranslate, languageCode);
      setTranslatedResult(result);
    } catch (err) {
      setTranslationError(err instanceof Error ? err.message : 'An unknown error occurred during translation.');
    } finally {
      setIsTranslating(false);
    }
  }, [storyResult, isTranslating, translatedResult]);

  const handleClearTranslation = useCallback(() => {
    setTranslatedResult(null);
    setTranslationError(null);
  }, []);
  
  const handleGenerateQuiz = useCallback(async () => {
      const currentResult = translatedResult || storyResult;
      if (!currentResult || isGeneratingQuiz) return;
      
      setIsGeneratingQuiz(true);
      setQuiz(null);
      setQuizError(null);
      
      const context = `Story: ${currentResult.story}\n\nKey Takeaways: ${currentResult.keyTakeaways.join(', ')}`;
      
      try {
          const quizResult = await generateQuiz(context);
          setQuiz(quizResult);
      } catch (err) {
          setQuizError(err instanceof Error ? err.message : 'An unknown error occurred while generating the quiz.');
      } finally {
          setIsGeneratingQuiz(false);
      }
  }, [storyResult, translatedResult, isGeneratingQuiz]);


  const renderInputPanel = () => {
    if (mode === 'story') {
      return (
        <>
          <p className="text-slate-500 dark:text-slate-400">
            Paste any educational text, question, or complex concept below. We'll transform it into an easy-to-understand visual story.
          </p>
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="For example: How does blockchain work?"
              className="w-full h-64 p-4 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition duration-200 resize-none"
              disabled={isLoading}
            />
            <button
              onClick={() => setInputText("Explain the process of photosynthesis.")}
              className="absolute bottom-3 right-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
              disabled={isLoading}
            >
              Use an example
            </button>
          </div>
          <button
            onClick={handleGenerateStory}
            disabled={isLoading || !inputText.trim()}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg disabled:shadow-none"
          >
            {isLoading ? 'Generating...' : 'Generate Visual Story'}
            <SparklesIcon className="w-5 h-5" />
          </button>
        </>
      );
    }

    if (mode === 'pdf') {
      return (
        <>
          <p className="text-slate-500 dark:text-slate-400">
            Upload a PDF document and ask a question about its content.
          </p>
          <div className="flex flex-col space-y-4">
            <label className="block">
                <span className="sr-only">Choose profile photo</span>
                <input type="file" onChange={handleFileChange} accept=".pdf" disabled={isLoading || isParsingPdf} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"/>
            </label>
            {isParsingPdf && <div className="flex items-center text-sm text-slate-500"><LoadingSpinner/> <span className="ml-2">Parsing PDF...</span></div>}
            {pdfFile && !isParsingPdf && <p className="text-sm text-green-600 dark:text-green-400">Loaded: {pdfFile.name}</p>}

            <textarea
              value={pdfQuestion}
              onChange={(e) => setPdfQuestion(e.target.value)}
              placeholder="Ask a question about the PDF..."
              className="w-full h-24 p-4 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition duration-200 resize-none"
              disabled={!pdfText || isLoading}
            />
          </div>
          <button
            onClick={handleAskPdf}
            disabled={isLoading || !pdfText || !pdfQuestion.trim()}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg disabled:shadow-none"
          >
            {isLoading ? 'Thinking...' : 'Get Answer'}
          </button>
        </>
      );
    }
  };

  const renderOutputPanel = () => {
      if (outputMode === 'story') {
          return <StoryOutput
            result={translatedResult || storyResult}
            isLoading={isLoading}
            error={error}
            isTranslated={!!translatedResult}
            isTranslating={isTranslating}
            translationError={translationError}
            onTranslate={handleTranslate}
            onClearTranslation={handleClearTranslation}
            onGenerateQuiz={handleGenerateQuiz}
            quiz={quiz}
            isGeneratingQuiz={isGeneratingQuiz}
            quizError={quizError}
          />
      }
      if (outputMode === 'pdf') {
          return <PdfAnswer 
            question={pdfQuestion} 
            answer={pdfAnswer} 
            fileName={pdfFile?.name || 'your PDF'} 
            isLoading={isLoading} 
            error={error}
            />
      }
      // Empty or initial state
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="text-slate-400 dark:text-slate-500">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" ></path>
          </svg>
          <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300">
            Your learning hub is ready
          </h3>
          <p className="mt-1 text-sm">
            Choose a mode above and provide your input to begin.
          </p>
        </div>
      </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setMode('story')} className={`${mode === 'story' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}>
                        Study Topic
                    </button>
                    <button onClick={() => setMode('pdf')} className={`${mode === 'pdf' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}>
                        Ask a PDF
                    </button>
                </nav>
            </div>
            {renderInputPanel()}
          </div>
          <div className="flex flex-col space-y-4">
            <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">Your Learning Hub</h2>
            <div className="bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 shadow-sm min-h-[400px] p-6">
              {renderOutputPanel()}
            </div>
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-slate-500 dark:text-slate-400">
        <p>Powered by Gemini. Designed for curious minds.</p>
      </footer>
    </div>
  );
};

export default App;