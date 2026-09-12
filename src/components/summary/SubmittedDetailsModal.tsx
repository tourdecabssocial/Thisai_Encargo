import React, { useState } from 'react';
import type { SubmittedRecord } from '../../types/form';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { getPriorityBadgeStyle, formatDate } from '../../utils/formatters';
import {
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Mail,
  Phone,
  Video,
  User,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import './SubmittedDetailsModal.css';

interface SubmittedDetailsModalProps {
  record: SubmittedRecord;
  onReset: () => void;
}

export const SubmittedDetailsModal: React.FC<SubmittedDetailsModalProps> = ({
  record,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyDetails = () => {
    const textSummary = `
========================================
REQUEST FOR QUOTE (RFQ) SUMMARY
Reference No: ${record.referenceNo}
Submitted At: ${formatDate(record.submittedAt)}
========================================

1. CLIENT INFORMATION
- Full Name: ${record.fullName}
- Email: ${record.email}
- Phone: ${record.phone || 'N/A'}
- Company: ${record.company}

2. PROJECT SCOPE
- Service Type: ${record.serviceType}
- Budget Range: ${record.budget}
- Timeline: ${record.timeline}
- Priority: ${record.priority.toUpperCase()}

3. SPECIFICATIONS
- Requirement Title: ${record.title}
- Description: ${record.description}
- Preferred Contact: ${record.contactMethod}
========================================
`.trim();

    navigator.clipboard.writeText(textSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const priorityStyle = getPriorityBadgeStyle(record.priority);

  return (
    <div className="informed-details-container animate-fade-in">
      <div className="informed-card">
        {/* Banner */}
        <div className="informed-banner">
          <div className="banner-icon-bg">
            <CheckCircle2 size={36} className="success-icon" />
          </div>
          <div className="banner-title-group">
            <span className="informed-tag">
              <Sparkles size={14} /> Form Details Informed
            </span>
            <h2 className="banner-heading">Request Submitted Successfully!</h2>
            <p className="banner-sub">
              Your details have been registered and transmitted to our review queue.
            </p>
          </div>
          <div className="reference-pill">
            <span className="ref-label">Reference ID</span>
            <span className="ref-code">{record.referenceNo}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="informed-body">
          {/* Metadata Cards Header */}
          <div className="meta-grid">
            <div className="meta-card">
              <div className="meta-icon-wrapper">
                <Calendar size={18} />
              </div>
              <div>
                <span className="meta-label">Submitted On</span>
                <span className="meta-value">{formatDate(record.submittedAt)}</span>
              </div>
            </div>

            <div className="meta-card">
              <div className="meta-icon-wrapper">
                <Tag size={18} />
              </div>
              <div>
                <span className="meta-label">Priority Level</span>
                <span
                  className="priority-pill"
                  style={{
                    backgroundColor: priorityStyle.bg,
                    color: priorityStyle.text,
                    borderColor: priorityStyle.border,
                  }}
                >
                  {record.priority}
                </span>
              </div>
            </div>

            <div className="meta-card">
              <div className="meta-icon-wrapper">
                {record.contactMethod === 'email' ? (
                  <Mail size={18} />
                ) : record.contactMethod === 'phone' ? (
                  <Phone size={18} />
                ) : (
                  <Video size={18} />
                )}
              </div>
              <div>
                <span className="meta-label">Preferred Contact</span>
                <span className="meta-value uppercase">{record.contactMethod}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Client Info */}
          <div className="detail-section">
            <h3 className="section-title">
              <User size={18} className="section-icon" /> Client & Organization Details
            </h3>
            <div className="detail-grid">
              <div className="detail-box">
                <span className="detail-label">Full Name</span>
                <span className="detail-val">{record.fullName}</span>
              </div>
              <div className="detail-box">
                <span className="detail-label">Email Address</span>
                <span className="detail-val">{record.email}</span>
              </div>
              <div className="detail-box">
                <span className="detail-label">Phone Number</span>
                <span className="detail-val">{record.phone || 'Not Provided'}</span>
              </div>
              <div className="detail-box">
                <span className="detail-label">Company / Org</span>
                <span className="detail-val">{record.company}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Project Scope */}
          <div className="detail-section">
            <h3 className="section-title">
              <DollarSign size={18} className="section-icon" /> Scope & Parameters
            </h3>
            <div className="detail-grid">
              <div className="detail-box">
                <span className="detail-label">Service Category</span>
                <span className="detail-val highlight-val">{record.serviceType}</span>
              </div>
              <div className="detail-box">
                <span className="detail-label">Estimated Budget</span>
                <span className="detail-val">{record.budget}</span>
              </div>
              <div className="detail-box">
                <span className="detail-label">Timeline Requirement</span>
                <span className="detail-val">{record.timeline}</span>
              </div>
              <div className="detail-box">
                <span className="detail-label">Terms Status</span>
                <Badge variant="success" icon={<ShieldCheck size={14} />}>
                  Agreed & Verified
                </Badge>
              </div>
            </div>
          </div>

          {/* Section 3: Requirement Details */}
          <div className="detail-section">
            <h3 className="section-title">
              <FileText size={18} className="section-icon" /> Form Specification Summary
            </h3>
            <div className="spec-card">
              <div className="spec-header">
                <span className="spec-title">{record.title}</span>
              </div>
              <div className="spec-content">
                <p>{record.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="informed-footer">
          <Button
            variant="secondary"
            onClick={handleCopyDetails}
            leftIcon={copied ? <Check size={18} className="text-success" /> : <Copy size={18} />}
          >
            {copied ? 'Summary Copied!' : 'Copy Summary'}
          </Button>

          <Button
            variant="primary"
            onClick={onReset}
            leftIcon={<RefreshCw size={18} />}
          >
            Submit Another Request
          </Button>
        </div>
      </div>
    </div>
  );
};
