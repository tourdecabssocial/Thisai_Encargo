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
import { type RouteStage } from '../../services/shipmentLifecycleEngine';
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

import encargoChargesData from '../../assets/Encargo_charges.json';

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
  serviceScope: string = 'D2D',
  loadType: string = 'FCL',
  loadingType?: string
): StageCharge[] => {
  const scope = (serviceScope || 'D2D').toUpperCase();
  const transportMode = mode.toLowerCase() === 'air' ? 'Air' : 'Ocean';
  const isLiveLoading = Boolean(
    loadingType && String(loadingType).toLowerCase().includes('live')
  );

  const highLevel = encargoChargesData.high_level_charges;
  let rawList: Array<{
    applicableScopes: string;
    category: string;
    stage: string;
    chargeName: string;
    mode: string[];
    notes: string;
  }> = [];

  if (stageId === 'origin') {
    rawList = highLevel.origin as typeof rawList;
  } else if (stageId === 'freight') {
    rawList = highLevel.freight as typeof rawList;
  } else if (stageId === 'destination') {
    rawList = highLevel.destination as typeof rawList;
  }

  // Filter raw list by scope, mode, and loadType
  const filtered = rawList.filter((item) => {
    // Mode filter check
    if (item.mode && item.mode.length > 0) {
      const modeMatches = item.mode.some((m) => {
        const mLower = m.toLowerCase();
        if (mLower === transportMode.toLowerCase()) return true;
        if (mLower === 'road' || mLower === 'rail') {
          return scope === 'D2D' || scope === 'D2P' || scope === 'P2D';
        }
        return false;
      });
      if (!modeMatches) return false;
    }

    // Live Loading constraint: If loadingType is live loading, 1st mile origin door charges are not needed
    if (isLiveLoading && item.applicableScopes === 'ORIGIN_DOOR') {
      return false;
    }

    // Scope filter check
    if (item.applicableScopes === 'ORIGIN_DOOR') {
      if (scope !== 'D2D' && scope !== 'D2P') return false;
    } else if (item.applicableScopes === 'DEST_DOOR') {
      if (scope !== 'D2D' && scope !== 'P2D') return false;
    }

    // LCL Consolidation Charges filter condition
    if (item.chargeName === 'LCL Consolidation Charges' || item.chargeName.includes('LCL Consolidation')) {
      if (loadType !== 'LCL') return false;
    }

    return true;
  });

  return filtered.map((item, idx) => ({
    category: item.category,
    stage: (item.stage === 'Origin' ? 'Origin' : item.stage === 'Main Freight' ? 'Main Freight' : 'Destination'),
    chargeName: item.chargeName === 'Freight Charges (Ocean / Air)' ? (transportMode === 'Air' ? 'Air Freight (AF)' : 'Ocean Freight (OF)') : item.chargeName,
    amount: Math.round(50 + (idx % 6) * 35),
    notes: item.notes,
    applicableScopes: [item.applicableScopes],
  }));
};

export const RFQSummarySidebar: React.FC<RFQSummarySidebarProps> = ({
  formData,
  totalVolumeCbm = 0,
  totalGrossWeightKg = 0,
  volumetricWeight = 0,
}) => {
  const isMetric = formData.unit_system === 'metric';

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
          const stageCharges = getStageCharges(stage.id, formData.mode, formData.service_scope || 'D2D', formData.load_type || 'FCL', formData.loading_type);

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
                          justifyContent: 'space-between',
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
