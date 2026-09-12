import type { AIEquipmentInput, AIEquipmentOutput, CargoForm, LoadingAccess } from '../types/aiEquipment';
import type { PhysicalState, CommercialItem, CommodityCategory, HandlingRequirement } from '../types/rfq';
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
 * Calls Google Gemini API to infer physical nature & handling specs.
 * Returns null if AI response is unavailable (No heuristic fallbacks).
 */
export const requestAICargoSpecsInference = async (
  items: CommercialItem[]
): Promise<AICargoSpecsOutput | null> => {
  const itemPayload = items.map((i) => ({
    description: i.description,
    hsCode: i.hsCode || 'Not provided',
    hsDescription: i.hsDescription || 'Not provided',
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    netWeightKg: i.netWeight,
  }));

  // 1. Query local API proxy endpoint (/api/gemini-cargo-specs)
  try {
    const proxyRes = await fetch('/api/gemini-cargo-specs', {
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

  // 2. Direct Gemini API call if key configured
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
  const modelName = (import.meta as any).env?.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

  if (apiKey && String(apiKey).trim().length > 0) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${String(apiKey).trim()}`,
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
      console.warn('Gemini API call exception for cargo specs:', err);
    }
  }

  // Pure AI Policy: Return null if AI is unreachable (No fallback heuristic values)
  return null;
};

/**
 * AI Equipment Allocation Service (Strict Pure AI Generation)
 * Calls Google Gemini API to evaluate cargo specs & allocate optimal container equipment.
 * Returns null if AI response is unavailable (No heuristic fallbacks).
 */
export const requestAIEquipmentRecommendation = async (
  input: AIEquipmentInput
): Promise<AIEquipmentOutput | null> => {
  // 1. Query local API proxy endpoint (/api/gemini-recommend)
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

  // 2. Direct Gemini API call if key configured
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
  const modelName = (import.meta as any).env?.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

  if (apiKey && String(apiKey).trim().length > 0) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${String(apiKey).trim()}`,
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
      console.warn('Gemini API call exception for equipment recommendation:', err);
    }
  }

  // Pure AI Policy: Return null if AI is unreachable (No fallback heuristic values)
  return null;
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
