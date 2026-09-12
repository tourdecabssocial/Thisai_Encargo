import React, { useState } from 'react';
import type { RFQFormData } from '../../types/rfq';
import { Card } from '../ui/Card';
import {
  Box,
  Scale,
  ChevronDown,
  Truck,
  Building2,
  Plane,
  Ship,
  ShieldCheck,
  MapPin,
  FileText,
  Receipt,
} from 'lucide-react';
import {
  generateShipmentRouteLifecycle,
  type RouteStage,
} from '../../services/shipmentLifecycleEngine';
import './ShipmentLifecycleRouteCard.css';
import './RFQSummarySidebar.css';

interface RFQSummarySidebarProps {
  formData: RFQFormData;
  totalVolumeCbm?: number;
  totalGrossWeightKg?: number;
  volumetricWeight?: number;
  hasDocumentsAttached?: boolean;
  itemReconciliationPassed?: boolean;
}

export interface StageCharge {
  category: string;
  stage: 'Origin' | 'Main Freight' | 'Destination';
  chargeName: string;
  amount: number;
  notes: string;
  applicableScopes?: string[];
}

export const getStageCharges = (
  stageId: string,
  mode: string = 'Ship',
  serviceScope: string = 'D2D'
): StageCharge[] => {
  const ALL = ['D2D', 'D2P', 'P2P', 'P2D'];
  const ORIGIN_DOOR = ['D2D', 'D2P'];
  const DEST_DOOR = ['D2D', 'P2D'];

  let charges: StageCharge[] = [];

  switch (stageId) {
    case 'origin':
      charges = [
        { applicableScopes: ORIGIN_DOOR, category: 'First Mile / Transport', stage: 'Origin', chargeName: 'Factory Pickup / Carting', amount: 180, notes: 'Transport of cargo/container from shipper premises to CFS or port terminal' },
        { applicableScopes: ORIGIN_DOOR, category: 'Packaging & Warehousing', stage: 'Origin', chargeName: 'CFS Handling & Stuffing', amount: 210, notes: 'Cargo handling, palletization, shrink-wrapping, stuffing & labor at origin CFS' },
        { applicableScopes: ORIGIN_DOOR, category: 'Customs & Clearance', stage: 'Origin', chargeName: 'Export Customs Brokerage (CHA)', amount: 150, notes: 'Professional export customs broker agency service fee' },
        { applicableScopes: ORIGIN_DOOR, category: 'Customs & Clearance', stage: 'Origin', chargeName: 'Shipping Bill Filing & Processing', amount: 65, notes: 'Electronic filing, checklist generation & ICEGATE EDI processing fee' },
        { applicableScopes: ORIGIN_DOOR, category: 'Customs & Compliance', stage: 'Origin', chargeName: 'Customs Examination & Scanning Fee', amount: 90, notes: 'Physical container inspection, X-ray scanning, open examination & officer fees' },
        { applicableScopes: ORIGIN_DOOR, category: 'Customs & Compliance', stage: 'Origin', chargeName: 'Certificate & Regulatory Documentation', amount: 45, notes: 'Issuance of Certificate of Origin (COO), legalization, fumigation & export permits' },
        { applicableScopes: ALL, category: 'Terminal & Port', stage: 'Origin', chargeName: 'Origin Terminal Handling Charges (OTHC)', amount: 250, notes: 'Container handling, yard movement & vessel loading fees at origin port' },
        { applicableScopes: ALL, category: 'Terminal & Port', stage: 'Origin', chargeName: 'Verified Gross Mass (VGM) Charges', amount: 25, notes: 'SOLAS weighbridge certification, electronic data submission & admin fee' },
        { applicableScopes: ALL, category: 'Terminal & Port', stage: 'Origin', chargeName: 'Seal & Equipment Maintenance', amount: 15, notes: 'High-security ISO container seal fee and container pre-trip washing/cleaning' },
        { applicableScopes: ALL, category: 'Documentation', stage: 'Origin', chargeName: 'Bill of Lading (B/L) Issuance Fee', amount: 50, notes: 'Carrier documentation issuance, electronic manifest transmission & drafting' },
        { applicableScopes: ALL, category: 'Documentation & Admin', stage: 'Origin', chargeName: 'B/L & Manifest Amendment Fee', amount: 35, notes: 'Corrections, revisions, or destination changes after manifest closure' },
      ];
      break;

    case 'freight':
      charges = [
        { applicableScopes: ALL, category: 'Freight & Transit', stage: 'Main Freight', chargeName: mode === 'Air' ? 'Air Freight (OF)' : 'Ocean Freight (OF)', amount: 1450, notes: 'Basic ocean/air carriage charge from origin port of loading to destination port' },
        { applicableScopes: ALL, category: 'Freight & Transit', stage: 'Main Freight', chargeName: 'Bunker & Currency Adjustments (BAF / CAF / LSS)', amount: 220, notes: 'Fuel price fluctuation (BAF), low-sulfur fuel compliance (LSS) & currency adjustment (CAF)' },
        { applicableScopes: ALL, category: 'Freight & Transit', stage: 'Main Freight', chargeName: 'Trade Lane Surcharges (PSS / GRI / EIS / PCS)', amount: 150, notes: 'Peak season (PSS), general rate increases (GRI), equipment imbalance (EIS) & congestion (PCS)' },
        { applicableScopes: ALL, category: 'Customs & Compliance', stage: 'Main Freight', chargeName: 'Security & Advance Manifest Filing (AMS / ISF / ENS)', amount: 60, notes: 'Regulatory electronic filing fees to destination customs (e.g., US AMS/ISF, EU ENS)' },
      ];
      break;

    case 'destination':
      charges = [
        { applicableScopes: ALL, category: 'Port & Terminal', stage: 'Destination', chargeName: 'Destination THC (DTHC)', amount: 310, notes: 'Vessel discharging, gantry crane handling & container staging at destination port' },
        { applicableScopes: ALL, category: 'Port & Terminal', stage: 'Destination', chargeName: 'Delivery Order (D/O) Fee', amount: 85, notes: 'Shipping line document issuance fee authorizing port/CFS cargo release' },
        { applicableScopes: ALL, category: 'Port & Terminal', stage: 'Destination', chargeName: 'Port Facility & Security Dues (ISPS / Port Dues)', amount: 45, notes: 'Terminal security compliance (ISPS), channel dues & port infrastructure fees' },
        { applicableScopes: DEST_DOOR, category: 'Customs & Clearance', stage: 'Destination', chargeName: 'Import Customs Brokerage', amount: 175, notes: 'Destination customs clearance services, tariff classification & representation' },
        { applicableScopes: DEST_DOOR, category: 'Customs & Clearance', stage: 'Destination', chargeName: 'Bill of Entry / Import Declaration', amount: 70, notes: 'Formal electronic customs entry declaration filing fee' },
        { applicableScopes: DEST_DOOR, category: 'Customs & Compliance', stage: 'Destination', chargeName: 'Import Customs Inspection & Examination', amount: 120, notes: 'Physical destuffing, customs examination, X-ray scanning & sampling at destination CFS' },
        { applicableScopes: DEST_DOOR, category: 'Customs & Compliance', stage: 'Destination', chargeName: 'Customs Bond & In-Bond Transfer', amount: 65, notes: 'Bond execution and carrier in-bond transit filing for inland movement' },
        { applicableScopes: DEST_DOOR, category: 'Statutory Charges', stage: 'Destination', chargeName: 'Customs Duty, Taxes & Statutory Surcharges', amount: 850, notes: 'Government import customs duty, IGST/VAT, anti-dumping duty & statutory surcharges' },
        { applicableScopes: DEST_DOOR, category: 'Last Mile / Transport', stage: 'Destination', chargeName: 'Destination Delivery / Trucking Charges', amount: 240, notes: 'Transport from destination port/CFS to buyer warehouse or final destination' },
        { applicableScopes: DEST_DOOR, category: 'Last Mile / Transport', stage: 'Destination', chargeName: 'Chassis Rental / Usage Fee', amount: 90, notes: 'Dedicated trailer chassis usage fee for container drayage delivery (common in North America)' },
        { applicableScopes: ALL, category: 'Contingent Charges', stage: 'Destination', chargeName: 'Demurrage & Detention (D&D)', amount: 0, notes: 'Penalties for container equipment usage (Detention) and port storage (Demurrage) exceeding free days' },
      ];
      break;

    default:
      charges = [];
  }

  return charges.filter((c) => !c.applicableScopes || c.applicableScopes.includes(serviceScope));
};


export const RFQSummarySidebar: React.FC<RFQSummarySidebarProps> = ({
  formData,
  totalVolumeCbm = 0,
  totalGrossWeightKg = 0,
  volumetricWeight = 0,
}) => {
  const isMetric = formData.unit_system === 'metric';

  // Currency Symbol calculation
  const currencySymbol =
    formData.currency === 'EUR'
      ? '€'
      : formData.currency === 'INR'
      ? '₹'
      : formData.currency === 'GBP'
      ? '£'
      : '$';

  // Safe numerical calculations
  const safeVolume = Number(totalVolumeCbm) || 0;

  // Total Net Cargo Weight across commercial items
  const totalNetCargoWeight = (formData.commercial_items || []).reduce(
    (sum, item) => sum + (Number(item.netWeight) || 0) * (Number(item.quantity) || 1),
    0
  );

  // If explicit gross weight is 0, fallback to totalNetCargoWeight
  const explicitGross = Number(totalGrossWeightKg) || 0;
  const safeGrossWeight = explicitGross > 0 ? explicitGross : totalNetCargoWeight;
  const safeVolumetricWeight = Number(volumetricWeight) || 0;

  const [expandedStageIds, setExpandedStageIds] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<'All' | 'Origin' | 'Main Freight' | 'Destination'>('All');

  const toggleStage = (id: string) => {
    setExpandedStageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const summaryStages = [
    {
      id: 'origin',
      title: 'Origin Charges',
      subtitle: 'Pickup, Handling, Port & Export Customs',
      category: 'Origin',
      iconType: 'truck' as const,
      stageNumber: 1,
    },
    {
      id: 'freight',
      title: 'Freight & Transit',
      subtitle: 'International Freight & Carrier Surcharges',
      category: 'Main Freight',
      iconType: 'ship' as const,
      stageNumber: 2,
    },
    {
      id: 'destination',
      title: 'Destination Charges',
      subtitle: 'Import Customs, Port & Final Delivery',
      category: 'Destination',
      iconType: 'delivery' as const,
      stageNumber: 3,
    }
  ];

  const filteredStages =
    filterCategory === 'All' ? summaryStages : summaryStages.filter((s) => s.category === filterCategory);

  const getStageIcon = (type: RouteStage['iconType']) => {
    switch (type) {
      case 'pickup':
      case 'truck':
        return <Truck size={16} />;
      case 'warehouse':
        return <Building2 size={16} />;
      case 'plane':
        return <Plane size={16} />;
      case 'ship':
        return <Ship size={16} />;
      case 'customs':
        return <ShieldCheck size={16} />;
      case 'delivery':
        return <MapPin size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  return (
    <Card className="summary-sidebar-card shadow-md" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 1. Card Header */}
      <div className="sidebar-header">
        <div className="header-status-dot pulse"></div>
        <span className="sidebar-title">Live RFQ Summary</span>
      </div>

      {/* 2. Compact Calculated Values Chips */}
      <div className="metrics-chips-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.45rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}>
          <span style={{ color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Box size={13} style={{ color: '#0284c7' }} /> Total Volume
          </span>
          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem' }}>
            {safeVolume.toFixed(2)} <small style={{ color: '#64748b', fontWeight: 600, fontSize: '0.68rem' }}>CBM</small>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}>
          <span style={{ color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Scale size={13} style={{ color: '#4f46e5' }} /> Gross Weight
          </span>
          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem' }}>
            {isMetric ? safeGrossWeight.toLocaleString() : Math.round(safeGrossWeight * 2.20462).toLocaleString()}{' '}
            <small style={{ color: '#64748b', fontWeight: 600, fontSize: '0.68rem' }}>{isMetric ? 'kg' : 'lbs'}</small>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}>
          <span style={{ color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Scale size={13} style={{ color: '#059669' }} /> Volumetric Wt
          </span>
          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.82rem' }}>
            {safeVolumetricWeight.toLocaleString()}{' '}
            <small style={{ color: '#64748b', fontWeight: 600, fontSize: '0.68rem' }}>{isMetric ? 'kg' : 'lbs'}</small>
          </span>
        </div>
      </div>

      {/* 3. Stage Category Filter Tabs Row */}
      <div className="route-control-row">
        <div className="route-filter-tabs" style={{ width: '100%', justifyContent: 'space-between' }}>
          {(['All', 'Origin', 'Main Freight', 'Destination'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`route-filter-btn ${filterCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Vertical Interactive Timeline Stages Focus Solely on High-UX Charge Cards */}
      <div className="vertical-timeline-container" style={{ flex: 1, paddingRight: '0.25rem', marginTop: '0.5rem' }}>
        {filteredStages.map((stage, idx) => {
          const isExpanded = expandedStageIds.includes(stage.id);
          const isLast = idx === filteredStages.length - 1;
          const stageCharges = getStageCharges(stage.id, formData.mode, formData.service_scope || 'D2D');
          const totalStageAmount = stageCharges.reduce((sum, c) => sum + c.amount, 0);

          return (
            <div
              key={stage.id}
              className={`timeline-stage-wrapper ${isExpanded ? 'expanded' : ''}`}
            >
              {!isLast && <div className="timeline-connecting-line" />}

              <div className="timeline-stage-card">
                {/* Clickable Accordion Header */}
                <div
                  className="stage-card-header"
                  onClick={() => toggleStage(stage.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="stage-header-left">
                    <div className="stage-node-badge">
                      {isExpanded ? getStageIcon(stage.iconType) : `0${stage.stageNumber}`}
                    </div>
                    <div className="stage-header-text">
                      <span className="stage-number-tag">
                        Stage {stage.stageNumber} • {stage.category}
                      </span>
                      <span className="stage-main-title">{stage.title}</span>
                    </div>
                  </div>

                  <div className="stage-header-right">
                    <span className="stage-doc-count-chip charges-chip">
                      <Receipt size={11} style={{ marginRight: 3 }} /> {stageCharges.length} Charges
                    </span>
                    <ChevronDown size={16} className="expand-chevron-icon" />
                  </div>
                </div>

                {/* Accordion Expand Body: Sleek Modern Card List UX */}
                {isExpanded && (
                  <div className="stage-card-body" style={{ padding: '0.65rem' }}>
                    <div className="stage-subtitle-bar" style={{ marginBottom: '0.55rem' }}>{stage.subtitle}</div>

                    {/* Stage Charges Section Block */}
                    <div className="stage-section-block charges-cards-block" style={{ margin: 0 }}>
                      <div
                        className="stage-block-title"
                        style={{
                          marginBottom: '0.55rem',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          width: '100%',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#1e293b', fontWeight: 800, fontSize: '0.78rem' }}>
                          <Receipt size={14} style={{ color: '#2563eb' }} /> Stage Charges Breakdown
                        </span>
                      </div>

                      {/* Card List View Grouped By Category */}
                      <div className="charge-cards-list">
                        {Array.from(new Set(stageCharges.map(c => c.category))).map(category => (
                          <div key={category} className="charge-category-group" style={{ 
                            marginBottom: '1rem',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                          }}>
                            <div className="category-group-header" style={{
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: '#1e40af',
                              backgroundColor: '#dbeafe',
                              padding: '0.45rem 0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              borderBottom: '1px solid #bfdbfe'
                            }}>
                              <div style={{ width: '4px', height: '12px', background: '#3b82f6', borderRadius: '4px', marginRight: '8px' }}></div>
                              {category}
                            </div>
                            
                            <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              {stageCharges.filter(c => c.category === category).map((charge, cIdx) => (
                                <div key={cIdx} className="charge-item-card" style={{ margin: 0, border: '1px solid #e2e8f0', background: '#ffffff' }}>
                                  <div className="charge-card-header">
                                    <div className="charge-name-title">{charge.chargeName}</div>
                                  </div>
                                  <div className="charge-notes-text" style={{ marginTop: '0.25rem' }}>{charge.notes}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
