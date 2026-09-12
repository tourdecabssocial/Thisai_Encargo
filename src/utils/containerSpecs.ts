export type ContainerCategory =
  | 'Standard'
  | 'Reefer'
  | 'Open Top'
  | 'Flat Rack'
  | 'Hardtop'
  | 'Tank';

export interface ISOContainerSpec {
  id: string;
  name: string;
  code: string;
  isoTypeGroup: string;
  isoSizeType: string;
  category: ContainerCategory;
  dimensions: string;
  maxGrossKg: number;
  tareKg: number;
  maxPayloadKg: number;
  cbmCapacity: number;
  internalLengthM: number;
  internalWidthM: number;
  internalHeightM: number;
  notes: string;
}

export const ALL_ISO_CONTAINERS: ISOContainerSpec[] = [
  // 1. Standard (Dry / General Purpose)
  {
    id: '20gp',
    name: "20' Standard",
    code: '20GP',
    isoTypeGroup: '22GP',
    isoSizeType: '22G1',
    category: 'Standard',
    dimensions: "20' × 8' × 8'6\"",
    maxGrossKg: 30480,
    tareKg: 2350,
    maxPayloadKg: 28130,
    cbmCapacity: 33.2,
    internalLengthM: 5.9,
    internalWidthM: 2.35,
    internalHeightM: 2.39,
    notes: 'Standard dry box for general cargo',
  },
  {
    id: '40gp',
    name: "40' Standard",
    code: '40GP',
    isoTypeGroup: '42GP',
    isoSizeType: '42G0 / 42G1',
    category: 'Standard',
    dimensions: "40' × 8' × 8'6\"",
    maxGrossKg: 32500,
    tareKg: 3750,
    maxPayloadKg: 28750,
    cbmCapacity: 67.7,
    internalLengthM: 12.03,
    internalWidthM: 2.35,
    internalHeightM: 2.39,
    notes: 'Standard high-capacity dry box',
  },
  {
    id: '40hc',
    name: "40' Standard High Cube",
    code: '40HC',
    isoTypeGroup: '45GP',
    isoSizeType: '45G0 / 45G1',
    category: 'Standard',
    dimensions: "40' × 8' × 9'6\"",
    maxGrossKg: 32500,
    tareKg: 3900,
    maxPayloadKg: 28600,
    cbmCapacity: 76.4,
    internalLengthM: 12.03,
    internalWidthM: 2.35,
    internalHeightM: 2.69,
    notes: 'High-volume dry cargo container',
  },
  {
    id: '45hc',
    name: "45' Standard High Cube",
    code: '45HC',
    isoTypeGroup: 'L5GP',
    isoSizeType: 'L5G1',
    category: 'Standard',
    dimensions: "45' × 8' × 9'6\"",
    maxGrossKg: 32500,
    tareKg: 4800,
    maxPayloadKg: 27700,
    cbmCapacity: 86.0,
    internalLengthM: 13.56,
    internalWidthM: 2.35,
    internalHeightM: 2.69,
    notes: 'Extra-long high-cube container',
  },

  // 2. Reefer (Temperature-Controlled)
  {
    id: '20rf',
    name: "20' Reefer",
    code: '20RF',
    isoTypeGroup: '22RT',
    isoSizeType: '22R1',
    category: 'Reefer',
    dimensions: "20' × 8' × 8'6\"",
    maxGrossKg: 32000,
    tareKg: 2860,
    maxPayloadKg: 29140,
    cbmCapacity: 28.3,
    internalLengthM: 5.44,
    internalWidthM: 2.29,
    internalHeightM: 2.27,
    notes: 'Temperature-controlled reefer container',
  },
  {
    id: '40rf',
    name: "40' Reefer",
    code: '40RF',
    isoTypeGroup: '42RT',
    isoSizeType: '42R1',
    category: 'Reefer',
    dimensions: "40' × 8' × 8'6\"",
    maxGrossKg: 32500,
    tareKg: 4000,
    maxPayloadKg: 28500,
    cbmCapacity: 59.3,
    internalLengthM: 11.56,
    internalWidthM: 2.29,
    internalHeightM: 2.25,
    notes: 'Temperature-controlled standard reefer',
  },
  {
    id: '40hc_rf',
    name: "40' Reefer High Cube",
    code: '40HC RF',
    isoTypeGroup: '45RT',
    isoSizeType: '45R1',
    category: 'Reefer',
    dimensions: "40' × 8' × 9'6\"",
    maxGrossKg: 34000,
    tareKg: 4420,
    maxPayloadKg: 29580,
    cbmCapacity: 66.2,
    internalLengthM: 11.56,
    internalWidthM: 2.29,
    internalHeightM: 2.5,
    notes: 'High-cube temperature-controlled reefer',
  },

  // 3. Open Top
  {
    id: '20ot',
    name: "20' Open Top",
    code: '20OT',
    isoTypeGroup: '22UT',
    isoSizeType: '22U1',
    category: 'Open Top',
    dimensions: "20' × 8' × 8'6\"",
    maxGrossKg: 32500,
    tareKg: 2450,
    maxPayloadKg: 30050,
    cbmCapacity: 32.0,
    internalLengthM: 5.89,
    internalWidthM: 2.34,
    internalHeightM: 2.32,
    notes: 'Top-loading container with removable tarpaulin',
  },
  {
    id: '40ot',
    name: "40' Open Top",
    code: '40OT',
    isoTypeGroup: '42UT',
    isoSizeType: '42U1',
    category: 'Open Top',
    dimensions: "40' × 8' × 8'6\"",
    maxGrossKg: 32500,
    tareKg: 4050,
    maxPayloadKg: 28450,
    cbmCapacity: 65.0,
    internalLengthM: 12.02,
    internalWidthM: 2.34,
    internalHeightM: 2.32,
    notes: 'Standard height top-loading open top container',
  },
  {
    id: '40hc_ot',
    name: "40' Open Top High Cube",
    code: '40HC OT',
    isoTypeGroup: '45UT',
    isoSizeType: '45U1',
    category: 'Open Top',
    dimensions: "40' × 8' × 9'6\"",
    maxGrossKg: 32500,
    tareKg: 4250,
    maxPayloadKg: 28250,
    cbmCapacity: 73.0,
    internalLengthM: 12.02,
    internalWidthM: 2.34,
    internalHeightM: 2.6,
    notes: 'High-cube top-loading open top container',
  },

  // 4. Flat Rack / Platform
  {
    id: '20fr',
    name: "20' Flatrack",
    code: '20FR',
    isoTypeGroup: '22PC',
    isoSizeType: '22P3',
    category: 'Flat Rack',
    dimensions: "20' × 8' × 8'6\"",
    maxGrossKg: 45000,
    tareKg: 2900,
    maxPayloadKg: 42100,
    cbmCapacity: 30.0,
    internalLengthM: 5.9,
    internalWidthM: 2.4,
    internalHeightM: 2.23,
    notes: 'Collapsible flat rack for heavy / out-of-gauge cargo',
  },
  {
    id: '40hc_fr',
    name: "40' Flatrack High Cube / 40' Platform",
    code: '40HC FR',
    isoTypeGroup: '45PF',
    isoSizeType: '45P8 / 45P1',
    category: 'Flat Rack',
    dimensions: "40' × 8' × 9'6\"",
    maxGrossKg: 55000,
    tareKg: 5900,
    maxPayloadKg: 49100,
    cbmCapacity: 60.0,
    internalLengthM: 12.03,
    internalWidthM: 2.4,
    internalHeightM: 1.95,
    notes: 'Heavy-duty flat rack / platform for heavy machinery & overdimensional cargo',
  },

  // 5. Hardtop
  {
    id: '20ht',
    name: "20' Hardtop",
    code: '20HT',
    isoTypeGroup: '22UP',
    isoSizeType: '22U6',
    category: 'Hardtop',
    dimensions: "20' × 8' × 8'6\"",
    maxGrossKg: 30480,
    tareKg: 2700,
    maxPayloadKg: 27780,
    cbmCapacity: 32.8,
    internalLengthM: 5.89,
    internalWidthM: 2.34,
    internalHeightM: 2.38,
    notes: 'Removable steel roof container with swinging door header',
  },
  {
    id: '40ht',
    name: "40' Hardtop",
    code: '40HT',
    isoTypeGroup: '45UP',
    isoSizeType: '45U6',
    category: 'Hardtop',
    dimensions: "40' × 8' × 9'6\"",
    maxGrossKg: 30480,
    tareKg: 4700,
    maxPayloadKg: 25780,
    cbmCapacity: 75.5,
    internalLengthM: 12.02,
    internalWidthM: 2.34,
    internalHeightM: 2.68,
    notes: 'High-cube removable steel roof hardtop container',
  },

  // 6. Tank (Gas / Liquid)
  {
    id: '20tk',
    name: "20' Tank (ISO Tank)",
    code: '20TK',
    isoTypeGroup: '22T*',
    isoSizeType: '20T5 / 22T0 / 22T5 / 22T6',
    category: 'Tank',
    dimensions: "20' × 8' × 8'6\"",
    maxGrossKg: 36000,
    tareKg: 4000,
    maxPayloadKg: 32000,
    cbmCapacity: 26.0, // 26,000 Liters
    internalLengthM: 6.05,
    internalWidthM: 2.44,
    internalHeightM: 2.44,
    notes: 'ISO Tank container for bulk liquids and hazardous/non-hazardous gases',
  },
];

export const getContainerSpecByNameOrCode = (nameOrCode: string): ISOContainerSpec => {
  const norm = (nameOrCode || '').toLowerCase().trim();
  const found = ALL_ISO_CONTAINERS.find(
    (c) =>
      c.name.toLowerCase() === norm ||
      c.code.toLowerCase() === norm ||
      c.id === norm ||
      norm.includes(c.code.toLowerCase()) ||
      norm.includes(c.name.toLowerCase()) ||
      c.category.toLowerCase() === norm
  );
  return found || ALL_ISO_CONTAINERS[0]; // Default to 20' Standard
};

export const getExactContainerName = (nameOrCode: string): string => {
  return getContainerSpecByNameOrCode(nameOrCode).name;
};

export interface ContainerMixItem {
  spec: ISOContainerSpec;
  count: number;
}

export interface EquipmentMixResult {
  mix: ContainerMixItem[];
  totalFleetCount: number;
  primaryContainerType: string;
  formattedMixString: string;
  totalFleetCbmCapacity: number;
  totalFleetWeightCapacity: number;
  volPercent: number;
  weightPercent: number;
  rationale: string;
}

export const computeOptimalEquipmentMix = (
  totalVolumeCbm: number,
  totalGrossWeightKg: number,
  maxLenM: number,
  maxWidM: number,
  maxHgtM: number,
  category: ContainerCategory
): EquipmentMixResult => {
  // 1. Get candidate containers matching category
  let candidates = ALL_ISO_CONTAINERS.filter((c) => c.category === category);
  if (candidates.length === 0) {
    candidates = ALL_ISO_CONTAINERS.filter((c) => c.category === 'Standard');
  }

  // Filter candidates by dimension constraints if possible
  const dimFittingCandidates = candidates.filter(
    (c) =>
      c.internalLengthM >= maxLenM &&
      c.internalWidthM >= maxWidM &&
      c.internalHeightM >= maxHgtM
  );

  const eligible = dimFittingCandidates.length > 0 ? dimFittingCandidates : candidates;

  // Sort eligible candidates by volume capacity descending
  eligible.sort((a, b) => b.cbmCapacity - a.cbmCapacity);

  let remVol = totalVolumeCbm;
  let remWt = totalGrossWeightKg;

  const mixMap = new Map<string, { spec: ISOContainerSpec; count: number }>();

  // If cargo volume and weight are negligible, default to 1x smallest container in category
  if (remVol <= 0.1 && remWt <= 10) {
    const defaultSpec = eligible[eligible.length - 1] || ALL_ISO_CONTAINERS[0];
    return {
      mix: [{ spec: defaultSpec, count: 1 }],
      totalFleetCount: 1,
      primaryContainerType: defaultSpec.name,
      formattedMixString: `1 × ${defaultSpec.name}`,
      totalFleetCbmCapacity: defaultSpec.cbmCapacity,
      totalFleetWeightCapacity: defaultSpec.maxPayloadKg,
      volPercent: 0,
      weightPercent: 0,
      rationale: `Cargo metrics minimal. Recommended 1 × ${defaultSpec.name}.`,
    };
  }

  // Greedy Optimization Loop for Mixed Fleet Allocation
  while (remVol > 0.05 || remWt > 5) {
    // Find the smallest container in eligible that can cover ALL remaining cargo
    const fitsAll = [...eligible]
      .reverse()
      .find((c) => remVol <= c.cbmCapacity && remWt <= c.maxPayloadKg);

    let chosen: ISOContainerSpec;

    if (fitsAll) {
      // If remaining cargo fits into a smaller container (e.g. 20GP or 40GP), choose it!
      chosen = fitsAll;
    } else {
      // Choose the largest container to maximize space efficiency
      chosen = eligible[0];
    }

    const existing = mixMap.get(chosen.name);
    if (existing) {
      existing.count += 1;
    } else {
      mixMap.set(chosen.name, { spec: chosen, count: 1 });
    }

    remVol = Math.max(0, remVol - chosen.cbmCapacity);
    remWt = Math.max(0, remWt - chosen.maxPayloadKg);
  }

  const mixList = Array.from(mixMap.values());

  // Sort mix items: primary is container with highest count, or highest capacity
  mixList.sort((a, b) => b.count - a.count || b.spec.cbmCapacity - a.spec.cbmCapacity);

  const totalFleetCount = mixList.reduce((sum, item) => sum + item.count, 0);
  const primaryContainerType = mixList[0]?.spec.name || eligible[0].name;

  const formattedMixString = mixList
    .map((item) => `${item.count} × ${item.spec.name}`)
    .join(' + ');

  const totalFleetCbmCapacity = mixList.reduce((sum, item) => sum + item.spec.cbmCapacity * item.count, 0);
  const totalFleetWeightCapacity = mixList.reduce((sum, item) => sum + item.spec.maxPayloadKg * item.count, 0);

  const volPercent = Math.min(100, Math.round((totalVolumeCbm / totalFleetCbmCapacity) * 100));
  const weightPercent = Math.min(100, Math.round((totalGrossWeightKg / totalFleetWeightCapacity) * 100));

  const rationale = `Recommended optimal equipment fleet: ${formattedMixString}. Calculated from total cargo volume (${totalVolumeCbm.toFixed(2)} CBM), total gross weight (${totalGrossWeightKg.toLocaleString()} kg), and package dimensions (max Hgt: ${maxHgtM.toFixed(2)}m). Achieves ${volPercent}% volume efficiency and ${weightPercent}% weight payload utilization across the mixed fleet without wasting equipment capacity.`;

  return {
    mix: mixList,
    totalFleetCount,
    primaryContainerType,
    formattedMixString,
    totalFleetCbmCapacity,
    totalFleetWeightCapacity,
    volPercent,
    weightPercent,
    rationale,
  };
};
