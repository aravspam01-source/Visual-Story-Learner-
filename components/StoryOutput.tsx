import React, { useEffect, useRef, useId, useState, useMemo } from 'react';
import { StoryResult, MindMapData, SUPPORTED_LANGUAGES, LanguageCode, QuizItem } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import ReactMarkdown from 'react-markdown';
import { SpeakerIcon } from './icons/SpeakerIcon';
import { Quiz } from './Quiz';


declare global {
  interface Window {
    mermaid?: {
      render: (id: string, txt: string) => Promise<{ svg: string }>;
    };
    svgPanZoom?: (element: SVGElement | HTMLElement, options?: SvgPanZoom.Options) => SvgPanZoom.Instance;
    pdfjsLib?: any;
  }
}

// FIX: Add SvgPanZoom namespace to declare missing types for svg-pan-zoom library.
declare namespace SvgPanZoom {
  interface Options {
    panEnabled?: boolean;
    zoomEnabled?: boolean;
    controlIconsEnabled?: boolean;
    fit?: boolean;
    center?: boolean;
    minZoom?: number;
    maxZoom?: number;
  }

  interface Instance {
    resize(): void;
    center(): void;
    destroy(): void;
  }
}

const CheckIcon: React.FC = () => (
  <svg className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

interface MindMapProps {
  mindMapDefinition: string;
  mindMapData: MindMapData;
}

const MindMap: React.FC<MindMapProps> = ({ mindMapDefinition, mindMapData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [panZoomInstance, setPanZoomInstance] = useState<SvgPanZoom.Instance | null>(null);
  const mermaidId = useId();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !mindMapDefinition || !window.mermaid?.render) {
      return;
    }
    
    let isMounted = true;
    const currentContainer = containerRef.current;
    
    let clickHandlerCleanup: (() => void) | undefined;
    
    setError(null);

    const renderMap = async () => {
      try {
        currentContainer.innerHTML = `<div class="flex justify-center items-center h-64"><svg class="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span class="ml-2 text-slate-500">Rendering map...</span></div>`;
        
        const { svg } = await window.mermaid.render(mermaidId, mindMapDefinition);
        if (!isMounted) return;
        
        currentContainer.innerHTML = svg;
        const svgEl = currentContainer.querySelector('svg');

        if (svgEl) {
          svgEl.classList.add('w-full', 'h-auto', 'cursor-move');
          currentContainer.classList.add('mermaid-container');

          if (window.svgPanZoom) {
            const newPanZoomInstance = window.svgPanZoom(svgEl, {
              panEnabled: true,
              zoomEnabled: true,
              controlIconsEnabled: true,
              fit: true,
              center: true,
              minZoom: 0.5,
              maxZoom: 5,
            });
            setPanZoomInstance(newPanZoomInstance);
            newPanZoomInstance.resize();
            newPanZoomInstance.center();
          }

          const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const nodeElement = target.closest('.node');
            
            currentContainer.querySelectorAll('.node, .edgePath').forEach(el => {
              el.classList.remove('highlight', 'highlight-from', 'highlight-to');
            });

            if (nodeElement) {
              const nodeId = nodeElement.id.replace(`flowchart-${mermaidId}-`, '');
              
              nodeElement.classList.add('highlight');

              mindMapData.connections.forEach(conn => {
                if (conn.from === nodeId) {
                  const edge = currentContainer.querySelector(`[class*="--\x3e${conn.to}"]`);
                  if (edge) edge.classList.add('highlight-from');
                }
                if (conn.to === nodeId) {
                  const edge = currentContainer.querySelector(`[class*="${conn.from}--\x3e"]`);
                  if (edge) edge.classList.add('highlight-to');
                }
              });
            }
          };

          currentContainer.addEventListener('click', handleClick);
          clickHandlerCleanup = () => {
            currentContainer.removeEventListener('click', handleClick);
          };
        }
      } catch (e) {
        if (!isMounted) return;
        console.error("Mermaid rendering error:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(errorMessage);
      }
    };

    renderMap();

    return () => {
      isMounted = false;
      if (panZoomInstance) {
        panZoomInstance.destroy();
      }
      if (clickHandlerCleanup) {
        clickHandlerCleanup();
      }
    };

  }, [mindMapDefinition, mindMapData, mermaidId]);
  
  if (error) {
    return (
      <div className="text-left w-full p-4 border border-red-500/30 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="font-bold text-red-700 dark:text-red-300">Concept Map Rendering Failed</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-3">
          The AI may have generated invalid syntax. Below is the raw code for debugging.
        </p>
        <pre className="bg-slate-200 dark:bg-slate-700/50 p-3 rounded-md text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-mono">{mindMapDefinition.trim()}</pre>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2"><strong>Details:</strong> {error}</p>
      </div>
    );
  }

  return <div ref={containerRef} className="flex justify-center my-4 overflow-hidden"/>;
};


interface StoryConversationProps {
  story: string;
}

const StoryConversation: React.FC<StoryConversationProps> = ({ story }) => {
  const dialogue = story.split('\n').filter(line => line.trim() !== '');

  return (
    <div className="space-y-4">
      {dialogue.map((line, index) => {
        const match = line.match(/^(.*?):\s*(.*)$/);
        if (match) {
          const [, speaker, text] = match;
          return (
            <div key={index} className="flex flex-col">
              <p className="font-bold text-indigo-700 dark:text-indigo-400">{speaker}:</p>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                 <ReactMarkdown>{text}</ReactMarkdown>
              </div>
            </div>
          );
        }
        return (
          <div key={index} className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown>{line}</ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
};

interface TranslationControlsProps {
  isTranslating: boolean;
  isTranslated: boolean;
  translationError: string | null;
  onTranslate: (languageCode: LanguageCode) => void;
  onClearTranslation: () => void;
}

const TranslationControls: React.FC<TranslationControlsProps> = ({
  isTranslating,
  isTranslated,
  translationError,
  onTranslate,
  onClearTranslation
}) => {
    const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('es');

    const handleTranslateClick = () => {
        onTranslate(selectedLanguage);
    };
    
    return (
        <section className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-lg shadow-inner">
             <h3 className="text-lg font-bold mb-3 text-slate-600 dark:text-slate-300">Translate Story</h3>
             <div className="flex flex-col sm:flex-row items-center gap-3">
                 <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as LanguageCode)}
                    disabled={isTranslating}
                    className="w-full sm:w-auto flex-grow p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                 >
                    {(Object.keys(SUPPORTED_LANGUAGES) as LanguageCode[]).map(code => (
                        <option key={code} value={code}>{SUPPORTED_LANGUAGES[code]}</option>
                    ))}
                 </select>
                {isTranslated ? (
                    <button
                        onClick={onClearTranslation}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-500 text-white font-semibold rounded-md hover:bg-slate-600 transition"
                    >
                        Show Original
                    </button>
                ) : (
                    <button
                        onClick={handleTranslateClick}
                        disabled={isTranslating}
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 transition"
                    >
                        {isTranslating ? 'Translating...' : 'Translate'}
                    </button>
                )}
             </div>
             {translationError && <p className="text-sm text-red-500 mt-2">{translationError}</p>}
        </section>
    );
};

const SpeechControl: React.FC<{ textToSpeak: string | string[] }> = ({ textToSpeak }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const text = useMemo(() => Array.isArray(textToSpeak) ? textToSpeak.join('. ') : textToSpeak, [textToSpeak]);
  
  const utterance = useMemo(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    return new SpeechSynthesisUtterance(text);
  }, [text]);

  useEffect(() => {
    if (!utterance) return;
    const onEnd = () => setIsSpeaking(false);
    utterance.addEventListener('end', onEnd);
    
    return () => {
      window.speechSynthesis.cancel();
      utterance.removeEventListener('end', onEnd);
    };
  }, [utterance]);

  const handleToggleSpeech = () => {
    if (!utterance) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  if (!utterance) return null;

  return (
    <button onClick={handleToggleSpeech} title={isSpeaking ? "Stop reading" : "Read aloud"} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
      <SpeakerIcon isSpeaking={isSpeaking} />
    </button>
  );
};


interface StoryOutputProps {
  result: StoryResult | null;
  isLoading: boolean;
  error: string | null;
  isTranslating: boolean;
  isTranslated: boolean;
  translationError: string | null;
  onTranslate: (languageCode: LanguageCode) => void;
  onClearTranslation: () => void;
  onGenerateQuiz: () => void;
  quiz: QuizItem[] | null;
  isGeneratingQuiz: boolean;
  quizError: string | null;
}

export const StoryOutput: React.FC<StoryOutputProps> = ({ 
  result, 
  isLoading, 
  error,
  isTranslating,
  isTranslated,
  translationError,
  onTranslate,
  onClearTranslation,
  onGenerateQuiz,
  quiz,
  isGeneratingQuiz,
  quizError
 }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <LoadingSpinner />
        <p className="mt-4 text-slate-500 dark:text-slate-400 animate-pulse">
          Crafting your visual story...
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

  if (!result) {
    return null; // The parent component now handles the initial empty state
  }

  return (
    <div className="space-y-8 animate-fade-in">

      <TranslationControls
        isTranslating={isTranslating}
        isTranslated={isTranslated}
        translationError={translationError}
        onTranslate={onTranslate}
        onClearTranslation={onClearTranslation}
      />
      
      <section>
        <h3 className="text-xl font-bold mb-4 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-200 dark:border-indigo-800 pb-2">Visual Aid</h3>
        <img
          src={result.imageUrl}
          alt="Visually generated story illustration"
          className="w-full h-auto rounded-lg shadow-lg object-cover border-4 border-slate-200 dark:border-slate-700"
        />
      </section>

      {result.keyTakeaways && result.keyTakeaways.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 border-b-2 border-indigo-200 dark:border-indigo-800 pb-2">
            <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Key Takeaways</h3>
                <SpeechControl textToSpeak={result.keyTakeaways} />
            </div>
            {isTranslated && (
                <span className="text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 px-2 py-1 rounded-full">Translated</span>
            )}
          </div>
          <ul className="space-y-3">
            {result.keyTakeaways.map((takeaway, index) => (
              <li key={index} className="flex items-start space-x-3">
                <CheckIcon />
                <span className="text-slate-700 dark:text-slate-300">{takeaway}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4 border-b-2 border-indigo-200 dark:border-indigo-800 pb-2">
            <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Story Time</h3>
                <SpeechControl textToSpeak={result.story} />
            </div>
            {isTranslated && (
                <span className="text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 px-2 py-1 rounded-full">Translated</span>
            )}
        </div>
        <div className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-lg shadow-inner">
           <StoryConversation story={result.story} />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 border-b-2 border-indigo-200 dark:border-indigo-800 pb-2">
            <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Concept Map</h3>
            {isTranslated && (
                <span className="text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 px-2 py-1 rounded-full">Translated</span>
            )}
        </div>
        <div className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-lg shadow-inner">
          {result.mindMapData && (
             <MindMap mindMapDefinition={result.mindMap} mindMapData={result.mindMapData} />
          )}
        </div>
      </section>
      
      <section>
        <h3 className="text-xl font-bold mb-4 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-200 dark:border-indigo-800 pb-2">Reinforce Your Learning</h3>
        <div className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-lg shadow-inner">
          {quiz ? (
              <Quiz items={quiz} key={result.story} />
          ) : (
            <div className="text-center">
              <p className="mb-4 text-slate-600 dark:text-slate-300">Ready to test your knowledge on this topic?</p>
              <button onClick={onGenerateQuiz} disabled={isGeneratingQuiz} className="px-5 py-2.5 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 disabled:bg-indigo-300 transition-colors">
                {isGeneratingQuiz ? 'Building Quiz...' : 'Generate Quiz'}
              </button>
            </div>
          )}
          {isGeneratingQuiz && <div className="flex justify-center mt-4"><LoadingSpinner /></div>}
          {quizError && <p className="text-sm text-red-500 mt-2 text-center">{quizError}</p>}
        </div>
      </section>
    </div>
  );
};