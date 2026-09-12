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
}

export const getStageCharges = (
  stageId: string,
  stageCategory: 'Origin' | 'Main Freight' | 'Destination',
  mode: string = 'Ship'
): StageCharge[] => {
  switch (stageId) {
    case 'origin_pickup':
      return [
        {
          category: 'First Mile / Transport',
          stage: 'Origin',
          chargeName: mode === 'Air' ? 'Airport Express Trucking' : 'Factory Pickup / Carting',
          amount: 180,
          notes: 'Transport of cargo/container from shipper premises to CFS or port terminal',
        },
        {
          category: 'Packaging & Warehousing',
          stage: 'Origin',
          chargeName: 'Cargo Lashing & Palletization',
          amount: 95,
          notes: 'Securing cargo packages, shrink-wrapping, and heavy-duty strapping at origin warehouse',
        },
      ];

    case 'origin_terminal':
      return [
        {
          category: 'Packaging & Warehousing',
          stage: 'Origin',
          chargeName: 'CFS Handling & Stuffing',
          amount: 210,
          notes: 'Cargo handling, palletization, shrink-wrapping, stuffing & labor at origin CFS',
        },
        {
          category: 'Customs & Clearance',
          stage: 'Origin',
          chargeName: 'Export Customs Brokerage (CHA)',
          amount: 150,
          notes: 'Professional export customs broker agency service fee',
        },
        {
          category: 'Customs & Clearance',
          stage: 'Origin',
          chargeName: 'Shipping Bill Filing & Processing',
          amount: 65,
          notes: 'Electronic filing, checklist generation & ICEGATE EDI processing fee',
        },
      ];

    case 'main_transit':
      return [
        {
          category: 'Freight & Linehaul',
          stage: 'Main Freight',
          chargeName: mode === 'Air' ? 'Air Freight Flight Linehaul' : 'Ocean Freight Linehaul Rate',
          amount: 1450,
          notes: 'Primary international carrier port-to-port linehaul transport rate',
        },
        {
          category: 'Freight & Linehaul',
          stage: 'Main Freight',
          chargeName: 'Bunker Adjustment / Fuel Surcharge',
          amount: 220,
          notes: 'Fluctuating fuel surcharge applied per TEU / CBM by carrier line',
        },
      ];

    case 'destination_customs':
      return [
        {
          category: 'Customs & Clearance',
          stage: 'Destination',
          chargeName: 'Import Customs Entry & Clearance',
          amount: 280,
          notes: 'Import customs duty calculation, HTS classification & EDI entry processing',
        },
        {
          category: 'Destination Handling',
          stage: 'Destination',
          chargeName: 'Terminal Handling Charge (DTHC)',
          amount: 310,
          notes: 'Port terminal crane discharge, vessel unloading & container yard handling',
        },
        {
          category: 'Customs & Clearance',
          stage: 'Destination',
          chargeName: 'Delivery Order (DO) Fee',
          amount: 85,
          notes: 'Carrier release order generation and administrative documentation charge',
        },
      ];

    case 'destination_delivery':
      return [
        {
          category: 'First Mile / Transport',
          stage: 'Destination',
          chargeName: 'Last-Mile Delivery / Drayage',
          amount: 240,
          notes: 'Transport from destination port/CFS to consignee warehouse door',
        },
        {
          category: 'Packaging & Warehousing',
          stage: 'Destination',
          chargeName: 'Container De-stuffing & Return',
          amount: 120,
          notes: 'Unloading cargo at warehouse bay and empty container depot interchange return',
        },
      ];

    default:
      return [
        {
          category: 'Handling & Logistics',
          stage: stageCategory,
          chargeName: 'Operational Handling Fee',
          amount: 100,
          notes: 'Standard operational handling and administrative fee for stage execution',
        },
      ];
  }
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

  // Stages & Filtering logic matching route planning
  const stages = generateShipmentRouteLifecycle({
    transportMode: formData.mode === 'Air' ? 'Air' : 'Ship',
    serviceType:
      formData.service_scope === 'D2D'
        ? 'Door-to-Door'
        : formData.service_scope === 'P2P'
        ? 'Port-to-Port'
        : formData.service_scope === 'D2P'
        ? 'Door-to-Port'
        : 'Port-to-Door',
    originPortOrCity: formData.origin_port_name || formData.from_port_name || 'Origin Location',
    destinationPortOrCity: formData.destination_port_name || formData.to_port_name || 'Destination Location',
    isHazmat: Boolean(formData.hazardous_materials),
    isReefer: Boolean(formData.temperature_control_required),
    incoterm: formData.incoterm || 'DDP',
  });

  const [expandedStageIds, setExpandedStageIds] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<'All' | 'Origin' | 'Main Freight' | 'Destination'>('All');

  const toggleStage = (id: string) => {
    setExpandedStageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredStages =
    filterCategory === 'All' ? stages : stages.filter((s) => s.category === filterCategory);

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
    <Card className="summary-sidebar-card shadow-md">
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
      <div className="vertical-timeline-container">
        {filteredStages.map((stage, idx) => {
          const isExpanded = expandedStageIds.includes(stage.id);
          const isLast = idx === filteredStages.length - 1;
          const stageCharges = getStageCharges(stage.id, stage.category, formData.mode);
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
                        <span style={{ fontSize: '0.725rem', color: '#059669', fontWeight: 800, background: '#ecfdf5', padding: '0.15rem 0.45rem', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                          {currencySymbol}{totalStageAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Total
                        </span>
                      </div>

                      {/* Card List View (100% Fit Width) */}
                      <div className="charge-cards-list">
                        {stageCharges.map((charge, cIdx) => (
                          <div key={cIdx} className="charge-item-card">
                            <div className="charge-card-header">
                              <div className="charge-name-title">{charge.chargeName}</div>
                              <div className="charge-amount-tag">
                                {currencySymbol}{charge.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>

                            <div className="charge-card-meta">
                              <span className="charge-cat-pill">{charge.category}</span>
                              <span className="stage-green-pill">{charge.stage}</span>
                            </div>

                            <div className="charge-notes-text">{charge.notes}</div>
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
