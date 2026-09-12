import React from 'react';
import type { FormData } from '../../types/form';
import { Badge } from '../ui/Badge';
import { User, Building, DollarSign, Clock, FileText, ShieldCheck } from 'lucide-react';
import './LivePreview.css';

interface LivePreviewProps {
  formData: FormData;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ formData }) => {
  // Calculate completion percentage
  const fields: (keyof FormData)[] = [
    'fullName',
    'email',
    'company',
    'serviceType',
    'budget',
    'timeline',
    'title',
    'description',
  ];
  const filledCount = fields.filter((f) => {
    const val = formData[f];
    return typeof val === 'string' && val.trim().length > 0;
  }).length;

  const percentage = Math.round((filledCount / fields.length) * 100);

  const formatServiceLabel = (val: string) => {
    switch (val) {
      case 'web_development': return 'Web & Mobile App Development';
      case 'ui_ux_design': return 'UI/UX & Product Design';
      case 'cloud_architecture': return 'Cloud Architecture & DevOps';
      case 'logistics_freight': return 'Logistics & Cargo RFQ';
      case 'custom_software': return 'Custom Enterprise Solution';
      default: return val || 'Not selected';
    }
  };

  return (
    <div className="live-preview-card">
      <div className="preview-header">
        <div className="preview-badge-row">
          <span className="live-indicator">
            <span className="live-dot"></span> Live Preview
          </span>
          <span className="completion-tag">{percentage}% Completed</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
        </div>
      </div>

      <div className="preview-body">
        <div className="preview-section">
          <div className="preview-title-row">
            <Badge variant={formData.priority === 'urgent' ? 'danger' : formData.priority === 'high' ? 'warning' : 'purple'}>
              {formData.priority} priority
            </Badge>
            <span className="service-chip">{formatServiceLabel(formData.serviceType)}</span>
          </div>

          <h4 className="preview-subject">
            {formData.title || <span className="placeholder-text">Requirement title will appear here...</span>}
          </h4>
        </div>

        <div className="preview-grid">
          <div className="preview-item">
            <div className="item-label"><User size={14} /> Contact Person</div>
            <div className="item-val">{formData.fullName || '—'}</div>
          </div>

          <div className="preview-item">
            <div className="item-label"><Building size={14} /> Company</div>
            <div className="item-val">{formData.company || '—'}</div>
          </div>

          <div className="preview-item">
            <div className="item-label"><DollarSign size={14} /> Budget</div>
            <div className="item-val">{formData.budget}</div>
          </div>

          <div className="preview-item">
            <div className="item-label"><Clock size={14} /> Timeline</div>
            <div className="item-val">{formData.timeline}</div>
          </div>
        </div>

        <div className="preview-description">
          <div className="item-label"><FileText size={14} /> Specifications Summary</div>
          <p className="desc-text">
            {formData.description || (
              <span className="placeholder-text">
                Your detailed specifications and project context will render in real-time as you type...
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="preview-footer">
        <ShieldCheck size={16} className="shield-icon" />
        <span>Instant validation & preview active</span>
      </div>
    </div>
  );
};
