// The final result object used by the React components
export interface StoryResult {
  story: string;
  mindMap: string;
  mindMapData: MindMapData;
  imageUrl: string;
  keyTakeaways: string[];
}

// Represents a single node in the mind map data structure
export interface MindMapNode {
  id: string;
  text: string;
}

// Represents a single connection between nodes by their IDs
export interface MindMapEdge {
  from: string;
  to: string;
}

// The complete, structured data for the mind map
export interface MindMapData {
  nodes: MindMapNode[];
  connections: MindMapEdge[];
}

// The expected JSON structure from the first Gemini API call
export interface GeminiStoryResponse {
    imagePrompt: string;
    story: string;
    mindMap: MindMapData;
    keyTakeaways: string[];
}

// The structure for a single quiz question
export interface QuizItem {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}


// Supported languages for translation
export const SUPPORTED_LANGUAGES = {
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'ja': 'Japanese',
  'zh': 'Mandarin Chinese',
  'hi': 'Hindi',
  'ta': 'Tamil',
  'te': 'Telugu',
  'ml': 'Malayalam',
  'kn': 'Kannada',
  'bn': 'Bengali',
  'mr': 'Marathi',
  'gu': 'Gujarati',
  'pa': 'Punjabi',
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;
export type LanguageName = typeof SUPPORTED_LANGUAGES[LanguageCode];

// The expected JSON structure from the translation API call
export interface TranslatedContent {
  story: string;
  keyTakeaways: string[];
  mindMapNodes: { id: string; text: string }[];
}