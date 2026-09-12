export type TransportMode = 'Air' | 'FCL' | 'LCL' | 'Road';
export type ServiceType = 'Door-to-Door' | 'Door-to-Port' | 'Port-to-Door' | 'Port-to-Port';
export type DocumentImportance = 'mandatory' | 'regulatory' | 'recommended';

export interface StageDocument {
  name: string;
  importance: DocumentImportance;
  issuer: string;
  description: string;
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
}

export const generateShipmentRouteLifecycle = (input: LifecycleEngineInput): RouteStage[] => {
  const mode = input.transportMode || 'FCL';
  const service = input.serviceType || 'Door-to-Door';
  const origin = input.originPortOrCity || 'Origin Location';
  const destination = input.destinationPortOrCity || 'Destination Location';
  const isHazmat = Boolean(input.isHazmat);
  const isReefer = Boolean(input.isReefer);

  const includesOriginDoor = service === 'Door-to-Door' || service === 'Door-to-Port';
  const includesDestDoor = service === 'Door-to-Door' || service === 'Port-to-Door';

  const stages: RouteStage[] = [];
  let stageCount = 1;

  // -------------------------------------------------------------
  // STAGE 1: Origin Pick Up & Cargo Handover (Door Pick Up)
  // -------------------------------------------------------------
  if (includesOriginDoor) {
    const pickupDocs: StageDocument[] = [
      {
        name: 'Commercial Invoice & Packing List',
        importance: 'mandatory',
        issuer: 'Shipper / Exporter',
        description: 'Detailed breakdown of cargo item quantities, weight, unit prices, and HS codes for customs clearance.',
      },
      {
        name: 'Shipper Letter of Instruction (SLI)',
        importance: 'mandatory',
        issuer: 'Shipper',
        description: 'Official instructions authorizing the freight forwarder to handle export dispatch.',
      },
    ];

    if (isHazmat) {
      pickupDocs.push({
        name: 'Material Safety Data Sheet (MSDS) & Dangerous Goods Declaration',
        importance: 'regulatory',
        issuer: 'Manufacturer / Shipper',
        description: 'Safety specification required by drayage truckers and origin terminal operators.',
      });
    }

    if (isReefer) {
      pickupDocs.push({
        name: 'Cold Chain Temperature Setting Instructions',
        importance: 'mandatory',
        issuer: 'Shipper',
        description: 'Explicit setpoint temperature and vent setting requirements for perishables.',
      });
    }

    stages.push({
      id: 'origin_pickup',
      stageNumber: stageCount++,
      title: 'First-Mile Origin Pickup',
      subtitle: `Shipper Premises (${origin})`,
      iconType: 'pickup',
      category: 'Origin',
      activities: [
        'Cargo quantity inspection, piece count, and gross weight verification.',
        'Loading cargo onto first-mile chassis / drayage truck.',
        'Issuance of initial Pickup Receipt & Electronic Cargo Record.',
      ],
      documents: pickupDocs,
      milestones: [
        { code: 'PICKUP_DISPATCHED', title: 'Truck Dispatched', description: 'Pickup vehicle dispatched to shipper warehouse.' },
        { code: 'CARGO_LOADED', title: 'Cargo Loaded & Sealed', description: 'Cargo securely loaded and container seal applied (if FCL).' },
        { code: 'DEPARTED_ORIGIN_DOOR', title: 'Departed Shipper Premises', description: 'First-mile truck en route to origin terminal.' },
      ],
      proTip: 'Ensure cargo package dimensions and weights match commercial invoice values to prevent drayage re-weigh surcharges.',
    });
  }

  // -------------------------------------------------------------
  // STAGE 2: Origin Terminal & Export Customs Handling
  // -------------------------------------------------------------
  const originTerminalTitle = mode === 'Air' ? 'Origin Air Cargo Terminal & Export Customs' : mode === 'LCL' ? 'Origin CFS Warehouse & Export Clearance' : 'Origin Sea Port Terminal (CY)';
  const originTerminalSubtitle = mode === 'Air' ? 'Airport Freight Depot' : mode === 'LCL' ? 'Container Freight Station (CFS)' : 'Container Yard Gate-in';

  const exportDocs: StageDocument[] = [
    {
      name: 'Export Customs Declaration (AES / SAD)',
      importance: 'regulatory',
      issuer: 'Customs Broker / Forwarder',
      description: 'Official export filing submitted to origin government customs authority.',
    },
    {
      name: mode === 'Air' ? 'House Air Waybill (HAWB)' : 'Forwarder Cargo Receipt (FCR) / House Bill of Lading',
      importance: 'mandatory',
      issuer: 'Freight Forwarder',
      description: 'Proof of cargo receipt and contract of carriage for export freight.',
    },
    {
      name: 'Certificate of Origin (CoO)',
      importance: 'recommended',
      issuer: 'Chamber of Commerce',
      description: 'Certifies manufacturing country to unlock preferential import tariff rates.',
    },
  ];

  if (isHazmat) {
    exportDocs.push({
      name: 'IMO Hazmat Approval & Terminal DG Gate Pass',
      importance: 'regulatory',
      issuer: 'Port Port Authority / IMO Safety Officer',
      description: 'Dangerous Goods terminal entry approval document.',
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
      mode === 'Air'
        ? 'Cargo x-ray screening, palletization, and ULD air container buildup.'
        : mode === 'LCL'
        ? 'Cargo receiving at CFS warehouse, measurement audit, and LCL container consolidation.'
        : 'Terminal Gate-in check, Solas Verified Gross Mass (VGM) transmission, and stack placement.',
      'Filing of Export Customs Declaration and export compliance release.',
      'Vessel / Aircraft bay allocation and pre-loading staging.',
    ],
    documents: exportDocs,
    milestones: [
      { code: 'GATE_IN_TERMINAL', title: 'Terminal Gate-in', description: 'Cargo safely received inside origin airport/seaport facility.' },
      { code: 'CUSTOMS_EXPORT_CLEARED', title: 'Export Customs Released', description: 'Origin customs approved cargo for international export.' },
      { code: 'STAGED_FOR_LOADING', title: 'Staged for Departure', description: 'Cargo loaded into ULD / Container mounted on vessel/aircraft.' },
    ],
    proTip: 'Submit Solas VGM at least 24 hours prior to port gate cutoff to avoid container roll-over.',
  });

  // -------------------------------------------------------------
  // STAGE 3: Main Freight International Transit (Ocean / Air / Road)
  // -------------------------------------------------------------
  const mainTransitTitle = mode === 'Air' ? 'Air Freight International Flight Transit' : mode === 'FCL' ? 'Ocean Vessel Linehaul Voyage' : mode === 'LCL' ? 'Ocean LCL Consolidated Freight Transit' : 'Cross-Border Trucking Linehaul';
  const mainTransitSubtitle = mode === 'Air' ? `Airport to Airport (${origin} ✈️ ${destination})` : `Seaport to Seaport (${origin} 🚢 ${destination})`;

  const transitDocs: StageDocument[] = [
    {
      name: mode === 'Air' ? 'Master Air Waybill (MAWB)' : 'Master Ocean Bill of Lading (MBL)',
      importance: 'mandatory',
      issuer: 'Airline Carrier / Ocean Line',
      description: 'Primary legal document representing international title of carriage.',
    },
    {
      name: 'Cargo Manifest & Pre-Arrival Manifest (AMS/ISF)',
      importance: 'regulatory',
      issuer: 'Carrying Carrier',
      description: 'Pre-arrival manifest transmitted to destination customs prior to vessel/flight arrival.',
    },
  ];

  if (isReefer) {
    transitDocs.push({
      name: 'Reefer Monitoring Log & Temperature Control Data Sheet',
      importance: 'regulatory',
      issuer: 'Vessel Chief Engineer / Airline Cargo Officer',
      description: 'Continuous temperature log maintained during transit.',
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
      'Transmittal of Electronic Pre-Arrival Security Filing (ISF / AMS / ENS) to destination port.',
      'Real-time position monitoring and vessel ETA updates.',
    ],
    documents: transitDocs,
    milestones: [
      { code: 'DEPARTED_ORIGIN', title: 'Vessel / Flight Departure', description: 'Carrying vessel departed origin seaport/airport.' },
      { code: 'IN_TRANSIT_OCEAN_AIR', title: 'International Transit', description: 'Freight active on main international linehaul leg.' },
      { code: 'ARRIVED_DESTINATION_PORT', title: 'Arrived Destination Port', description: 'Vessel berthed or flight landed at destination port.' },
    ],
    proTip: 'Ensure ISF 10+2 (US imports) or ENS (EU imports) is filed prior to origin vessel departure to prevent port fines.',
  });

  // -------------------------------------------------------------
  // STAGE 4: Destination Port & Import Customs Clearance
  // -------------------------------------------------------------
  const destCustomsDocs: StageDocument[] = [
    {
      name: 'Import Customs Entry / Release Declaration',
      importance: 'mandatory',
      issuer: 'Destination Customs Broker',
      description: 'Customs entry form calculating tariff duty and VAT taxes.',
    },
    {
      name: 'Delivery Order (DO)',
      importance: 'mandatory',
      issuer: 'Shipping Line / Forwarder',
      description: 'Authorizes port terminal to release physical container/cargo to carrier.',
    },
    {
      name: 'Arrival Notice & Freight Invoice',
      importance: 'mandatory',
      issuer: 'Destination Forwarder',
      description: 'Notification of cargo arrival detailing local port handling charges.',
    },
  ];

  if (isHazmat) {
    destCustomsDocs.push({
      name: 'Destination EPA / Environmental Hazmat Release',
      importance: 'regulatory',
      issuer: 'Environmental Protection Agency',
      description: 'Hazmat environmental release permit prior to port gate-out.',
    });
  }

  stages.push({
    id: 'destination_customs',
    stageNumber: stageCount++,
    title: 'Destination Port & Import Customs',
    subtitle: `Port Handling (${destination})`,
    iconType: 'customs',
    category: 'Destination',
    activities: [
      'Container discharge from vessel / ULD breakdown from aircraft.',
      'Submission of Import Customs Entry, HS tariff assessment, and duty payment.',
      'Physical customs inspection or quarantine check (if flagged).',
      'Issuance of Delivery Order (DO) upon terminal charge clearance.',
    ],
    documents: destCustomsDocs,
    milestones: [
      { code: 'DISCHARGED_FROM_VESSEL', title: 'Cargo Discharged', description: 'Container unloaded from vessel onto port terminal yard.' },
      { code: 'CUSTOMS_IMPORT_RELEASED', title: 'Import Customs Cleared', description: 'Customs authority cleared cargo for entry.' },
      { code: 'DELIVERY_ORDER_ISSUED', title: 'Delivery Order Issued', description: 'Terminal gate pass and DO generated for truck dispatch.' },
    ],
    proTip: 'Pay destination terminal charges promptly upon arrival notice to avoid port demurrage and storage penalties.',
  });

  // -------------------------------------------------------------
  // STAGE 5: Last-Mile Delivery & Consignee Door Handover
  // -------------------------------------------------------------
  if (includesDestDoor) {
    const deliveryDocs: StageDocument[] = [
      {
        name: 'Proof of Delivery (POD) / Waybill',
        importance: 'mandatory',
        issuer: 'Delivery Drayage Driver',
        description: 'Signed delivery receipt confirming cargo received in sound condition.',
      },
      {
        name: 'Container Equipment Interchange Receipt (EIR)',
        importance: 'recommended',
        issuer: 'Empty Depot Operator',
        description: 'Confirms return of empty container to carrier depot with zero damage.',
      },
    ];

    stages.push({
      id: 'destination_delivery',
      stageNumber: stageCount++,
      title: 'Last-Mile Delivery & Door Receipt',
      subtitle: `Consignee Warehouse (${destination})`,
      iconType: 'delivery',
      category: 'Destination',
      activities: [
        'Dispatch of last-mile container chassis / delivery vehicle.',
        'Transport from port/terminal to consignee door warehouse.',
        'Cargo unboxing / container de-stuffing at warehouse bay.',
        'Inspection for outer package integrity and POD sign-off.',
        'Return of empty container to ocean line depot (if FCL).',
      ],
      documents: deliveryDocs,
      milestones: [
        { code: 'DISPATCHED_LAST_MILE', title: 'Delivery Truck Dispatched', description: 'Vehicle departed port terminal with cleared cargo.' },
        { code: 'DELIVERED_TO_CONSIGNEE', title: 'Delivered to Consignee Door', description: 'Cargo safely delivered to destination warehouse.' },
        { code: 'POD_SIGNED', title: 'Proof of Delivery Signed', description: 'POD signed and shipment lifecycle successfully completed.' },
      ],
      proTip: 'Inspect container seal numbers upon truck arrival before un-sealing to ensure chain of custody integrity.',
    });
  }

  return stages;
};
