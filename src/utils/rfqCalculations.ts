import type { PackageCard, CommercialItem, ItemReconciliationResult, UnitSystem, TransportMode, LoadType } from '../types/rfq';

// FCL Container Volume Presets (in CBM) - Official Hapag-Lloyd Specification Standards
export const FCL_CONTAINER_PRESETS: Record<string, number> = {
  "20' Standard": 33.2,
  "40' Standard": 67.7,
  "40' High Cube": 76.3,
  "45' High Cube": 86.0,
  "20' Reefer": 28.3,
  "40' Reefer": 58.0,
  "40' Reefer High Cube": 67.0,
  "20' Open Top": 32.0,
  "40' Open Top": 66.0,
  "40' Open Top High Cube": 74.0,
  "20' Flat Rack": 28.0,
  "40' Flat Rack High Cube": 65.0,
  "20' Hardtop": 32.0,
  "40' Hardtop": 66.0,
  "20' ISO Tank": 24.0,
};

// Calculate volume for a single package card (CBM)
export const calculatePackageVolumeCbm = (pkg: PackageCard, unitSystem: UnitSystem): number => {
  if (pkg.packageType === 'FCL Container' && pkg.fclPreset && FCL_CONTAINER_PRESETS[pkg.fclPreset]) {
    return FCL_CONTAINER_PRESETS[pkg.fclPreset] * (pkg.quantity || 1);
  }

  const { length, width, height, quantity } = pkg;
  if (!length || !width || !height || !quantity) return 0;

  if (unitSystem === 'metric') {
    // Dimensions in cm -> (L * W * H) / 1,000,000 * quantity
    return ((length * width * height) / 1000000) * quantity;
  } else {
    // Dimensions in inches -> cubic inches to CBM (1 cubic meter = 61023.74 cubic inches)
    const cubicInches = length * width * height * quantity;
    return cubicInches / 61023.74;
  }
};

// Calculate total volume across all packages (CBM)
export const calculateTotalVolumeCbm = (packages: PackageCard[], unitSystem: UnitSystem): number => {
  return packages.reduce((acc, pkg) => acc + calculatePackageVolumeCbm(pkg, unitSystem), 0);
};

// Calculate total gross weight in kg (sum of unit gross weight * quantity per line, or fallback to net weight)
export const calculateTotalGrossWeightKg = (
  packages: PackageCard[],
  unitSystem: UnitSystem,
  totalNetCargoWeightKg: number = 0
): number => {
  const totalExplicit = packages.reduce((acc, pkg) => {
    const pkgWeight = Number(pkg.grossWeight) || 0;
    return acc + pkgWeight * (Number(pkg.quantity) || 1);
  }, 0);

  const finalGross = totalExplicit > 0 ? totalExplicit : totalNetCargoWeightKg;

  // Convert lbs to kg if imperial
  return unitSystem === 'imperial' ? finalGross / 2.20462 : finalGross;
};

/**
 * Mode-Specific Volumetric Weight Calculation
 * - Air Freight: 1 CBM = 166.67 kg (Divisor 6,000 cm³/kg)
 * - Ocean Freight (FCL & LCL W/M): 1 CBM = 1,000 kg (1 Metric Ton W/M Standard)
 */
export const calculateVolumetricWeight = (
  totalVolumeCbm: number,
  mode: TransportMode = 'Ship',
  loadType: LoadType = 'FCL',
  unitSystem: UnitSystem = 'metric'
): { volumetricWeightKg: number; ruleDescription: string } => {
  let factor = 1000;
  let ruleDescription = 'Ocean W/M (1 CBM = 1,000 kg)';

  const normalizedMode = String(mode || '').toLowerCase();

  if (normalizedMode === 'air' || (loadType as string) === 'AIR_STANDARD') {
    factor = 166.67; // IATA standard air freight divisor (6000 cm³/kg)
    ruleDescription = 'Air Freight (1 CBM = 166.67 kg)';
  } else {
    // Ocean Freight (FCL, LCL, Breakbulk, RoRo)
    factor = 1000; // Ocean standard W/M ratio (1 CBM = 1,000 kg)
    ruleDescription = 'Ocean W/M (1 CBM = 1,000 kg)';
  }

  const volWeightKg = totalVolumeCbm * factor;
  const resultKg = unitSystem === 'imperial' ? volWeightKg * 2.20462 : volWeightKg;

  return {
    volumetricWeightKg: Math.round(resultKg),
    ruleDescription,
  };
};

/**
 * Chargeable Weight = max(Total Gross Weight, Volumetric Weight)
 */
export const calculateChargeableWeightKg = (
  grossWeightKg: number,
  volumetricWeightKg: number
): number => {
  return Math.max(grossWeightKg, volumetricWeightKg);
};

/**
 * Tare / Packaging Weight = Gross Weight - Net Weight (when both are known)
 */
export const calculateTareWeightKg = (grossWeightKg: number, netWeightKg: number): number => {
  return Math.max(0, grossWeightKg - netWeightKg);
};

// Cross-Validation Reconciliation: Commercial Items vs Package Descriptions
export const reconcileItemsAndPackages = (
  commercialItems: CommercialItem[] = [],
  packages: PackageCard[] = []
): ItemReconciliationResult => {
  const mismatches: string[] = [];
  const safeItems = Array.isArray(commercialItems) ? commercialItems : [];
  const safePackages = Array.isArray(packages) ? packages : [];

  if (safeItems.length === 0) {
    return { passed: true, mismatches: [] };
  }

  // 1. Item Presence Check: Every commercial item must exist in at least one package description
  const allPackedDescriptionsList = safePackages.flatMap((pkg) =>
    Array.isArray(pkg?.packedItemDescriptions)
      ? pkg.packedItemDescriptions.map((d) => (d ? String(d).trim().toLowerCase() : ''))
      : []
  );

  safeItems.forEach((item) => {
    const itemDescLower = (item?.description || '').trim().toLowerCase();
    if (!itemDescLower) return;

    // Check exact match, substring match, or single package fallback
    const hasMatch =
      allPackedDescriptionsList.length === 0 ||
      safePackages.length === 1 ||
      allPackedDescriptionsList.some(
        (packed) => packed === itemDescLower || packed.includes(itemDescLower) || itemDescLower.includes(packed)
      );

    if (!hasMatch) {
      mismatches.push(`Item "${item.description}" listed in Commercial Invoice is not assigned to any package line.`);
    }
  });

  return {
    passed: mismatches.length === 0,
    mismatches,
  };
};
