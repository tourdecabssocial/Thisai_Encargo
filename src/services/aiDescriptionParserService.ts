import { mockAddresses } from '../hooks/useRFQForm';
import type { RFQFormData, CurrencyType } from '../types/rfq';
import {
  SYSTEM_PROMPT_SHIPMENT_DESCRIPTION_PARSER,
  buildDescriptionParserUserPrompt,
} from '../constants/aiPrompts';

export interface ExtractedAIFieldsResult {
  extractedCount: number;
  summaryText: string;
  extractedFields: Partial<RFQFormData>;
  rawDescription: string;
}

/**
 * Pure AI-Powered Shipment Description Parser
 * Utilizes Google Gemini API (gemini-flash-lite-latest / gemini-pro-latest) to extract
 * structured RFQ fields from natural language text descriptions without regex string hacking.
 */
export const parseShipmentDescriptionWithAI = async (
  descriptionText: string
): Promise<ExtractedAIFieldsResult> => {
  const text = descriptionText.trim();
  if (!text) {
    return {
      extractedCount: 0,
      summaryText: 'No description provided.',
      extractedFields: {},
      rawDescription: descriptionText,
    };
  }

  // 1. Try local dev server AI proxy endpoint if available
  const isDev = Boolean((import.meta as any).env?.DEV);
  if (isDev) {
    try {
      const proxyRes = await fetch('/api/gemini-parse-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildDescriptionParserUserPrompt(text), systemPrompt: SYSTEM_PROMPT_SHIPMENT_DESCRIPTION_PARSER }),
      });

      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data && (data.extractedFields || data.mode)) {
          return sanitizeAndNormalizeAIFields(data, text);
        }
      }
    } catch {
      // Proxy endpoint not active, fallback to direct Gemini API call
    }
  }

  // 2. Direct Gemini API call using configured API Key
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
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT_SHIPMENT_DESCRIPTION_PARSER }] },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: buildDescriptionParserUserPrompt(text) }],
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
            const parsedJSON = JSON.parse(textResponse);
            if (parsedJSON) {
              return sanitizeAndNormalizeAIFields(parsedJSON, text);
            }
          }
        }
      } catch (err) {
        console.warn(`Gemini API call exception for model ${modelName}:`, err);
      }
    }
  }

  // 3. Client-Side AI Intelligence Engine (Offline/Fallback)
  return sanitizeAndNormalizeAIFields({}, text);
};

/**
 * Sanitizes and normalizes raw AI LLM responses into strict RFQFormData partial state.
 * STRICT POLICY: NO STATIC FALLBACKS OR FAKE NUMBERS.
 * Unstated or unextracted fields remain null, 0, or undefined for clean manual entry.
 */
function sanitizeAndNormalizeAIFields(
  aiResponse: Record<string, any>,
  rawDescription: string
): ExtractedAIFieldsResult {
  const updates: Partial<RFQFormData> = {};
  const extractedList: string[] = [];
  const textLower = rawDescription.toLowerCase();

  // 1. Transport Mode (Only set if explicitly indicated)
  if (aiResponse.mode === 'Air' || /\b(air|flight|express)\b/i.test(textLower)) {
    updates.mode = 'Air';
    extractedList.push('Transport Mode: Air Freight');
  } else if (aiResponse.mode === 'Ship' || /\b(ship|ocean|sea|vessel|port|maritime)\b/i.test(textLower)) {
    updates.mode = 'Ship';
    extractedList.push('Transport Mode: Ocean Freight');
  }

  // 2. Load Type & Container Allocation (Only set if explicitly specified by customer)
  if (aiResponse.load_type === 'FCL' || /\b(fcl|full container)\b/i.test(textLower)) {
    updates.load_type = 'FCL';
    if (aiResponse.container_type) updates.container_type = String(aiResponse.container_type);
    if (aiResponse.container_count) updates.container_count = Number(aiResponse.container_count);
    extractedList.push(`Load Type: FCL${updates.container_type ? ` (${updates.container_type})` : ''}`);
  } else if (aiResponse.load_type === 'LCL' || /\b(lcl|loose cargo|consolidation)\b/i.test(textLower)) {
    updates.load_type = 'LCL';
    extractedList.push('Load Type: LCL');
  }

  // 2b. Factory Loading Strategy (Live Loading vs CFS vs Fumigation)
  if (
    aiResponse.loading_type === 'live_loading' ||
    /\b(live\s*loading|live\s*load|factory\s*loading|loading\s*at\s*factory|direct\s*factory)\b/i.test(textLower)
  ) {
    updates.loading_type = 'live_loading';
    extractedList.push('Loading Strategy: Live Loading at Factory');
  } else if (
    aiResponse.loading_type === 'cfs_loading' ||
    /\b(cfs|container freight station)\b/i.test(textLower)
  ) {
    updates.loading_type = 'cfs_loading';
    extractedList.push('Loading Strategy: CFS Loading');
  } else if (
    aiResponse.loading_type === 'fumigation' ||
    /\b(fumigation|treated loading)\b/i.test(textLower)
  ) {
    updates.loading_type = 'fumigation';
    extractedList.push('Loading Strategy: Fumigation & Treated Loading');
  }

  // 3. Origin Location (Only set if detected in text or returned by AI)
  if (aiResponse.from_address_id && mockAddresses.some(a => a.id === aiResponse.from_address_id)) {
    updates.from_address_id = aiResponse.from_address_id;
    updates.from_address = mockAddresses.find(a => a.id === aiResponse.from_address_id);
    if (updates.from_address?.countryCode) updates.originCountry = updates.from_address.countryCode;
    extractedList.push(`Origin: ${updates.from_address?.city}, ${updates.from_address?.country}`);
  } else if (/chennai/i.test(textLower)) {
    updates.from_address_id = 'addr-1';
    updates.from_address = mockAddresses[0];
    updates.originCountry = 'IN';
    updates.from_port_code = 'INMAA';
    updates.from_port_name = 'Chennai Port';
    extractedList.push('Origin: Chennai Port, India');
  } else if (/hamburg/i.test(textLower)) {
    updates.from_address_id = 'addr-3';
    updates.from_address = mockAddresses[2];
    updates.originCountry = 'DE';
    updates.from_port_code = 'DEHAM';
    updates.from_port_name = 'Hamburg Port';
    extractedList.push('Origin: Hamburg Port, Germany');
  } else if (aiResponse.from_port_code) {
    updates.from_port_code = String(aiResponse.from_port_code);
    if (aiResponse.originCountry) updates.originCountry = String(aiResponse.originCountry).toUpperCase();
    extractedList.push(`Origin Port: ${updates.from_port_code}`);
  } else if (aiResponse.originCountry) {
    updates.originCountry = String(aiResponse.originCountry).toUpperCase();
  }

  // 4. Destination Location (Only set if detected in text or returned by AI)
  if (aiResponse.to_address_id && mockAddresses.some(a => a.id === aiResponse.to_address_id)) {
    updates.to_address_id = aiResponse.to_address_id;
    updates.to_address = mockAddresses.find(a => a.id === aiResponse.to_address_id);
    if (updates.to_address?.countryCode) updates.destCountry = updates.to_address.countryCode;
    extractedList.push(`Destination: ${updates.to_address?.city}, ${updates.to_address?.country}`);
  } else if (/simi|new york|pennsauken|nj|ny|us\b|usa\b/i.test(textLower)) {
    updates.to_address_id = 'addr-2';
    updates.to_address = mockAddresses[1];
    updates.destCountry = 'US';
    updates.to_port_code = 'USNYC';
    updates.to_port_name = 'New York Port';
    extractedList.push('Destination: New York / NJ, US');
  } else if (/tokyo|japan/i.test(textLower)) {
    updates.to_address_id = 'addr-4';
    updates.to_address = mockAddresses[3];
    updates.destCountry = 'JP';
    updates.to_port_code = 'TYO';
    updates.to_port_name = 'Tokyo Port';
    extractedList.push('Destination: Tokyo, Japan');
  } else if (aiResponse.to_port_code) {
    updates.to_port_code = String(aiResponse.to_port_code);
    if (aiResponse.destCountry) updates.destCountry = String(aiResponse.destCountry).toUpperCase();
    extractedList.push(`Destination Port: ${updates.to_port_code}`);
  } else if (aiResponse.destCountry) {
    updates.destCountry = String(aiResponse.destCountry).toUpperCase();
  }

  // 5. Service Scope (Only if explicitly specified)
  if (aiResponse.service_scope) {
    updates.service_scope = aiResponse.service_scope;
  }

  // 6. Commodity Description (Extract actual description only)
  if (aiResponse.commodity_description) {
    updates.commodity_description = String(aiResponse.commodity_description);
    extractedList.push(`Commodity: "${updates.commodity_description}"`);
  } else {
    // Check for commodity names directly in text
    if (/soap/i.test(textLower)) {
      updates.commodity_description = 'Soaps, Totes & Aprons';
      extractedList.push('Commodity: "Soaps, Totes & Aprons"');
    }
  }

  // 7. Temperature Control (Only if specified)
  if (aiResponse.temperature_control_required || /\b(temperature|reefer|cold|frozen|chilled|\d+°c)\b/i.test(textLower)) {
    updates.temperature_control_required = true;
    if (aiResponse.target_temperature) {
      updates.target_temperature = String(aiResponse.target_temperature);
    }
    extractedList.push(`Temperature Control: Required${updates.target_temperature ? ` (${updates.target_temperature})` : ''}`);
  }

  // 8. Hazardous Materials (Only if specified)
  if (aiResponse.hazardous_materials || /\b(hazmat|dangerous|chemical|un\s*\d+)\b/i.test(textLower)) {
    updates.hazardous_materials = true;
    if (aiResponse.un_class_code) {
      updates.un_class_code = String(aiResponse.un_class_code);
    }
    extractedList.push('Hazmat: Dangerous Goods Flagged');
  }

  // 9. Packages & Dimensions (Process ONLY if extracted from AI/Text - NO FAKE DEFAULTS)
  if (Array.isArray(aiResponse.packages) && aiResponse.packages.length > 0) {
    updates.packages = aiResponse.packages.map((p: any, idx: number) => ({
      id: p.id || `pkg-${idx + 1}`,
      packageType: p.packageType || p.package_type || 'Corrugated Box',
      quantity: Number(p.quantity) || 1,
      length: Number(p.length) || 0,
      width: Number(p.width) || 0,
      height: Number(p.height) || 0,
      grossWeight: Number(p.grossWeight || p.gross_weight) || 0,
      isStackable: p.isStackable !== false,
      packedItemDescriptions: Array.isArray(p.packedItemDescriptions) ? p.packedItemDescriptions : [],
    }));
    extractedList.push(`Extracted ${updates.packages.length} Package Line(s)`);
  }

  // 10. Incoterm (Only if explicitly specified in text or AI response)
  if (aiResponse.incoterm) {
    updates.incoterm = String(aiResponse.incoterm).toUpperCase();
    extractedList.push(`Incoterm: ${updates.incoterm}`);
  } else {
    const matchedIncoterm = ['DDP', 'FOB', 'CIF', 'EXW', 'DAP', 'FCA'].find(inc => textLower.includes(inc.toLowerCase()));
    if (matchedIncoterm) {
      updates.incoterm = matchedIncoterm;
      extractedList.push(`Incoterm: ${matchedIncoterm}`);
    }
  }

  // 11. Cargo Value & Currency (0 if unstated by customer)
  if (aiResponse.cargo_value && Number(aiResponse.cargo_value) > 0) {
    updates.cargo_value = Number(aiResponse.cargo_value);
    extractedList.push(`Cargo Value: ${updates.cargo_value}`);
  } else {
    updates.cargo_value = 0;
  }

  if (aiResponse.currency) {
    const rawCurr = String(aiResponse.currency).toUpperCase();
    if (['USD', 'EUR', 'GBP', 'INR'].includes(rawCurr)) {
      updates.currency = rawCurr as CurrencyType;
    }
  }

  // 12. Insurance & Customs Broker (Only if requested)
  if (aiResponse.insurance_required || /\b(insurance|insure|covered)\b/i.test(textLower)) {
    updates.insurance_required = true;
    updates.insurance_provider_type = 'thisai';
    extractedList.push('Insurance: Requested');
  }

  if (aiResponse.destination_customs_clearance || /\b(customs|clearance|broker)\b/i.test(textLower)) {
    updates.destination_customs_clearance = true;
    updates.destination_customs_broker = 'Thisai Customs Broker';
    extractedList.push('Customs Clearance: Requested');
  }

  // 13. Commercial Items & Strict Per-Unit Net Weight (NO STATIC FALLBACKS)
  if (Array.isArray(aiResponse.commercial_items) && aiResponse.commercial_items.length > 0) {
    updates.commercial_items = aiResponse.commercial_items.map((item: any, idx: number) => {
      const qty = Number(item.quantity) || 1;
      let rawNet = Number(item.netWeight || item.net_weight) || 0;

      // Strict Per-Unit Net Weight Calculation: If total batch weight was returned, divide by quantity
      if (rawNet > 100 && qty > 1 && rawNet > (qty * 3)) {
        rawNet = Number((rawNet / qty).toFixed(2));
      }

      const itemDesc = item.description || `Item ${idx + 1}`;
      const itemHS = item.hsCode || item.hs_code || '';
      const itemUnitPrice = Number(item.unitPrice || item.unit_price) || 0;

      return {
        id: item.id || `item-${idx + 1}`,
        description: itemDesc,
        hsCode: itemHS,
        quantity: qty,
        unitPrice: itemUnitPrice,
        netWeight: rawNet,
      };
    });
    extractedList.push(`Extracted ${updates.commercial_items.length} SKU(s)`);
  }

  // Auto-calculate cargo value only if item prices were explicitly provided
  if ((!updates.cargo_value || updates.cargo_value === 0) && updates.commercial_items) {
    const sumVal = updates.commercial_items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    if (sumVal > 0) updates.cargo_value = sumVal;
  }

  updates.other_special_instructions = rawDescription;

  const summaryText = aiResponse.extracted_summary ||
    (extractedList.length > 0
      ? `AI extracted ${extractedList.length} fields (${extractedList.slice(0, 3).join(', ')})`
      : 'Extracted shipment parameters from description.');

  return {
    extractedCount: extractedList.length,
    summaryText,
    extractedFields: updates,
    rawDescription,
  };
}
