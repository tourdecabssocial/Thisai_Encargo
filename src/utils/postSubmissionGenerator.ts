import type { SubmittedRFQRecord } from '../types/rfq';
import type { ShipmentStage, StageDocument } from '../types/postSubmission';
import {
  getStageDocumentsFromSchema,
  getHSChapterComplianceFromSchema,
  getSpecialServiceDocumentsFromSchema,
  resolveTradeLane,
} from '../services/cargoDocService';
import { generateSchemaQuotesForStage } from '../services/cargoChargesService';

/**
 * Dynamically generates post-submission shipment stages, rates, and stage document checklists
 * strictly driven by the master schemas in Cargo Doc.json and Encargo_charges.json based on user submitted RFQ details.
 */
export const generateDynamicPostSubmissionStages = (
  record: SubmittedRFQRecord
): ShipmentStage[] => {
  const p = record.payload;
  const stages: ShipmentStage[] = [];

  const originText = p.origin_location || 'Origin Address';
  const destText = p.destination_location || 'Destination Address';
  const originPortText = p.from_port_code ? `${p.from_port_code} Port` : 'Origin Port';
  const destPortText = p.to_port_code ? `${p.to_port_code} Port` : 'Destination Port';

  const rawScope = (p.service_scope || 'D2D').toUpperCase();
  const scope: 'D2D' | 'D2P' | 'P2D' | 'P2P' =
    rawScope === 'D2P' ? 'D2P' : rawScope === 'P2D' ? 'P2D' : rawScope === 'P2P' ? 'P2P' : 'D2D';
  const isAir = (p.mode || 'Ship').toLowerCase() === 'air';

  const tradeLane = resolveTradeLane(originText, destText);
  const schemaStages = getStageDocumentsFromSchema(tradeLane, scope);
  const hsCompliance = getHSChapterComplianceFromSchema(p.hs_code, tradeLane);

  // Dynamic helper: retrieves documents from Cargo Doc.json for stageId and applies user-specific extras
  const buildStageDocumentsFromSchema = (
    stageId: number,
    additionalRegulatoryDocs: string[] = []
  ): StageDocument[] => {
    const stageSchema = schemaStages.find((s) => s.stage_id === stageId);
    if (!stageSchema) return [];

    const docs: StageDocument[] = stageSchema.documents.map((doc, idx) => ({
      id: `doc-s${stageId}-${idx + 1}`,
      name: doc.name,
      description: `${doc.description} [Issuer: ${doc.issuer}${doc.recipient ? ` ➔ ${doc.recipient}` : ''}]`,
      status: idx === 0 || idx === 1 ? 'verified' : idx === 2 ? 'collected' : 'pending',
      fileName: idx === 0 ? `${doc.name.replace(/[^a-zA-Z0-9]/g, '_')}_APPROVED.pdf` : undefined,
      uploadedAt: idx === 0 ? 'Today, 10:15 AM' : idx === 2 ? 'Today, 11:30 AM' : undefined,
    }));

    // Append regulatory/commodity compliance documents from Cargo Doc.json (HS Chapter rules)
    additionalRegulatoryDocs.forEach((docName, idx) => {
      docs.push({
        id: `doc-s${stageId}-reg-${idx + 1}`,
        name: docName,
        description: `HS Chapter ${hsCompliance?.chapter || ''} (${hsCompliance?.scope || 'Regulatory Compliance'}) requirement from Cargo Doc.json.`,
        status: 'pending',
      });
    });

    return docs;
  };

  const isLiveLoading = Boolean(
    p.loading_type && String(p.loading_type).toLowerCase().includes('live')
  );

  // 1. First Mile Trucking (Stage 1 in Cargo Doc.json & Encargo_charges.json)
  if (scope === 'D2D' || scope === 'D2P') {
    const stage1Extra: string[] = [];
    if (hsCompliance && hsCompliance.exportAgencyDocs.length > 0) {
      stage1Extra.push(...hsCompliance.exportAgencyDocs);
    }
    if (p.has_wood_packaging || p.crating_service_required) {
      const fumiDocs = getSpecialServiceDocumentsFromSchema('fumigation');
      stage1Extra.push(...fumiDocs.map((d) => d.name));
    }

    stages.push({
      id: 'stage-first-mile',
      stageName: 'First Mile – Trucking Pickup',
      category: 'first_mile',
      locationInfo: `${originText} → ${originPortText}`,
      iconType: 'truck',
      quotes: isLiveLoading ? [] : generateSchemaQuotesForStage(1, record, 'First Mile Trucking'),
      documents: buildStageDocumentsFromSchema(1, stage1Extra),
    });
  }

  // 2. Origin Port Handling & Export Customs (Stage 2 in Cargo Doc.json & Encargo_charges.json)
  if (scope === 'D2D' || scope === 'D2P' || scope === 'P2D' || p.origin_customs_clearance) {
    const stage2Extra: string[] = [];
    if (p.hazardous_materials) {
      const hazDocs = getSpecialServiceDocumentsFromSchema('hazmat');
      stage2Extra.push(...hazDocs.map((d) => d.name));
    }

    stages.push({
      id: 'stage-origin-customs',
      stageName: 'Origin Port Handling & Export Customs',
      category: 'origin_customs',
      locationInfo: `${originPortText} Terminal`,
      iconType: 'customs',
      quotes: generateSchemaQuotesForStage(2, record, 'Export Customs & Port Services'),
      documents: buildStageDocumentsFromSchema(2, stage2Extra),
    });
  }

  // 3. Main Haul Freight (Stage 3 in Cargo Doc.json & Encargo_charges.json)
  const mainHaulName = isAir
    ? 'Main Haul – Air Freight Express'
    : `Main Haul – Ocean Freight (${p.load_type || 'FCL'})`;

  const stage3Extra: string[] = [];
  if (p.temperature_control_required) {
    const reeferDocs = getSpecialServiceDocumentsFromSchema('reefer');
    stage3Extra.push(...reeferDocs.map((d) => d.name));
  }

  stages.push({
    id: 'stage-main-haul',
    stageName: mainHaulName,
    category: 'main_haul',
    locationInfo: `${originPortText} → ${destPortText}`,
    iconType: isAir ? 'plane' : 'ship',
    quotes: generateSchemaQuotesForStage(3, record, isAir ? 'Air Freight' : 'Ocean Freight'),
    documents: buildStageDocumentsFromSchema(3, stage3Extra),
  });

  // 4. Destination Customs & Import Clearance (Stage 4 in Cargo Doc.json & Encargo_charges.json)
  if (scope === 'D2D' || scope === 'P2D' || scope === 'P2P' || p.destination_customs_clearance) {
    const stage4Extra: string[] = [];
    if (hsCompliance && hsCompliance.importAgencyDocs.length > 0) {
      stage4Extra.push(...hsCompliance.importAgencyDocs);
    }

    stages.push({
      id: 'stage-dest-customs',
      stageName: 'Destination Customs & Import Clearance',
      category: 'dest_customs',
      locationInfo: `${destPortText} Port`,
      iconType: 'customs',
      quotes: generateSchemaQuotesForStage(4, record, 'Import Customs & Port Services'),
      documents: buildStageDocumentsFromSchema(4, stage4Extra),
    });
  }

  // 5. Last Mile Delivery – Trucking (Stage 5 in Cargo Doc.json & Encargo_charges.json)
  if (scope === 'D2D' || scope === 'P2D') {
    stages.push({
      id: 'stage-last-mile',
      stageName: 'Last Mile – Truck Delivery',
      category: 'last_mile',
      locationInfo: `${destPortText} → ${destText}`,
      iconType: 'truck',
      quotes: generateSchemaQuotesForStage(5, record, 'Last Mile Delivery'),
      documents: buildStageDocumentsFromSchema(5),
    });
  }

  // 6. Marine Cargo Insurance (Special Service)
  if (p.insurance_required) {
    const insuranceSchemaDocs = getSpecialServiceDocumentsFromSchema('insurance');
    const insuranceDocs: StageDocument[] = insuranceSchemaDocs.map((doc, idx) => ({
      id: `doc-ins-${idx + 1}`,
      name: doc.name,
      description: `${doc.description} [Issuer: ${doc.issuer}${doc.recipient ? ` ➔ ${doc.recipient}` : ''}]`,
      status: 'verified',
      fileName: idx === 0 ? 'Insurance_Policy_Cert_ALLIANZ.pdf' : 'Cargo_Valuation_Statement.pdf',
      uploadedAt: idx === 0 ? 'Today, 08:00 AM' : 'Yesterday',
    }));

    stages.push({
      id: 'stage-insurance',
      stageName: 'Cargo Marine Insurance Policy',
      category: 'special_service',
      locationInfo: 'Full Transit Coverage',
      iconType: 'shield',
      quotes: generateSchemaQuotesForStage(6, record, 'Marine Insurance'),
      documents: insuranceDocs,
    });
  }

  // Ensure export HS compliance documents are attached to the first stage of the route (e.g. for P2P/P2D)
  if (hsCompliance && hsCompliance.exportAgencyDocs.length > 0 && stages.length > 0) {
    const hasExportDocs = stages.some((st) =>
      st.documents.some((d) => hsCompliance.exportAgencyDocs.includes(d.name))
    );
    if (!hasExportDocs) {
      const firstStage = stages[0];
      hsCompliance.exportAgencyDocs.forEach((docName, idx) => {
        firstStage.documents.push({
          id: `doc-${firstStage.id}-hs-exp-${idx + 1}`,
          name: docName,
          description: `HS Chapter ${hsCompliance.chapter} (${hsCompliance.scope}) mandatory export requirement from Cargo Doc.json.`,
          status: 'pending',
        });
      });
    }
  }

  return stages;
};
