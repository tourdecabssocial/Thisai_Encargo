import React, { useState } from 'react';
import type { SubmittedRFQRecord } from '../../types/rfq';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Toast } from '../ui/Toast';
import {
  CheckCircle2,
  Copy,
  RotateCcw,
  Ship,
  Box,
  ShieldCheck,
} from 'lucide-react';
import './RFQSubmissionReport.css';

interface RFQSubmissionReportProps {
  record: SubmittedRFQRecord;
  onReset: () => void;
}

export const RFQSubmissionReport: React.FC<RFQSubmissionReportProps> = ({ record, onReset }) => {
  const [showToast, setShowToast] = useState(false);
  const { payload } = record;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setShowToast(true);
  };

  return (
    <div className="report-wrapper animate-fade-in">
      {showToast && (
        <Toast
          message="Transformed RFQ Submission Payload copied to clipboard!"
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Top Banner */}
      <div className="report-header-banner">
        <div className="banner-icon-ring">
          <CheckCircle2 size={36} className="text-success" />
        </div>
        <div className="banner-title-group">
          <Badge variant="cyan">Form Specifications Registered & Validated</Badge>
          <h2 className="banner-heading">Request for Quote Submitted Successfully</h2>
          <p className="banner-sub">
            Reference ID: <strong>{record.referenceNo}</strong> • Submitted on{' '}
            {new Date(record.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="report-grid">
        <Card className="report-main-card">
          <div className="card-section-title">
            <Ship size={18} className="text-cyan" /> 1. Mode, Scope & Route Parameters
          </div>
          <div className="info-grid-3">
            <div className="info-box">
              <span className="info-label">Transport Mode</span>
              <span className="info-value font-bold text-cyan">{payload.mode}</span>
            </div>
            <div className="info-box">
              <span className="info-label">Service Scope</span>
              <span className="info-value">{payload.service_scope}</span>
            </div>
            <div className="info-box">
              <span className="info-label">Incoterm</span>
              <span className="info-value">{payload.incoterm}</span>
            </div>
            <div className="info-box">
              <span className="info-label">Origin Location</span>
              <span className="info-value">{payload.origin_location}</span>
            </div>
            <div className="info-box">
              <span className="info-label">Destination Location</span>
              <span className="info-value">{payload.destination_location}</span>
            </div>
            <div className="info-box">
              <span className="info-label">Ready Date</span>
              <span className="info-value">{payload.ready_date}</span>
            </div>
          </div>

          <div className="card-section-title mt-4">
            <Box size={18} className="text-purple" /> 2. Cargo & Container Summary
          </div>
          <div className="info-grid-3">
            <div className="info-box metric-highlight">
              <span className="info-label">Container Spec</span>
              <span className="info-value highlight-val">{payload.container_count}x {payload.container_type}</span>
            </div>
            <div className="info-box metric-highlight">
              <span className="info-label">Total Volume</span>
              <span className="info-value highlight-val">{payload.total_volume_cbm} CBM</span>
            </div>
            <div className="info-box metric-highlight">
              <span className="info-label">Total Gross Weight</span>
              <span className="info-value highlight-val">{payload.total_gross_weight_kg} kg</span>
            </div>
          </div>

          <div className="card-section-title mt-4">
            <ShieldCheck size={18} className="text-success" /> 3. Customs Brokers & Special Services
          </div>
          <div className="info-grid-3">
            <div className="info-box">
              <span className="info-label">Cargo Value</span>
              <span className="info-value">{payload.currency} {payload.cargo_value ? payload.cargo_value.toLocaleString() : 0}</span>
            </div>
            <div className="info-box">
              <span className="info-label">Origin Customs Broker</span>
              <span className="info-value">{payload.origin_customs_clearance ? payload.origin_customs_broker : 'Not Required'}</span>
            </div>
            <div className="info-box">
              <span className="info-label">Destination Customs Broker</span>
              <span className="info-value">{payload.destination_customs_clearance ? payload.destination_customs_broker : 'Not Required'}</span>
            </div>
            <div className="info-box">
              <span className="info-label">Wood Packaging (ISPM-15)</span>
              <span className="info-value">{payload.has_wood_packaging ? 'YES' : 'NO'}</span>
            </div>
            <div className="info-box">
              <span className="info-label">Hazardous Goods (DG)</span>
              <span className="info-value">{payload.hazardous_materials ? `YES (${payload.un_class_code})` : 'NO'}</span>
            </div>
            <div className="info-box">
              <span className="info-label">Crating & Fumigation</span>
              <span className="info-value">{payload.crating_service_required ? 'Fumigation Certified' : 'NO'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="report-actions-bar">
            <Button variant="secondary" onClick={handleCopyJson} leftIcon={<Copy size={16} />}>
              Copy API Payload JSON
            </Button>
            <Button variant="primary" onClick={onReset} leftIcon={<RotateCcw size={16} />}>
              Submit Another Request
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
