export interface MaxPackageDimensions {
  length: number; // in meters
  width: number;  // in meters
  height: number; // in meters
}

export interface TemperatureControlConfig {
  is_required: boolean;
  target_temp_celsius?: number | null;
}

export type PhysicalState = 'solid' | 'liquid' | 'gas' | 'machinery' | 'perishable' | 'vehicle';
export type CargoForm = 'packaged_dry' | 'bulk_liquid' | 'bulk_gas' | 'machinery';
export type LoadingAccess = 'standard_rear_door' | 'overhead_crane' | 'side_roll_on' | 'fragile_delicate';
export type CommodityCategory = 'general' | 'hazardous' | 'fda_regulated' | 'agri_wood' | 'jewelry_high_value' | 'wood_pkg';
export type HandlingRequirement = 'standard' | 'top_loading' | 'side_loading' | 'fragile_delicate';

export interface AIEquipmentInput {
  cargo_volume_cbm: number;
  cargo_gross_weight_kg: number;
  max_package_dimensions: MaxPackageDimensions;
  commodity_name: string;
  is_hazardous: boolean;
  temperature_control: TemperatureControlConfig;
  cargo_form: CargoForm;
  loading_access: LoadingAccess;
  requires_rigid_roof: boolean;
  is_urgent: boolean;
  is_high_value_fragile: boolean;
}

export interface EquipmentRecommendation {
  name: string;
  common_code: string;
  iso_type_code?: string;
  iso_type_group?: string;
  iso_size_type?: string;
  estimated_units: number;
}

export interface AIEquipmentFlags {
  is_oog: boolean;
  is_reefer: boolean;
  is_hazmat?: boolean;
  imo_class_code?: string;
  payload_warning: boolean;
}

export interface AIEquipmentOutput {
  mode: 'FCL' | 'LCL';
  equipment_recommendation: EquipmentRecommendation;
  rationale: string;
  flags: AIEquipmentFlags;
  source?: 'gemini_api' | 'ai_engine' | 'deterministic_engine' | string;
}
