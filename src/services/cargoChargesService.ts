import encargoChargesData from '../assets/Encargo_charges.json';
import type { SubmittedRFQRecord } from '../types/rfq';
import type {
  LineItemChargeBreakdown,
  StageQuote,
  StageCategoryGroup,
  CategoryGroupedChargeLineItem,
  CategoryQuote,
  ChargeItemGroupBundle,
} from '../types/postSubmission';

export interface EncargoChargeRawItem {
  applicableScopes: string;
  category: string;
  stage: string;
  chargeName: string;
  mode: string[];
  notes: string;
}

/**
 * Filter line items from Encargo_charges.json and group them by specified categories for a stage
 */
export const getStageCategoryGroupsFromSchema = (
  stageId: number,
  record: SubmittedRFQRecord
): StageCategoryGroup[] => {
  const p = record.payload;
  const rawScope = (p.service_scope || 'D2D').toUpperCase();
  const scope: 'D2D' | 'D2P' | 'P2D' | 'P2P' =
    rawScope === 'D2P' ? 'D2P' : rawScope === 'P2D' ? 'P2D' : rawScope === 'P2P' ? 'P2P' : 'D2D';
  const isAir = (p.mode || 'Ship').toLowerCase() === 'air';

  const containerCount = Math.max(1, p.container_count || (p as any).containerCount || 1);
  const grossWeightKg = p.total_gross_weight_kg || (p as any).totalGrossWeightKg || 1000;

  let rawList: EncargoChargeRawItem[] = [];
  let allowedCategories: string[] = [];

  const detailed = encargoChargesData.detailed_line_items;

  if (stageId === 1) {
    // 1. First Mile – Trucking Pickup
    // Categories: First Mile / Transport
    rawList = detailed.origin;
    allowedCategories = ['First Mile / Transport'];
  } else if (stageId === 2) {
    // 2. Origin Port Handling & Export Customs
    // Categories: Packaging & Warehousing, Customs & Clearance, Customs & Compliance, Terminal & Port, Documentation & Admin, Contingent Charges
    rawList = detailed.origin;
    allowedCategories = [
      'Packaging & Warehousing',
      'Customs & Clearance',
      'Customs & Compliance',
      'Terminal & Port',
      'Documentation & Admin',
      'Contingent Charges',
    ];
  } else if (stageId === 3) {
    // 3. Main Haul Freight (Ocean or Air)
    if (isAir) {
      rawList = detailed.air_freight;
      allowedCategories = ['Base Freight', 'Surcharges', 'Security & Compliance', 'Contingent Charges'];
    } else {
      rawList = detailed.ocean_freight;
      allowedCategories = ['Base Freight', 'Surcharges', 'Security & Compliance'];
    }
  } else if (stageId === 4) {
    // 4. Destination Customs & Import Clearance
    // Categories: Port & Terminal, Warehousing & Handling, Customs & Clearance, Customs & Compliance, Statutory Charges
    rawList = detailed.destination;
    allowedCategories = [
      'Port & Terminal',
      'Warehousing & Handling',
      'Customs & Clearance',
      'Customs & Compliance',
      'Statutory Charges',
    ];
  } else if (stageId === 5) {
    // 5. Last Mile – Truck Delivery
    // Categories: Last Mile / Transport, Contingent Charges
    rawList = detailed.destination;
    allowedCategories = ['Last Mile / Transport', 'Contingent Charges'];
  } else if (stageId === 6) {
    // 6. Special Services (Marine Cargo Insurance)
    rawList = [
      {
        applicableScopes: 'ALL',
        category: 'Statutory Charges',
        stage: 'Insurance',
        chargeName: 'Marine Cargo Insurance Policy Premium',
        mode: ['Ocean', 'Air', 'Road'],
        notes: 'All-risk cargo marine insurance policy coverage based on declared cargo valuation.',
      },
      {
        applicableScopes: 'ALL',
        category: 'Statutory Charges',
        stage: 'Insurance',
        chargeName: 'Valuation & Policy Issuance Processing Fee',
        mode: ['Ocean', 'Air', 'Road'],
        notes: 'Underwriter policy generation and declaration processing fee.',
      },
    ];
    allowedCategories = ['Statutory Charges'];
  }

  // Filter raw list by scope and mode
  const scopeFiltered = rawList.filter((item) => {
    if (item.applicableScopes === 'ORIGIN_DOOR') {
      return scope === 'D2D' || scope === 'D2P';
    }
    if (item.applicableScopes === 'DEST_DOOR') {
      return scope === 'D2D' || scope === 'P2D';
    }
    return true;
  });

  // Provider Names depending on stage
  const providerA =
    stageId === 1
      ? 'Chennai FastTrack Logistics '
      : stageId === 2
        ? 'Madras Port Customs & Terminal '
        : stageId === 3
          ? isAir
            ? 'Emirates SkyCargo Line '
            : 'Maersk Ocean Liner Direct '
          : stageId === 4
            ? 'US Customs Brokerage Services '
            : stageId === 5
              ? 'Simi Valley Drayage & Trucking '
              : 'Allianz Global Marine Insurance ';

  const providerB =
    stageId === 1
      ? 'TCI Freight Express '
      : stageId === 2
        ? 'Apex Origin Clearance Agency '
        : stageId === 3
          ? isAir
            ? 'Cathay Cargo Express '
            : 'MSC Mediterranean Shipping '
          : stageId === 4
            ? 'CBP FastTrack Customs Brokers '
            : stageId === 5
              ? 'US Xpress Interstate Hauling '
              : 'AIG Cargo Protection ';

  // Group line items by allowed category
  const categoryGroups: StageCategoryGroup[] = [];

  allowedCategories.forEach((catName) => {
    const itemsInCat = scopeFiltered.filter((item) => item.category === catName);
    if (itemsInCat.length === 0) return;

    let totalCatBaseRate = 0;

    const lineItems: CategoryGroupedChargeLineItem[] = itemsInCat.map((item, idx) => {
      let baseChargeVal = 50;
      const nameLower = item.chargeName.toLowerCase();

      if (nameLower.includes('pickup') || nameLower.includes('drayage') || nameLower.includes('line haul')) {
        baseChargeVal = 250 * containerCount;
      } else if (nameLower.includes('fuel surcharge') || nameLower.includes('fsc')) {
        baseChargeVal = Math.round(65 * containerCount);
      } else if (nameLower.includes('base ocean freight')) {
        baseChargeVal = Math.round(2200 * containerCount);
      } else if (nameLower.includes('base rate - air')) {
        baseChargeVal = Math.round(Math.max(1500, grossWeightKg * 4.2));
      } else if (nameLower.includes('bunker adjustment') || nameLower.includes('baf')) {
        baseChargeVal = 180 * containerCount;
      } else if (nameLower.includes('low sulphur') || nameLower.includes('lss')) {
        baseChargeVal = 75 * containerCount;
      } else if (nameLower.includes('terminal handling') || nameLower.includes('thc')) {
        baseChargeVal = 160 * containerCount;
      } else if (nameLower.includes('customs') || nameLower.includes('cha') || nameLower.includes('brokerage')) {
        baseChargeVal = 120;
      } else if (nameLower.includes('bill of lading') || nameLower.includes('b/l') || nameLower.includes('awb')) {
        baseChargeVal = 60;
      } else if (nameLower.includes('vgm')) {
        baseChargeVal = 25 * containerCount;
      } else if (nameLower.includes('seal')) {
        baseChargeVal = 15 * containerCount;
      } else if (nameLower.includes('delivery order') || nameLower.includes('d/o')) {
        baseChargeVal = 85;
      } else if (nameLower.includes('insurance')) {
        baseChargeVal = Math.round(Math.max(120, ((p as any).cargo_value || 50000) * 0.003));
      } else {
        baseChargeVal = Math.round(35 + (idx % 4) * 20);
      }

      // Surcharges for Hazardous & Reefer
      if (p.hazardous_materials && (nameLower.includes('examination') || nameLower.includes('handling') || nameLower.includes('security'))) {
        baseChargeVal = Math.round(baseChargeVal * 1.3);
      }
      if (p.temperature_control_required && (nameLower.includes('freight') || nameLower.includes('terminal') || nameLower.includes('handling'))) {
        baseChargeVal = Math.round(baseChargeVal * 1.25);
      }

      totalCatBaseRate += baseChargeVal;

      return {
        id: `line-item-s${stageId}-${catName.replace(/[^a-zA-Z0-9]/g, '_')}-${idx}`,
        chargeName: item.chargeName,
        category: item.category,
        stage: item.stage,
        notes: item.notes,
        applicableScopes: item.applicableScopes,
        mode: item.mode,
        selectedRate: baseChargeVal,
      };
    });

    const itemizedAmountsA: Record<string, number> = {};
    const itemizedAmountsB: Record<string, number> = {};
    lineItems.forEach((li) => {
      itemizedAmountsA[li.id] = li.selectedRate;
      itemizedAmountsB[li.id] = Math.round(li.selectedRate * 1.08);
    });

    const catRateB = Math.round(totalCatBaseRate * 1.08);

    // Generate combined charge set bundles for Quote A (Grouping 2 or 3 items per set)
    let bundlesA: ChargeItemGroupBundle[] = [];
    if (lineItems.length >= 2) {
      const groupCount = Math.min(3, lineItems.length);
      const set1Items = lineItems.slice(0, groupCount);
      const set1Rate = set1Items.reduce((sum, item) => sum + item.selectedRate, 0);

      bundlesA.push({
        groupId: `bundle-s${stageId}-${catName.replace(/[^a-zA-Z0-9]/g, '_')}-1`,
        groupName: `${catName} Combined Set`,
        lineItemIds: set1Items.map((li) => li.id),
        bundleRate: set1Rate,
      });

      if (lineItems.length > groupCount) {
        const set2Items = lineItems.slice(groupCount);
        const set2Rate = set2Items.reduce((sum, item) => sum + item.selectedRate, 0);

        bundlesA.push({
          groupId: `bundle-s${stageId}-${catName.replace(/[^a-zA-Z0-9]/g, '_')}-2`,
          groupName: `${catName} Auxiliary Package Set`,
          lineItemIds: set2Items.map((li) => li.id),
          bundleRate: set2Rate,
        });
      }
    }

    const categoryQuotes: CategoryQuote[] = [
      {
        id: `q-cat-a-s${stageId}-${catName.replace(/[^a-zA-Z0-9]/g, '_')}`,
        providerName: providerA,
        type: 'third_party',
        baseRate: totalCatBaseRate,
        markupValue: 0,
        finalRate: totalCatBaseRate,
        isSelected: true,
        rateMode: lineItems.length >= 2 ? 'grouped_sets' : 'category_lump',
        itemizedAmounts: itemizedAmountsA,
        bundles: bundlesA,
        transitTime: '1-2 Days',
        notes: `Primary vendor pitched rate for ${catName}`,
      },
      {
        id: `q-cat-b-s${stageId}-${catName.replace(/[^a-zA-Z0-9]/g, '_')}`,
        providerName: providerB,
        type: 'third_party',
        baseRate: catRateB,
        markupValue: 0,
        finalRate: catRateB,
        isSelected: false,
        rateMode: 'category_lump',
        itemizedAmounts: itemizedAmountsB,
        transitTime: '1-2 Days',
        notes: `Alternative vendor pitched rate for ${catName}`,
      },
    ];

    categoryGroups.push({
      categoryName: catName,
      categoryQuotes,
      lineItems,
    });
  });

  return categoryGroups;
};

/**
 * Filter line items from Encargo_charges.json according to user selected RFQ parameters
 */
export const getStageChargesFromSchema = (
  stageId: number,
  record: SubmittedRFQRecord
): LineItemChargeBreakdown[] => {
  const groups = getStageCategoryGroupsFromSchema(stageId, record);
  const items: LineItemChargeBreakdown[] = [];

  groups.forEach((group) => {
    group.lineItems.forEach((item) => {
      const activeQuote = item.quotes && item.quotes.length > 0 ? (item.quotes.find((q) => q.isSelected) || item.quotes[0]) : null;
      items.push({
        id: item.id,
        chargeName: item.chargeName,
        category: item.category,
        amount: activeQuote ? activeQuote.finalRate : item.selectedRate,
        notes: item.notes,
        isMandatory: item.applicableScopes === 'ALL',
      });
    });
  });

  return items;
};

/**
 * Generate rate options for a stage strictly calculated from Encargo_charges.json line item charges
 */
export const generateSchemaQuotesForStage = (
  stageId: number,
  record: SubmittedRFQRecord,
  stageCategoryName: string
): StageQuote[] => {
  const groups = getStageCategoryGroupsFromSchema(stageId, record);
  const lineItems = getStageChargesFromSchema(stageId, record);
  const totalSchemaBase = lineItems.reduce((sum, item) => sum + item.amount, 0);

  const providerA =
    stageId === 1
      ? 'Chennai FastTrack Freight '
      : stageId === 2
        ? 'Madras Port Customs & Terminal Services '
        : stageId === 3
          ? record.payload.mode === 'Air'
            ? 'Emirates SkyCargo Line '
            : 'Maersk Ocean Liner Direct '
          : stageId === 4
            ? 'US Customs Brokerage Services '
            : stageId === 5
              ? 'Simi Valley Interstate Drayage '
              : 'Allianz Global Marine Insurance ';

  const providerB =
    stageId === 1
      ? 'TCI Logistics Express '
      : stageId === 2
        ? 'Apex Origin Clearance Agency '
        : stageId === 3
          ? record.payload.mode === 'Air'
            ? 'Cathay Cargo Express '
            : 'MSC Mediterranean Shipping '
          : stageId === 4
            ? 'CBP FastTrack Customs Brokers '
            : stageId === 5
              ? 'US Xpress Interstate Hauling '
              : 'AIG Cargo Protection ';

  const baseA = totalSchemaBase;
  const markupA = Math.round(baseA * 0.1);
  const baseB = Math.round(totalSchemaBase * 1.08);
  const markupB = 0;
  const baseThisai = Math.round(totalSchemaBase * 0.92);
  const markupThisai = Math.round(baseThisai * 0.05);

  return [
    {
      id: `q-s${stageId}-1`,
      type: 'third_party',
      providerName: providerA,
      baseRate: baseA,
      markupType: 'flat',
      markupValue: markupA,
      markupCalculatedAmount: markupA,
      finalRate: baseA + markupA,
      transitTime: stageId === 3 ? (record.payload.mode === 'Air' ? '2-3 Days' : '18-22 Days') : '1-2 Days',
      validUntil: '2026-10-30',
      notes: `Mapped across ${groups.length} categories and ${lineItems.length} charge line items from Encargo_charges.json.`,
      isSelected: true,
      chargesBreakdown: lineItems,
      categoryGroups: groups,
    },
    {
      id: `q-s${stageId}-2`,
      type: 'third_party',
      providerName: providerB,
      baseRate: baseB,
      markupType: 'flat',
      markupValue: markupB,
      markupCalculatedAmount: markupB,
      finalRate: baseB + markupB,
      transitTime: stageId === 3 ? (record.payload.mode === 'Air' ? '3-4 Days' : '20-24 Days') : '1-2 Days',
      validUntil: '2026-11-15',
      notes: `Alternative vendor rate across ${groups.length} category groups.`,
      isSelected: false,
      chargesBreakdown: lineItems.map((item) => ({ ...item, amount: Math.round(item.amount * 1.08) })),
      categoryGroups: groups,
    },
    {
      id: `q-s${stageId}-3`,
      type: 'thisai',
      providerName: `THISAI Direct ${stageCategoryName} Rate`,
      baseRate: baseThisai,
      markupType: 'flat',
      markupValue: markupThisai,
      markupCalculatedAmount: markupThisai,
      finalRate: baseThisai + markupThisai,
      transitTime: stageId === 3 ? (record.payload.mode === 'Air' ? '2 Days' : '19 Days') : '1 Day',
      validUntil: '2026-12-31',
      notes: `THISAI direct volume contract tier rate.`,
      isSelected: false,
      chargesBreakdown: lineItems.map((item) => ({ ...item, amount: Math.round(item.amount * 0.95) })),
      categoryGroups: groups,
    },
  ];
};
