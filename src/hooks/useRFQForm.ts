import { useState, useEffect, type ChangeEvent } from 'react';
import type {
  RFQFormData,
  SubmittedRFQRecord,
  ItemReconciliationResult,
  CustomerOption,
  PortOption,
  AddressOption,
} from '../types/rfq';
import { SCOPE_INCOTERMS_MAP, getMinReadyDate, getMinDeliveryDate } from '../utils/rfqConstants';
import {
  reconcileItemsAndPackages,
  calculateTotalVolumeCbm,
  calculateTotalGrossWeightKg,
  calculateVolumetricWeight,
} from '../utils/rfqCalculations';
import { transformRFQPayload } from '../utils/rfqTransformations';

export const mockCustomers: CustomerOption[] = [
  { id: 'cust-1', name: 'Global Logistics Corp', company: 'Global Logistics Corp', email: 'rfq@globallogistics.com', country: 'United States' },
  { id: 'cust-2', name: 'Apex Trade LLC', company: 'Apex Trade LLC', email: 'logistics@apextrade.com', country: 'Germany' },
  { id: 'cust-3', name: 'Pacific Exports Co', company: 'Pacific Exports Co', email: 'supply@pacificexports.com', country: 'Japan' },
];

export const mockAddresses: AddressOption[] = [
  { id: 'addr-1', label: 'Chennai Warehouse (HQ)', street: '12 GST Road, Guindy', city: 'Chennai', postalCode: '600032', country: 'India', countryCode: 'IN' },
  { id: 'addr-2', label: 'NY Distribution Hub', street: '450 7th Ave', city: 'New York', postalCode: '10123', country: 'United States', countryCode: 'US' },
  { id: 'addr-3', label: 'Hamburg Terminal Depot', street: 'Speicherstadt 14', city: 'Hamburg', postalCode: '20457', country: 'Germany', countryCode: 'DE' },
  { id: 'addr-4', label: 'Tokyo Logistics Park', street: '1-1 Chiyoda', city: 'Tokyo', postalCode: '100-0001', country: 'Japan', countryCode: 'JP' },
];

export const mockPorts: PortOption[] = [
  { code: 'INMAA', name: 'Chennai Port', city: 'Chennai', country: 'India', countryCode: 'IN' },
  { code: 'USNYC', name: 'New York Port', city: 'New York', country: 'United States', countryCode: 'US' },
  { code: 'DEHAM', name: 'Hamburg Port', city: 'Hamburg', country: 'Germany', countryCode: 'DE' },
  { code: 'TYO', name: 'Tokyo Port', city: 'Tokyo', country: 'Japan', countryCode: 'JP' },
  { code: 'SGSIN', name: 'Singapore Port', city: 'Singapore', country: 'Singapore', countryCode: 'SG' },
];

const INITIAL_FORM_DATA: RFQFormData = {
  selectedCustomerId: 'cust-1',

  mode: 'Ship',
  service_scope: 'D2D',
  shipment_type: 'Export',
  unit_system: 'metric',

  from_address_id: 'addr-1',
  from_address: mockAddresses[0],
  to_address_id: 'addr-2',
  to_address: mockAddresses[1],
  from_port_code: '',
  from_port_name: '',
  to_port_code: '',
  to_port_name: '',

  origin_port_code: '',
  origin_port_name: '',
  destination_port_code: '',
  destination_port_name: '',

  originCountry: 'IN',
  destCountry: 'US',

  ready_date: getMinReadyDate(),
  delivery_date: getMinDeliveryDate(getMinReadyDate(), 'Ship'),

  load_type: 'FCL',
  container_type: "20' Standard",
  container_count: 1,

  hs_code: '',
  commodity_description: '',

  cargo_value: 0,
  currency: 'INR',

  temperature_control_required: false,
  target_temperature: '',

  incoterm: 'DDP',
  insurance_required: true,

  origin_customs_clearance: true,
  origin_customs_broker: 'Thisai Customs Broker',
  destination_customs_clearance: true,
  destination_customs_broker: 'Thisai Customs Broker',

  has_wood_packaging: false,
  hazardous_materials: false,
  un_class_code: '',

  crating_service_required: false,
  fumigation_certificate: false,
  other_special_instructions: '',

  commercial_items: [
    {
      id: 'item-1',
      description: '',
      hsCode: '',
      quantity: 1,
      unitPrice: 0,
      netWeight: 0,
    },
  ],

  packages: [
    {
      id: 'pkg-1',
      packageType: 'Box / Pallet',
      quantity: 1,
      length: 0,
      width: 0,
      height: 0,
      grossWeight: 0,
      isStackable: true,
      packedItemDescriptions: [],
    },
  ],
};

export function useRFQForm() {
  const [formData, setFormData] = useState<RFQFormData>(INITIAL_FORM_DATA);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submittedRecord, setSubmittedData] = useState<SubmittedRFQRecord | null>(null);

  // Sync service_scope with allowed Incoterms
  useEffect(() => {
    const allowedIncoterms = SCOPE_INCOTERMS_MAP[formData.service_scope] || [];
    if (!allowedIncoterms.includes(formData.incoterm)) {
      setFormData((prev) => ({
        ...prev,
        incoterm: allowedIncoterms[0] || 'FOB',
      }));
    }
  }, [formData.service_scope]);

  // Sync Incoterms with Customs Broker Responsibility Rules
  useEffect(() => {
    if (formData.incoterm === 'DDP') {
      setFormData((prev) => ({
        ...prev,
        destination_customs_clearance: true,
        destination_customs_broker: 'Thisai Customs Broker',
      }));
    } else if (formData.incoterm === 'EXW') {
      setFormData((prev) => ({
        ...prev,
        origin_customs_clearance: true,
        origin_customs_broker: 'Customer / External Broker',
      }));
    }
  }, [formData.incoterm]);

  // Auto-sync Unit System and Currency based on Origin (From) Country
  useEffect(() => {
    const orig = formData.originCountry;
    if (orig === 'US') {
      setFormData((prev) => {
        if (prev.unit_system === 'imperial' && prev.currency === 'USD') return prev;
        return { ...prev, unit_system: 'imperial', currency: 'USD' };
      });
    } else if (orig === 'IN') {
      setFormData((prev) => {
        if (prev.unit_system === 'metric' && prev.currency === 'INR') return prev;
        return { ...prev, unit_system: 'metric', currency: 'INR' };
      });
    } else {
      setFormData((prev) => {
        if (prev.unit_system === 'metric' && prev.currency === 'USD') return prev;
        return { ...prev, unit_system: 'metric', currency: 'USD' };
      });
    }
  }, [formData.originCountry]);

  // Auto-adjust delivery date if ready date or mode changes
  useEffect(() => {
    if (formData.ready_date) {
      const minDel = getMinDeliveryDate(formData.ready_date, formData.mode);
      if (!formData.delivery_date || formData.delivery_date < minDel) {
        setFormData((prev) => ({ ...prev, delivery_date: minDel }));
      }
    }
  }, [formData.ready_date, formData.mode]);

  const setFieldValue = (field: keyof RFQFormData, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'from_address_id') {
        const found = mockAddresses.find((a) => a.id === value);
        if (found) {
          next.from_address = found;
          next.originCountry = found.countryCode || 'IN';
        }
      }

      if (field === 'to_address_id') {
        const found = mockAddresses.find((a) => a.id === value);
        if (found) {
          next.to_address = found;
          next.destCountry = found.countryCode || 'US';
        }
      }

      if (field === 'from_port_code') {
        const found = mockPorts.find((p) => p.code === value);
        if (found) {
          next.from_port_name = found.name;
          next.originCountry = found.countryCode || 'IN';
        }
      }

      if (field === 'to_port_code') {
        const found = mockPorts.find((p) => p.code === value);
        if (found) {
          next.to_port_name = found.name;
          next.destCountry = found.countryCode || 'US';
        }
      }

      return next;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalVal: any = value;

    if (type === 'checkbox') {
      finalVal = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      finalVal = value === '' ? '' : Number(value);
    }

    setFieldValue(name as keyof RFQFormData, finalVal);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      const isFromAddress = ['D2D', 'D2P'].includes(formData.service_scope);
      const isToAddress = ['D2D', 'P2D'].includes(formData.service_scope);

      // 1. Mandatory From Selection
      if (isFromAddress && !formData.from_address_id) {
        newErrors.from_address_id = 'Origin pickup address is required.';
      }
      if (!isFromAddress && !formData.from_port_code) {
        newErrors.from_port_code = 'Origin port is required.';
      }

      // 2. Mandatory To Selection
      if (isToAddress && !formData.to_address_id) {
        newErrors.to_address_id = 'Destination delivery address is required.';
      }
      if (!isToAddress && !formData.to_port_code) {
        newErrors.to_port_code = 'Destination port is required.';
      }

      // 3. Different Country Check: From and To must NOT be the same country!
      if (formData.originCountry && formData.destCountry && formData.originCountry === formData.destCountry) {
        const sameCountryError = 'Origin and Destination cannot be in the same country. Cargo handles international shipments.';
        if (isFromAddress) newErrors.from_address_id = sameCountryError;
        else newErrors.from_port_code = sameCountryError;

        if (isToAddress) newErrors.to_address_id = 'Destination country must differ from origin country.';
        else newErrors.to_port_code = 'Destination country must differ from origin country.';
      }

      // 4. Ready Date Validation (Mandatory, 6 days lead time minimum from today)
      const minReady = getMinReadyDate();
      if (!formData.ready_date) {
        newErrors.ready_date = 'Cargo ready date is required.';
      } else if (formData.ready_date < minReady) {
        newErrors.ready_date = `Ready Date must be at least 6 days from today (${minReady}). Immediate pickup is not allowed.`;
      }

      // 5. Delivery Date Validation (Mandatory, Later than Ready Date, Mode-based transit time)
      const minDelivery = getMinDeliveryDate(formData.ready_date, formData.mode);
      if (!formData.delivery_date) {
        newErrors.delivery_date = 'Target delivery date is required.';
      } else if (formData.ready_date && formData.delivery_date <= formData.ready_date) {
        newErrors.delivery_date = 'Target delivery date must be later than Cargo Ready Date.';
      } else if (formData.ready_date && formData.delivery_date < minDelivery) {
        newErrors.delivery_date = `Insufficient transit time for ${formData.mode} freight. Minimum delivery date is ${minDelivery} (${formData.mode === 'Air' ? '4' : '14'} days after Ready Date).`;
      }
    }

    if (step === 2) {
      // 1. Commodity Description (Mandatory)
      if (!formData.commodity_description || !formData.commodity_description.trim()) {
        newErrors.commodity_description = 'Commodity description is required.';
      }

      // 2. Primary Item Quantity, Unit Price, and Net Weight (Mandatory)
      const primaryItem = formData.commercial_items[0];
      if (!primaryItem?.quantity || primaryItem.quantity < 1) {
        newErrors.primary_item_qty = 'Quantity must be at least 1 unit.';
      }
      if (primaryItem?.unitPrice === undefined || primaryItem.unitPrice === null || primaryItem.unitPrice < 0) {
        newErrors.primary_item_unit_price = 'Unit price must be 0 or greater.';
      }
      if (!primaryItem?.netWeight || primaryItem.netWeight <= 0) {
        newErrors.primary_item_net_weight = 'Net weight per unit is required (must be > 0 kg).';
      }

      // 3. Total Cargo Commercial Value (Mandatory > 0)
      if (formData.cargo_value === undefined || formData.cargo_value === null || formData.cargo_value <= 0) {
        newErrors.cargo_value = 'Total commercial value must be greater than zero.';
      }

      // 4. Currency (Mandatory)
      if (!formData.currency) {
        newErrors.currency = 'Currency selection is required.';
      }

      // 5. Load Type (Mandatory)
      if (!formData.load_type) {
        newErrors.load_type = 'Load type selection is required.';
      }

      // 6. Package Dimensions & Line Validation (Mandatory > 0)
      const invalidPackage = formData.packages.find(
        (pkg) => !pkg.quantity || pkg.quantity < 1 || !pkg.length || pkg.length <= 0 || !pkg.width || pkg.width <= 0 || !pkg.height || pkg.height <= 0
      );
      if (invalidPackage) {
        newErrors.packages = 'All package lines must have valid Quantity (≥ 1) and Dimensions (L, W, H > 0 cm).';
      }

      // 7. HAZMAT UN Class Validation if hazardous materials is checked
      if (formData.hazardous_materials && (!formData.un_class_code || !formData.un_class_code.trim())) {
        newErrors.un_class_code = 'UN Class / Code is required for hazardous materials.';
      }

      // 8. Temperature Control Validation if temp control is checked
      if (formData.temperature_control_required && (!formData.target_temperature || !String(formData.target_temperature).trim())) {
        newErrors.target_temperature = 'Target temperature specification is required (e.g. -18°C or 2-8°C).';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 1));
  };

  const handleGoToStep = (step: number) => {
    if (step < activeStep || validateStep(activeStep)) {
      setActiveStep(step);
    }
  };

  const totalVolumeCbm = calculateTotalVolumeCbm(formData.packages, formData.unit_system);
  const totalGrossWeightKg = calculateTotalGrossWeightKg(formData.packages, formData.unit_system);
  const { volumetricWeightKg } = calculateVolumetricWeight(
    totalVolumeCbm,
    formData.mode,
    formData.load_type,
    formData.unit_system
  );

  const hasDocumentsAttached = Boolean(formData.commercial_docs || formData.packaginglist_docs);

  const itemReconciliation: ItemReconciliationResult = reconcileItemsAndPackages(
    formData.commercial_items,
    formData.packages
  );

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return;

    setIsSubmitting(true);
    try {
      await new Promise((res) => setTimeout(res, 800));
      const payload = transformRFQPayload(formData);
      setSubmittedData(payload);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to submit RFQ:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setActiveStep(1);
    setErrors({});
    setIsSubmitted(false);
    setSubmittedData(null);
  };

  return {
    formData,
    activeStep,
    setActiveStep,
    errors,
    isSubmitting,
    isSubmitted,
    submittedRecord,
    mockCustomers,
    mockAddresses,
    mockPorts,
    totalVolumeCbm,
    totalGrossWeightKg,
    volumetricWeight: volumetricWeightKg,
    hasDocumentsAttached,
    itemReconciliation,

    setFieldValue,
    handleChange: handleInputChange,
    handleInputChange,
    nextStep,
    prevStep,
    handleGoToStep,
    handleSubmit,
    resetForm,
  };
}
