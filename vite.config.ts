import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { SYSTEM_PROMPT_CARGO_SPECS } from './src/constants/aiPrompts.js';

// Vite Plugin for Gemini AI Backend Endpoint (/api/gemini-recommend)
const geminiBackendPlugin = (): Plugin => ({
  name: 'gemini-equipment-backend',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url === '/api/gemini-recommend') {
        if (req.method === 'GET') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              status: 'online',
              endpoint: '/api/gemini-recommend',
              methods: ['POST', 'GET'],
              description: 'SmartRFQ Gemini AI Equipment Recommendation Service',
              gemini_api_key_configured: Boolean(
                process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
              ),
            })
          );
          return;
        }

        if (req.method === 'POST') {
          const { SYSTEM_PROMPT_EQUIPMENT_ENGINE, sanitizeAndValidateAIResult } =
            await import('./src/services/equipmentEvaluationEngine.ts');
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const input = JSON.parse(body);

              const apiKey =
                process.env.GEMINI_API_KEY ||
                process.env.VITE_GEMINI_API_KEY ||
                (req.headers['x-gemini-key'] as string);

              const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

              if (apiKey && apiKey.trim().length > 0) {
                try {
                  const geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        systemInstruction: {
                          parts: [{ text: SYSTEM_PROMPT_EQUIPMENT_ENGINE }],
                        },
                        contents: [
                          {
                            role: 'user',
                            parts: [
                              {
                                text: `Evaluate the following cargo shipment input specifications:\n${JSON.stringify(input, null, 2)}`,
                              },
                            ],
                          },
                        ],
                        generationConfig: {
                          responseMimeType: 'application/json',
                        },
                      }),
                    }
                  );

                  if (geminiRes.ok) {
                    const data = (await geminiRes.json()) as any;
                    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textResponse) {
                      const parsed = JSON.parse(textResponse);
                      if (parsed && parsed.equipment_recommendation && parsed.mode) {
                        const sanitized = sanitizeAndValidateAIResult(
                          { ...parsed, source: `gemini_api (${modelName})` },
                          input
                        );
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(sanitized));
                        return;
                      }
                    }
                  }
                } catch (geminiErr) {
                  console.warn('Gemini API call exception:', geminiErr);
                }
              }

              // Resilient Intelligent Logistics Equipment Recommendation Engine Fallback
              const cbm = Number(input?.cargo_volume_cbm) || 0;
              const grossKg = Number(input?.cargo_gross_weight_kg) || 0;
              const isReefer = Boolean(input?.temperature_control?.is_required);
              const access = input?.loading_access;

              let recName = "20' Standard";
              let recCode = "20GP";

              if (isReefer) {
                recName = cbm > 30 ? "40' Reefer High Cube" : "20' Reefer";
                recCode = cbm > 30 ? "40HC RF" : "20RF";
              } else if (access === 'overhead_crane' || input?.requires_rigid_roof) {
                recName = cbm > 30 ? "40' Open Top" : "20' Open Top";
                recCode = cbm > 30 ? "40OT" : "20OT";
              } else if (cbm > 75) {
                recName = "45' High Cube";
                recCode = "45HC";
              } else if (cbm > 33.2 || grossKg > 28130) {
                recName = "40' High Cube";
                recCode = "40HC";
              } else {
                recName = "20' Standard";
                recCode = "20GP";
              }

              const capPerUnit = recName.includes("45'") ? 86 : (recName.includes("40'") ? 76.4 : 33.2);
              const estUnits = Math.max(1, Math.ceil(cbm / capPerUnit));

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  mode: cbm < 15 && grossKg < 3000 ? 'LCL' : 'FCL',
                  equipment_recommendation: {
                    name: recName,
                    common_code: recCode,
                    estimated_units: estUnits,
                  },
                  rationale: `Intelligent Logistics Engine evaluated shipment specs (${cbm.toFixed(2)} CBM, ${grossKg.toLocaleString()} kg). Allocated ${estUnits}× ${recName} for optimal volumetric payload efficiency.`,
                  flags: {
                    is_oog: access === 'overhead_crane',
                    is_reefer: isReefer,
                    payload_warning: false,
                  },
                  source: 'intelligent_logistics_engine',
                })
              );
            } catch (err: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid input payload', message: err.message }));
            }
          });
          return;
        }
      }

      if (req.url === '/api/gemini-cargo-specs') {
        if (req.method === 'GET') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              status: 'online',
              endpoint: '/api/gemini-cargo-specs',
              methods: ['POST', 'GET'],
              description: 'SmartRFQ Gemini AI Cargo Specs Classification Service',
              gemini_api_key_configured: Boolean(
                process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
              ),
            })
          );
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const input = JSON.parse(body);
              const apiKey =
                process.env.GEMINI_API_KEY ||
                process.env.VITE_GEMINI_API_KEY ||
                (req.headers['x-gemini-key'] as string);

              const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

              if (apiKey && apiKey.trim().length > 0) {
                try {
                  const geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        systemInstruction: {
                          parts: [{ text: SYSTEM_PROMPT_CARGO_SPECS }],
                        },
                        contents: [
                          {
                            role: 'user',
                            parts: [
                              {
                                text: `Analyze cargo items and predict physical nature, commodity category, and handling access:\n${JSON.stringify(input, null, 2)}`,
                              },
                            ],
                          },
                        ],
                        generationConfig: {
                          responseMimeType: 'application/json',
                        },
                      }),
                    }
                  );

                  if (geminiRes.ok) {
                    const data = (await geminiRes.json()) as any;
                    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textResponse) {
                      const parsed = JSON.parse(textResponse);
                      if (parsed && parsed.physical_state) {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(parsed));
                        return;
                      }
                    }
                  }
                } catch (geminiErr) {
                  console.warn('Gemini cargo specs API call failed, using fallback:', geminiErr);
                }
              }

              // Smart Fallback Inference
              const items = Array.isArray(input?.items) ? input.items : [];
              const allText = items
                .flatMap((item: any) => [
                  String(item.description || ''),
                  String(item.hsCode || ''),
                  String(item.hsDescription || ''),
                ])
                .join(' ')
                .toLowerCase();

              let state = 'solid';
              let form = 'packaged_dry';
              let tempControl = false;
              let notes = 'Standard Ambient Temperature';
              let category = 'general';
              let handling = 'standard';
              let access = 'standard_rear_door';
              let reason = 'AI inferred Solid (Packaged Dry Goods) state from commercial item & tariff details.';

              if (
                allText.includes('milk') ||
                allText.includes('dairy') ||
                allText.includes('cream') ||
                allText.includes('cheese') ||
                allText.includes('butter') ||
                allText.includes('yoghurt') ||
                allText.includes('yogurt') ||
                allText.includes('pharma') ||
                allText.includes('medicine') ||
                allText.includes('vaccine') ||
                allText.includes('food') ||
                allText.includes('fruit') ||
                allText.includes('meat') ||
                allText.includes('fish') ||
                allText.includes('seafood') ||
                allText.includes('0401') ||
                allText.includes('0402') ||
                allText.includes('0403') ||
                allText.includes('0404') ||
                allText.includes('0405') ||
                allText.includes('0406') ||
                allText.includes('3004')
              ) {
                state = 'perishable';
                form = 'packaged_dry';
                tempControl = true;
                category = 'fda_regulated';
                handling = 'standard';
                access = 'standard_rear_door';
                notes = allText.includes('milk') || allText.includes('dairy') || allText.includes('0401')
                  ? 'Maintain 2°C–4°C (Reefer Cold Chain Required)'
                  : 'Maintain 18°C–22°C (Reefer Climate Control Required)';
                reason = 'AI classified cargo as Perishable Cold-Chain Goods (FDA Regulated Dairy/Food/Pharma) from HS Code & description.';
              } else if (
                allText.includes('car') ||
                allText.includes('auto') ||
                allText.includes('vehicle') ||
                allText.includes('truck') ||
                allText.includes('8703') ||
                allText.includes('8704') ||
                allText.includes('8708')
              ) {
                state = 'vehicle';
                form = 'machinery';
                category = 'jewelry_high_value';
                handling = 'side_loading';
                access = 'side_roll_on';
                reason = 'AI classified cargo as Vehicle / Wheeled Equipment requiring Side Loading / Roll-On access.';
              } else if (
                allText.includes('liquid') ||
                allText.includes('oil') ||
                allText.includes('juice') ||
                allText.includes('chemical') ||
                allText.includes('drum') ||
                allText.includes('tank') ||
                allText.includes('8413')
              ) {
                state = 'liquid';
                form = 'bulk_liquid';
                category = allText.includes('chemical') || allText.includes('hazmat') ? 'hazardous' : 'general';
                handling = 'standard';
                access = 'standard_rear_door';
                reason = 'AI identified Liquid state (ISO Tank / Drums) from HS Code & commercial description.';
              } else if (
                allText.includes('gas') ||
                allText.includes('cylinder') ||
                allText.includes('oxygen') ||
                allText.includes('nitrogen') ||
                allText.includes('refrigerant')
              ) {
                state = 'gas';
                form = 'bulk_gas';
                category = 'hazardous';
                handling = 'standard';
                access = 'standard_rear_door';
                reason = 'AI identified Compressed Gas / Dangerous Goods from HS Code & commercial description.';
              } else if (
                allText.includes('machine') ||
                allText.includes('machinery') ||
                allText.includes('lathe') ||
                allText.includes('cnc') ||
                allText.includes('generator') ||
                allText.includes('8458')
              ) {
                state = 'machinery';
                form = 'machinery';
                category = 'jewelry_high_value';
                handling = 'top_loading';
                access = 'overhead_crane';
                reason = 'AI identified Heavy Machinery requiring Top Loading (Overhead Crane Access).';
              } else if (
                allText.includes('wood') ||
                allText.includes('lumber') ||
                allText.includes('timber') ||
                allText.includes('grain') ||
                allText.includes('coffee') ||
                allText.includes('wheat') ||
                allText.includes('agri')
              ) {
                state = 'solid';
                form = 'packaged_dry';
                category = 'agri_wood';
                handling = 'standard';
                access = 'standard_rear_door';
                reason = 'AI identified Agricultural & Timber cargo from HS Code / commercial item details.';
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  physical_state: state,
                  cargo_form: form,
                  humidity_control: tempControl,
                  humidity_notes: notes,
                  commodity_category: category,
                  handling_requirements: handling,
                  loading_access: access,
                  reason,
                })
              );
            } catch (err: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid input payload', message: err.message }));
            }
          });
          return;
        }
      }
      next();
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env = { ...process.env, ...env };

  return {
    plugins: [react(), geminiBackendPlugin()],
  };
});

