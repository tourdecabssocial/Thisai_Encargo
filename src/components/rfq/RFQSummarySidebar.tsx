import React from 'react';
import type { RFQFormData } from '../../types/rfq';
import { Card } from '../ui/Card';
import { Box, Scale } from 'lucide-react';
import './RFQSummarySidebar.css';

interface RFQSummarySidebarProps {
  formData: RFQFormData;
  totalVolumeCbm?: number;
  totalGrossWeightKg?: number;
  volumetricWeight?: number;
  hasDocumentsAttached?: boolean;
  itemReconciliationPassed?: boolean;
}

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

  return (
    <Card className="summary-sidebar-card shadow-md">
      {/* 1. Card Header */}
      <div className="sidebar-header">
        <div className="header-status-dot pulse"></div>
        <span className="sidebar-title">Live RFQ Summary</span>
      </div>

      {/* 2. Compact Calculated Values Chips */}
      <div className="metrics-chips-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
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
    </Card>
  );
};
