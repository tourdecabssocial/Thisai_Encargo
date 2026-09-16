import type { RFQFormData, RFQSubmissionPayload } from '../types/rfq';
import {
  calculateTotalVolumeCbm,
  calculateTotalGrossWeightKg,
  calculateVolumetricWeight,
} from './rfqCalculations';

export const transformRFQPayload = (formData: RFQFormData): RFQSubmissionPayload => {
  const totalVolumeCbm = calculateTotalVolumeCbm(formData.packages, formData.unit_system);
  const totalGrossWeightKg = calculateTotalGrossWeightKg(formData.packages, formData.unit_system);
  const { volumetricWeightKg } = calculateVolumetricWeight(
    totalVolumeCbm,
    formData.mode,
    formData.load_type,
    formData.unit_system
  );

  const originStr = formData.from_port_code
    ? `${formData.from_port_name || 'Port'} (${formData.from_port_code})`
    : formData.from_address?.city
    ? `${formData.from_address.city}, ${formData.from_address.country}`
    : formData.originCountry;

  const destStr = formData.to_port_code
    ? `${formData.to_port_name || 'Port'} (${formData.to_port_code})`
    : formData.to_address?.city
    ? `${formData.to_address.city}, ${formData.to_address.country}`
    : formData.destCountry;

  const payload: RFQSubmissionPayload = {
    mode: formData.mode,
    service_scope: formData.service_scope,
    shipment_type: formData.shipment_type,
    origin_location: originStr,
    destination_location: destStr,
    from_address: formData.from_address || undefined,
    from_port_code: formData.from_port_code || undefined,
    to_address: formData.to_address || undefined,
    to_port_code: formData.to_port_code || undefined,
    origin_port_code: formData.origin_port_code || undefined,
    destination_port_code: formData.destination_port_code || undefined,
    ready_date: formData.ready_date,
    delivery_date: formData.delivery_date,
    incoterm: formData.incoterm,
    unit_system: formData.unit_system,
    load_type: formData.load_type,
    container_type: formData.container_type || undefined,
    container_count: formData.container_count || 1,
    hs_code: formData.hs_code || undefined,
    commodity_description: formData.commodity_description || undefined,
    total_volume_cbm: Number(totalVolumeCbm.toFixed(3)),
    total_gross_weight_kg: Number(totalGrossWeightKg.toFixed(2)),
    volumetric_weight: Number(volumetricWeightKg.toFixed(2)),
    cargo_value: formData.cargo_value || 0,
    currency: formData.currency,
    temperature_control_required: formData.temperature_control_required,
    target_temperature: formData.temperature_control_required ? formData.target_temperature : undefined,
    insurance_required: formData.insurance_required,
    insurance_provider_type: formData.insurance_required ? (formData.insurance_provider_type || 'thisai') : undefined,
    insurance_instructions: formData.insurance_required && formData.insurance_provider_type === 'customer_external' ? formData.insurance_instructions : undefined,
    origin_customs_clearance: formData.origin_customs_clearance,
    origin_customs_broker: formData.origin_customs_clearance ? formData.origin_customs_broker : undefined,
    destination_customs_clearance: formData.destination_customs_clearance,
    destination_customs_broker: formData.destination_customs_clearance ? formData.destination_customs_broker : undefined,
    has_wood_packaging: formData.has_wood_packaging,
    hazardous_materials: formData.hazardous_materials,
    un_class_code: formData.hazardous_materials ? formData.un_class_code : undefined,
    crating_service_required: formData.crating_service_required,
    fumigation_certificate: formData.crating_service_required ? Boolean(formData.fumigation_certificate) : undefined,
    other_special_instructions: formData.other_special_instructions || undefined,
    packages: [...formData.packages],
    commercial_items: [...formData.commercial_items],
    commercial_docs_name: formData.commercial_docs_name || undefined,
    packaginglist_docs_name: formData.packaginglist_docs_name || undefined,
    customer_id: formData.selectedCustomerId || undefined,
  };

  return payload;
};
