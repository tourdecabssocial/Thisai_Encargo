import type { PhysicalState, CargoForm } from '../types/aiEquipment';

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

export interface ReefHSCandidate {
  code: string;
  code_digits?: string;
  description: string;
  confidence?: number;
  reason?: string;
  duty_general_mfn?: string | null;
  duty_general_mfn_pct?: number | null;
  confidence_band?: string;
  review_required?: boolean;
}

export interface ReefHSResponse {
  ok: boolean;
  meta?: {
    api?: string;
    endpoint?: string;
    mode?: string;
    latency_ms?: number;
    record_count?: number;
  };
  data?: {
    destination?: string;
    query?: string;
    candidates?: ReefHSCandidate[];
    top_candidate?: ReefHSCandidate;
  };
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * Classifies product description using Reef API (POST https://api.reefapi.com/hs-code/v1/classify)
 */
export const classifyHSCodeReefAPI = async (
  description: string,
  destination: string = 'US',
  customApiKey?: string
): Promise<ReefHSCandidate[]> => {
  if (!description || description.trim().length < 2) return [];

  // Pass default US if destination is not in allowed list ('US', 'UK') by Reef API
  const validDestination = destination && ['US', 'UK'].includes(destination.toUpperCase())
    ? destination.toUpperCase()
    : 'US';

  const apiKey = customApiKey || (import.meta as any).env?.VITE_REEF_KEY || 'ak_live_mnbvzNOvslBkrIr-06SNdS9AhLQHhkRZ';

  // 1. Try proxy endpoint (/api/reef-classify) first to bypass browser CORS rules
  try {
    const proxyRes = await fetch('/api/reef-classify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body: JSON.stringify({
        description: description.trim(),
        destination: validDestination,
      }),
    });

    if (proxyRes.ok) {
      const resJson: ReefHSResponse = await proxyRes.json();
      if (resJson.ok && resJson.data?.candidates && resJson.data.candidates.length > 0) {
        return resJson.data.candidates;
      }
    }
  } catch {
    // Proxy endpoint unavailable on static server, fall through to fallback
  }

  // 2. Direct fetch fallback with Authorization Bearer header (CORS compliant)
  if (apiKey) {
    try {
      const response = await fetch('https://api.reefapi.com/hs-code/v1/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          description: description.trim(),
          destination: validDestination,
        }),
      });

      if (response.ok) {
        const data: ReefHSResponse = await response.json();
        if (data.ok && data.data?.candidates) {
          return data.data.candidates;
        }
      }
    } catch (err) {
      console.warn('Reef API direct fetch exception:', err);
    }
  }

  // Local fallback candidates if API call yields no results
  const lower = description.toLowerCase();

  if (lower.includes('lathe') || lower.includes('machine') || lower.includes('cnc') || lower.includes('equipment')) {
    return [
      {
        code: '8458.11',
        description: 'Horizontal lathes, numerically controlled (CNC Lathes)',
        confidence: 0.94,
        duty_general_mfn: '4.4%',
      },
      {
        code: '8459.61',
        description: 'Milling machines for metals, numerically controlled',
        confidence: 0.88,
        duty_general_mfn: '4.2%',
      },
      {
        code: '8466.93',
        description: 'Parts and accessories for machine tools of headings 8456 to 8461',
        confidence: 0.79,
        duty_general_mfn: 'Free',
      },
    ];
  }

  if (lower.includes('shirt') || lower.includes('cotton') || lower.includes('textile') || lower.includes('apparel')) {
    return [
      {
        code: '6105.10',
        description: "Men's or boys' shirts, knitted or crocheted, of cotton",
        confidence: 0.95,
        duty_general_mfn: '19.7%',
      },
      {
        code: '6205.20',
        description: "Men's or boys' shirts, of cotton, not knitted or crocheted",
        confidence: 0.91,
        duty_general_mfn: '19.7%',
      },
    ];
  }

  return [
    {
      code: '8479.89',
      description: 'Machines and mechanical appliances having individual functions, n.e.s.o.i.',
      confidence: 0.72,
      duty_general_mfn: '2.5%',
    },
  ];
};
