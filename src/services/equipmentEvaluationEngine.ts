import type { AIEquipmentInput, AIEquipmentOutput } from '../types/aiEquipment.js';
import { SYSTEM_PROMPT_EQUIPMENT_ENGINE } from '../constants/aiPrompts.js';

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

export { SYSTEM_PROMPT_EQUIPMENT_ENGINE };

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
