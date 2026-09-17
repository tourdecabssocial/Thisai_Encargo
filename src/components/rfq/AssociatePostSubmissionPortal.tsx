import React, { useState } from 'react';
import type { SubmittedRFQRecord } from '../../types/rfq';
import type { ShipmentStage, StageQuote, QuoteType, MarkupType, DocumentStatus } from '../../types/postSubmission';
import { generateDynamicPostSubmissionStages } from '../../utils/postSubmissionGenerator';
import { RFQSubmissionReport } from './RFQSubmissionReport';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Toast } from '../ui/Toast';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  Building2,
  Clock,
  DollarSign,
  FileCheck,
  Upload,
  RotateCcw,
  Truck,
  Ship,
  Plane,
  ShieldCheck,
  Flame,
  Thermometer,
  Box,
  Layers,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  X,
  FileText,
} from 'lucide-react';
import './AssociatePostSubmissionPortal.css';

interface AssociatePostSubmissionPortalProps {
  record: SubmittedRFQRecord;
  onReset: () => void;
}

export const AssociatePostSubmissionPortal: React.FC<AssociatePostSubmissionPortalProps> = ({
  record,
  onReset,
}) => {
  // Master View Toggle: 'portal' (THISAI Associate Quote & Doc Portal) vs 'report' (Customer Submission Payload Report)
  const [activeViewMode, setActiveViewMode] = useState<'portal' | 'report'>('portal');

  // Dynamic Stages State initialized from submitted RFQ payload parameters
  const [stages, setStages] = useState<ShipmentStage[]>(() =>
    generateDynamicPostSubmissionStages(record)
  );

  // Accordion Expand State
  const [expandedStageId, setExpandedStageId] = useState<string>(() =>
    stages[0]?.id || ''
  );

  // Active Sub-Tab per stage: stageId -> 'quotes' | 'checklist'
  const [stageTabState, setStageTabState] = useState<Record<string, 'quotes' | 'checklist'>>({});

  // Toast Notification Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State for Adding a New Quote
  const [addingQuoteStageId, setAddingQuoteStageId] = useState<string | null>(null);
  const [newQuoteForm, setNewQuoteForm] = useState<{
    type: QuoteType;
    providerName: string;
    baseRate: string;
    markupValue: string;
    markupType: MarkupType;
    transitTime: string;
    validUntil: string;
    notes: string;
  }>({
    type: 'third_party',
    providerName: '',
    baseRate: '',
    markupValue: '0',
    markupType: 'flat',
    transitTime: '2-3 Days',
    validUntil: '2026-11-30',
    notes: '',
  });

  // Modal State for Editing Markup on a specific quote
  const [editingMarkupQuote, setEditingMarkupQuote] = useState<{
    stageId: string;
    quoteId: string;
    markupValue: number;
    markupType: MarkupType;
  } | null>(null);

  // Master KPI Calculations across all selected stage quotes
  let totalCustomerPrice = 0;
  let totalBaseCost = 0;
  let totalThisaiMargin = 0;
  let totalDocsCount = 0;
  let totalVerifiedDocs = 0;

  stages.forEach((stage) => {
    const selectedQuote = stage.quotes.find((q) => q.isSelected);
    if (selectedQuote) {
      totalCustomerPrice += selectedQuote.finalRate;
      totalBaseCost += selectedQuote.baseRate;
      totalThisaiMargin += selectedQuote.markupCalculatedAmount;
    }
    stage.documents.forEach((doc) => {
      totalDocsCount++;
      if (doc.status === 'verified') totalVerifiedDocs++;
    });
  });

  const overallDocProgressPercent =
    totalDocsCount > 0 ? Math.round((totalVerifiedDocs / totalDocsCount) * 100) : 0;

  // Toggle Accordion Stage Expansion
  const toggleStageExpand = (stageId: string) => {
    setExpandedStageId((prev) => (prev === stageId ? '' : stageId));
  };

  // Get current subtab for stage (defaults to 'quotes')
  const getStageSubtab = (stageId: string): 'quotes' | 'checklist' => {
    return stageTabState[stageId] || 'quotes';
  };

  const setStageSubtab = (stageId: string, tab: 'quotes' | 'checklist') => {
    setStageTabState((prev) => ({ ...prev, [stageId]: tab }));
  };

  // --- Quote Operations ---
  const handleSelectQuote = (stageId: string, quoteId: string) => {
    setStages((prevStages) =>
      prevStages.map((stage) => {
        if (stage.id !== stageId) return stage;
        return {
          ...stage,
          quotes: stage.quotes.map((q) => ({
            ...q,
            isSelected: q.id === quoteId,
          })),
        };
      })
    );
    setToastMessage('Selected active quote for stage updated!');
  };

  // Open Edit Markup Modal
  const openEditMarkup = (stageId: string, quote: StageQuote) => {
    setEditingMarkupQuote({
      stageId,
      quoteId: quote.id,
      markupValue: quote.markupValue,
      markupType: quote.markupType,
    });
  };

  // Save Edit Markup
  const handleSaveMarkup = () => {
    if (!editingMarkupQuote) return;
    const { stageId, quoteId, markupValue, markupType } = editingMarkupQuote;

    setStages((prevStages) =>
      prevStages.map((stage) => {
        if (stage.id !== stageId) return stage;
        return {
          ...stage,
          quotes: stage.quotes.map((q) => {
            if (q.id !== quoteId) return q;
            const base = q.baseRate;
            const calculatedMarkup =
              markupType === 'percent' ? Math.round(base * (markupValue / 100)) : markupValue;
            const final = base + calculatedMarkup;
            return {
              ...q,
              markupValue,
              markupType,
              markupCalculatedAmount: calculatedMarkup,
              finalRate: final,
            };
          }),
        };
      })
    );
    setEditingMarkupQuote(null);
    setToastMessage('Additional markup updated!');
  };

  // Submit Add New Quote
  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingQuoteStageId) return;

    const baseNum = Number(newQuoteForm.baseRate) || 0;
    const markupNum = Number(newQuoteForm.markupValue) || 0;
    const calcMarkup =
      newQuoteForm.markupType === 'percent'
        ? Math.round(baseNum * (markupNum / 100))
        : markupNum;
    const final = baseNum + calcMarkup;

    const createdQuote: StageQuote = {
      id: 'q-custom-' + Date.now(),
      type: newQuoteForm.type,
      providerName:
        newQuoteForm.providerName ||
        (newQuoteForm.type === 'thisai' ? 'THISAI Direct Special Rate' : 'Vendor 3rd Party'),
      baseRate: baseNum,
      markupType: newQuoteForm.markupType,
      markupValue: markupNum,
      markupCalculatedAmount: calcMarkup,
      finalRate: final,
      transitTime: newQuoteForm.transitTime || '2-3 Days',
      validUntil: newQuoteForm.validUntil || '2026-11-30',
      notes: newQuoteForm.notes,
      isSelected: false,
    };

    setStages((prevStages) =>
      prevStages.map((stage) => {
        if (stage.id !== addingQuoteStageId) return stage;
        return {
          ...stage,
          quotes: [...stage.quotes, createdQuote],
        };
      })
    );

    setAddingQuoteStageId(null);
    setNewQuoteForm({
      type: 'third_party',
      providerName: '',
      baseRate: '',
      markupValue: '0',
      markupType: 'flat',
      transitTime: '2-3 Days',
      validUntil: '2026-11-30',
      notes: '',
    });
    setToastMessage('New rate/quote added successfully!');
  };

  // --- Document Checklist Operations ---
  const handleToggleDocStatus = (stageId: string, docId: string, currentStatus: DocumentStatus) => {
    let nextStatus: DocumentStatus = 'collected';
    if (currentStatus === 'pending') nextStatus = 'collected';
    else if (currentStatus === 'collected') nextStatus = 'verified';
    else nextStatus = 'pending';

    setStages((prevStages) =>
      prevStages.map((stage) => {
        if (stage.id !== stageId) return stage;
        return {
          ...stage,
          documents: stage.documents.map((doc) => {
            if (doc.id !== docId) return doc;
            return {
              ...doc,
              status: nextStatus,
              fileName: doc.fileName || (nextStatus !== 'pending' ? 'Uploaded_Doc.pdf' : undefined),
              uploadedAt: nextStatus !== 'pending' ? 'Just now' : undefined,
            };
          }),
        };
      })
    );
    setToastMessage(`Document status updated to ${nextStatus.toUpperCase()}`);
  };

  const handleUploadSimulatedDoc = (stageId: string, docId: string) => {
    setStages((prevStages) =>
      prevStages.map((stage) => {
        if (stage.id !== stageId) return stage;
        return {
          ...stage,
          documents: stage.documents.map((doc) => {
            if (doc.id !== docId) return doc;
            return {
              ...doc,
              status: 'verified',
              fileName: `${doc.name.replace(/[^a-zA-Z0-9]/g, '_')}_VERIFIED.pdf`,
              uploadedAt: 'Today, Just now',
            };
          }),
        };
      })
    );
    setToastMessage('Document uploaded & verified successfully!');
  };

  // Render Icon dynamically based on iconType
  const renderStageIcon = (type: ShipmentStage['iconType']) => {
    switch (type) {
      case 'truck': return <Truck size={22} />;
      case 'customs': return <Building2 size={22} />;
      case 'ship': return <Ship size={22} />;
      case 'plane': return <Plane size={22} />;
      case 'shield': return <ShieldCheck size={22} />;
      case 'flame': return <Flame size={22} />;
      case 'thermometer': return <Thermometer size={22} />;
      default: return <Box size={22} />;
    }
  };

  // Return Customer Payload Report if user toggles view
  if (activeViewMode === 'report') {
    return (
      <div className="associate-portal-container">
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button variant="secondary" onClick={() => setActiveViewMode('portal')} leftIcon={<SlidersHorizontal size={16} />}>
            Back to Associate Quote & Document Operations Hub
          </Button>
        </div>
        <RFQSubmissionReport record={record} onReset={onReset} />
      </div>
    );
  }

  return (
    <div className="associate-portal-container animate-fade-in">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      {/* Header Banner & Shipment Master Overview */}
      <div className="associate-header-card">
        <div className="portal-top-bar">
          <div className="portal-title-group">
            <div className="portal-title-icon">
              <Layers size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h1 className="portal-main-heading">Post-RFQ Shipment Operations Hub</h1>
                <Badge variant="cyan">THISAI Associate Portal</Badge>
              </div>
              <p className="portal-sub-heading">
                Ref ID: <strong>{record.referenceNo}</strong> • Submitted{' '}
                {new Date(record.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Mode:{' '}
                <strong>{record.payload.mode}</strong> ({record.payload.service_scope})
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <Button variant="secondary" onClick={() => setActiveViewMode('report')} leftIcon={<FileText size={16} />}>
              View Raw API Payload
            </Button>
            <Button variant="primary" onClick={onReset} leftIcon={<RotateCcw size={16} />}>
              New RFQ Entry
            </Button>
          </div>
        </div>

        {/* Financial & Document KPI Cards */}
        <div className="portal-kpi-grid">
          <div className="kpi-card highlight-price">
            <span className="kpi-label">
              Total Customer Price <DollarSign size={14} />
            </span>
            <span className="kpi-value">${totalCustomerPrice.toLocaleString()}</span>
            <span className="kpi-subtext">Sum of active selected stage quotes</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Base Vendor Cost</span>
            <span className="kpi-value">${totalBaseCost.toLocaleString()}</span>
            <span className="kpi-subtext">Original 3rd party & base rates</span>
          </div>

          <div className="kpi-card highlight-margin">
            <span className="kpi-label">
              THISAI Margin / Profit <TrendingUp size={14} />
            </span>
            <span className="kpi-value">${totalThisaiMargin.toLocaleString()}</span>
            <span className="kpi-subtext">Added additional markup revenue</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Document Checklist</span>
            <span className="kpi-value">
              {totalVerifiedDocs} / {totalDocsCount}
            </span>
            <div style={{ background: 'rgba(255,255,255,0.2)', height: '6px', borderRadius: '4px', marginTop: '0.4rem', overflow: 'hidden' }}>
              <div style={{ width: `${overallDocProgressPercent}%`, height: '100%', background: '#10b981' }} />
            </div>
            <span className="kpi-subtext">{overallDocProgressPercent}% Stage Documents Verified</span>
          </div>
        </div>
      </div>

      {/* Control Actions Row */}
      <div className="portal-actions-row">
        <div className="tab-group-buttons">
          <button
            className={`tab-btn ${activeViewMode === 'portal' ? 'active' : ''}`}
            onClick={() => setActiveViewMode('portal')}
          >
            <SlidersHorizontal size={15} /> Dynamic Shipment Stages ({stages.length})
          </button>
        </div>

        <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>
          Manage quotes, add markups, select final rates & track required stage documentation.
        </span>
      </div>

      {/* Dynamic Stages Accordion List */}
      <div className="stages-list">
        {stages.map((stage) => {
          const isExpanded = expandedStageId === stage.id;
          const selectedQuote = stage.quotes.find((q) => q.isSelected);
          const activeSubtab = getStageSubtab(stage.id);

          const verifiedDocs = stage.documents.filter((d) => d.status === 'verified').length;
          const totalStageDocs = stage.documents.length;

          return (
            <div key={stage.id} className={`stage-card ${isExpanded ? 'expanded' : ''}`}>
              {/* Accordion Header */}
              <div className="stage-card-header" onClick={() => toggleStageExpand(stage.id)}>
                <div className="stage-title-section">
                  <div className={`stage-icon-badge ${stage.iconType}`}>
                    {renderStageIcon(stage.iconType)}
                  </div>
                  <div>
                    <h3 className="stage-name-text">{stage.stageName}</h3>
                    <p className="stage-location-text">
                      <ArrowRight size={13} style={{ color: '#2563eb' }} /> {stage.locationInfo}
                    </p>
                  </div>
                </div>

                {/* Right Header Active Quote & Status Pill */}
                <div className="stage-header-summary">
                  <div className={`active-quote-pill ${selectedQuote ? 'has-selected' : ''}`}>
                    <span className="active-provider-name">
                      {selectedQuote ? selectedQuote.providerName : 'No Quote Selected'}
                    </span>
                    {selectedQuote ? (
                      <div>
                        <span className="active-quote-pricing">${selectedQuote.finalRate.toLocaleString()}</span>
                        {selectedQuote.markupCalculatedAmount > 0 && (
                          <span className="active-quote-breakdown">
                            (Base: ${selectedQuote.baseRate} + ${selectedQuote.markupCalculatedAmount} Markup)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>Requires Selection</span>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <Badge variant={verifiedDocs === totalStageDocs ? 'success' : 'warning'}>
                      Docs: {verifiedDocs}/{totalStageDocs} Verified
                    </Badge>
                  </div>

                  {isExpanded ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                </div>
              </div>

              {/* Expanded Content Panel */}
              {isExpanded && (
                <div className="stage-card-body animate-fade-in">
                  {/* Stage Sub-Tabs: Quotes vs Document Checklist */}
                  <div className="stage-nav-tabs">
                    <button
                      className={`stage-subtab ${activeSubtab === 'quotes' ? 'active' : ''}`}
                      onClick={() => setStageSubtab(stage.id, 'quotes')}
                    >
                      <DollarSign size={16} /> Quote & Rate Management ({stage.quotes.length})
                    </button>
                    <button
                      className={`stage-subtab ${activeSubtab === 'checklist' ? 'active' : ''}`}
                      onClick={() => setStageSubtab(stage.id, 'checklist')}
                    >
                      <FileCheck size={16} /> Stage Document Checklist ({verifiedDocs}/{totalStageDocs})
                    </button>
                  </div>

                  {/* TAB 1: QUOTE MANAGEMENT */}
                  {activeSubtab === 'quotes' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                          Quotes for {stage.stageName}
                        </h4>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setAddingQuoteStageId(stage.id)}
                          leftIcon={<Plus size={15} />}
                        >
                          Add New Rate / Quote
                        </Button>
                      </div>

                      <div className="quotes-grid">
                        {stage.quotes.map((quote) => {
                          const isSelected = quote.isSelected;
                          const isThisai = quote.type === 'thisai';

                          return (
                            <div
                              key={quote.id}
                              className={`quote-option-card ${isSelected ? 'selected' : ''} ${
                                isThisai ? 'thisai-rate' : ''
                              }`}
                            >
                              <div>
                                <div className="quote-card-header">
                                  <div>
                                    <h5 className="quote-provider-title">{quote.providerName}</h5>
                                    <div className="quote-meta-row">
                                      <span>
                                        <Clock size={13} style={{ display: 'inline', marginRight: '3px' }} />
                                        {quote.transitTime}
                                      </span>
                                      •
                                      <span>Valid until: {quote.validUntil}</span>
                                    </div>
                                  </div>
                                  <Badge variant={isThisai ? 'purple' : 'cyan'}>
                                    {isThisai ? 'THISAI Direct' : '3rd Party Vendor'}
                                  </Badge>
                                </div>

                                {/* Financial Breakdown Box */}
                                <div className="quote-financial-box">
                                  <div className="quote-financial-row">
                                    <span>Original Base Quote:</span>
                                    <span style={{ fontWeight: 700 }}>${quote.baseRate.toLocaleString()}</span>
                                  </div>
                                  <div className="quote-financial-row">
                                    <span>
                                      Additional Markup / Value ({quote.markupType === 'percent' ? `${quote.markupValue}%` : 'Flat'}):
                                    </span>
                                    <span style={{ fontWeight: 700, color: quote.markupCalculatedAmount > 0 ? '#16a34a' : '#64748b' }}>
                                      +${quote.markupCalculatedAmount.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="quote-financial-row total-final">
                                    <span>Final Selected Stage Amount:</span>
                                    <span style={{ color: isSelected ? '#16a34a' : '#0f172a', fontSize: '1.05rem' }}>
                                      ${quote.finalRate.toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                {quote.notes && (
                                  <p style={{ fontSize: '0.775rem', color: '#64748b', margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>
                                    "{quote.notes}"
                                  </p>
                                )}
                              </div>

                              {/* Card Actions Bar */}
                              <div className="quote-actions-bar">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditMarkup(stage.id, quote)}
                                  leftIcon={<SlidersHorizontal size={14} />}
                                >
                                  Adjust Markup
                                </Button>

                                {isSelected ? (
                                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <CheckCircle2 size={16} /> Active Stage Quote
                                  </span>
                                ) : (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleSelectQuote(stage.id, quote.id)}
                                    leftIcon={<Check size={15} />}
                                  >
                                    Select Quote
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: STAGE DOCUMENT CHECKLIST */}
                  {activeSubtab === 'checklist' && (
                    <div className="doc-checklist-container">
                      <div className="doc-progress-banner">
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                            Required Document Verification Progress ({verifiedDocs} of {totalStageDocs} Verified)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="doc-progress-bar-track">
                            <div
                              className="doc-progress-bar-fill"
                              style={{ width: `${Math.round((verifiedDocs / totalStageDocs) * 100)}%` }}
                            />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2563eb' }}>
                            {Math.round((verifiedDocs / totalStageDocs) * 100)}%
                          </span>
                        </div>
                      </div>

                      <div className="doc-list">
                        {stage.documents.map((doc) => {
                          return (
                            <div key={doc.id} className="doc-item-row">
                              <div className="doc-info">
                                <div
                                  className={`doc-status-checkbox ${doc.status}`}
                                  onClick={() => handleToggleDocStatus(stage.id, doc.id, doc.status)}
                                >
                                  {doc.status !== 'pending' && <Check size={14} />}
                                </div>
                                <div>
                                  <h5 className="doc-name">{doc.name}</h5>
                                  <p className="doc-desc">{doc.description}</p>

                                  {doc.fileName && (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#eff6ff', color: '#1d4ed8', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.725rem', marginTop: '0.35rem', fontWeight: 700 }}>
                                      <FileText size={12} /> {doc.fileName} • {doc.uploadedAt}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="doc-actions-group">
                                <Badge
                                  variant={
                                    doc.status === 'verified'
                                      ? 'success'
                                      : doc.status === 'collected'
                                      ? 'cyan'
                                      : 'warning'
                                  }
                                >
                                  {doc.status.toUpperCase()}
                                </Badge>

                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleUploadSimulatedDoc(stage.id, doc.id)}
                                  leftIcon={<Upload size={14} />}
                                >
                                  Upload / Verify
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add New Quote Modal */}
      {addingQuoteStageId && (
        <div className="add-quote-modal-overlay">
          <div className="add-quote-modal-card animate-scale-up">
            <div className="modal-title-row">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Add New Quote / Rate Card
              </h3>
              <button
                onClick={() => setAddingQuoteStageId(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateQuote}>
              <div className="form-group-row">
                <label className="form-group-label">Quote Type</label>
                <select
                  className="form-group-input"
                  value={newQuoteForm.type}
                  onChange={(e) => setNewQuoteForm({ ...newQuoteForm, type: e.target.value as QuoteType })}
                >
                  <option value="third_party">3rd-Party Vendor Quote</option>
                  <option value="thisai">THISAI Direct Specific Rate</option>
                </select>
              </div>

              <div className="form-group-row">
                <label className="form-group-label">Provider / Carrier Name</label>
                <input
                  type="text"
                  className="form-group-input"
                  placeholder="e.g. DHL Global Forwarding / THISAI Direct"
                  value={newQuoteForm.providerName}
                  onChange={(e) => setNewQuoteForm({ ...newQuoteForm, providerName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group-row">
                <label className="form-group-label">Base Rate Amount ($ USD)</label>
                <input
                  type="number"
                  className="form-group-input"
                  placeholder="e.g. 1200"
                  value={newQuoteForm.baseRate}
                  onChange={(e) => setNewQuoteForm({ ...newQuoteForm, baseRate: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group-row">
                  <label className="form-group-label">Markup Type</label>
                  <select
                    className="form-group-input"
                    value={newQuoteForm.markupType}
                    onChange={(e) => setNewQuoteForm({ ...newQuoteForm, markupType: e.target.value as MarkupType })}
                  >
                    <option value="flat">Flat ($ USD)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                </div>

                <div className="form-group-row">
                  <label className="form-group-label">Additional Markup</label>
                  <input
                    type="number"
                    className="form-group-input"
                    placeholder="e.g. 150"
                    value={newQuoteForm.markupValue}
                    onChange={(e) => setNewQuoteForm({ ...newQuoteForm, markupValue: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group-row">
                  <label className="form-group-label">Estimated Transit Time</label>
                  <input
                    type="text"
                    className="form-group-input"
                    placeholder="e.g. 2-3 Days"
                    value={newQuoteForm.transitTime}
                    onChange={(e) => setNewQuoteForm({ ...newQuoteForm, transitTime: e.target.value })}
                  />
                </div>

                <div className="form-group-row">
                  <label className="form-group-label">Rate Validity Date</label>
                  <input
                    type="date"
                    className="form-group-input"
                    value={newQuoteForm.validUntil}
                    onChange={(e) => setNewQuoteForm({ ...newQuoteForm, validUntil: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-row">
                <label className="form-group-label">Notes / Instructions</label>
                <input
                  type="text"
                  className="form-group-input"
                  placeholder="Special conditions or inclusions..."
                  value={newQuoteForm.notes}
                  onChange={(e) => setNewQuoteForm({ ...newQuoteForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <Button variant="secondary" type="button" onClick={() => setAddingQuoteStageId(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" leftIcon={<Plus size={16} />}>
                  Save & Add Rate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Markup Modal */}
      {editingMarkupQuote && (
        <div className="add-quote-modal-overlay">
          <div className="add-quote-modal-card animate-scale-up">
            <div className="modal-title-row">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Adjust Additional Markup / Margin
              </h3>
              <button
                onClick={() => setEditingMarkupQuote(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="form-group-row">
              <label className="form-group-label">Markup Type</label>
              <select
                className="form-group-input"
                value={editingMarkupQuote.markupType}
                onChange={(e) =>
                  setEditingMarkupQuote({
                    ...editingMarkupQuote,
                    markupType: e.target.value as MarkupType,
                  })
                }
              >
                <option value="flat">Flat Dollar Amount ($ USD)</option>
                <option value="percent">Percentage Markup (%)</option>
              </select>
            </div>

            <div className="form-group-row">
              <label className="form-group-label">Markup Value</label>
              <input
                type="number"
                className="form-group-input"
                value={editingMarkupQuote.markupValue}
                onChange={(e) =>
                  setEditingMarkupQuote({
                    ...editingMarkupQuote,
                    markupValue: Number(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <Button variant="secondary" type="button" onClick={() => setEditingMarkupQuote(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="button" onClick={handleSaveMarkup} leftIcon={<Check size={16} />}>
                Save Markup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
