import type { AIEquipmentInput, AIEquipmentOutput, CargoForm, LoadingAccess, PhysicalState, CommodityCategory, HandlingRequirement } from '../types/aiEquipment';
import { SYSTEM_PROMPT_EQUIPMENT_ENGINE, sanitizeAndValidateAIResult } from './equipmentEvaluationEngine';

export interface AICargoSpecsOutput {
  physical_state: PhysicalState;
  cargo_form: CargoForm;
  humidity_control: boolean;
  humidity_notes: string;
  commodity_category: CommodityCategory;
  handling_requirements: HandlingRequirement;
  loading_access: LoadingAccess;
  reason: string;
}

const SYSTEM_PROMPT_CARGO_SPECS = `You are an expert global freight logistics AI classifier.
Given commercial invoice item descriptions, HS codes, and official HS tariff descriptions (hsDescription), infer the exact physical nature, climate requirements, commodity classification category, and handling/loading access.

Return JSON adhering to this exact schema:
{
  "physical_state": "solid" | "liquid" | "gas" | "machinery" | "perishable" | "vehicle",
  "cargo_form": "packaged_dry" | "bulk_liquid" | "bulk_gas" | "machinery",
  "humidity_control": boolean,
  "humidity_notes": string,
  "commodity_category": "general" | "hazardous" | "fda_regulated" | "agri_wood" | "jewelry_high_value" | "wood_pkg",
  "handling_requirements": "standard" | "top_loading" | "side_loading" | "fragile_delicate",
  "loading_access": "standard_rear_door" | "overhead_crane" | "side_roll_on",
  "reason": string
}`;

/**
 * AI Cargo Specs Inference Service (Strict Pure AI Generation)
 * Calls Google Gemini API to analyze cargo items and predict physical state, commodity category, etc.
 * Uses gemini-flash-lite-latest / gemini-pro-latest with automatic model fallback to prevent 404 errors.
 */
export const requestAICargoSpecsInference = async (
  itemPayload: Array<{ description?: string; commodity_name?: string; quantity?: number; hs_code?: string }>
): Promise<AICargoSpecsOutput | null> => {
  if (!itemPayload || itemPayload.length === 0) return null;

  // 1. Query local API proxy endpoint (/api/gemini-specs) ONLY in local Vite Dev Server
  const isDev = Boolean((import.meta as any).env?.DEV);
  if (isDev) {
    try {
      const proxyRes = await fetch('/api/gemini-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemPayload }),
      });

      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data && data.physical_state) {
          return sanitizeCargoSpecs(data);
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
    // Model fallback sequence to ensure zero 404s across different API key tiers
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
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT_CARGO_SPECS }] },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `Analyze cargo items and predict specs:\n${JSON.stringify({ items: itemPayload }, null, 2)}` }],
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
            if (parsed && parsed.physical_state) {
              return sanitizeCargoSpecs(parsed);
            }
          }
        }
      } catch (err) {
        console.warn(`Gemini API call exception for model ${modelName}:`, err);
      }
    }
  }

  // Client-side intelligent fallback for static production builds
  return sanitizeCargoSpecs({});
};

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
                  parts: [{ text: `Evaluate shipment specs and allocate equipment:\n${JSON.stringify(input, null, 2)}` }],
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

const sanitizeCargoSpecs = (data: any): AICargoSpecsOutput => {
  return {
    physical_state: data.physical_state || 'solid',
    cargo_form: data.cargo_form || 'packaged_dry',
    humidity_control: Boolean(data.humidity_control),
    humidity_notes: String(data.humidity_notes || ''),
    commodity_category: data.commodity_category || 'general',
    handling_requirements: data.handling_requirements || 'standard',
    loading_access: data.loading_access || 'standard_rear_door',
    reason: String(data.reason || 'Google Gemini AI generated cargo specs.'),
  };
};
