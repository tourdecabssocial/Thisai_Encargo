import type { AIEquipmentInput, AIEquipmentOutput } from '../types/aiEquipment';

export interface HazmatDetectionResult {
  isHazmat: boolean;
  imoClassCode: string;
  matchedReason?: string;
}

/**
 * Intelligent Hazmat / Dangerous Goods Classification Engine
 * Analyzes Commodity Description & HS Code to infer UN ADR / IMO hazard classes.
 */
export const detectCargoHazmatClassification = (
  commodityName: string = '',
  hsCode: string = ''
): HazmatDetectionResult => {
  const query = (commodityName + ' ' + hsCode).toLowerCase().trim();
  const hsClean = hsCode.replace(/[^0-9]/g, '');

  if (hsClean.startsWith('36') || query.includes('explosive') || query.includes('firework')) {
    return { isHazmat: true, imoClassCode: 'Class 1 (Explosives)', matchedReason: 'Class 1 Explosive materials detected' };
  }

  if (query.includes('lithium') || query.includes('battery') || query.includes('batteries') || hsClean.startsWith('8506') || hsClean.startsWith('8507')) {
    return { isHazmat: true, imoClassCode: 'Class 9 (Lithium Batteries / Misc DG)', matchedReason: 'Class 9 Dangerous Goods (Lithium Batteries)' };
  }

  if (query.includes('gas') || query.includes('propane') || query.includes('butane') || query.includes('aerosol') || query.includes('refrigerant')) {
    return { isHazmat: true, imoClassCode: 'Class 2.1 (Flammable Gases)', matchedReason: 'Class 2 Flammable Compressed Gas' };
  }

  if (
    query.includes('chemical') ||
    query.includes('paint') ||
    query.includes('solvent') ||
    query.includes('alcohol') ||
    query.includes('ethanol') ||
    query.includes('flammable') ||
    query.includes('fuel') ||
    query.includes('gasoline') ||
    query.includes('diesel') ||
    query.includes('resin') ||
    query.includes('ink') ||
    hsClean.startsWith('29')
  ) {
    return { isHazmat: true, imoClassCode: 'Class 3 (Flammable Liquids)', matchedReason: 'Class 3 Flammable Liquids / Solvents' };
  }

  if (query.includes('acid') || query.includes('corrosive') || query.includes('bleach') || hsClean.startsWith('28')) {
    return { isHazmat: true, imoClassCode: 'Class 8 (Corrosive Substances)', matchedReason: 'Class 8 Corrosive Acid' };
  }

  if (query.includes('toxic') || query.includes('poison') || query.includes('pesticide') || query.includes('insecticide')) {
    return { isHazmat: true, imoClassCode: 'Class 6.1 (Toxic Substances)', matchedReason: 'Class 6.1 Toxic Substance' };
  }

  if (query.includes('fertilizer') || hsClean.startsWith('31') || hsClean.startsWith('38')) {
    return { isHazmat: true, imoClassCode: 'Class 5.1 (Oxidizing Substances)', matchedReason: 'Class 5 Chemical Fertilizers' };
  }

  if (query.includes('hazmat') || query.includes('dangerous') || query.includes('un ') || query.includes('un#')) {
    return { isHazmat: true, imoClassCode: 'Class 3 (Flammable Liquids)', matchedReason: 'Dangerous Goods Keyword Detected' };
  }

  return { isHazmat: false, imoClassCode: '' };
};

export const SYSTEM_PROMPT_EQUIPMENT_ENGINE = `You are an expert global freight logistics & container equipment AI recommendation engine.
Given shipment input specs (package line items, HS code, commodity description, total volume, total gross weight, unit system), evaluate and infer the optimal container equipment allocation across the 15 ISO Container Types.

EVALUATION PROCESS:
Step 1: Container Category Selection (based on Commodity Details & Description)
- Standard (Dry/General Purpose): 20' Standard (20GP), 40' Standard (40GP), 40' High Cube (40HC), 45' High Cube (45HC). Used for general dry packaged cargo.
- Reefer (Temperature-Controlled): 20' Reefer (20RF), 40' Reefer (40RF), 40' Reefer High Cube (40HC RF). Used for perishable/cold-chain (HS 02, 03, 04, 07, 08, 30 or dairy, frozen, seafood, pharma).
- Open Top: 20' Open Top (20OT), 40' Open Top (40OT), 40' Open Top High Cube (40HC OT). Used for top-loading, overhead crane access, or overheight cargo.
- Flat Rack / Platform: 20' Flatrack (20FR), 40' Flatrack High Cube (40HC FR). Used for heavy machinery, vehicles, or overdimensional out-of-gauge (OOG) cargo.
- Hardtop: 20' Hardtop (20HT), 40' Hardtop (40HT). Used for heavy top-loading cargo needing a removable steel roof with rigid protection.
- Tank (Gas/Liquid): 20' Tank (20TK). Used for bulk liquids, liquid chemicals, or industrial gases.

Step 2: Recommended Size & Count Selection (based on Volume, Dimensions & Weight)
- Compare cargo volume (CBM) and gross weight (kg) against container capacities:
  * 20' Dry: 33.2 CBM / 28,130 kg max payload
  * 40' Dry: 67.7 CBM / 28,750 kg max payload
  * 40' High Cube: 76.4 CBM / 28,600 kg max payload
  * 45' High Cube: 86.0 CBM / 27,700 kg max payload
- Calculate container count = max(ceil(Total Volume / Usable CBM), ceil(Total Weight / Max Payload)).

Step 3: Hazardous Goods & Reefer Flag Evaluation
- Infer if the commodity is dangerous goods / hazmat or requires temperature control based on description and HS code.

Return JSON adhering strictly to this schema:
{
  "mode": "FCL" | "LCL",
  "equipment_recommendation": {
    "name": string,
    "common_code": string,
    "estimated_units": number
  },
  "rationale": string,
  "flags": {
    "is_oog": boolean,
    "is_reefer": boolean,
    "is_hazmat": boolean,
    "imo_class_code": string,
    "payload_warning": boolean
  }
}`;

/**
 * Validates and sanitizes raw AI outputs.
 */
export const sanitizeAndValidateAIResult = (
  raw: any,
  _input: AIEquipmentInput
): AIEquipmentOutput => {
  const validModes: ('FCL' | 'LCL')[] = ['FCL', 'LCL'];
  const mode = validModes.includes(raw.mode) ? raw.mode : 'FCL';

  const equipName = String(raw?.equipment_recommendation?.name || raw?.equipment_recommendation || "20' Standard");
  const estimated_units = Math.max(1, Number(raw?.equipment_recommendation?.estimated_units || raw?.container_count) || 1);

  const hazmatDetection = detectCargoHazmatClassification(_input.commodity_name, '');
  const is_hazmat = Boolean(raw?.flags?.is_hazmat) || _input.is_hazardous || hazmatDetection.isHazmat;
  const imo_class_code = String(raw?.flags?.imo_class_code || hazmatDetection.imoClassCode || (is_hazmat ? 'Class 3 (Flammable Liquids)' : ''));

  return {
    mode,
    equipment_recommendation: {
      name: equipName,
      common_code: String(raw?.equipment_recommendation?.common_code || equipName),
      estimated_units,
    },
    rationale: String(raw?.rationale || raw?.reason || 'AI model evaluated commodity specs and allocated ISO container equipment.'),
    flags: {
      is_oog: Boolean(raw?.flags?.is_oog),
      is_reefer: Boolean(raw?.flags?.is_reefer),
      is_hazmat,
      imo_class_code,
      payload_warning: Boolean(raw?.flags?.payload_warning),
    },
    source: String(raw?.source || 'gemini_api'),
  };
};
