import { GoogleGenAI, Type } from "@google/genai";
import { StoryResult, GeminiStoryResponse, MindMapNode, MindMapEdge, MindMapData, TranslatedContent, SUPPORTED_LANGUAGES, LanguageCode, LanguageName, QuizItem } from '../types';

export { SUPPORTED_LANGUAGES };

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const textModel = "gemini-2.5-flash";
const imageModel = "imagen-4.0-generate-001";

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        imagePrompt: {
            type: Type.STRING,
            description: "A highly descriptive, vivid prompt for an image generation model, specifying characters, action, setting, and a clear artistic style (e.g., 'Charming educational cartoon style'). It must explicitly name the characters from the story and describe the exact action they are performing. See the main prompt for a detailed example of a strong prompt."
        },
        story: {
            type: Type.STRING,
            description: "A story in Markdown format, presented as a conversation between two named characters. The characters should explain the user's text in a simple, conversational, and easy-to-digest manner. Each line of dialogue MUST start with the character's name followed by a colon (e.g., \"Professor Hoot: ...\")."
        },
        mindMap: {
            type: Type.OBJECT,
            description: "A structured object containing nodes and connections for a mind map. This is the most reliable way to ensure valid syntax.",
            properties: {
                nodes: {
                    type: Type.ARRAY,
                    description: "An array of all nodes in the mind map. Each node must have a unique ID.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING, description: "A short, unique identifier for the node (e.g., 'A', 'B', 'C1')." },
                            text: { type: Type.STRING, description: "The display text for the node." }
                        },
                        required: ["id", "text"]
                    }
                },
                connections: {
                    type: Type.ARRAY,
                    description: "An array of objects, where each object defines a directed edge between two nodes using their IDs.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            from: { type: Type.STRING, description: "The ID of the source node for the connection." },
                            to: { type: Type.STRING, description: "The ID of the target node for the connection." }
                        },
                        required: ["from", "to"]
                    }
                }
            },
            required: ["nodes", "connections"]
        },
        keyTakeaways: {
            type: Type.ARRAY,
            description: "An array of 3-5 short, concise strings. Each string is a key takeaway or summary point from the story's explanation.",
            items: {
                type: Type.STRING
            }
        },
    },
    required: ["imagePrompt", "story", "mindMap", "keyTakeaways"]
};

export const generateVisualStory = async (studentText: string): Promise<StoryResult> => {
  try {
    const prompt = `
You are an expert teacher and creative storyteller who simplifies complex educational topics for students. Your goal is to explain the following text by creating a cohesive learning package.

User's Text:
---
${studentText}
---

Your task is to generate a response in a single, valid JSON object. This object must contain four elements: a story, a mind map, a highly specific image prompt, and key takeaways.

1.  **story**: A story in Markdown format. This story must be a conversation between two named, memorable characters (e.g., a wise mentor and a curious student). They should explain the user's text in a simple, conversational, and engaging way. Each line of dialogue MUST start with the character's name followed by a colon (e.g., "Professor Hoot: ...").

2.  **mindMap**: A structured JSON object containing the data for a mind map. This object must have two keys: \`"nodes"\` and \`"connections"\`.
    *   **nodes**: An array of node objects. Each object must have a unique \`"id"\` (e.g., "A", "B1") and the \`"text"\` to display.
    *   **connections**: An array of connection objects. Each object defines a directional link and must have a \`"from"\` key and a \`"to"\` key, using the node IDs from the \`nodes\` list.
    *   **This approach separates data from syntax and is REQUIRED to prevent errors.**
    *   **GOOD EXAMPLE:**
        \`\`\`json
        {
          "nodes": [
            { "id": "A", "text": "Main Topic" },
            { "id": "B", "text": "Sub-Topic 1" },
            { "id": "C", "text": "Detail A" }
          ],
          "connections": [
            { "from": "A", "to": "B" },
            { "from": "B", "to": "C" }
          ]
        }
        \`\`\`

3.  **imagePrompt**: This is the MOST CRITICAL part. You must create a vivid, highly-detailed prompt for an advanced AI image generator that directly visualizes a scene from the story.
    *   **Character-Centric MANDATORY RULE**: The prompt MUST feature the **exact same named characters** that you created in the **story** part of this response. For example, if your story features 'Professor Hoot' and 'Squeaky', the image prompt MUST also feature 'Professor Hoot' and 'Squeaky'. This connection is non-negotiable.
    *   **Action & Interaction**: Describe the EXACT action they are performing as it relates to the educational topic. Are they pointing at something? Looking at a book? Building a model? The interaction should be clear.
    *   **Setting the Scene**: Describe the environment from the story. Are they in a cozy library, a sunny forest, a futuristic lab?
    *   **Define the Style**: The artistic style MUST be "Charming educational cartoon style". This is a strict requirement. The prompt must start with these exact words. Do not use any other style.
    *   **Example of a STRONG prompt**: "Charming educational cartoon style. Professor Hoot, a wise cartoon owl with large spectacles and a graduation cap, is pointing a wing at a glowing diagram of a plant cell on a magical, floating chalkboard. Squeaky, a curious and wide-eyed squirrel holding an acorn, looks on with fascination. They are in a sun-dappled, enchanted forest."

4.  **keyTakeaways**: An array of 3-5 short, simple strings. Each string is a key learning point that summarizes the most important information from the explanation.

Ensure the entire output is a single, valid JSON object matching the provided schema. Do not include any text, formatting, or markdown backticks outside of the main JSON object.
    `;

    const textResponse = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.5,
      }
    });
    
    const textResultJson = textResponse.text.trim();
    const parsedResult: GeminiStoryResponse = JSON.parse(textResultJson);

    const imageResponse = await ai.models.generateImages({
        model: imageModel,
        prompt: parsedResult.imagePrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '16:9',
        },
    });

    let imageUrl = '';
    const generatedImage = imageResponse.generatedImages?.[0];
    if (generatedImage?.image?.imageBytes) {
        const base64ImageBytes: string = generatedImage.image.imageBytes;
        imageUrl = `data:image/png;base64,${base64ImageBytes}`;
    }
    
    if (!imageUrl) {
        const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576" viewBox="0 0 1024 576" style="background-color:#e2e8f0;">
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="48px" fill="#64748b">
            Image Generation Failed
          </text>
          <text x="50%" y="55%" dy="1.2em" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24px" fill="#94a3b8">
            Displaying a placeholder
          </text>
        </svg>`;
        imageUrl = `data:image/svg+xml;base64,${btoa(fallbackSvg)}`;
    }

    let mindMapString = '';
    const mindMapData = parsedResult.mindMap;
    if (mindMapData && Array.isArray(mindMapData.nodes) && mindMapData.nodes.length > 0 && Array.isArray(mindMapData.connections)) {
        mindMapString = buildMindMapString(mindMapData);
    }

    return {
      story: parsedResult.story,
      mindMap: mindMapString,
      mindMapData: mindMapData,
      imageUrl: imageUrl,
      keyTakeaways: parsedResult.keyTakeaways || [],
    };
  } catch (error) {
    console.error("Error generating visual story:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate visual story. Gemini API Error: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while generating the visual story.");
  }
};

const translationSchema = {
    type: Type.OBJECT,
    properties: {
        story: { type: Type.STRING },
        keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
        mindMapNodes: { 
            type: Type.ARRAY, 
            items: { 
                type: Type.OBJECT, 
                properties: {
                    id: { type: Type.STRING },
                    text: { type: Type.STRING }
                },
                required: ["id", "text"]
            }
        }
    },
    required: ["story", "keyTakeaways", "mindMapNodes"]
};

export const translateStory = async (originalResult: StoryResult, languageCode: LanguageCode): Promise<StoryResult> => {
    const languageName = SUPPORTED_LANGUAGES[languageCode];
    const contentToTranslate = {
        story: originalResult.story,
        keyTakeaways: originalResult.keyTakeaways,
        mindMapNodes: originalResult.mindMapData.nodes,
    };

    const prompt = `
You are an expert translator. Your task is to translate the text content of the following JSON object into ${languageName}.
- Translate the 'story' field.
- Translate each string in the 'keyTakeaways' array.
- Translate the 'text' property of each object in the 'mindMapNodes' array.
- CRITICAL RULE: Do NOT translate the character names that appear at the beginning of a line in the story (e.g., "Professor Hoot:"). Preserve them exactly as they are.
- CRITICAL RULE: Do NOT translate the 'id' property in the 'mindMapNodes' array. Preserve the IDs exactly.
- Return ONLY a single, valid JSON object with the exact same structure as the input, but with the text content translated.

Input JSON:
---
${JSON.stringify(contentToTranslate, null, 2)}
---
`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: translationSchema,
                temperature: 0.2,
            }
        });

        const translatedJson = response.text.trim();
        const translatedContent: TranslatedContent = JSON.parse(translatedJson);

        const newMindMapData: MindMapData = {
            ...originalResult.mindMapData,
            nodes: translatedContent.mindMapNodes,
        };

        const newMindMapString = buildMindMapString(newMindMapData);
        
        return {
            ...originalResult,
            story: translatedContent.story,
            keyTakeaways: translatedContent.keyTakeaways,
            mindMapData: newMindMapData,
            mindMap: newMindMapString,
        };

    } catch (error) {
        console.error("Error translating story:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to translate. Gemini API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred during translation.");
    }
};


function buildMindMapString(mindMapData: MindMapData): string {
    if (!mindMapData || !Array.isArray(mindMapData.nodes) || mindMapData.nodes.length === 0 || !Array.isArray(mindMapData.connections)) {
        return '';
    }
    const { nodes, connections } = mindMapData;
    
    const nodeDefinitions = nodes.map(
        (node: MindMapNode) => `${node.id}[${JSON.stringify(node.text)}]`
    );
    
    const connectionDefinitions = connections.map(
        (edge: MindMapEdge) => `${edge.from} --> ${edge.to}`
    );

    return `graph TD\n${nodeDefinitions.join('\n')}\n${connectionDefinitions.join('\n')}`;
}

export const answerFromPdf = async (pdfText: string, question: string): Promise<string> => {
    const prompt = `
You are a helpful academic assistant. Your task is to provide a clear and concise answer to the user's question based *only* on the provided text extracted from a PDF document.
- Analyze the text thoroughly.
- If the answer is present in the text, synthesize it and present it in a well-formatted Markdown.
- If the answer cannot be found in the provided text, you MUST state that clearly, for example: "I could not find an answer to your question in the provided PDF text." Do not use outside knowledge.

---
CONTEXT FROM PDF (first 20,000 characters):
${pdfText.substring(0, 20000)}
---
USER'S QUESTION:
${question}
---

ANSWER:
`;
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error answering from PDF:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to get answer. Gemini API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while answering the question.");
    }
};

const quizSchema = {
    type: Type.ARRAY,
    description: "An array of 3 quiz questions.",
    items: {
        type: Type.OBJECT,
        properties: {
            question: { type: Type.STRING, description: "The question text." },
            options: { type: Type.ARRAY, description: "An array of 4 string options.", items: { type: Type.STRING } },
            correctAnswerIndex: { type: Type.NUMBER, description: "The 0-based index of the correct answer in the options array." }
        },
        required: ["question", "options", "correctAnswerIndex"]
    }
};

export const generateQuiz = async (context: string): Promise<QuizItem[]> => {
    const prompt = `
You are an expert educator. Based on the provided learning material, create a multiple-choice quiz with exactly 3 questions to test a student's understanding.
- For each question, provide 4 distinct options.
- The questions should be relevant to the key concepts in the text.
- Ensure the options are plausible but only one is correct.
- Return the quiz as a single, valid JSON array matching the provided schema. Do not include any other text or formatting.

CONTEXT:
---
${context}
---
`;

    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema
            }
        });
        const quizJson = response.text.trim();
        const quiz: QuizItem[] = JSON.parse(quizJson);
        // Basic validation
        if (Array.isArray(quiz) && quiz.length > 0 && quiz.every(q => q.question && Array.isArray(q.options) && typeof q.correctAnswerIndex === 'number')) {
            return quiz;
        }
        throw new Error("Generated quiz has an invalid format.");
    } catch (error) {
        console.error("Error generating quiz:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate quiz. Gemini API Error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while generating the quiz.");
    }
};