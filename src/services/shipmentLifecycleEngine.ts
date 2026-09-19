import {
  getStageDocumentsFromSchema,
  getHSChapterComplianceFromSchema,
  getSpecialServiceDocumentsFromSchema,
  resolveTradeLane,
} from './cargoDocService';

export interface StageDocument {
  name: string;
  importance: 'mandatory' | 'conditional' | 'recommended' | 'regulatory';
  issuer: string;
  recipient?: string;
  description: string;
  bullets?: string[];
}

export interface StageMilestone {
  code: string;
  title: string;
  description: string;
}

export interface RouteStage {
  id: string;
  stageNumber: number;
  title: string;
  subtitle: string;
  iconType: 'pickup' | 'customs' | 'ship' | 'plane' | 'delivery' | 'warehouse' | 'file-text' | 'truck';
  category: 'Origin' | 'Main Freight' | 'Destination';
  activities: string[];
  documents: StageDocument[];
  milestones: StageMilestone[];
  isCompleted?: boolean;
  isInProgress?: boolean;
  proTip?: string;
}

export interface LifecycleInput {
  origin: string;
  destination: string;
  originPortOrCity?: string;
  destinationPortOrCity?: string;
  serviceType?: string;
  transportMode?: string;
  scope: string; // 'D2D' | 'D2P' | 'P2D' | 'P2P'
  mode: string; // 'Ship' | 'Air'
  hsCode?: string;
  commercialItems?: Array<{ description?: string; originHsCode?: string; destHsCode?: string; hsCode?: string }>;
  isReefer?: boolean;
  isHazmat?: boolean;
}

export type LifecycleEngineInput = LifecycleInput;

/**
 * Generates dynamic, multi-commodity shipment route lifecycle stages driven by Cargo Doc.json.
 */
export function generateShipmentRouteLifecycle(input: LifecycleInput): RouteStage[] {
  const { origin, destination, scope, mode, isReefer, isHazmat } = input;
  const tradeLane = resolveTradeLane(origin, destination);
  const scopeCode = (scope || 'D2D').toUpperCase() as 'D2D' | 'D2P' | 'P2D' | 'P2P';
  const schemaStages = getStageDocumentsFromSchema(tradeLane, scopeCode);

  const commercialItems = input.commercialItems && input.commercialItems.length > 0
    ? input.commercialItems
    : [{ description: 'Cargo Item', originHsCode: input.hsCode, destHsCode: input.hsCode, hsCode: input.hsCode }];

  interface AggregatedHSDoc {
    docName: string;
    chapter: string;
    scope: string;
    hsRange: string;
    commodityName: string;
    commodityIndex: number;
  }

  const exportAgencyDocsList: AggregatedHSDoc[] = [];
  const importAgencyDocsList: AggregatedHSDoc[] = [];

  commercialItems.forEach((item, index) => {
    const commName = item.description || `Commodity #${index + 1}`;

    const originHs = item.originHsCode || item.hsCode || input.hsCode;
    const originComp = getHSChapterComplianceFromSchema(originHs, tradeLane);
    if (originComp && originComp.exportAgencyDocs) {
      originComp.exportAgencyDocs.forEach((docName) => {
        exportAgencyDocsList.push({
          docName,
          chapter: originComp.chapter,
          scope: originComp.scope,
          hsRange: originComp.hsRange,
          commodityName: commName,
          commodityIndex: index + 1,
        });
      });
    }

    const destHs = item.destHsCode || item.hsCode || input.hsCode;
    const destComp = getHSChapterComplianceFromSchema(destHs, tradeLane);
    if (destComp && destComp.importAgencyDocs) {
      destComp.importAgencyDocs.forEach((docName) => {
        importAgencyDocsList.push({
          docName,
          chapter: destComp.chapter,
          scope: destComp.scope,
          hsRange: destComp.hsRange,
          commodityName: commName,
          commodityIndex: index + 1,
        });
      });
    }
  });

  const stages: RouteStage[] = [];
  let stageCount = 1;

  // Filter stage groups visible for selected scope
  const visibleSchemaStages = schemaStages.filter((st) => st.visible_scopes.includes(scopeCode));

  visibleSchemaStages.forEach((s, idx) => {
    let iconType: RouteStage['iconType'] = 'file-text';
    let category: RouteStage['category'] = 'Origin';

    if (s.stage_id === 1) {
      iconType = 'pickup';
      category = 'Origin';
    } else if (s.stage_id === 2) {
      iconType = mode === 'Air' ? 'warehouse' : 'customs';
      category = 'Origin';
    } else if (s.stage_id === 3) {
      iconType = mode === 'Air' ? 'plane' : 'ship';
      category = 'Main Freight';
    } else if (s.stage_id === 4) {
      iconType = 'customs';
      category = 'Destination';
    } else if (s.stage_id === 5) {
      iconType = 'delivery';
      category = 'Destination';
    }

    // Map documents from Cargo Doc.json schema
    const mappedDocs: StageDocument[] = s.documents.map((doc) => ({
      name: doc.name,
      importance: doc.importance === 'mandatory' ? 'mandatory' : 'conditional',
      issuer: doc.issuer,
      recipient: doc.recipient,
      description: doc.description,
    }));

    // Inject HS Chapter compliance documents into the 1st visible stage of the route (e.g. Stage 1 for D2D/D2P, Stage 3 for P2P)
    if (idx === 0 && exportAgencyDocsList.length > 0) {
      exportAgencyDocsList.forEach((expDoc) => {
        mappedDocs.push({
          name: `${expDoc.docName} (Item #${expDoc.commodityIndex}: ${expDoc.commodityName})`,
          importance: 'mandatory',
          issuer: `Export Regulatory Agency (HS Ch. ${expDoc.chapter})`,
          description: `Mandatory export document for HS ${expDoc.hsRange} (${expDoc.scope}) — Item #${expDoc.commodityIndex}: ${expDoc.commodityName}.`,
        });
      });
    }

    // Inject HS Chapter compliance documents as separate individual documents into Stage 4 (Destination Customs)
    if (s.stage_id === 4 && importAgencyDocsList.length > 0) {
      importAgencyDocsList.forEach((impDoc) => {
        mappedDocs.push({
          name: `${impDoc.docName} (Item #${impDoc.commodityIndex}: ${impDoc.commodityName})`,
          importance: 'mandatory',
          issuer: `Import Regulatory Agency / PGA (HS Ch. ${impDoc.chapter})`,
          description: `Mandatory import clearance permit for HS ${impDoc.hsRange} (${impDoc.scope}) — Item #${impDoc.commodityIndex}: ${impDoc.commodityName}.`,
        });
      });
    }

    // Inject Hazmat & Reefer special documents directly from Cargo Doc.json specs
    if (isReefer && s.stage_id === 1) {
      const reeferSchemaDocs = getSpecialServiceDocumentsFromSchema('reefer');
      reeferSchemaDocs.forEach((doc) => {
        mappedDocs.push({
          name: doc.name,
          importance: doc.importance === 'mandatory' ? 'mandatory' : 'conditional',
          issuer: doc.issuer,
          recipient: doc.recipient,
          description: doc.description,
        });
      });
    }

    if (isHazmat && (s.stage_id === 2 || s.stage_id === 4)) {
      const hazmatSchemaDocs = getSpecialServiceDocumentsFromSchema('hazmat');
      hazmatSchemaDocs.forEach((doc) => {
        mappedDocs.push({
          name: doc.name,
          importance: doc.importance === 'mandatory' ? 'mandatory' : 'conditional',
          issuer: doc.issuer,
          recipient: doc.recipient,
          description: doc.description,
        });
      });
    }

    // Create dynamic sub-stage activities list from Cargo Doc.json sub_stages
    const activitiesList = s.sub_stages.length > 0
      ? s.sub_stages.map((st) => `Milestone ${st}: Document collection and verification.`)
      : ['Processing required stage documents and authority approvals.'];

    // Stage milestones
    const milestones: StageMilestone[] = s.documents.slice(0, 3).map((d, idx) => ({
      code: `DOC_STAGE_${s.stage_id}_${idx + 1}`,
      title: `${d.name} (${d.issuer})`,
      description: d.description,
    }));

    stages.push({
      id: `stage_${s.stage_id}`,
      stageNumber: stageCount++,
      title: s.stage_name,
      subtitle: s.stage_id === 3 ? `${origin} ➔ ${destination}` : `Stage ${s.stage_id} Workflow`,
      iconType,
      category,
      activities: activitiesList,
      documents: mappedDocs,
      milestones,
    });
  });

  return stages;
}
