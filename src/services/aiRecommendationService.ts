import type { AIEquipmentInput, AIEquipmentOutput } from '../types/aiEquipment';
import { SYSTEM_PROMPT_EQUIPMENT_ENGINE, sanitizeAndValidateAIResult } from './equipmentEvaluationEngine';
import { buildEquipmentEvaluationUserPrompt } from '../constants/aiPrompts';

/**
 * AI Equipment Allocation Service (Strict Pure AI Generation)
 * Calls Google Gemini API to evaluate cargo specs & allocate optimal container equipment.
 * Uses gemini-flash-lite-latest / gemini-pro-latest with automatic model fallback to prevent 404 errors.
 */
export const requestAIEquipmentRecommendation = async (
  input: AIEquipmentInput
): Promise<AIEquipmentOutput | null> => {
  // 1. Query local API proxy endpoint (/api/gemini-recommend) ONLY in local Vite Dev Server
  const isDev = Boolean((import.meta as any).env?.DEV);
  if (isDev) {
    try {
      const proxyRes = await fetch('/api/gemini-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data && data.equipment_recommendation && data.mode) {
          return sanitizeAndValidateAIResult(data, input);
        }
      }
    } catch {
      // Proxy unavailable
    }
  }

  // 2. Direct Gemini API call if key configured
  const rawKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || '';
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
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT_EQUIPMENT_ENGINE }] },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: buildEquipmentEvaluationUserPrompt(input) }],
                },
              ],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = (await geminiRes.json()) as any;
          const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResponse) {
            const parsed = JSON.parse(textResponse);
            if (parsed && parsed.equipment_recommendation && parsed.mode) {
              return sanitizeAndValidateAIResult({ ...parsed, source: `gemini_api (${modelName})` }, input);
            }
          }
        }
      } catch (err) {
        console.warn(`Gemini API call exception for model ${modelName}:`, err);
      }
    }
  }

  // Client-side intelligent fallback for static production builds
  return sanitizeAndValidateAIResult({ source: 'client_intelligence_engine' }, input);
};
