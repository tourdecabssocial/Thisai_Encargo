import type { PhysicalState, CargoForm } from '../types/aiEquipment';
import { SYSTEM_PROMPT_HS_CLASSIFIER, buildHSClassifierUserPrompt } from '../constants/aiPrompts';

export interface HSCodeSuggestion {
  hsCode: string;
  category: string;
  description: string;
  keywords: string[];
}

export interface InferredCargoSpecs {
  physical_state: PhysicalState;
  cargo_form: CargoForm;
  humidity_control: boolean;
  humidity_notes: string;
  reason: string;
}

export interface GeminiHSCandidate {
  code: string;
  code_digits?: string;
  description: string;
  wco_6digit?: string;
  country_name?: string;
  confidence?: number;
  category?: string;
  duty_notes?: string;
}

// Backward compatibility alias
export type ReefHSCandidate = GeminiHSCandidate;

/**
 * Classifies product description using Google Gemini AI for Country-Specific HS Tariff Codes
 * supporting both Origin and Destination countries.
 * Pure AI Engine — No local fallbacks or hardcoded dictionaries.
 */
export const classifyHSCodeWithGemini = async (
  description: string,
  originCountry: string = 'India',
  destinationCountry: string = 'United States',
  customApiKey?: string
): Promise<GeminiHSCandidate[]> => {
  if (!description || description.trim().length < 2) return [];

  const rawKey = customApiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || '';
  const apiKey = String(rawKey).trim();

  if (apiKey.length > 0) {
    const configuredModel = (import.meta as any).env?.VITE_GEMINI_MODEL;
    const modelCandidates = configuredModel
      ? [configuredModel, 'gemini-flash-lite-latest', 'gemini-pro-latest']
      : ['gemini-flash-lite-latest', 'gemini-pro-latest', 'gemini-flash-latest'];

    for (const modelName of modelCandidates) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT_HS_CLASSIFIER }] },
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: buildHSClassifierUserPrompt(description, originCountry, destinationCountry),
                    },
                  ],
                },
              ],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResponse) {
            const parsed = JSON.parse(textResponse);
            if (parsed && Array.isArray(parsed.candidates) && parsed.candidates.length > 0) {
              return parsed.candidates;
            }
          }
        }
      } catch (err) {
        console.warn(`Gemini HS classifier exception for model ${modelName}:`, err);
      }
    }
  }

  // Pure AI classification - Return empty array if API fails or key missing
  return [];
};

// Backward-compatible export alias
export const classifyHSCodeReefAPI = classifyHSCodeWithGemini;
