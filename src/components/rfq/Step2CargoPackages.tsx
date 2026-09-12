import React, { useState, useEffect } from 'react';
import type { RFQFormData, PackageCard, CommercialItem } from '../../types/rfq';
import { FormInput } from '../form/FormInput';
import { FormSelect } from '../form/FormSelect';
import { Button } from '../ui/Button';
import { classifyHSCodeReefAPI, type ReefHSCandidate } from '../../utils/hsCodeLookup';
import {
  getContainerSpecByNameOrCode,
  getExactContainerName,
  computeOptimalEquipmentMix,
  type ContainerCategory,
  type EquipmentMixResult,
} from '../../utils/containerSpecs';
import { requestAIEquipmentRecommendation } from '../../services/aiRecommendationService';
import type { AIEquipmentOutput } from '../../types/aiEquipment';
import {
  calculateTotalGrossWeightKg,
  calculateTotalVolumeCbm,
  calculateVolumetricWeight,
  calculateChargeableWeightKg,
} from '../../utils/rfqCalculations';
import { Box, Plus, Trash2, FileText, Upload, CheckCircle2, DollarSign, IndianRupee, Euro, PoundSterling, JapaneseYen, PackageCheck, Layers, Scale, Sparkles, ChevronDown, ChevronUp, Info } from 'lucide-react';
import './Step2CargoPackages.css';

const getCurrencySymbol = (currency: string = 'USD'): string => {
  switch (currency?.toUpperCase()) {
    case 'INR': return '₹';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY':
    case 'CNY': return '¥';
    case 'CAD': return 'C$';
    case 'AUD': return 'A$';
    case 'AED': return 'AED';
    case 'SGD': return 'S$';
    case 'USD':
    default: return '$';
  }
};

const getCurrencyIconNode = (currency: string = 'USD') => {
  const code = currency?.toUpperCase();
  switch (code) {
    case 'INR':
      return <IndianRupee size={16} />;
    case 'EUR':
      return <Euro size={16} />;
    case 'GBP':
      return <PoundSterling size={16} />;
    case 'JPY':
    case 'CNY':
      return <JapaneseYen size={16} />;
    case 'USD':
      return <DollarSign size={16} />;
    default:
      return (
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', lineHeight: 1 }}>
          {getCurrencySymbol(code)}
        </span>
      );
  }
};

interface Step2CargoPackagesProps {
  formData: RFQFormData;
  errors: Record<string, string>;
  hasDocumentsAttached: boolean;
  itemReconciliation: { passed: boolean; mismatches: string[] };
  onSetFieldValue: (field: keyof RFQFormData, value: any) => void;
}

export const Step2CargoPackages: React.FC<Step2CargoPackagesProps> = ({
  formData,
  errors,
  onSetFieldValue,
}) => {
  const [commDocName, setCommDocName] = useState<string>(formData.commercial_docs_name || '');
  const [packDocName, setPackDocName] = useState<string>(formData.packaginglist_docs_name || '');
  const [showMultiSKU, setShowMultiSKU] = useState<boolean>(formData.commercial_items.length > 1);
  const [activeContainerIndex, setActiveContainerIndex] = useState<number>(0);

  // REEF API HS Code Auto-Suggest State
  const [hsCandidates, setHsCandidates] = useState<ReefHSCandidate[]>([]);
  const [isSearchingHS, setIsSearchingHS] = useState<boolean>(false);
  const [dismissedHsCandidates, setDismissedHsCandidates] = useState<boolean>(false);

  // Debounced REEF API Lookup when Commodity Description changes
  useEffect(() => {
    const query = formData.commodity_description;
    if (!query || query.trim().length < 3 || dismissedHsCandidates) {
      setHsCandidates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingHS(true);
      try {
        const candidates = await classifyHSCodeReefAPI(query, formData.destCountry || 'US');
        if (!dismissedHsCandidates) {
          setHsCandidates(candidates);
        }
      } catch (err) {
        console.warn('REEF API HS Lookup error:', err);
      } finally {
        setIsSearchingHS(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.commodity_description, formData.destCountry, dismissedHsCandidates]);

  // File Upload Handlers
  const handleCommercialDocsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSetFieldValue('commercial_docs', file);
      onSetFieldValue('commercial_docs_name', file.name);
      setCommDocName(file.name);

      if (!formData.cargo_value) {
        onSetFieldValue('cargo_value', 52500);
      }
    }
  };

  const handlePackingListUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSetFieldValue('packaginglist_docs', file);
      onSetFieldValue('packaginglist_docs_name', file.name);
      setPackDocName(file.name);
    }
  };

  // Primary Item Sync Helper
  const primaryItem = formData.commercial_items[0] || {
    id: 'item-1',
    description: formData.commodity_description || '',
    hsCode: formData.hs_code || '',
    quantity: 1,
    unitPrice: formData.cargo_value || 0,
    netWeight: 0,
  };

  const handlePrimaryItemChange = (field: keyof CommercialItem, value: any) => {
    const updatedItems = [...formData.commercial_items];
    if (updatedItems.length === 0) {
      updatedItems.push({
        id: 'item-1',
        description: formData.commodity_description || '',
        hsCode: formData.hs_code || '',
        quantity: 1,
        unitPrice: formData.cargo_value || 0,
        netWeight: 0,
      });
    }

    updatedItems[0] = { ...updatedItems[0], [field]: value };

    // Auto calculate cargo_value if quantity or unitPrice changes
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(value) : updatedItems[0].quantity;
      const p = field === 'unitPrice' ? Number(value) : updatedItems[0].unitPrice;
      const computedVal = q * p;
      if (computedVal > 0) {
        onSetFieldValue('cargo_value', computedVal);
      }
    }

    if (field === 'description') {
      onSetFieldValue('commodity_description', value);
    }
    if (field === 'hsCode') {
      onSetFieldValue('hs_code', value);
    }

    onSetFieldValue('commercial_items', updatedItems);
  };

  // Total Net Cargo Weight = sum across commercial items (quantity * unit net weight)
  const totalNetCargoWeight = formData.commercial_items.reduce(
    (sum, item) => sum + (Number(item.netWeight) || 0) * (Number(item.quantity) || 1),
    0
  );

  // Total Gross Weight Calculation with Net Weight Fallback
  const totalGrossWeight = calculateTotalGrossWeightKg(formData.packages, formData.unit_system, totalNetCargoWeight);
  const totalVolumeCbm = calculateTotalVolumeCbm(formData.packages, formData.unit_system);

  const { volumetricWeightKg, ruleDescription } = calculateVolumetricWeight(
    totalVolumeCbm,
    formData.mode,
    formData.load_type,
    formData.unit_system
  );

  const chargeableWeightKg = calculateChargeableWeightKg(totalGrossWeight, volumetricWeightKg);

  // Add / Remove Package Card
  const handleAddPackage = () => {
    const newPkg: PackageCard = {
      id: `pkg-${Date.now()}`,
      packageType: 'Box / Pallet',
      quantity: 1,
      length: 0,
      width: 0,
      height: 0,
      grossWeight: 0,
      isStackable: true,
      packedItemDescriptions: [formData.commodity_description || 'General Cargo'],
    };
    onSetFieldValue('packages', [...formData.packages, newPkg]);
  };

  const handleRemovePackage = (index: number) => {
    if (formData.packages.length <= 1) return;
    const updated = formData.packages.filter((_, idx) => idx !== index);
    onSetFieldValue('packages', updated);
  };

  const handleUpdatePackage = (index: number, field: keyof PackageCard, value: any) => {
    const updated = [...formData.packages];
    updated[index] = { ...updated[index], [field]: value };
    onSetFieldValue('packages', updated);
  };

  // Multi-SKU Itemized Table Handlers
  const handleAddCommercialItem = () => {
    const newItem: CommercialItem = {
      id: `item-${Date.now()}`,
      description: '',
      hsCode: formData.hs_code || '',
      quantity: 1,
      unitPrice: 0,
      netWeight: 0,
    };
    onSetFieldValue('commercial_items', [...formData.commercial_items, newItem]);
  };

  const handleRemoveCommercialItem = (index: number) => {
    if (formData.commercial_items.length <= 1) return;
    const updated = formData.commercial_items.filter((_, idx) => idx !== index);
    onSetFieldValue('commercial_items', updated);
  };

  const handleUpdateCommercialItem = (index: number, field: keyof CommercialItem, value: any) => {
    const updated = [...formData.commercial_items];
    updated[index] = { ...updated[index], [field]: value };
    onSetFieldValue('commercial_items', updated);
  };

  const totalPackageCount = formData.packages.reduce((sum, p) => sum + (Number(p.quantity) || 1), 0);
  const pkgNetWeightEstimate = totalPackageCount > 0 ? Math.ceil(totalNetCargoWeight / totalPackageCount) : 0;

  const [aiResult, setAiResult] = useState<AIEquipmentOutput | null>(null);

  // Trigger AI Equipment Recommendation Engine (Google Gemini API / Proxy)
  useEffect(() => {
    if (!formData.commodity_description && !formData.hs_code) return;

    let active = true;
    requestAIEquipmentRecommendation({
      cargo_volume_cbm: totalVolumeCbm,
      cargo_gross_weight_kg: totalGrossWeight,
      max_package_dimensions: {
        length: Math.max(0, ...formData.packages.map((p) => (p.length || 0) / 100)),
        width: Math.max(0, ...formData.packages.map((p) => (p.width || 0) / 100)),
        height: Math.max(0, ...formData.packages.map((p) => (p.height || 0) / 100)),
      },
      commodity_name: formData.commodity_description || 'General Cargo',
      is_hazardous: Boolean(formData.hazardous_materials),
      temperature_control: {
        is_required: Boolean(formData.temperature_control_required),
      },
      cargo_form: 'packaged_dry',
      loading_access: 'standard_rear_door',
      requires_rigid_roof: false,
      is_urgent: false,
      is_high_value_fragile: false,
    }).then((res) => {
      if (active && res) {
        setAiResult(res);
      }
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, [formData.commodity_description, formData.hs_code, totalVolumeCbm, totalGrossWeight]);

  const deriveAIRecommendation = () => {
    const maxLenM = Math.max(0, ...formData.packages.map((p) => (p.length || 0) / 100));
    const maxWidM = Math.max(0, ...formData.packages.map((p) => (p.width || 0) / 100));
    const maxHgtM = Math.max(0, ...formData.packages.map((p) => (p.height || 0) / 100));

    // 1. Container Type (Category Family) - Suggested strictly by AI evaluation output or user equipment choice
    let category: ContainerCategory = 'Standard';

    if (aiResult?.equipment_recommendation?.name) {
      const recName = aiResult.equipment_recommendation.name.toLowerCase();
      if (recName.includes('reefer') || aiResult.flags?.is_reefer) category = 'Reefer';
      else if (recName.includes('tank')) category = 'Tank';
      else if (recName.includes('flat') || aiResult.flags?.is_oog) category = 'Flat Rack';
      else if (recName.includes('open top')) category = 'Open Top';
      else if (recName.includes('hardtop')) category = 'Hardtop';
    } else if (formData.container_type) {
      category = getContainerSpecByNameOrCode(formData.container_type).category;
    }

    // 2. Container Size & Count Selection - Derived via Internal Metric Calculations (Volume, Weight & Package Dimensions)
    const mixResult = computeOptimalEquipmentMix(
      totalVolumeCbm,
      totalGrossWeight,
      maxLenM,
      maxWidM,
      maxHgtM,
      category
    );

    // 3. Dangerous Goods & Reefer Flags (Suggested by AI model output or User selection)
    const isHazmat = Boolean((aiResult?.flags as any)?.is_hazmat) || Boolean(formData.hazardous_materials);
    const imoClassCode = formData.un_class_code || 'Class 3 (Flammable Liquids)';

    const isReefer = Boolean(aiResult?.flags?.is_reefer) || Boolean(formData.temperature_control_required);
    const targetTemperature = formData.target_temperature || '2°C – 4°C (Chilled Cold Chain)';

    const rationale = aiResult?.rationale || mixResult.rationale;

    return {
      containerType: mixResult.primaryContainerType,
      containerCount: mixResult.totalFleetCount,
      equipmentMix: mixResult,
      isHazmat,
      imoClassCode,
      isReefer,
      targetTemperature,
      rationale,
    };
  };

  const aiRecommendation = deriveAIRecommendation();

  // Live Auto-Sync: Update container fields when FCL is selected or when cargo volume changes
  useEffect(() => {
    if (formData.load_type === 'FCL') {
      const selectedType = formData.container_type || aiRecommendation.containerType;
      const spec = getContainerSpecByNameOrCode(selectedType);
      const minRequiredCount = Math.max(1, Math.ceil(totalVolumeCbm / (spec.cbmCapacity || 33.2)));

      if (!formData.container_type) {
        onSetFieldValue('container_type', aiRecommendation.containerType);
      }
      if (!formData.container_count || formData.container_count < minRequiredCount) {
        onSetFieldValue('container_count', Math.max(aiRecommendation.containerCount, minRequiredCount));
      }
    } else if (formData.load_type === 'LCL') {
      if (formData.container_type) onSetFieldValue('container_type', '');
      if (formData.container_count !== 1) onSetFieldValue('container_count', 1);
    }
  }, [
    formData.load_type,
    totalVolumeCbm,
    aiRecommendation.containerType,
    aiRecommendation.containerCount,
  ]);




  return (
    <div className="step-container animate-fade-in">
      {/* 1. Drag & Drop Shipment Document Upload Dropzone */}
      <div className="section-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <FileText size={20} className="text-indigo" /> 1. Shipment Documents (Commercial Invoice & Packing List)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, marginTop: '0.2rem' }}>
              Upload Commercial Invoice and Packing List for automatic cargo value, weights, and specifications extraction.
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#dbeafe', padding: '0.3rem 0.65rem', borderRadius: '6px' }}>
            ⚡ AI Auto-Extract Ready
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
          {/* Commercial Invoice Dropzone */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              border: commDocName ? '2px solid #22c55e' : '2px dashed #93c5fd',
              background: commDocName ? '#f0fdf4' : '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ background: commDocName ? '#dcfce7' : '#dbeafe', color: commDocName ? '#15803d' : '#1d4ed8', padding: '0.6rem', borderRadius: '10px', display: 'flex' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.925rem', display: 'block', color: '#1e293b' }}>
                    Commercial Invoice *
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    PDF, PNG, JPG (up to 10MB)
                  </span>
                </div>
              </div>
              {commDocName && <CheckCircle2 size={20} style={{ color: '#22c55e' }} />}
            </div>

            {commDocName ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#15803d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                  ✓ {commDocName}
                </span>
                <label style={{ cursor: 'pointer', color: '#2563eb', fontSize: '0.78rem', fontWeight: 700 }}>
                  Change
                  <input type="file" accept=".pdf,.jpg,.png" onChange={handleCommercialDocsUpload} style={{ display: 'none' }} />
                </label>
              </div>
            ) : (
              <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#2563eb', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'center' }}>
                <Upload size={16} /> Choose Invoice File
                <input type="file" accept=".pdf,.jpg,.png" onChange={handleCommercialDocsUpload} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {/* Packing List Dropzone */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              border: packDocName ? '2px solid #22c55e' : '2px dashed #93c5fd',
              background: packDocName ? '#f0fdf4' : '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ background: packDocName ? '#dcfce7' : '#dbeafe', color: packDocName ? '#15803d' : '#1d4ed8', padding: '0.6rem', borderRadius: '10px', display: 'flex' }}>
                  <PackageCheck size={22} />
                </div>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.925rem', display: 'block', color: '#1e293b' }}>
                    Packing List *
                  </span>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    PDF, PNG, JPG (up to 10MB)
                  </span>
                </div>
              </div>
              {packDocName && <CheckCircle2 size={20} style={{ color: '#22c55e' }} />}
            </div>

            {packDocName ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#15803d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                  ✓ {packDocName}
                </span>
                <label style={{ cursor: 'pointer', color: '#2563eb', fontSize: '0.78rem', fontWeight: 700 }}>
                  Change
                  <input type="file" accept=".pdf,.jpg,.png" onChange={handlePackingListUpload} style={{ display: 'none' }} />
                </label>
              </div>
            ) : (
              <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#2563eb', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'center' }}>
                <Upload size={16} /> Choose Packing List
                <input type="file" accept=".pdf,.jpg,.png" onChange={handlePackingListUpload} style={{ display: 'none' }} />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* 2. Commodity, Pricing & Commercial Specifications Card */}
      <div className="section-card" style={{ marginTop: '1.25rem' }}>
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={20} className="text-indigo" /> 2. Commodity, Pricing & Commercial Specifications
        </h3>

        {/* Row 1: Commodity Description & HS Code + REEF API Auto-Suggest */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.15rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem' }}>
            <FormInput
              label="HS Code"
              name="hs_code"
              value={formData.hs_code}
              onChange={(e) => {
                onSetFieldValue('hs_code', e.target.value);
                handlePrimaryItemChange('hsCode', e.target.value);
              }}
              placeholder="e.g. 8458.11"
              error={errors.hs_code}
              helperText="Harmonized Tariff System Code"
            />

            <FormInput
              label="Commodity Description *"
              name="commodity_description"
              value={formData.commodity_description}
              onChange={(e) => {
                onSetFieldValue('commodity_description', e.target.value);
                handlePrimaryItemChange('description', e.target.value);
                setDismissedHsCandidates(false);
              }}
              placeholder="e.g. Precision Industrial Machining Equipment"
              error={errors.commodity_description}
              helperText="Descriptive cargo summary"
            />
          </div>

          {/* REEF API HS Code Auto-Suggest Chip Badge */}
          {isSearchingHS && (
            <div style={{ fontSize: '0.78rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
              <Sparkles size={14} className="animate-spin" /> Querying REEF AI Tariff Classifier...
            </div>
          )}

          {!isSearchingHS && hsCandidates.length > 0 && !dismissedHsCandidates && (
            <div style={{ background: '#f0f6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '0.65rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={14} /> REEF API HS Code Suggestions:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {hsCandidates.slice(0, 3).map((cand) => (
                  <button
                    key={cand.code}
                    type="button"
                    onClick={() => {
                      onSetFieldValue('hs_code', cand.code);
                      handlePrimaryItemChange('hsCode', cand.code);
                      if (cand.description) {
                        onSetFieldValue('commodity_description', cand.description);
                        handlePrimaryItemChange('description', cand.description);
                      }
                      setDismissedHsCandidates(true);
                      setHsCandidates([]);
                    }}
                    style={{
                      background: formData.hs_code === cand.code ? '#2563eb' : '#ffffff',
                      color: formData.hs_code === cand.code ? '#ffffff' : '#1e293b',
                      border: formData.hs_code === cand.code ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>{cand.code}</span>
                    <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>({cand.description})</span>
                    {cand.confidence && <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1d4ed8', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>{Math.round(cand.confidence * 100)}%</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Quantity, Unit Price & Net Weight per Unit */}
        <div className="grid-3col" style={{ gap: '1.25rem', marginBottom: '1.15rem' }}>
          <FormInput
            type="number"
            min={1}
            label="Quantity (Units) *"
            name="primary_item_qty"
            value={primaryItem.quantity || ''}
            onChange={(e) => handlePrimaryItemChange('quantity', e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
            error={errors.primary_item_qty}
            helperText="Item unit count"
          />

          <FormInput
            type="number"
            min={0}
            label={`Unit Price (${getCurrencySymbol(formData.currency)}) *`}
            name="primary_item_unit_price"
            value={primaryItem.unitPrice || ''}
            onChange={(e) => handlePrimaryItemChange('unitPrice', e.target.value === '' ? '' : Number(e.target.value))}
            error={errors.primary_item_unit_price}
            icon={getCurrencyIconNode(formData.currency)}
            helperText={`Price per individual unit in ${formData.currency || 'USD'}`}
          />

          <FormInput
            type="number"
            min={0}
            label="Net Weight / Unit (kg) *"
            name="primary_item_net_weight"
            value={primaryItem.netWeight || ''}
            onChange={(e) => handlePrimaryItemChange('netWeight', e.target.value === '' ? '' : Number(e.target.value))}
            error={errors.primary_item_net_weight}
            icon={<Scale size={16} />}
            helperText="Net weight per individual unit (excl. packaging)"
          />
        </div>

        {/* Row 3: Total Cargo Commercial Value, Currency & Load Type */}
        <div className="grid-3col" style={{ gap: '1.25rem' }}>
          <FormInput
            type="number"
            label={`Total Commercial Value (${getCurrencySymbol(formData.currency)}) *`}
            name="cargo_value"
            value={formData.cargo_value || ''}
            onChange={(e) => onSetFieldValue('cargo_value', e.target.value === '' ? '' : Number(e.target.value))}
            error={errors.cargo_value}
            icon={getCurrencyIconNode(formData.currency)}
            helperText="Total invoice valuation (Auto-calculated: Qty × Unit Price)"
          />

          <FormSelect
            label="Currency *"
            name="currency"
            value={formData.currency || 'USD'}
            onChange={(e) => onSetFieldValue('currency', e.target.value)}
            options={[
              { value: 'USD', label: 'USD - US Dollar ($)' },
              { value: 'INR', label: 'INR - Indian Rupee (₹)' },
              { value: 'EUR', label: 'EUR - Euro (€)' },
              { value: 'GBP', label: 'GBP - British Pound (£)' },
              { value: 'AED', label: 'AED - UAE Dirham (AED)' },
              { value: 'SGD', label: 'SGD - Singapore Dollar (S$)' },
              { value: 'CAD', label: 'CAD - Canadian Dollar (C$)' },
              { value: 'AUD', label: 'AUD - Australian Dollar (A$)' },
              { value: 'JPY', label: 'JPY - Japanese Yen (¥)' },
              { value: 'CNY', label: 'CNY - Chinese Yuan (¥)' },
            ]}
            error={errors.currency}
          />

          <FormSelect
            label="Load Type *"
            name="load_type"
            value={formData.load_type}
            onChange={(e) => onSetFieldValue('load_type', e.target.value)}
            options={[
              { value: 'FCL', label: 'FCL - Full Container Load' },
              { value: 'LCL', label: 'LCL - Less than Container Load' },
              { value: 'AIR_STANDARD', label: 'Air Standard Freight' },
            ]}
            error={errors.load_type}
          />
        </div>


        {/* Optional Multi-SKU Expander */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 500 }}>
            Shipping multiple distinct commercial SKUs in this shipment?
          </span>
          <button
            type="button"
            onClick={() => setShowMultiSKU(!showMultiSKU)}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#1e293b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
          >
            {showMultiSKU ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showMultiSKU ? 'Hide Multi-SKU Itemized Table' : '+ Expand Multi-SKU Itemized Breakdown'}
          </button>
        </div>

        {/* Multi-SKU Itemized Table (Expandable on demand) */}
        {showMultiSKU && (
          <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                Itemized Commercial Breakdown ({formData.commercial_items.length} SKUs)
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddCommercialItem} leftIcon={<Plus size={14} />}>
                Add Additional SKU
              </Button>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#ffffff' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#ffffff', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>SKU Description</th>
                    <th style={{ padding: '0.75rem 0.75rem', width: '130px' }}>HS Code</th>
                    <th style={{ padding: '0.75rem 0.75rem', width: '90px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0.75rem 0.75rem', width: '140px' }}>Unit Price ({getCurrencySymbol(formData.currency)})</th>
                    <th style={{ padding: '0.75rem 0.75rem', width: '140px' }}>Net Wt/Unit (kg)</th>
                    <th style={{ padding: '0.75rem 0.75rem', width: '60px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.commercial_items.map((item, index) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateCommercialItem(index, 'description', e.target.value)}
                          style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        <input
                          type="text"
                          value={item.hsCode || ''}
                          onChange={(e) => handleUpdateCommercialItem(index, 'hsCode', e.target.value)}
                          style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity || ''}
                          onChange={(e) => handleUpdateCommercialItem(index, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                          style={{ width: '100%', padding: '0.5rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', textAlign: 'center', fontSize: '0.875rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        <input
                          type="number"
                          min={0}
                          value={item.unitPrice || ''}
                          onChange={(e) => handleUpdateCommercialItem(index, 'unitPrice', e.target.value === '' ? '' : Number(e.target.value))}
                          style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem' }}>
                        <input
                          type="number"
                          min={0}
                          value={item.netWeight || ''}
                          onChange={(e) => handleUpdateCommercialItem(index, 'netWeight', e.target.value === '' ? '' : Number(e.target.value))}
                          style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveCommercialItem(index)}
                          disabled={formData.commercial_items.length <= 1}
                          style={{ background: 'none', border: 'none', color: formData.commercial_items.length <= 1 ? '#cbd5e1' : '#ef4444', cursor: formData.commercial_items.length <= 1 ? 'not-allowed' : 'pointer', padding: '0.35rem' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 3. Package Dimensions, Gross Weight & Weight Breakdown Section */}
      <div className="section-card" style={{ marginTop: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Box size={20} className="text-indigo" /> 3. Package Dimensions & Gross Weight
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, marginTop: '0.15rem' }}>
              Define package count, dimensions (L × W × H cm), and auto-derive or override gross weight per package unit.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddPackage} leftIcon={<Plus size={14} />}>
            Add Package Line
          </Button>
        </div>

        {errors.packages && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#b91c1c', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>⚠️</span> {errors.packages}
          </div>
        )}

        {/* Logistics Weight & Volume Metrics Breakdown Summary Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1.5px solid #bae6fd',
            borderRadius: '12px',
            padding: '0.9rem 1.15rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: '#0284c7', color: '#ffffff', padding: '0.55rem', borderRadius: '8px', display: 'flex' }}>
              <Scale size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0369a1', display: 'block' }}>
                Logistics Weight & Volume Breakdown
              </span>
              <span style={{ fontSize: '0.76rem', color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Info size={13} /> {ruleDescription}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            {/* Total Gross Weight */}
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: '#0369a1', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Total Gross Wt
              </span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {totalGrossWeight.toLocaleString()} <small style={{ fontSize: '0.725rem', color: '#475569' }}>kg</small>
              </span>
              <span style={{ fontSize: '0.68rem', color: '#0369a1', display: 'block', opacity: 0.85 }}>
                (Auto-derived per pkg)
              </span>
            </div>

            <div style={{ height: '32px', width: '1px', background: '#93c5fd' }} />

            {/* Total Net Cargo Weight */}
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: '#0369a1', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Net Cargo Wt
              </span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {totalNetCargoWeight.toLocaleString()} <small style={{ fontSize: '0.725rem', color: '#475569' }}>kg</small>
              </span>
              <span style={{ fontSize: '0.68rem', color: '#0369a1', display: 'block', opacity: 0.85 }}>
                (Qty × Net Wt/Unit)
              </span>
            </div>

            <div style={{ height: '32px', width: '1px', background: '#93c5fd' }} />

            {/* Total Volume */}
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: '#0369a1', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Total Volume
              </span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {totalVolumeCbm.toFixed(2)} <small style={{ fontSize: '0.725rem', color: '#475569' }}>CBM</small>
              </span>
              <span style={{ fontSize: '0.68rem', color: '#0369a1', display: 'block', opacity: 0.85 }}>
                (L × W × H ÷ 1M)
              </span>
            </div>

            <div style={{ height: '32px', width: '1px', background: '#93c5fd' }} />

            {/* Chargeable Weight */}
            <div style={{ textAlign: 'right', background: '#ffffff', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #7dd3fc' }}>
              <span style={{ fontSize: '0.7rem', color: '#0284c7', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>
                Chargeable Wt
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0369a1' }}>
                {chargeableWeightKg.toLocaleString()} <small style={{ fontSize: '0.725rem', color: '#0284c7' }}>kg</small>
              </span>
              <span style={{ fontSize: '0.68rem', color: '#0284c7', display: 'block', fontWeight: 600 }}>
                max(Gross, Vol)
              </span>
            </div>
          </div>
        </div>

        {/* Package Line Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {formData.packages.map((pkg, index) => {
            const volCbm = ((pkg.length * pkg.width * pkg.height) / 1000000) * pkg.quantity;
            const explicitGross = (pkg.grossWeight || 0) * pkg.quantity;
            const lineGrossWeight = explicitGross > 0 ? explicitGross : (pkgNetWeightEstimate * pkg.quantity);
            const isAutoDefault = !pkg.grossWeight && pkgNetWeightEstimate > 0;

            return (
              <div
                key={pkg.id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1d4ed8', background: '#dbeafe', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                      PACKAGE LINE #{index + 1}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0891b2', background: '#ecfeff', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                      📦 Vol: {volCbm.toFixed(2)} CBM
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isAutoDefault ? '#0284c7' : '#15803d', background: isAutoDefault ? '#e0f2fe' : '#f0fdf4', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                      ⚖️ Line Total Gross: {lineGrossWeight.toLocaleString()} kg {isAutoDefault ? '(Auto Cargo Net)' : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemovePackage(index)}
                    disabled={formData.packages.length <= 1}
                    style={{ background: 'none', border: 'none', color: formData.packages.length <= 1 ? '#cbd5e1' : '#ef4444', cursor: formData.packages.length <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Qty (Packages)</label>
                    <input
                      type="number"
                      min={1}
                      value={pkg.quantity || ''}
                      onChange={(e) => handleUpdatePackage(index, 'quantity', e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Length (cm)</label>
                    <input
                      type="number"
                      min={0}
                      value={pkg.length || ''}
                      onChange={(e) => handleUpdatePackage(index, 'length', e.target.value === '' ? '' : Number(e.target.value))}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Width (cm)</label>
                    <input
                      type="number"
                      min={0}
                      value={pkg.width || ''}
                      onChange={(e) => handleUpdatePackage(index, 'width', e.target.value === '' ? '' : Number(e.target.value))}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Height (cm)</label>
                    <input
                      type="number"
                      min={0}
                      value={pkg.height || ''}
                      onChange={(e) => handleUpdatePackage(index, 'height', e.target.value === '' ? '' : Number(e.target.value))}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Gross Wt / Pkg (kg)</span>
          
                    </label>
                    <input
                      type="number"
                      readOnly
                      disabled
                      value={pkg.grossWeight || (totalPackageCount > 0 && totalGrossWeight > 0 ? Math.round(totalGrossWeight / totalPackageCount) : (pkgNetWeightEstimate > 0 ? pkgNetWeightEstimate : ''))}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.65rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: '#475569',
                        background: '#f1f5f9',
                        cursor: 'not-allowed',
                      }}
                      title="Auto-calculated from Total Cargo Weight ÷ Total Packages."
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. AI Recommended Cargo & Equipment Allocation Card (Displayed ONLY if Load Type is NOT LCL) */}
      {formData.load_type !== 'LCL' && (
        <div
          className="section-card"
          style={{
            marginTop: '1.25rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)',
            border: '1.5px solid #86efac',
            borderRadius: '12px',
            padding: '1.15rem 1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 className="section-title" style={{ margin: 0, color: '#14532d', fontSize: '1rem', fontWeight: 800 }}>
                    AI Recommended Cargo & Equipment Allocation
                  </h3>
                </div>
                <span style={{ fontSize: '0.76rem', color: '#166534', fontWeight: 500 }}>
                  Derived from package dimensions, total gross weight ({totalGrossWeight.toLocaleString()} kg), volume ({totalVolumeCbm.toFixed(2)} CBM), and HS code specifications.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Hazmat / DG Badge */}
              <div style={{ background: aiRecommendation.isHazmat ? '#fef2f2' : '#ffffff', border: aiRecommendation.isHazmat ? '1px solid #fca5a5' : '1px solid #bbf7d0', padding: '0.35rem 0.65rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, color: aiRecommendation.isHazmat ? '#dc2626' : '#15803d' }}>
                {aiRecommendation.isHazmat ? `⚠️ ${aiRecommendation.imoClassCode}` : '✓ Non-Hazardous Cargo'}
              </div>
            </div>
          </div>



          {/* Single Unified Load & Capacity Utilization Inspector */}
          {(() => {
            const isMixedFleet = aiRecommendation.equipmentMix && aiRecommendation.equipmentMix.mix.length > 1;

            if (isMixedFleet) {
              // Flatten individual containers from the recommended mix
              const individualContainers: Array<{
                index: number;
                spec: typeof aiRecommendation.equipmentMix.mix[0]['spec'];
                volAllocated: number;
                weightAllocated: number;
                itemCount: number;
                volUtilization: number;
                weightUtilization: number;
              }> = [];

              let remainingVol = totalVolumeCbm;
              let remainingWeight = totalGrossWeight;
              const totalItems = formData.commercial_items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0) || 48;
              let remainingItems = totalItems;

              const totalContainersInMix = aiRecommendation.equipmentMix.totalFleetCount;
              const densityKgPerCbm = totalVolumeCbm > 0 ? totalGrossWeight / totalVolumeCbm : 0;

              let globalIdx = 0;
              aiRecommendation.equipmentMix.mix.forEach((mixItem) => {
                for (let c = 0; c < mixItem.count; c++) {
                  globalIdx++;
                  const spec = mixItem.spec;
                  const maxVol = spec.cbmCapacity;
                  const maxWeight = spec.maxPayloadKg;
                  const isLast = globalIdx === totalContainersInMix;

                  // 1. Determine volume limits based on both container CBM capacity and payload weight cap
                  const volCapByVolume = maxVol * 0.92;
                  const volCapByWeight = densityKgPerCbm > 0 ? maxWeight / densityKgPerCbm : Infinity;
                  const maxVolAllowed = Math.min(volCapByVolume, volCapByWeight);

                  const volForThis = isLast ? remainingVol : Math.min(remainingVol, maxVolAllowed);

                  // 2. Determine weight allocation capped by container max payload kg
                  const weightByVol = totalVolumeCbm > 0 ? (volForThis / totalVolumeCbm) * totalGrossWeight : 0;
                  const weightForThis = isLast
                    ? remainingWeight
                    : Math.min(remainingWeight, Math.min(maxWeight, weightByVol > 0 ? weightByVol : maxWeight * 0.85));

                  // 3. Determine item allocation based on weight ratio & remaining items
                  let itemsForThis = isLast
                    ? remainingItems
                    : (totalGrossWeight > 0
                        ? Math.round((weightForThis / totalGrossWeight) * totalItems)
                        : Math.round(totalItems / totalContainersInMix));

                  itemsForThis = Math.max(0, Math.min(remainingItems, itemsForThis));
                  if (isLast) itemsForThis = remainingItems;

                  const volUtil = Math.min(100, Math.round((volForThis / maxVol) * 100));
                  const weightUtil = Math.min(100, Math.round((weightForThis / maxWeight) * 100));

                  individualContainers.push({
                    index: globalIdx,
                    spec,
                    volAllocated: volForThis,
                    weightAllocated: Math.round(weightForThis),
                    itemCount: Math.max(itemsForThis > 0 ? itemsForThis : (isLast ? remainingItems : 0), 0),
                    volUtilization: volUtil,
                    weightUtilization: weightUtil,
                  });

                  remainingVol = Math.max(0, remainingVol - volForThis);
                  remainingWeight = Math.max(0, remainingWeight - weightForThis);
                  remainingItems = Math.max(0, remainingItems - itemsForThis);
                }
              });

              const safeActiveIdx = Math.min(activeContainerIndex, individualContainers.length - 1);
              const activeContainer = individualContainers[safeActiveIdx] || individualContainers[0];

              return (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '16px',
                    padding: '1.15rem 1.25rem',
                    marginBottom: '0.85rem',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {/* Top Bar: Container Tabs on Left, Items Allocated + Active Container Name on Right */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {/* Numbered Container Selector Pills */}
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {individualContainers.map((cont, idx) => {
                          const isActive = safeActiveIdx === idx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveContainerIndex(idx)}
                              style={{
                                padding: '0.25rem 0.65rem',
                                borderRadius: '6px',
                                border: isActive ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                background: isActive ? '#2563eb' : '#f8fafc',
                                color: isActive ? '#ffffff' : '#475569',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <span>Container {idx + 1}</span>
                              {isActive && <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>({cont.spec.code || 'ISO'})</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '0.2rem 0.55rem', borderRadius: '12px' }}>
                        📦 {activeContainer.itemCount} items allocated
                      </span>

                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                        {activeContainer.spec.name}
                      </span>
                    </div>
                  </div>

                  {/* SmartRFQ Fleet Summary Strip */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      padding: '0.6rem 0.85rem',
                      marginBottom: '0.85rem',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#1e3a8a', fontSize: '0.82rem' }}>
                      <span>🏆 Fleet Mix:</span>
                      <span style={{ color: '#2563eb' }}>{aiRecommendation.equipmentMix.formattedMixString}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                      <span>Cargo Volume: <strong style={{ color: '#0f172a' }}>{totalVolumeCbm.toFixed(1)} CBM</strong></span>
                      <span>Cargo Weight: <strong style={{ color: '#0f172a' }}>{totalGrossWeight.toLocaleString()} kg</strong></span>
                    </div>
                  </div>

                  {/* Capacity Gauges for Active Container */}
                  <div style={{ marginBottom: '0.85rem', background: '#ffffff', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {/* Volume Capacity */}
                    <div style={{ marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        <span style={{ color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          📐 Volume Capacity Utilization
                        </span>
                        <span style={{ color: '#0284c7', fontWeight: 800 }}>
                          {activeContainer.volAllocated.toFixed(2)} / {activeContainer.spec.cbmCapacity} CBM ({activeContainer.volUtilization}%)
                        </span>
                      </div>
                      <div style={{ height: '6px', width: '100%', background: '#e0f2fe', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${activeContainer.volUtilization}%`, background: '#0284c7', borderRadius: '3px' }} />
                      </div>
                    </div>

                    {/* Weight Capacity */}
                    <div style={{ marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        <span style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          ⚖️ Payload Weight Capacity
                        </span>
                        <span style={{ color: '#16a34a', fontWeight: 800 }}>
                          {activeContainer.weightAllocated.toLocaleString()} / {activeContainer.spec.maxPayloadKg.toLocaleString()} kg ({activeContainer.weightUtilization}%)
                        </span>
                      </div>
                      <div style={{ height: '6px', width: '100%', background: '#dcfce7', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${activeContainer.weightUtilization}%`, background: '#16a34a', borderRadius: '3px' }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Single container specification inspector
            const spec = getContainerSpecByNameOrCode(formData.container_type || "20' Standard");
            const count = formData.container_count || 1;
            const maxVol = spec.cbmCapacity * count;
            const maxWeight = spec.maxPayloadKg * count;

            const rawVolPercent = maxVol > 0 ? Math.round((totalVolumeCbm / maxVol) * 100) : 0;
            const rawWeightPercent = maxWeight > 0 ? Math.round((totalGrossWeight / maxWeight) * 100) : 0;

            const volGaugePercent = Math.min(100, rawVolPercent);
            const weightGaugePercent = Math.min(100, rawWeightPercent);

            const isOverloaded = totalVolumeCbm > maxVol || totalGrossWeight > maxWeight;
            const requiredCountForSelected = Math.max(1, Math.ceil(totalVolumeCbm / (spec.cbmCapacity || 33.2)));

            return (
              <div
                style={{
                  background: '#ffffff',
                  border: isOverloaded ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '0.85rem 1.1rem',
                  marginBottom: '0.85rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.875rem' }}>
                      📦 {count}x {spec.name} ({spec.code} / ISO {spec.isoTypeGroup})
                    </span>
                    <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                      {spec.category} Category
                    </span>
                    {isOverloaded && (
                      <span style={{ fontSize: '0.7rem', background: '#fef2f2', color: '#dc2626', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 800 }}>
                        ⚠️ Over Capacity
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    Dimensions: <strong style={{ color: '#0f172a' }}>{spec.dimensions}</strong> | Max Gross: <strong style={{ color: '#0f172a' }}>{spec.maxGrossKg.toLocaleString()} kg</strong> | Tare: <strong style={{ color: '#0f172a' }}>{spec.tareKg.toLocaleString()} kg</strong>
                  </div>
                </div>

                {/* Gauges */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  {/* Volume Gauge */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      <span style={{ color: '#0369a1' }}>📐 Volume Utilization</span>
                      <span style={{ color: rawVolPercent > 100 ? '#dc2626' : (rawVolPercent > 95 ? '#ea580c' : '#0284c7') }}>
                        {totalVolumeCbm.toFixed(2)} / {maxVol.toFixed(1)} CBM ({rawVolPercent}%{rawVolPercent > 100 ? ' - OVER CAPACITY' : ''})
                      </span>
                    </div>
                    <div style={{ height: '8px', width: '100%', background: '#e0f2fe', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${volGaugePercent}%`, background: rawVolPercent > 100 ? '#ef4444' : (rawVolPercent > 80 ? '#f59e0b' : '#0284c7'), transition: 'width 0.3s ease' }} />
                    </div>
                  </div>

                  {/* Weight Gauge */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                      <span style={{ color: '#15803d' }}>⚖️ Payload Weight Utilization</span>
                      <span style={{ color: rawWeightPercent > 100 ? '#dc2626' : (rawWeightPercent > 95 ? '#ea580c' : '#16a34a') }}>
                        {totalGrossWeight.toLocaleString()} / {maxWeight.toLocaleString()} kg ({rawWeightPercent}%{rawWeightPercent > 100 ? ' - OVER WEIGHT' : ''})
                      </span>
                    </div>
                    <div style={{ height: '8px', width: '100%', background: '#dcfce7', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${weightGaugePercent}%`, background: rawWeightPercent > 100 ? '#ef4444' : (rawWeightPercent > 80 ? '#f59e0b' : '#22c55e'), transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                </div>

                {isOverloaded && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.55rem 0.85rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      ⚠️ Cargo exceeds {count}× {spec.name} capacity. Requires {requiredCountForSelected} containers.
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => onSetFieldValue('container_count', requiredCountForSelected)}
                        style={{ background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ⚡ Add Containers (Set Count to {requiredCountForSelected})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSetFieldValue('container_type', aiRecommendation.containerType);
                          onSetFieldValue('container_count', aiRecommendation.containerCount);
                        }}
                        style={{ background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ✨ Apply AI Fleet Mix ({aiRecommendation.containerCount} Containers)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Reefer Cold Chain Banner if Reefer Container Suggested */}
          {aiRecommendation.isReefer && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <span style={{ fontSize: '1.1rem' }}>❄️</span>
                <div>
                  <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#1d4ed8', display: 'block' }}>
                    Reefer Container Suggested: Auto-setpoint target temperature set to {aiRecommendation.targetTemperature}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                    Perishable cargo detected. Cold-chain temperature control and target setpoint have been enabled automatically.
                  </span>
                </div>
              </div>
            </div>
          )}

          <div style={{ fontSize: '0.78rem', color: '#334155', fontStyle: 'italic', background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            💡 <strong>AI Rationale:</strong> {aiRecommendation.rationale}
          </div>
        </div>
      )}
    </div>
  );
};



