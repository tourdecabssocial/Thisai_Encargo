import {
  getStageDocumentsFromSchema,
  getHSChapterComplianceFromSchema,
  resolveTradeLane,
} from './cargoDocService';

export type TransportMode = 'Air' | 'FCL' | 'LCL' | 'Road' | 'Ship';
export type ServiceType = 'Door-to-Door' | 'Door-to-Port' | 'Port-to-Door' | 'Port-to-Port';
export type DocumentImportance = 'mandatory' | 'regulatory' | 'recommended' | 'conditional';

export interface StageDocument {
  name: string;
  importance: DocumentImportance;
  issuer: string;
  recipient?: string;
  description: string;
  bullets?: string[];
  applicableScopes?: ServiceType[];
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
  iconType: 'pickup' | 'truck' | 'warehouse' | 'customs' | 'plane' | 'ship' | 'delivery' | 'file-text';
  category: 'Origin' | 'Main Freight' | 'Destination';
  activities: string[];
  documents: StageDocument[];
  milestones: StageMilestone[];
  proTip: string;
}

export interface LifecycleEngineInput {
  transportMode: TransportMode;
  serviceType: ServiceType;
  originPortOrCity?: string;
  destinationPortOrCity?: string;
  isHazmat?: boolean;
  isReefer?: boolean;
  incoterm?: string;
  hsCode?: string;
}

// Convert full service name to scope code ('D2D', 'D2P', 'P2D', 'P2P')
const toScopeCode = (service: ServiceType): 'D2D' | 'D2P' | 'P2D' | 'P2P' => {
  switch (service) {
    case 'Door-to-Port': return 'D2P';
    case 'Port-to-Door': return 'P2D';
    case 'Port-to-Port': return 'P2P';
    default: return 'D2D';
  }
};

/**
 * Dynamically generates shipment route lifecycle stages and document requirements
 * strictly leveraging Cargo Doc.json master schema.
 */
export const generateShipmentRouteLifecycle = (input: LifecycleEngineInput): RouteStage[] => {
  const mode = input.transportMode || 'FCL';
  const service = input.serviceType || 'Door-to-Door';
  const scopeCode = toScopeCode(service);
  const origin = input.originPortOrCity || 'Origin Location';
  const destination = input.destinationPortOrCity || 'Destination Location';
  const isHazmat = Boolean(input.isHazmat);
  const isReefer = Boolean(input.isReefer);

  const tradeLane = resolveTradeLane(origin, destination);
  const schemaStages = getStageDocumentsFromSchema(tradeLane, scopeCode);
  const hsCompliance = getHSChapterComplianceFromSchema(input.hsCode, tradeLane);

  const stages: RouteStage[] = [];
  let stageCount = 1;

  // Filter stage groups visible for selected scope
  const visibleSchemaStages = schemaStages.filter((st) => st.visible_scopes.includes(scopeCode));

  visibleSchemaStages.forEach((s) => {
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

    // Inject HS Chapter compliance documents as separate individual documents into Stage 1 (Origin)
    if (s.stage_id === 1 && hsCompliance && hsCompliance.exportAgencyDocs.length > 0) {
      hsCompliance.exportAgencyDocs.forEach((docTitle: string) => {
        mappedDocs.push({
          name: docTitle,
          importance: 'mandatory',
          issuer: `Export Regulatory Agency (HS Ch. ${hsCompliance.chapter})`,
          description: `Mandatory export document for HS ${hsCompliance.hsRange} (${hsCompliance.scope}).`,
        });
      });
    }

    // Inject HS Chapter compliance documents as separate individual documents into Stage 4 (Destination Customs)
    if (s.stage_id === 4 && hsCompliance && hsCompliance.importAgencyDocs.length > 0) {
      hsCompliance.importAgencyDocs.forEach((docTitle: string) => {
        mappedDocs.push({
          name: docTitle,
          importance: 'mandatory',
          issuer: `Import Regulatory Agency / PGA (HS Ch. ${hsCompliance.chapter})`,
          description: `Mandatory import clearance permit for HS ${hsCompliance.hsRange} (${hsCompliance.scope}).`,
        });
      });
    }

    // Inject Hazmat & Reefer special documents from Cargo Doc.json specs
    if (isReefer && s.stage_id === 1) {
      mappedDocs.push({
        name: 'Cold Chain Temperature Setting Instructions',
        importance: 'mandatory',
        issuer: 'Shipper / Cold Chain Operator',
        description: 'Explicit temperature setpoint and vent setting for reefer container provided to terminal.',
      });
    }

    if (isHazmat && (s.stage_id === 2 || s.stage_id === 4)) {
      mappedDocs.push({
        name: 'IMO Hazmat Approval & Terminal DG Gate Pass',
        importance: 'mandatory',
        issuer: 'Port Authority / IMO Safety Officer',
        description: 'Dangerous Goods terminal entry approval required before hazmat container gate-in.',
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
      proTip: `Ensure all ${mappedDocs.filter((d) => d.importance === 'mandatory').length} mandatory documents are verified before proceeding past Stage ${s.stage_id}.`,
    });
  });

  return stages;
};
