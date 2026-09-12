export type TransportMode = 'Air' | 'FCL' | 'LCL' | 'Road' | 'Ship';
export type ServiceType = 'Door-to-Door' | 'Door-to-Port' | 'Port-to-Door' | 'Port-to-Port';
export type DocumentImportance = 'mandatory' | 'regulatory' | 'recommended';

export interface StageDocument {
  name: string;
  importance: DocumentImportance;
  issuer: string;
  description: string;
  bullets?: string[];
  /**
   * Service scopes in which this document is applicable ("Own & File").
   * If undefined, the document applies to ALL service types.
   * Used to hide "Not in Scope" documents for the selected service.
   */
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

// ---------------------------------------------------------------------------
// Scope filter — removes documents that are "Not in Scope" for the service
// ---------------------------------------------------------------------------
const filterDocsByScope = (
  docs: StageDocument[],
  service: ServiceType
): StageDocument[] =>
  docs.filter((doc) => !doc.applicableScopes || doc.applicableScopes.includes(service));

// Scope shorthand constants (matching the matrix columns exactly)
const D2D_D2P: ServiceType[] = ['Door-to-Door', 'Door-to-Port']; // origin-door docs
const D2D_P2D: ServiceType[] = ['Door-to-Door', 'Port-to-Door']; // destination-door docs

// ---------------------------------------------------------------------------
// Commodity Document Helper
// ---------------------------------------------------------------------------
const getCommodityDocs = (hsCode?: string): StageDocument[] => {
  if (!hsCode) {
    return [{
      name: 'Commodity Based Documents',
      importance: 'regulatory',
      issuer: 'Exporter / Importer / Agency',
      description: 'Pending HS Code entry. Specific pre-shipment and import certificates will be listed once HS Code is entered.',
      applicableScopes: D2D_D2P,
    }];
  }

  const prefix = parseInt(hsCode.substring(0, 2), 10);
  let requiredDocs: string[] = [];
  let category = '';

  if (prefix >= 1 && prefix <= 24) {
    category = 'Food & Agriculture';
    requiredDocs = [
      'FSSAI License', 'Phytosanitary Certificate', 'Health Certificate', 'APEDA / MPEDA / Spice Board', 'Lab Test Report', 'FDA Registration & Prior Notice',
      'USDA Import Permit (Certain food products)', 'DGFT Import Permit'
    ];
  } else if (prefix === 30) {
    category = 'Pharmaceuticals';
    requiredDocs = [
      'CDSCO Drug License', 'GMP Certificate', 'Batch Test Reports', 'FDA Approval',
      'Import Permit (controlled substances)', 'DGFT Import Permit'
    ];
  } else if (prefix >= 28 && prefix <= 38) {
    category = 'Chemicals & Hazardous Materials';
    requiredDocs = [
      'DGFT Export License (SCOMET)', 'MSDS', 'Dangerous Goods Declaration (DGD)', 'EPA Registration',
      'EPA Clearance', 'DGFT Import License'
    ];
  } else if (prefix === 84 || prefix === 85) {
    category = 'Electronics & IT Equipment';
    requiredDocs = [
      'BIS Certification', 'RoHS / CE Compliance', 'MSDS (Battery Related) & DGD', 'FCC Certification', 'Technical Design Doc (Product Spec)',
      'DGFT Import License'
    ];
  } else if (prefix >= 50 && prefix <= 63) {
    category = 'Textiles & Apparel';
    requiredDocs = ['Certificate of Origin', 'ESG / Labor Compliance Docs'];
  } else if (prefix === 87) {
    category = 'Automobiles & Spare Parts';
    requiredDocs = [
      'DGFT Export License', 'Certificate of Origin', 'Technical Design Doc (Product Spec)', 'DOT / EPA Compliance',
      'DGFT Import License'
    ];
  } else {
    category = 'General Goods';
    requiredDocs = ['Certificate of Origin', 'Required documents are processed during KYC'];
  }

  if (requiredDocs.length === 0) {
    return [];
  }

  return [{
    name: 'Commodity Based Documents',
    importance: 'regulatory',
    issuer: 'Various Agencies',
    description: `[${category}] The following certificates must be processed:`,
    bullets: requiredDocs,
    applicableScopes: D2D_D2P,
  }];
};

export const generateShipmentRouteLifecycle = (input: LifecycleEngineInput): RouteStage[] => {
  const mode = input.transportMode || 'FCL';
  const service = input.serviceType || 'Door-to-Door';
  const origin = input.originPortOrCity || 'Origin Location';
  const destination = input.destinationPortOrCity || 'Destination Location';
  const isHazmat = Boolean(input.isHazmat);
  const isReefer = Boolean(input.isReefer);

  // Which legs of the journey are in scope
  const includesOriginDoor = service === 'Door-to-Door' || service === 'Door-to-Port';
  const includesDestDoor = service === 'Door-to-Door' || service === 'Port-to-Door';

  const stages: RouteStage[] = [];
  let stageCount = 1;

  // =============================================================
  // STAGE 1 — Factory / Pre-Shipment & First-Mile Pickup
  // Visible for: Door-to-Door | Door-to-Port
  // Sub-stages mapped: 1. Factory/Pre-Shipment  3. Factory to CFS/ICD
  // =============================================================
  if (includesOriginDoor) {
    const pickupDocs: StageDocument[] = [
      // Sub-stage 1: Factory / Pre-Shipment
      {
        name: 'Commercial Invoice',
        importance: 'mandatory',
        issuer: 'India Exporter',
        description: 'Official invoice with cargo description, quantity, unit value, HS codes; issued to CHA, Buyer, and Bank.',
        applicableScopes: D2D_D2P,
      },
      {
        name: 'Packing List',
        importance: 'mandatory',
        issuer: 'India Exporter',
        description: 'Itemized list of packages, piece count, net/gross weight, and dimensions; forwarded to CHA, Forwarder, and CFS.',
        applicableScopes: D2D_D2P,
      },
      // Sub-stage 3: Factory to CFS/ICD
      {
        name: 'Delivery Challan / E-way Bill',
        importance: 'mandatory',
        issuer: 'Exporter / Transporter',
        description: 'Domestic transport document authorizing movement of goods from factory to CFS/ICD gate entry.',
        applicableScopes: D2D_D2P,
      },
      ...getCommodityDocs(input.hsCode)
    ];

    if (isReefer) {
      pickupDocs.push({
        name: 'Cold Chain Temperature Setting Instructions',
        importance: 'mandatory',
        issuer: 'Shipper',
        description: 'Explicit temperature setpoint and vent setting for reefer container; provided to CFS / terminal operator.',
        applicableScopes: D2D_D2P,
      });
    }

    stages.push({
      id: 'origin_pickup',
      stageNumber: stageCount++,
      title: 'Factory / Pre-Shipment & First-Mile Pickup',
      subtitle: `Shipper Premises → CFS/ICD (${origin})`,
      iconType: 'pickup',
      category: 'Origin',
      activities: [
        'Cargo quantity inspection, piece count, and gross weight verification at factory.',
        'Loading cargo onto first-mile truck for movement to CFS / ICD.',
        'Issuance of Delivery Challan / E-way Bill for domestic transport leg.',
        'Pre-shipment commodity certificates identified and submitted to CHA.',
      ],
      documents: filterDocsByScope(pickupDocs, service),
      milestones: [
        { code: 'CARGO_READY', title: 'Cargo Ready at Factory', description: 'Cargo packed, weighed, and ready for truck dispatch.' },
        { code: 'TRUCK_DEPARTED', title: 'Truck Departed Factory', description: 'First-mile truck en route to CFS / ICD with E-way Bill.' },
        { code: 'CARGO_RECEIVED_CFS', title: 'Cargo Received at CFS', description: 'CFS acknowledged receipt; cargo weighed and logged.' },
      ],
      proTip: 'Identify all commodity-specific certificates (Fumigation, Phytosanitary, Health Cert, COA, DGD) before booking — late certificates cause Shipping Bill filing delays.',
    });
  }

  // =============================================================
  // STAGE 2 — Booking, CHA / Customs Filing & Origin Terminal
  // Visible for: ALL scopes
  // Sub-stages mapped: 2. Booking Confirmed  4. CHA/Customs Filing (India)
  //                    5. Customs Examination  6. Customs Clearance  7. CFS to Terminal
  //                    8. Terminal Loading  9. Vessel Departure / B/L
  // =============================================================
  const originTerminalTitle =
    mode === 'Air'
      ? 'Origin Air Cargo Terminal & Export Customs'
      : mode === 'LCL'
        ? 'Origin CFS Warehouse & Export Clearance'
        : 'Origin Sea Port Terminal (CY) & Export Customs';
  const originTerminalSubtitle =
    mode === 'Air'
      ? 'Airport Freight Depot'
      : mode === 'LCL'
        ? 'Container Freight Station (CFS)'
        : 'Container Yard Gate-in';

  const exportDocs: StageDocument[] = [
    // --- Sub-stage 2: Booking Confirmed (ALL scopes) ---
    {
      name: 'Booking Confirmation',
      importance: 'mandatory',
      issuer: 'Shipping Line / Forwarder',
      description: 'Confirmed vessel/flight space allocation with booking reference and cut-off dates; issued to Exporter / CHA.',
      // applicableScopes: undefined → ALL scopes
    },
    {
      name: 'Shipping Instructions (SI)',
      importance: 'mandatory',
      issuer: 'Exporter / Forwarder',
      description: 'Instructions to Shipping Line specifying B/L consignee, notify party, cargo marks, and description for drafting the Bill of Lading.',
      // applicableScopes: undefined → ALL scopes
    },
    // --- Sub-stage 4: CHA / Customs Filing India ---
    {
      name: 'Shipping Bill (Export Declaration)',
      importance: 'mandatory',
      issuer: 'CHA',
      description: 'Official export declaration filed with Indian Customs to obtain export clearance; addressed to Indian Customs authority.',
      applicableScopes: D2D_D2P,
    },
    {
      name: 'Certificate of Origin (CoO)',
      importance: 'regulatory',
      issuer: 'Chamber of Commerce / EPC',
      description: 'Certifies country of manufacture; issued to US Buyer for preferential duty claims and import compliance.',
      applicableScopes: D2D_D2P,
    },
    {
      name: 'VGM Declaration (Verified Gross Mass)',
      importance: 'mandatory',
      issuer: 'Exporter / CHA',
      description: 'SOLAS-mandatory declared container gross weight submitted to Shipping Line / Terminal before vessel loading.',
      // applicableScopes: undefined → ALL scopes
    },
    {
      name: 'Health Certificate / COA / Dangerous Goods Declaration (as applicable)',
      importance: 'regulatory',
      issuer: 'Respective Agency',
      description: 'Commodity-specific: Health Cert for food/pharma, COA for quality-controlled goods, or DG Declaration for hazardous cargo. Attached to Customs filing.',
      applicableScopes: D2D_D2P,
    },
    // --- Sub-stage 5: Customs Examination India ---
    {
      name: 'Examination Report',
      importance: 'regulatory',
      issuer: 'Customs Officer',
      description: 'Official customs physical/scanning examination report confirming cargo matches Shipping Bill declaration; filed with Shipping Bill.',
      applicableScopes: D2D_D2P,
    },
    // --- Sub-stage 6: Customs Clearance India ---
    {
      name: 'LEO (Let Export Order)',
      importance: 'mandatory',
      issuer: 'Indian Customs',
      description: 'Final permission from Indian Customs allowing cargo to be loaded onto vessel; transmitted CHA → Terminal.',
      applicableScopes: D2D_D2P,
    },
    // --- Sub-stage 7: CFS to Terminal (ALL scopes) ---
    {
      name: 'Gate Pass / EIR (Equipment Interchange Receipt)',
      importance: 'mandatory',
      issuer: 'CFS / Terminal',
      description: 'Terminal gate entry/exit authorization and container condition receipt; issued to Transporter for container movement.',
      // applicableScopes: undefined → ALL scopes
    },
    // --- Sub-stage 8: Terminal Loading (ALL scopes) ---
    {
      name: "Mate's Receipt",
      importance: 'mandatory',
      issuer: "Ship's Officer / Terminal",
      description: "Acknowledgment from the ship's mate that cargo was loaded on board in apparent good order; used by Shipping Line for B/L issuance.",
      // applicableScopes: undefined → ALL scopes
    },
    // --- Sub-stage 9: Vessel Departure / B/L (ALL scopes) ---
    {
      name: 'Draft Bill of Lading',
      importance: 'mandatory',
      issuer: 'Shipping Line / Forwarder',
      description: 'Draft B/L forwarded to Exporter for review and approval; all corrections must be made before final B/L is issued.',
      // applicableScopes: undefined → ALL scopes
    },
    {
      name: 'Final B/L (Original / Telex Release)',
      importance: 'mandatory',
      issuer: 'Shipping Line / NVOCC',
      description: 'Final issued Bill of Lading (3 originals or telex release); primary title document dispatched Exporter → Buyer / Bank.',
      // applicableScopes: undefined → ALL scopes
    },
  ];

  if (isHazmat) {
    exportDocs.push({
      name: 'IMO Hazmat Approval & Terminal DG Gate Pass',
      importance: 'regulatory',
      issuer: 'Port Authority / IMO Safety Officer',
      description: 'Dangerous Goods terminal entry approval required before hazmat container is accepted at origin port.',
      // applicableScopes: undefined → ALL scopes
    });
  }

  stages.push({
    id: 'origin_terminal',
    stageNumber: stageCount++,
    title: originTerminalTitle,
    subtitle: originTerminalSubtitle,
    iconType: mode === 'Air' ? 'warehouse' : 'truck',
    category: 'Origin',
    activities: [
      'Booking space confirmed with Shipping Line; Shipping Instructions submitted.',
      mode === 'Air'
        ? 'Cargo x-ray screening, palletization, and ULD air container buildup.'
        : mode === 'LCL'
          ? 'Cargo receiving at CFS, measurement audit, and LCL container consolidation.'
          : 'Terminal Gate-in check, VGM transmission, and container stack placement.',
      'CHA files Shipping Bill with Indian Customs; examination and LEO issuance.',
      "Mate's Receipt issued after loading; Draft B/L reviewed; Final B/L released.",
    ],
    documents: filterDocsByScope(exportDocs, service),
    milestones: [
      { code: 'BOOKING_CONFIRMED', title: 'Booking Confirmed', description: 'Vessel/flight space confirmed; SI submitted to Shipping Line.' },
      { code: 'LEO_GRANTED', title: 'LEO Granted — Export Cleared', description: 'Indian Customs issued Let Export Order; cargo cleared for loading.' },
      { code: 'FINAL_BL_ISSUED', title: 'Final B/L Issued', description: 'Shipping Line released Final Bill of Lading post vessel departure.' },
    ],
    proTip: 'Approve Draft B/L corrections within 24 hours of receipt and submit VGM before port gate cutoff — both are critical to avoid vessel roll-over.',
  });

  // =============================================================
  // STAGE 3 — Main Freight International Transit
  // Visible for: ALL scopes
  // Sub-stages mapped: 10. Post-Departure Dispatch  11. Pre-Arrival (US)
  //                    12. Document Collection (US)
  // =============================================================
  const mainTransitTitle =
    mode === 'Air'
      ? 'Air Freight International Flight Transit'
      : mode === 'FCL'
        ? 'Ocean Vessel Linehaul Voyage'
        : mode === 'LCL'
          ? 'Ocean LCL Consolidated Freight Transit'
          : 'Cross-Border Trucking Linehaul';
  const mainTransitSubtitle =
    mode === 'Air'
      ? `Airport to Airport (${origin} ✈️ ${destination})`
      : `Seaport to Seaport (${origin} 🚢 ${destination})`;

  const transitDocs: StageDocument[] = [
    // --- Sub-stage 10: Post-Departure Dispatch (ALL scopes) ---
    // --- Sub-stage 11: Pre-Arrival (US) (ALL scopes) ---
    {
      name: 'ISF / 10+2 (Importer Security Filing)',
      importance: 'mandatory',
      issuer: 'US Importer / Customs Broker',
      description: 'US CBP mandatory security filing submitted to US CBP at least 24 hours BEFORE vessel loads at Indian port; non-compliance attracts up to $5,000 penalty.',
      // applicableScopes: undefined → ALL scopes
    },
    {
      name: "Carrier's Manifest",
      importance: 'mandatory',
      issuer: 'Shipping Line',
      description: 'Complete manifest of all cargo on board transmitted by Shipping Line to US CBP before vessel arrival at destination port.',
      // applicableScopes: undefined → ALL scopes
    },
    {
      name: 'Arrival Notice',
      importance: 'mandatory',
      issuer: 'Shipping Line / Agent',
      description: 'Notification sent to US Consignee upon vessel arrival at destination port; details freight charges, demurrage timelines, and document pickup requirements.',
      // applicableScopes: undefined → ALL scopes
    },
    // --- Sub-stage 12: Document Collection (US) (ALL scopes) ---
    {
      name: 'Original B/L Surrender / Telex Release',
      importance: 'mandatory',
      issuer: 'US Importer',
      description: 'US Importer surrenders original B/L (or telex release confirmed) to Shipping Line in exchange for a Delivery Order to release cargo from terminal.',
      // applicableScopes: undefined → ALL scopes
    },
    {
      name: 'Delivery Order (D.O.)',
      importance: 'mandatory',
      issuer: 'Shipping Line / Agent',
      description: 'Issued by Shipping Line to US Importer / Customs Broker after B/L surrender; authorizes terminal to release the container for pickup.',
      // applicableScopes: undefined → ALL scopes
    },
  ];

  if (isReefer) {
    transitDocs.push({
      name: 'Reefer Monitoring Log & Temperature Control Data Sheet',
      importance: 'regulatory',
      issuer: 'Vessel Chief Engineer / Airline Cargo Officer',
      description: 'Continuous temperature and humidity log maintained throughout international transit.',
      // applicableScopes: undefined → ALL scopes
    });
  }

  stages.push({
    id: 'main_transit',
    stageNumber: stageCount++,
    title: mainTransitTitle,
    subtitle: mainTransitSubtitle,
    iconType: mode === 'Air' ? 'plane' : 'ship',
    category: 'Main Freight',
    activities: [
      mode === 'Air'
        ? 'Direct flight linehaul or hub transshipment transfer.'
        : 'Ocean vessel transit with carrier satellite container tracking.',
      'Full document set dispatched by Exporter to Buyer\'s Bank (US) for negotiation.',
      'ISF 10+2 filed with US CBP by US Customs Broker (24 hrs before India vessel load).',
      'Arrival Notice received; US Importer surrenders B/L to obtain Delivery Order.',
    ],
    documents: filterDocsByScope(transitDocs, service),
    milestones: [
      { code: 'VESSEL_DEPARTED', title: 'Vessel / Flight Departed', description: 'Carrying vessel departed origin seaport / aircraft departed origin airport.' },
      { code: 'ISF_FILED', title: 'ISF 10+2 Filed with US CBP', description: 'US CBP security filing submitted before vessel departure from India.' },
      { code: 'ARRIVED_DEST_PORT', title: 'Arrived Destination Port', description: 'Vessel berthed / flight landed at US destination port.' },
    ],
    proTip: 'ISF 10+2 must be filed BEFORE the vessel loads at origin — not upon arrival. File at least 24 hours before departure to avoid CBP penalties.',
  });

  // =============================================================
  // STAGE 4 — Destination Port & Import Customs Clearance (US)
  // Visible for: Door-to-Door | Port-to-Door
  // Sub-stages mapped: 13. Customs Filing (US Broker)  14. Duty Assessment
  //                    15. Customs Examination  16. Final Clearance  17. Terminal Handling
  // =============================================================
  if (includesDestDoor) {
    const destCustomsDocs: StageDocument[] = [
      // --- Sub-stage 13: Customs Filing (US Broker) ---
      {
        name: 'CBP Entry (Form 3461 & 7501)',
        importance: 'mandatory',
        issuer: 'Customs Broker',
        description: 'US CBP import entry — Form 3461 (Entry/Immediate Delivery) and Form 7501 (Entry Summary) — for formal customs entry and duty assessment; filed with US CBP.',
        applicableScopes: D2D_P2D,
      },
      {
        name: 'Certificate of Origin (for trade preference)',
        importance: 'regulatory',
        issuer: 'Exporter (sent earlier)',
        description: 'Presented to US CBP to claim preferential duty rates under FTA agreements (e.g., GSP, USMCA, India-specific schemes).',
        applicableScopes: D2D_P2D,
      },
      {
        name: 'Import Permit (FDA / USDA / EPA)',
        importance: 'regulatory',
        issuer: 'Respective US Agency',
        description: 'Agency-specific authorization for controlled goods (food, pharma, plants, chemicals); filed with US CBP if cargo is controlled.',
        applicableScopes: D2D_P2D,
      },
      {
        name: 'Customs Bond',
        importance: 'mandatory',
        issuer: 'Surety Company / Broker',
        description: 'Continuous or single-entry bond guaranteeing duties, taxes, and penalties owed to US CBP; required for all formal import entries.',
        applicableScopes: D2D_P2D,
      },
      // --- Sub-stage 14: Duty Assessment ---
      {
        name: 'HTS Classification & Duty Calculation',
        importance: 'mandatory',
        issuer: 'Customs Broker',
        description: 'Correct HTS code determination and applicable import duty rate calculation submitted to US CBP for duty assessment.',
        applicableScopes: D2D_P2D,
      },
      {
        name: 'Duty / Tax Payment',
        importance: 'mandatory',
        issuer: 'US Importer / Broker',
        description: 'Payment of assessed import duties, Harbor Maintenance Fee (HMF), and Merchandise Processing Fee (MPF) to US CBP before cargo release.',
        applicableScopes: D2D_P2D,
      },
      // --- Sub-stage 15: Customs Examination ---
      {
        name: 'CBP Exam Report (X-ray / VACIS / Physical)',
        importance: 'regulatory',
        issuer: 'CBP Officer',
        description: 'Official US CBP examination report (X-ray, VACIS scan, or physical exam); cargo must pass before release. Filed with entry record.',
        applicableScopes: D2D_P2D,
      },
      // --- Sub-stage 16: Final Clearance ---
      {
        name: "Entry Release ('Cargo Released')",
        importance: 'mandatory',
        issuer: 'US CBP',
        description: 'US CBP official cargo release notification confirming entry is cleared and cargo is authorized for terminal pickup.',
        applicableScopes: D2D_P2D,
      },
      // --- Sub-stage 17: Terminal Handling ---
      {
        name: 'Terminal Release / Pickup Number',
        importance: 'mandatory',
        issuer: 'Terminal Operator',
        description: 'Terminal-issued pickup authorization number allowing trucker to collect cleared container from the terminal yard.',
        applicableScopes: D2D_P2D,
      },
      {
        name: 'Container Interchange Report',
        importance: 'mandatory',
        issuer: 'Terminal',
        description: 'Documents container condition at time of pickup from terminal; issued to Trucker / Importer to protect against pre-existing damage liability.',
        applicableScopes: D2D_P2D,
      },
    ];

    if (isHazmat) {
      destCustomsDocs.push({
        name: 'Destination EPA / Environmental Hazmat Release',
        importance: 'regulatory',
        issuer: 'Environmental Protection Agency',
        description: 'EPA hazmat environmental release permit required before port gate-out for hazardous cargo.',
        applicableScopes: D2D_P2D,
      });
    }

    stages.push({
      id: 'destination_customs',
      stageNumber: stageCount++,
      title: 'Destination Port & Import Customs (US)',
      subtitle: `Port Handling & Customs Clearance (${destination})`,
      iconType: 'customs',
      category: 'Destination',
      activities: [
        'Container discharged from vessel onto terminal yard.',
        'US Customs Broker files CBP Entry (Form 3461 & 7501) with HTS classification.',
        'Customs Bond verified; any agency permits (FDA/USDA/EPA) confirmed.',
        'Duty and tax payment made; CBP examination completed (if selected).',
        'Entry Release obtained; Terminal issues Pickup Number; Container Interchange Report completed at gate-out.',
      ],
      documents: filterDocsByScope(destCustomsDocs, service),
      milestones: [
        { code: 'CARGO_DISCHARGED', title: 'Cargo Discharged', description: 'Container unloaded from vessel onto US port terminal yard.' },
        { code: 'CBP_ENTRY_RELEASED', title: 'CBP Entry Released', description: 'US CBP issued formal cargo release; entry cleared for pickup.' },
        { code: 'TERMINAL_PICKUP_NUMBER', title: 'Terminal Pickup Number Issued', description: 'Terminal authorized container gate-out for trucker.' },
      ],
      proTip: 'US terminals typically provide only 3–5 free days before demurrage begins — file CBP entry and pay duties promptly upon arrival notice.',
    });
  }

  // =============================================================
  // STAGE 5 — Last-Mile Delivery & Consignee Door Handover (US)
  // Visible for: Door-to-Door | Port-to-Door
  // Sub-stage mapped: 18. Last-Mile Delivery (US)
  // =============================================================
  if (includesDestDoor) {
    const deliveryDocs: StageDocument[] = [
      {
        name: 'Delivery Receipt / Inland B/L',
        importance: 'mandatory',
        issuer: 'Trucker',
        description: 'Inland transport document covering last-mile movement from US port/terminal to consignee warehouse; given to US Importer upon delivery.',
        applicableScopes: D2D_P2D,
      },
      {
        name: 'Proof of Delivery (POD)',
        importance: 'mandatory',
        issuer: 'US Importer (signed)',
        description: 'Delivery receipt signed by US Importer confirming cargo received in good condition; forwarded to Broker / Forwarder to close the shipment file.',
        applicableScopes: D2D_P2D,
      },
      {
        name: 'Empty Container Return Receipt',
        importance: 'mandatory',
        issuer: 'Trucker / Terminal',
        description: 'Confirmation issued by Shipping Line empty depot that the container was returned in accepted condition; closes equipment liability for the Trucker.',
        applicableScopes: D2D_P2D,
      },
    ];

    stages.push({
      id: 'destination_delivery',
      stageNumber: stageCount++,
      title: 'Last-Mile Delivery & Door Receipt (US)',
      subtitle: `Consignee Warehouse (${destination})`,
      iconType: 'delivery',
      category: 'Destination',
      activities: [
        'Last-mile container chassis / delivery vehicle dispatched from terminal.',
        'Container transported from US port terminal to consignee warehouse door.',
        'Cargo de-stuffed / unboxed at consignee receiving dock.',
        'Consignee inspects outer packaging integrity; Proof of Delivery signed.',
        'Empty container returned to Shipping Line depot; EIR / return receipt obtained.',
      ],
      documents: filterDocsByScope(deliveryDocs, service),
      milestones: [
        { code: 'LAST_MILE_DISPATCHED', title: 'Delivery Truck Dispatched', description: 'Vehicle departed US terminal with cleared container.' },
        { code: 'DELIVERED_TO_CONSIGNEE', title: 'Delivered to Consignee', description: 'Cargo delivered to US consignee warehouse door.' },
        { code: 'POD_SIGNED', title: 'POD Signed — File Closed', description: 'POD signed by importer; Forwarder closes the shipment file.' },
      ],
      proTip: 'Inspect container seal number against the B/L seal before breaking seal at delivery — any mismatch must be noted on the POD for insurance claims.',
    });
  }

  return stages;
};


