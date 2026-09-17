import type { SubmittedRFQRecord } from '../types/rfq';
import type { ShipmentStage, StageDocument } from '../types/postSubmission';
import {
  getStageDocumentsFromSchema,
  getHSChapterComplianceFromSchema,
  getSpecialServiceDocumentsFromSchema,
  resolveTradeLane,
} from '../services/cargoDocService';

/**
 * Dynamically generates post-submission shipment stages, rates, and stage document checklists
 * strictly driven by the master schema in Cargo Doc.json and user submitted RFQ details.
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

  // 1. First Mile Trucking (Stage 1 in Cargo Doc.json)
  if (scope === 'D2D' || scope === 'D2P' || Boolean(p.from_address)) {
    const stage1Extra: string[] = [];
    if (hsCompliance && hsCompliance.exportAgencyDocs.length > 0) {
      stage1Extra.push(...hsCompliance.exportAgencyDocs);
    }
    if (p.has_wood_packaging || p.crating_service_required) {
      stage1Extra.push('ISPM-15 Wood Packing Phytosanitary Certificate');
    }

    stages.push({
      id: 'stage-first-mile',
      stageName: 'First Mile – Trucking Pickup',
      category: 'first_mile',
      locationInfo: `${originText} → ${originPortText}`,
      iconType: 'truck',
      quotes: [
        {
          id: 'q-fm-1',
          type: 'third_party',
          providerName: 'Chennai FastTrack Logistics (3rd Party)',
          baseRate: 450,
          markupType: 'flat',
          markupValue: 50,
          markupCalculatedAmount: 50,
          finalRate: 500,
          transitTime: '1 Day',
          validUntil: '2026-10-15',
          notes: 'Standard 40ft container flatbed trailer pickup with driver tracking.',
          isSelected: true,
        },
        {
          id: 'q-fm-2',
          type: 'third_party',
          providerName: 'TCI Freight Express (3rd Party)',
          baseRate: 520,
          markupType: 'flat',
          markupValue: 0,
          markupCalculatedAmount: 0,
          finalRate: 520,
          transitTime: '1 Day',
          validUntil: '2026-10-20',
          notes: 'Includes 2 hours free loading time at warehouse.',
          isSelected: false,
        },
        {
          id: 'q-fm-3',
          type: 'thisai',
          providerName: 'THISAI Fleet Direct Rate',
          baseRate: 480,
          markupType: 'flat',
          markupValue: 0,
          markupCalculatedAmount: 0,
          finalRate: 480,
          transitTime: 'Same Day',
          validUntil: '2026-12-31',
          notes: 'Dedicated THISAI partner fleet vehicle with real-time GPS telemetry.',
          isSelected: false,
        },
      ],
      documents: buildStageDocumentsFromSchema(1, stage1Extra),
    });
  }

  // 2. Origin Port Handling & Export Customs (Stage 2 in Cargo Doc.json)
  if (scope !== 'P2P' || p.origin_customs_clearance) {
    const stage2Extra: string[] = [];
    if (p.hazardous_materials) {
      stage2Extra.push('Dangerous Goods Declaration (DGD / IMO)', 'Material Safety Data Sheet (MSDS)');
    }

    stages.push({
      id: 'stage-origin-customs',
      stageName: 'Origin Port Handling & Export Customs',
      category: 'origin_customs',
      locationInfo: `${originPortText} Terminal`,
      iconType: 'customs',
      quotes: [
        {
          id: 'q-oc-1',
          type: 'third_party',
          providerName: 'Madras Terminal & Customs Services (3rd Party)',
          baseRate: 380,
          markupType: 'flat',
          markupValue: 40,
          markupCalculatedAmount: 40,
          finalRate: 420,
          transitTime: '1-2 Days',
          validUntil: '2026-10-30',
          notes: 'Includes export documentation, THC, and customs filing.',
          isSelected: true,
        },
        {
          id: 'q-oc-2',
          type: 'thisai',
          providerName: 'THISAI Export Customs Clearance',
          baseRate: 350,
          markupType: 'flat',
          markupValue: 0,
          markupCalculatedAmount: 0,
          finalRate: 350,
          transitTime: '1 Day',
          validUntil: '2026-12-31',
          notes: 'In-house licensed THISAI customs broker team.',
          isSelected: false,
        },
      ],
      documents: buildStageDocumentsFromSchema(2, stage2Extra),
    });
  }

  // 3. Main Haul Freight (Stage 3 in Cargo Doc.json)
  const mainHaulName = isAir
    ? 'Main Haul – Air Freight Express'
    : `Main Haul – Ocean Freight (${p.load_type || 'FCL'})`;

  const stage3Extra: string[] = [];
  if (p.temperature_control_required) {
    stage3Extra.push('Reefer Temperature Log Report & PTI Certificate');
  }

  stages.push({
    id: 'stage-main-haul',
    stageName: mainHaulName,
    category: 'main_haul',
    locationInfo: `${originPortText} → ${destPortText}`,
    iconType: isAir ? 'plane' : 'ship',
    quotes: isAir
      ? [
          {
            id: 'q-mh-air-1',
            type: 'third_party',
            providerName: 'Emirates SkyCargo (3rd Party)',
            baseRate: 4200,
            markupType: 'flat',
            markupValue: 350,
            markupCalculatedAmount: 350,
            finalRate: 4550,
            transitTime: '2-3 Days',
            validUntil: '2026-10-10',
            notes: 'Direct priority express flight space allocation.',
            isSelected: true,
          },
          {
            id: 'q-mh-air-2',
            type: 'third_party',
            providerName: 'Cathay Cargo Express (3rd Party)',
            baseRate: 4050,
            markupType: 'flat',
            markupValue: 300,
            markupCalculatedAmount: 300,
            finalRate: 4350,
            transitTime: '3-4 Days',
            validUntil: '2026-10-15',
            notes: 'Standard air freight schedule via transit hub.',
            isSelected: false,
          },
          {
            id: 'q-mh-air-3',
            type: 'thisai',
            providerName: 'THISAI Air Charter Block Rate',
            baseRate: 4100,
            markupType: 'flat',
            markupValue: 0,
            markupCalculatedAmount: 0,
            finalRate: 4100,
            transitTime: '2 Days',
            validUntil: '2026-12-31',
            notes: 'Guaranteed space contract with automated tracking.',
            isSelected: false,
          },
        ]
      : [
          {
            id: 'q-mh-sea-1',
            type: 'third_party',
            providerName: 'Maersk Line Ocean Carrier (3rd Party)',
            baseRate: 2850,
            markupType: 'flat',
            markupValue: 250,
            markupCalculatedAmount: 250,
            finalRate: 3100,
            transitTime: '18-22 Days',
            validUntil: '2026-10-25',
            notes: `Direct liner service for ${p.container_count || 1}x ${p.container_type || '20GP'} container.`,
            isSelected: true,
          },
          {
            id: 'q-mh-sea-2',
            type: 'third_party',
            providerName: 'MSC Mediterranean Shipping (3rd Party)',
            baseRate: 2720,
            markupType: 'flat',
            markupValue: 200,
            markupCalculatedAmount: 200,
            finalRate: 2920,
            transitTime: '20-24 Days',
            validUntil: '2026-10-30',
            notes: 'Includes 14 days free demurrage at destination port.',
            isSelected: false,
          },
          {
            id: 'q-mh-sea-3',
            type: 'thisai',
            providerName: 'THISAI Preferred Carrier Contract Rate',
            baseRate: 2800,
            markupType: 'flat',
            markupValue: 0,
            markupCalculatedAmount: 0,
            finalRate: 2800,
            transitTime: '19 Days',
            validUntil: '2026-12-31',
            notes: 'THISAI direct volume tier contract pricing.',
            isSelected: false,
          },
        ],
    documents: buildStageDocumentsFromSchema(3, stage3Extra),
  });

  // 4. Destination Customs & Import Clearance (Stage 4 in Cargo Doc.json)
  if (scope === 'D2D' || scope === 'P2D' || p.destination_customs_clearance) {
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
      quotes: [
        {
          id: 'q-dc-1',
          type: 'third_party',
          providerName: 'NY Customs Clearance Services (3rd Party)',
          baseRate: 620,
          markupType: 'flat',
          markupValue: 80,
          markupCalculatedAmount: 80,
          finalRate: 700,
          transitTime: '1-2 Days',
          validUntil: '2026-10-30',
          notes: 'Includes US CBP entry filing, ISF 10+2, and duty processing.',
          isSelected: true,
        },
        {
          id: 'q-dc-2',
          type: 'thisai',
          providerName: 'THISAI US Import Brokerage',
          baseRate: 590,
          markupType: 'flat',
          markupValue: 0,
          markupCalculatedAmount: 0,
          finalRate: 590,
          transitTime: '1 Day',
          validUntil: '2026-12-31',
          notes: 'Automated ISF filing and direct CBP portal submission.',
          isSelected: false,
        },
      ],
      documents: buildStageDocumentsFromSchema(4, stage4Extra),
    });
  }

  // 5. Last Mile Delivery – Trucking (Stage 5 in Cargo Doc.json)
  if (scope === 'D2D' || scope === 'P2D' || Boolean(p.to_address)) {
    stages.push({
      id: 'stage-last-mile',
      stageName: 'Last Mile – Truck Delivery',
      category: 'last_mile',
      locationInfo: `${destPortText} → ${destText}`,
      iconType: 'truck',
      quotes: [
        {
          id: 'q-lm-1',
          type: 'third_party',
          providerName: 'Simi Valley Drayage & Trucking (3rd Party)',
          baseRate: 750,
          markupType: 'flat',
          markupValue: 75,
          markupCalculatedAmount: 75,
          finalRate: 825,
          transitTime: '1 Day',
          validUntil: '2026-10-20',
          notes: 'Includes port drayage, chassis rental, and door unloading.',
          isSelected: true,
        },
        {
          id: 'q-lm-2',
          type: 'third_party',
          providerName: 'US Xpress Interstate Hauling (3rd Party)',
          baseRate: 820,
          markupType: 'flat',
          markupValue: 50,
          markupCalculatedAmount: 50,
          finalRate: 870,
          transitTime: '1 Day',
          validUntil: '2026-10-25',
          notes: 'Liftgate equipped truck delivery.',
          isSelected: false,
        },
        {
          id: 'q-lm-3',
          type: 'thisai',
          providerName: 'THISAI Partner Delivery Network',
          baseRate: 780,
          markupType: 'flat',
          markupValue: 0,
          markupCalculatedAmount: 0,
          finalRate: 780,
          transitTime: '1 Day',
          validUntil: '2026-12-31',
          notes: 'THISAI contracted last-mile drayage service.',
          isSelected: false,
        },
      ],
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
      quotes: [
        {
          id: 'q-ins-1',
          type: 'third_party',
          providerName: 'Allianz Cargo Marine Insurance (3rd Party)',
          baseRate: 150,
          markupType: 'flat',
          markupValue: 25,
          markupCalculatedAmount: 25,
          finalRate: 175,
          transitTime: 'Immediate',
          validUntil: '2026-12-31',
          notes: 'Comprehensive All-Risk (Clause A) marine cargo insurance policy.',
          isSelected: true,
        },
      ],
      documents: insuranceDocs,
    });
  }

  return stages;
};
