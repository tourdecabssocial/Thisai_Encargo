export type TransportMode = 'Air' | 'Ship';
export type ServiceScope = 'D2D' | 'P2P' | 'P2D' | 'D2P';
export type ShipmentType = 'Import' | 'Export';
export type UnitSystem = 'metric' | 'imperial';
export type LoadType = 'FCL' | 'LCL' | 'Roll-on/Roll-off' | 'Breakbulk';
export type CurrencyType = 'USD' | 'EUR' | 'GBP' | 'INR';
export type CustomsBrokerType = 'Thisai Customs Broker' | 'Customer / External Broker';
export type InsuranceProviderType = 'thisai' | 'customer_external';

export interface CustomerOption {
  id: string;
  name: string;
  company: string;
  email: string;
  country?: string;
}

export interface PortOption {
  code: string;
  name: string;
  city?: string;
  country: string;
  countryCode: string;
}

export interface AddressOption {
  id: string;
  label: string;
  street: string;
  city: string;
  country: string;
  countryCode: string;
  postalCode: string;
}

export interface CommercialItem {
  id: string;
  description: string;
  hsCode?: string;
  quantity: number;
  unitPrice: number;
  netWeight: number;
}

export interface PackageCard {
  id: string;
  packageType: string;
  fclPreset?: string;
  quantity: number;
  length: number;
  width: number;
  height: number;
  grossWeight: number;
  isStackable: boolean;
  packedItemDescriptions: string[];
}

export interface RFQFormData {
  selectedCustomerId: string;

  // Step 1: Mode, Scope & Route
  mode: TransportMode;
  service_scope: ServiceScope;
  shipment_type: ShipmentType;
  from_address_id?: string;
  from_address?: Partial<AddressOption> | null;
  from_port_code?: string;
  from_port_name?: string;
  to_address_id?: string;
  to_address?: Partial<AddressOption> | null;
  to_port_code?: string;
  to_port_name?: string;
  originCountry: string;
  destCountry: string;
  origin_port_code?: string;
  origin_port_name?: string;
  destination_port_code?: string;
  destination_port_name?: string;
  ready_date: string;
  delivery_date: string;

  // Step 2: Cargo & Load Specs
  unit_system: UnitSystem;
  hs_code: string;
  origin_hs_code?: string;
  destination_hs_code?: string;
  commodity_description: string;
  commodity_category?: string;
  fda_registration_no?: string;
  loading_type?: string;
  customs_clearance?: boolean;
  declared_value?: number;
  load_type: LoadType;
  container_type: string;
  container_count: number;
  cargo_value: number;
  currency: CurrencyType;
  temperature_control_required: boolean;
  target_temperature?: number | string;

  commercial_docs?: File | null;
  commercial_docs_name?: string;
  packaginglist_docs?: File | null;
  packaginglist_docs_name?: string;

  packages: PackageCard[];
  commercial_items: CommercialItem[];

  // Step 3: Incoterms, Insurance & Customs Clearances
  incoterm: string;
  insurance_required: boolean;
  insurance_provider_type?: InsuranceProviderType;
  insurance_instructions?: string;
  origin_customs_clearance: boolean;
  origin_customs_broker?: CustomsBrokerType;
  destination_customs_clearance: boolean;
  destination_customs_broker?: CustomsBrokerType;

  // Step 4: Special Instructions & Services
  has_wood_packaging: boolean;
  hazardous_materials: boolean;
  un_class_code: string;
  crating_service_required: boolean;
  fumigation_certificate?: boolean;
  other_special_instructions: string;
}

export interface ItemReconciliationResult {
  passed: boolean;
  mismatches: string[];
}

export interface RFQSubmissionPayload {
  mode: TransportMode;
  service_scope: ServiceScope;
  shipment_type: ShipmentType;
  origin_location: string;
  destination_location: string;
  from_address?: Partial<AddressOption>;
  from_port_code?: string;
  to_address?: Partial<AddressOption>;
  to_port_code?: string;
  origin_port_code?: string;
  destination_port_code?: string;
  ready_date: string;
  delivery_date: string;
  incoterm: string;
  unit_system: UnitSystem;
  load_type: LoadType;
  container_type?: string;
  container_count?: number;
  hs_code?: string;
  commodity_description?: string;
  total_volume_cbm: number;
  total_gross_weight_kg: number;
  volumetric_weight: number;
  cargo_value: number;
  currency: CurrencyType;
  temperature_control_required: boolean;
  target_temperature?: number | string;
  insurance_required: boolean;
  insurance_provider_type?: InsuranceProviderType;
  insurance_instructions?: string;
  origin_customs_clearance: boolean;
  origin_customs_broker?: CustomsBrokerType;
  destination_customs_clearance: boolean;
  destination_customs_broker?: CustomsBrokerType;
  has_wood_packaging: boolean;
  hazardous_materials: boolean;
  un_class_code?: string;
  crating_service_required: boolean;
  fumigation_certificate?: boolean;
  other_special_instructions?: string;
  packages: PackageCard[];
  commercial_items: CommercialItem[];
  commercial_docs_name?: string;
  packaginglist_docs_name?: string;
  customer_id?: string;
}

export interface SubmittedRFQRecord {
  id: string;
  referenceNo: string;
  submittedAt: string;
  payload: RFQSubmissionPayload;
  calculatedVolumeCbm: number;
  calculatedGrossWeightKg: number;
  calculatedVolumetricWeight: number;
}
