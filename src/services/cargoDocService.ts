import cargoDocSchema from '../assets/Cargo Doc.json';

export interface CargoDocItem {
  name: string;
  importance: 'mandatory' | 'conditional';
  category: 'Origin' | 'Freight' | 'Destination';
  issuer: string;
  recipient: string;
  applicableScopes: string[];
  status: string;
  description: string;
}

export interface CargoStageGroup {
  stage_id: number;
  stage_name: string;
  visible_scopes: string[];
  sub_stages: string[];
  documents: CargoDocItem[];
}

/**
 * Resolves trade lane ('IN_to_US' | 'US_to_IN') based on origin & destination strings.
 */
export const resolveTradeLane = (origin?: string, destination?: string): 'IN_to_US' | 'US_to_IN' => {
  const o = (origin || '').toLowerCase().trim();
  const d = (destination || '').toLowerCase().trim();

  // Word-boundary matching to avoid false positives on words like "customs" or "warehouse"
  const usRegex = /\b(us|usa|united states|new york|los angeles|chicago|simi valley|usboy|uslax|usnyc)\b/;
  const indiaRegex = /\b(india|chennai|inmaa|mumbai|nhava sheva|innsa|delhi|bangalore|kolkata|mundra|hyderabad)\b/;

  const isOriginUS = usRegex.test(o) && !indiaRegex.test(o);
  const isDestIndia = indiaRegex.test(d) && !usRegex.test(d);

  if (isOriginUS || isDestIndia) {
    return 'US_to_IN';
  }

  return 'IN_to_US';
};

/**
 * Gets stage milestone documents for a trade lane and service scope from Cargo Doc.json
 */
export const getStageDocumentsFromSchema = (
  tradeLane: 'IN_to_US' | 'US_to_IN',
  scopeCode: string // 'D2D', 'D2P', 'P2D', 'P2P'
): CargoStageGroup[] => {
  const laneStages = cargoDocSchema.stage_milestone_documents[tradeLane] || [];

  return laneStages.map((stage: any) => {
    // Filter documents applicable to this scope
    const filteredDocs = (stage.documents || []).filter((doc: any) => {
      if (!doc.applicableScopes || doc.applicableScopes.length === 0) return true;
      return doc.applicableScopes.includes(scopeCode);
    });

    return {
      stage_id: stage.stage_id,
      stage_name: stage.stage_name,
      visible_scopes: stage.visible_scopes || [],
      sub_stages: stage.sub_stages || [],
      documents: filteredDocs,
    };
  });
};

/**
 * Gets HS Chapter specific compliance document requirements from Cargo Doc.json
 */
export const getHSChapterComplianceFromSchema = (
  hsCode?: string,
  tradeLane: 'IN_to_US' | 'US_to_IN' = 'IN_to_US'
) => {
  if (!hsCode) return null;
  const clean = hsCode.replace(/[^0-9]/g, '');
  if (clean.length < 2) return null;

  const chapterStr = clean.substring(0, 2).padStart(2, '0');
  const match = (cargoDocSchema.chapters as any[]).find((ch) => ch.chapter === chapterStr);

  if (!match) return null;

  const isExportIN = tradeLane === 'IN_to_US';
  const exportAgencyDocs = isExportIN ? match.export?.India : match.export?.US;
  const importAgencyDocs = isExportIN ? match.import?.US : match.import?.India;

  return {
    chapter: match.chapter as string,
    hsRange: match.hs_range as string,
    scope: match.scope as string,
    exportAgencyDocs: (exportAgencyDocs || []) as string[],
    importAgencyDocs: (importAgencyDocs || []) as string[],
  };
};

/**
 * Gets documents for special value-add services (insurance, fumigation, hazmat, reefer) from Cargo Doc.json
 */
export const getSpecialServiceDocumentsFromSchema = (
  serviceKey: 'insurance' | 'fumigation' | 'hazmat' | 'reefer'
): CargoDocItem[] => {
  const specialDocs = (cargoDocSchema as any).special_services_documents?.[serviceKey] || [];
  return specialDocs;
};
