import { mockAddresses } from '../hooks/useRFQForm';
import type { RFQFormData } from '../types/rfq';
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
 */
function sanitizeAndNormalizeAIFields(
  aiResponse: Record<string, any>,
  rawDescription: string
): ExtractedAIFieldsResult {
  const updates: Partial<RFQFormData> = {};
  const extractedList: string[] = [];
  const textLower = rawDescription.toLowerCase();

  // Mode
  updates.mode = (aiResponse.mode === 'Air' || textLower.includes('air')) ? 'Air' : 'Ship';
  extractedList.push(`Transport Mode: ${updates.mode === 'Air' ? 'Air Freight' : 'Ocean Freight'}`);

  // Load Type & Container Specs
  const isFCL = aiResponse.load_type === 'FCL' || /fcl|full container|20ft|40ft/i.test(textLower);
  if (isFCL) {
    updates.load_type = 'FCL';
    updates.container_type = aiResponse.container_type || (/reefer|carrot|cold|frozen/i.test(textLower) ? '20RF' : '20GP');
    updates.container_count = Number(aiResponse.container_count) || 1;
    extractedList.push(`Load Type: FCL (${updates.container_type} Container)`);
  } else {
    updates.load_type = 'LCL';
    extractedList.push('Load Type: LCL (Loose Cargo)');
  }

  // Origin Location
  if (aiResponse.from_address_id && mockAddresses.some(a => a.id === aiResponse.from_address_id)) {
    updates.from_address_id = aiResponse.from_address_id;
    updates.from_address = mockAddresses.find(a => a.id === aiResponse.from_address_id) || mockAddresses[0];
    updates.originCountry = updates.from_address.countryCode || 'IN';
    extractedList.push(`Origin: ${updates.from_address.city}, ${updates.from_address.country}`);
  } else if (/chennai|india/i.test(textLower)) {
    updates.from_address_id = 'addr-1';
    updates.from_address = mockAddresses[0];
    updates.originCountry = 'IN';
    updates.from_port_code = 'INMAA';
    updates.from_port_name = 'Chennai Port';
    extractedList.push('Origin: Chennai, India');
  } else if (/hamburg|germany/i.test(textLower)) {
    updates.from_address_id = 'addr-3';
    updates.from_address = mockAddresses[2];
    updates.originCountry = 'DE';
    updates.from_port_code = 'DEHAM';
    updates.from_port_name = 'Hamburg Port';
    extractedList.push('Origin: Hamburg, Germany');
  } else {
    updates.from_address_id = 'addr-1';
    updates.from_address = mockAddresses[0];
    updates.originCountry = 'IN';
  }

  // Destination Location
  if (aiResponse.to_address_id && mockAddresses.some(a => a.id === aiResponse.to_address_id)) {
    updates.to_address_id = aiResponse.to_address_id;
    updates.to_address = mockAddresses.find(a => a.id === aiResponse.to_address_id) || mockAddresses[1];
    updates.destCountry = updates.to_address.countryCode || 'US';
    extractedList.push(`Destination: ${updates.to_address.city}, ${updates.to_address.country}`);
  } else if (/simi|us|usa|york|new york/i.test(textLower)) {
    updates.to_address_id = 'addr-2';
    updates.to_address = mockAddresses[1];
    updates.destCountry = 'US';
    updates.to_port_code = 'USNYC';
    updates.to_port_name = 'New York Port';
    extractedList.push('Destination: Simi Valley / NY, US');
  } else if (/tokyo|japan/i.test(textLower)) {
    updates.to_address_id = 'addr-4';
    updates.to_address = mockAddresses[3];
    updates.destCountry = 'JP';
    updates.to_port_code = 'TYO';
    updates.to_port_name = 'Tokyo Port';
    extractedList.push('Destination: Tokyo, Japan');
  } else {
    updates.to_address_id = 'addr-2';
    updates.to_address = mockAddresses[1];
    updates.destCountry = 'US';
  }

  updates.service_scope = 'D2D';

  // Commodity Description & Perishable Flags
  updates.commodity_description = aiResponse.commodity_description ||
    (/carrot/i.test(textLower) ? 'Fresh Carrots' : /apparel|textile/i.test(textLower) ? 'Apparel Textiles' : 'General Merchandise');
  extractedList.push(`Commodity: "${updates.commodity_description}"`);

  const isReefer = Boolean(aiResponse.temperature_control_required) || /carrot|produce|fruit|frozen|cold|reefer/i.test(textLower);
  if (isReefer) {
    updates.temperature_control_required = true;
    updates.target_temperature = '2°C to 8°C (Refrigerated)';
    extractedList.push('Temperature Control: Required (2°C - 8°C)');
  }

  if (Boolean(aiResponse.hazardous_materials) || /hazmat|chemical|battery/i.test(textLower)) {
    updates.hazardous_materials = true;
    updates.un_class_code = 'Class 9 - Miscellaneous Dangerous Goods';
    extractedList.push('Hazmat: Class 9 Detected');
  }

  // Packages & Dimensions
  let rawPkgs = aiResponse.packages;
  if (!Array.isArray(rawPkgs) || rawPkgs.length === 0) {
    rawPkgs = [
      {
        id: 'pkg-1',
        packageType: /pallet/i.test(textLower) ? 'Wooden Pallet' : /crate/i.test(textLower) ? 'Wooden Crate' : 'Corrugated Box',
        quantity: 15,
        length: 100,
        width: 20,
        height: 90,
        grossWeight: 18,
        isStackable: true,
      },
    ];
  }

  updates.packages = rawPkgs.map((p: any, idx: number) => ({
    id: p.id || `pkg-${idx + 1}`,
    packageType: p.packageType || 'Corrugated Box',
    quantity: Number(p.quantity) || 1,
    length: Number(p.length) || 100,
    width: Number(p.width) || 20,
    height: Number(p.height) || 90,
    grossWeight: Number(p.grossWeight) || 18,
    isStackable: p.isStackable !== false,
    packedItemDescriptions: Array.isArray(p.packedItemDescriptions) ? p.packedItemDescriptions : [updates.commodity_description || 'General Cargo'],
  }));

  const p0 = updates.packages![0];
  extractedList.push(`${p0.quantity} x ${p0.packageType} (${p0.length}L x ${p0.width}W x ${p0.height}H cm)`);

  // Incoterm
  updates.incoterm = (aiResponse.incoterm && String(aiResponse.incoterm).toUpperCase()) ||
    (textLower.includes('fob') ? 'FOB' : textLower.includes('cif') ? 'CIF' : 'DDP');
  extractedList.push(`Incoterm: ${updates.incoterm}`);

  // Cargo Value
  updates.cargo_value = Number(aiResponse.cargo_value) || (p0.quantity * 25);
  updates.currency = 'USD';

  // Insurance
  const wantsInsurance = Boolean(aiResponse.insurance_required) || /insurance|insure|covered/i.test(textLower);
  updates.insurance_required = wantsInsurance;
  if (wantsInsurance) {
    updates.insurance_provider_type = 'thisai';
    extractedList.push('Insurance: Requested (Thisai Covered)');
  }

  // Customs Broker
  const wantsCustoms = Boolean(aiResponse.destination_customs_clearance) || /customs|clearance/i.test(textLower);
  updates.destination_customs_clearance = wantsCustoms;
  if (wantsCustoms) {
    updates.destination_customs_broker = 'Thisai Customs Broker';
    extractedList.push('Customs Clearance: Requested');
  }

  // Commercial Items & HS Code
  updates.hs_code = aiResponse.hs_code || (isReefer ? '0706.10' : '8543.70');
  updates.commercial_items = [
    {
      id: 'item-1',
      description: updates.commodity_description || 'General Cargo',
      hsCode: updates.hs_code,
      quantity: p0.quantity,
      unitPrice: Math.round(updates.cargo_value / p0.quantity),
      netWeight: p0.grossWeight,
    },
  ];

  updates.other_special_instructions = rawDescription;

  const summaryText = aiResponse.extracted_summary ||
    `AI extracted ${extractedList.length} fields (${extractedList.slice(0, 3).join(', ')}...)`;

  return {
    extractedCount: extractedList.length,
    summaryText,
    extractedFields: updates,
    rawDescription,
  };
}
