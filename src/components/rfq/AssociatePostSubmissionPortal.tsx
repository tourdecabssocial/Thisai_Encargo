import React, { useState } from 'react';
import type { SubmittedRFQRecord, CurrencyType } from '../../types/rfq';
import type { ShipmentStage, StageQuote, CategoryQuote, MarkupType, DocumentStatus, ChargeItemGroupBundle } from '../../types/postSubmission';
import { generateDynamicPostSubmissionStages } from '../../utils/postSubmissionGenerator';

const getCurrencySymbol = (curr?: CurrencyType | string): string => {
  switch (curr) {
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'INR': return '₹';
    case 'USD':
    default: return '$';
  }
};
import { RFQSubmissionReport } from './RFQSubmissionReport';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Toast } from '../ui/Toast';
import {
  CheckCircle2,
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
  SlidersHorizontal,
  X,
  FileText,
} from 'lucide-react';
import './AssociatePostSubmissionPortal.css';

interface AssociatePostSubmissionPortalProps {
  record: SubmittedRFQRecord;
  onReset: () => void;
  selectedStageIndex?: number;
  onSelectStageIndex?: (index: number) => void;
}

export const AssociatePostSubmissionPortal: React.FC<AssociatePostSubmissionPortalProps> = ({
  record,
  onReset,
  selectedStageIndex,
  onSelectStageIndex,
}) => {
  // Master View Toggle: 'portal' (THISAI Associate Quote & Doc Portal) vs 'report' (Customer Submission Payload Report)
  const [activeViewMode, setActiveViewMode] = useState<'portal' | 'report'>('portal');

  // Dynamic Stages State initialized from submitted RFQ payload parameters
  const [stages, setStages] = useState<ShipmentStage[]>(() =>
    generateDynamicPostSubmissionStages(record)
  );

  // Active Stage Selection Index
  const [internalStageIndex, setInternalStageIndex] = useState<number>(0);
  const activeStageIndex = selectedStageIndex !== undefined ? selectedStageIndex : internalStageIndex;

  const setActiveStageIndex = (index: number) => {
    setInternalStageIndex(index);
    if (onSelectStageIndex) {
      onSelectStageIndex(index);
    }
  };

  // Active Sub-Tab per stage: stageId -> 'quotes' | 'checklist'
  const [stageTabState, setStageTabState] = useState<Record<string, 'quotes' | 'checklist'>>({});

  // Toast Notification Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedCategoryQuotes, setExpandedCategoryQuotes] = useState<Record<string, boolean>>({});

  const toggleExpandCategoryQuote = (quoteId: string) => {
    setExpandedCategoryQuotes((prev) => {
      const isCurrentlyExpanded = !!prev[quoteId];
      if (!isCurrentlyExpanded) {
        return { [quoteId]: true };
      }
      return {};
    });
  };

  // Modal State for Adding a New Quote
  const [addingQuoteStageId, setAddingQuoteStageId] = useState<string | null>(null);
  const [selectedForBundle, setSelectedForBundle] = useState<string[]>([]);
  const [newQuoteForm, setNewQuoteForm] = useState<{
    providerName: string;
    baseRate: string;
    markupValue: string;
    markupType: MarkupType;
    currency: CurrencyType;
    transitTime: string;
    validUntil: string;
    notes: string;
    rateMode: 'category_lump' | 'itemized_charge' | 'grouped_sets';
    itemizedAmounts: Record<string, number>;
    bundles: ChargeItemGroupBundle[];
  }>({
    providerName: '',
    baseRate: '',
    markupValue: '0',
    markupType: 'flat',
    currency: (record.payload.currency as CurrencyType) || 'USD',
    transitTime: '1-2 Days',
    validUntil: '2026-11-30',
    notes: '',
    rateMode: 'category_lump',
    itemizedAmounts: {},
    bundles: [],
  });

  // Modal State for Editing Markup on a specific quote (Stage quote or Charge Line-Item quote)
  const [editingMarkupQuote, setEditingMarkupQuote] = useState<{
    stageId: string;
    quoteId: string;
    lineItemId?: string;
    itemQuoteId?: string;
    markupValue: number;
    markupType: MarkupType;
  } | null>(null);

  // Category target for adding custom quote option
  const [addingQuoteCategoryName, setAddingQuoteCategoryName] = useState<string | null>(null);

  const handleSelectCategoryQuote = (stageId: string, categoryName: string, categoryQuoteId: string) => {
    setStages((prevStages) =>
      prevStages.map((stage) => {
        if (stage.id !== stageId) return stage;

        const updatedQuotes = stage.quotes.map((quote) => {
          if (!quote.categoryGroups) return quote;

          const updatedGroups = quote.categoryGroups.map((group) => {
            if (group.categoryName !== categoryName) return group;

            const updatedCatQuotes = group.categoryQuotes.map((cq) => ({
              ...cq,
              isSelected: cq.id === categoryQuoteId,
            }));

            return {
              ...group,
              categoryQuotes: updatedCatQuotes,
            };
          });

          const newTotalFinal = updatedGroups.reduce((catSum, grp) => {
            const activeCQ = grp.categoryQuotes.find((cq) => cq.isSelected) || grp.categoryQuotes[0];
            return catSum + (activeCQ ? activeCQ.finalRate : 0);
          }, 0);

          return {
            ...quote,
            baseRate: Math.round(newTotalFinal * 0.9),
            finalRate: newTotalFinal,
            categoryGroups: updatedGroups,
          };
        });

        return {
          ...stage,
          quotes: updatedQuotes,
        };
      })
    );
    setToastMessage(`Rate option selected for category ${categoryName}!`);
  };

  const handleUpdateCategoryMarkup = (stageId: string, categoryName: string, markupValue: number) => {
    setStages((prevStages) =>
      prevStages.map((stage) => {
        if (stage.id !== stageId) return stage;

        const updatedQuotes = stage.quotes.map((quote) => {
          if (!quote.categoryGroups) return quote;

          const updatedGroups = quote.categoryGroups.map((group) => {
            if (group.categoryName !== categoryName) return group;

            const updatedCatQuotes = group.categoryQuotes.map((cq) => {
              if (!cq.isSelected) return cq;
              const base = cq.baseRate;
              const final = base + markupValue;
              return {
                ...cq,
                markupValue,
                finalRate: final,
              };
            });

            return {
              ...group,
              categoryQuotes: updatedCatQuotes,
            };
          });

          const newTotalFinal = updatedGroups.reduce((catSum, grp) => {
            const activeCQ = grp.categoryQuotes.find((cq) => cq.isSelected) || grp.categoryQuotes[0];
            return catSum + (activeCQ ? activeCQ.finalRate : 0);
          }, 0);

          return {
            ...quote,
            baseRate: Math.round(newTotalFinal * 0.9),
            finalRate: newTotalFinal,
            categoryGroups: updatedGroups,
          };
        });

        return {
          ...stage,
          quotes: updatedQuotes,
        };
      })
    );
  };



  const handleUpdateLineItemRate = (
    stageId: string,
    categoryName: string,
    lineItemId: string,
    newItemRate: number
  ) => {
    setStages((prevStages) =>
      prevStages.map((stage) => {
        if (stage.id !== stageId) return stage;

        const updatedQuotes = stage.quotes.map((quote) => {
          if (!quote.categoryGroups) return quote;

          const updatedGroups = quote.categoryGroups.map((group) => {
            if (group.categoryName !== categoryName) return group;

            // Update line item's selectedRate
            const updatedLineItems = group.lineItems.map((li) => {
              if (li.id !== lineItemId) return li;
              return { ...li, selectedRate: newItemRate };
            });

            const updatedCatQuotes = group.categoryQuotes.map((cq) => {
              if (!cq.isSelected) return cq;

              const newItemizedAmounts = {
                ...(cq.itemizedAmounts || {}),
                [lineItemId]: newItemRate,
              };

              // Re-sum total base rate for the category from itemized amounts
              const newBaseRate = Object.values(newItemizedAmounts).reduce((sum, val) => sum + (val || 0), 0);
              const newFinalRate = newBaseRate + (cq.markupValue || 0);

              return {
                ...cq,
                baseRate: newBaseRate,
                finalRate: newFinalRate,
                itemizedAmounts: newItemizedAmounts,
              };
            });

            return {
              ...group,
              lineItems: updatedLineItems,
              categoryQuotes: updatedCatQuotes,
            };
          });

          const newTotalFinal = updatedGroups.reduce((catSum, grp) => {
            const activeCQ = grp.categoryQuotes.find((cq) => cq.isSelected) || grp.categoryQuotes[0];
            return catSum + (activeCQ ? activeCQ.finalRate : 0);
          }, 0);

          return {
            ...quote,
            baseRate: Math.round(newTotalFinal * 0.9),
            finalRate: newTotalFinal,
            categoryGroups: updatedGroups,
          };
        });

        return {
          ...stage,
          quotes: updatedQuotes,
        };
      })
    );
  };

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

  // Stage Selection is driven via activeStageIndex (side card or stage strip click)

  // Get current subtab for stage (defaults to 'quotes')
  const getStageSubtab = (stageId: string): 'quotes' | 'checklist' => {
    return stageTabState[stageId] || 'quotes';
  };

  const setStageSubtab = (stageId: string, tab: 'quotes' | 'checklist') => {
    setStageTabState((prev) => ({ ...prev, [stageId]: tab }));
  };

  // --- Quote Operations ---




  // Save Edit Markup
  const handleSaveMarkup = () => {
    if (!editingMarkupQuote) return;
    const { stageId, quoteId, lineItemId, itemQuoteId, markupValue, markupType } = editingMarkupQuote;

    setStages((prevStages) =>
      prevStages.map((stage) => {
        if (stage.id !== stageId) return stage;

        // If editing a specific charge line item quote option
        if (lineItemId && itemQuoteId) {
          const updatedQuotes = stage.quotes.map((quote) => {
            if (!quote.categoryGroups) return quote;

            const updatedGroups = quote.categoryGroups.map((group) => ({
              ...group,
              lineItems: group.lineItems.map((item) => {
                if (item.id !== lineItemId || !item.quotes) return item;

                const updatedItemQuotes = item.quotes.map((iq) => {
                  if (iq.id !== itemQuoteId) return iq;
                  const base = iq.baseRate;
                  const calcMarkup =
                    markupType === 'percent' ? Math.round(base * (markupValue / 100)) : markupValue;
                  return {
                    ...iq,
                    markupValue,
                    markupCalculatedAmount: calcMarkup,
                    finalRate: base + calcMarkup,
                  };
                });

                const activeQ = updatedItemQuotes.find((q) => q.isSelected) || updatedItemQuotes[0];
                return {
                  ...item,
                  selectedRate: activeQ ? activeQ.finalRate : item.selectedRate,
                  quotes: updatedItemQuotes,
                };
              }),
            }));

            const newTotalFinal = updatedGroups.reduce(
              (grpSum, grp) =>
                grpSum +
                grp.lineItems.reduce((itemSum, item) => {
                  const itemQuotes = item.quotes || [];
                  const activeQ = itemQuotes.find((q) => q.isSelected) || itemQuotes[0];
                  return itemSum + (activeQ ? activeQ.finalRate : 0);
                }, 0),
              0
            );

            return {
              ...quote,
              baseRate: Math.round(newTotalFinal * 0.9),
              finalRate: newTotalFinal,
              categoryGroups: updatedGroups,
            };
          });

          return { ...stage, quotes: updatedQuotes };
        }

        // Standard stage quote markup edit
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

    // Target is a specific category
    if (addingQuoteCategoryName) {
      const categoryName = addingQuoteCategoryName;
      const createdCategoryQuote: CategoryQuote = {
        id: 'q-cat-custom-' + Date.now(),
        providerName: newQuoteForm.providerName || 'Vendor 3rd Party Rate',
        baseRate: baseNum,
        markupValue: calcMarkup,
        currency: newQuoteForm.currency,
        finalRate: final,
        isSelected: false,
        rateMode: newQuoteForm.rateMode,
        itemizedAmounts: newQuoteForm.itemizedAmounts,
        bundles: newQuoteForm.bundles,
        transitTime: newQuoteForm.transitTime || '1-2 Days',
        notes: newQuoteForm.notes || `Associate custom rate for ${categoryName}`,
      };

      setStages((prevStages) =>
        prevStages.map((stage) => {
          if (stage.id !== addingQuoteStageId) return stage;

          const updatedQuotes = stage.quotes.map((quote) => {
            if (!quote.categoryGroups) return quote;

            const updatedGroups = quote.categoryGroups.map((group) => {
              if (group.categoryName !== categoryName) return group;
              return {
                ...group,
                categoryQuotes: [...(group.categoryQuotes || []), createdCategoryQuote],
              };
            });

            return { ...quote, categoryGroups: updatedGroups };
          });

          return { ...stage, quotes: updatedQuotes };
        })
      );

      setAddingQuoteStageId(null);
      setAddingQuoteCategoryName(null);
      setSelectedForBundle([]);
      setNewQuoteForm({
        providerName: '',
        baseRate: '',
        markupValue: '0',
        markupType: 'flat',
        currency: (record.payload.currency as CurrencyType) || 'USD',
        transitTime: '1-2 Days',
        validUntil: '2026-11-30',
        notes: '',
        rateMode: 'category_lump',
        itemizedAmounts: {},
        bundles: [],
      });
      setToastMessage(`New rate option added for category ${categoryName}!`);
      return;
    }

    const createdQuote: StageQuote = {
      id: 'q-custom-' + Date.now(),
      type: 'third_party',
      providerName: newQuoteForm.providerName || 'Vendor 3rd Party Rate',
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
    setSelectedForBundle([]);
    setNewQuoteForm({
      providerName: '',
      baseRate: '',
      markupValue: '0',
      markupType: 'flat',
      currency: (record.payload.currency as CurrencyType) || 'USD',
      transitTime: '1-2 Days',
      validUntil: '2026-11-30',
      notes: '',
      rateMode: 'category_lump',
      itemizedAmounts: {},
      bundles: [],
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

      {/* Sleek Single-Line Operations Summary Bar */}
      <div className="associate-single-line-bar">
        <div className="bar-left-section">
          <div className="bar-title-item">
            <Layers size={18} style={{ color: '#60a5fa' }} />
            <span className="bar-main-title">Operations Hub</span>
            <span className="bar-ref-badge">{record.referenceNo}</span>
          </div>

          <div className="bar-metrics-inline">
            <div className="bar-metric-pill price">
              <span className="bar-label">Price:</span>
              <span className="bar-val">${totalCustomerPrice.toLocaleString()}</span>
            </div>
            <div className="bar-metric-pill base">
              <span className="bar-label">Base:</span>
              <span className="bar-val">${totalBaseCost.toLocaleString()}</span>
            </div>
            <div className="bar-metric-pill margin">
              <span className="bar-label">Margin:</span>
              <span className="bar-val">+${totalThisaiMargin.toLocaleString()}</span>
            </div>
            <div className="bar-metric-pill docs">
              <span className="bar-label">Docs:</span>
              <span className="bar-val">
                {totalVerifiedDocs}/{totalDocsCount} ({overallDocProgressPercent}%)
              </span>
            </div>
          </div>
        </div>

        <div className="bar-right-actions">
          <Button variant="ghost" size="sm" onClick={() => setActiveViewMode('report')} leftIcon={<FileText size={14} />}>
            Raw Payload
          </Button>
          <Button variant="secondary" size="sm" onClick={onReset} leftIcon={<RotateCcw size={14} />}>
            New RFQ
          </Button>
        </div>
      </div>

      {/* Dynamic Horizontal Stage Navigation Strip */}
      <div
        className="stage-selector-strip"
        style={{
          display: 'flex',
          gap: '0.65rem',
          overflowX: 'auto',
          paddingBottom: '0.65rem',
          marginBottom: '1.25rem',
        }}
      >
        {stages.map((stg, idx) => {
          const isSelected = idx === activeStageIndex;
          const selectedQuote = stg.quotes.find((q) => q.isSelected);
          const verifiedDocs = stg.documents.filter((d) => d.status === 'verified').length;
          const totalDocs = stg.documents.length;

          return (
            <button
              key={stg.id}
              type="button"
              onClick={() => setActiveStageIndex(idx)}
              style={{
                flex: '0 0 auto',
                minWidth: '210px',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: isSelected ? 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)' : '#ffffff',
                boxShadow: isSelected ? '0 4px 14px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isSelected ? '#2563eb' : '#64748b', textTransform: 'uppercase' }}>
                  Stage 0{idx + 1}
                </span>
                <Badge variant={verifiedDocs === totalDocs ? 'success' : 'warning'}>
                  Docs: {verifiedDocs}/{totalDocs}
                </Badge>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.35rem' }}>
                {stg.stageName}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: selectedQuote ? '#16a34a' : '#dc2626' }}>
                {selectedQuote ? `$${selectedQuote.finalRate.toLocaleString()}` : 'No Quote Selected'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Selected Stage Focused Content Panel (No Accordion Chevrons) */}
      {(() => {
        const stage = stages[activeStageIndex] || stages[0];
        const selectedQuote = stage.quotes.find((q) => q.isSelected);
        const activeSubtab = getStageSubtab(stage.id);

        const verifiedDocs = stage.documents.filter((d) => d.status === 'verified').length;
        const totalStageDocs = stage.documents.length;

        return (
          <div key={stage.id} className="stage-card expanded">
            {/* Non-collapsible Stage Header */}
            <div className="stage-card-header" style={{ cursor: 'default', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div className="stage-title-section">
                <div className={`stage-icon-badge ${stage.iconType}`}>
                  {renderStageIcon(stage.iconType)}
                </div>
                <div>
                  <h3 className="stage-name-text">
                    Stage {activeStageIndex + 1}: {stage.stageName}
                  </h3>
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
              </div>
            </div>

            {/* Direct Content Panel (Quotes vs Document Checklist) */}
            <div className="stage-card-body animate-fade-in" style={{ borderTop: 'none' }}>
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

              {/* TAB 1: QUOTE MANAGEMENT (Category-Level Rate Selection) */}
              {activeSubtab === 'quotes' && (() => {
                const selectedQuote = stage.quotes.find((q) => q.isSelected) || stage.quotes[0];
                const isLiveLoading = Boolean(
                  record.payload.loading_type &&
                  String(record.payload.loading_type).toLowerCase().includes('live')
                );
                const isFirstMileStage = stage.category === 'first_mile' || stage.id === 'stage-first-mile';
                const isLiveLoadingPitchBlocked = isLiveLoading && isFirstMileStage;

                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.65rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <DollarSign size={18} style={{ color: '#2563eb' }} />
                          Category-Level Rate Management for {stage.stageName}
                        </h4>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.775rem', color: '#64748b' }}>
                          Vendor quotes are pitched per operational category. Select a pitched rate for each category and add optional category markup.
                        </p>
                      </div>
                    </div>

                    {/* Live Loading Active Constraint Banner */}
                    {isLiveLoadingPitchBlocked && (
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #fffbe0 0%, #fef3c7 100%)',
                          border: '1.5px solid #f59e0b',
                          borderRadius: '10px',
                          padding: '0.9rem 1.15rem',
                          marginBottom: '1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)',
                        }}
                      >
                        <div style={{ background: '#d97706', color: '#ffffff', padding: '0.55rem', borderRadius: '8px', display: 'flex' }}>
                          <Truck size={20} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#92400e', display: 'block' }}>
                            ⚡ Live Factory Loading Active — 1st Mile Pitching Disabled
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 600 }}>
                            This shipment uses Live Loading at the factory. Container pickup is integrated directly into factory drayage; standalone 1st Mile vendor quote pitching is bypassed.
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedQuote && selectedQuote.categoryGroups && selectedQuote.categoryGroups.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {selectedQuote.categoryGroups.map((group) => {
                          const selectedCategoryQuote = (group.categoryQuotes && group.categoryQuotes.find((cq) => cq.isSelected)) || (group.categoryQuotes && group.categoryQuotes[0]);
                          const categorySubtotal = isLiveLoadingPitchBlocked ? 0 : (selectedCategoryQuote ? selectedCategoryQuote.finalRate : 0);

                          return (
                            <div
                              key={group.categoryName}
                              style={{
                                background: '#ffffff',
                                borderRadius: '12px',
                                border: '1px solid #cbd5e1',
                                padding: '1.1rem',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                              }}
                            >
                              {/* Category Header */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '1rem',
                                  background: 'linear-gradient(90deg, #f8fafc 0%, #eff6ff 100%)',
                                  padding: '0.65rem 1rem',
                                  borderRadius: '8px',
                                  borderLeft: '4px solid #2563eb',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <span style={{ fontWeight: 800, fontSize: '0.925rem', color: '#0f172a' }}>
                                    Category: {group.categoryName}
                                  </span>
                                  <Badge variant="cyan">{group.lineItems.length} Charge Items</Badge>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                                      Category Subtotal:
                                    </span>
                                    <span style={{ fontSize: '1.05rem', color: '#16a34a', fontWeight: 800 }}>
                                      ${categorySubtotal.toLocaleString()}
                                    </span>
                                  </div>
                                  {isLiveLoadingPitchBlocked ? (
                                    <Badge variant="warning">⚡ Pitching Bypassed (Live Loading)</Badge>
                                  ) : (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                                      onClick={() => {
                                        setAddingQuoteStageId(stage.id);
                                        setAddingQuoteCategoryName(group.categoryName);
                                        const initialItemized: Record<string, number> = {};
                                        group.lineItems.forEach((li) => {
                                          initialItemized[li.id] = li.selectedRate || 0;
                                        });
                                        const totalSum = Object.values(initialItemized).reduce((a, b) => a + b, 0);
                                        setNewQuoteForm({
                                          providerName: '',
                                          baseRate: totalSum > 0 ? String(totalSum) : '',
                                          markupValue: '0',
                                          markupType: 'flat',
                                          currency: (record.payload.currency as CurrencyType) || 'USD',
                                          transitTime: '1-2 Days',
                                          validUntil: '2026-11-30',
                                          notes: '',
                                          rateMode: 'category_lump',
                                          itemizedAmounts: initialItemized,
                                          bundles: [],
                                        });
                                      }}
                                      leftIcon={<Plus size={13} />}
                                    >
                                      Add Vendor Rate
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Pitched Category Vendor Quote Cards & Right-Side Selected Quote Configurator */}
                              {!isLiveLoadingPitchBlocked && group.categoryQuotes && group.categoryQuotes.length > 0 && (
                                <div style={{ marginBottom: '1rem' }}>
                                  <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                                    Pitched Vendor Rates for Category:
                                  </span>
                                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                    {/* Pitched Vendor Cards Grid (Left Side) - Ultra-Compact Layout */}
                                    <div style={{ flex: '2 1 480px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.6rem' }}>
                                      {group.categoryQuotes.map((catQuote) => {
                                        const isSelected = catQuote.isSelected;
                                        const isExpanded = !!expandedCategoryQuotes[catQuote.id];

                                        return (
                                          <div
                                            key={catQuote.id}
                                            style={{
                                              background: '#ffffff',
                                              border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                              borderRadius: '10px',
                                              padding: '0.55rem 0.75rem',
                                              boxShadow: isSelected ? '0 2px 10px rgba(37, 99, 235, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                                              transition: 'all 0.15s ease',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: '0.35rem',
                                            }}
                                          >
                                            {/* Header Row: Provider Name + Rate */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {catQuote.providerName}
                                              </h4>
                                              <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', background: '#f8fafc', padding: '0.15rem 0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                ${catQuote.baseRate.toLocaleString()}
                                              </span>
                                            </div>

                                            {/* Subtext Row: Transit & Validity */}
                                            <div style={{ fontSize: '0.675rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                              <Clock size={10} style={{ color: '#64748b' }} />
                                              <span>{catQuote.transitTime || '1-2 Days'}</span>
                                              <span>•</span>
                                              <span>Valid: {catQuote.validUntil || '2026-11-15'}</span>
                                            </div>

                                            {/* Optional Note (Truncated) */}
                                            {catQuote.notes && (
                                              <div style={{ fontSize: '0.675rem', color: '#64748b', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                "{catQuote.notes}"
                                              </div>
                                            )}

                                            {/* Actions Footer */}
                                            <div
                                              style={{
                                                borderTop: '1px solid #f1f5f9',
                                                paddingTop: '0.35rem',
                                                marginTop: '0.1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '0.35rem',
                                              }}
                                            >
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleExpandCategoryQuote(catQuote.id);
                                                }}
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '0.25rem',
                                                  background: 'transparent',
                                                  border: 'none',
                                                  color: '#475569',
                                                  fontWeight: 700,
                                                  fontSize: '0.725rem',
                                                  cursor: 'pointer',
                                                  padding: 0,
                                                }}
                                              >
                                                <SlidersHorizontal size={12} />
                                                {isExpanded ? 'Hide' : '👁️ View'}
                                              </button>

                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleSelectCategoryQuote(stage.id, group.categoryName, catQuote.id);
                                                }}
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '0.25rem',
                                                  background: isSelected
                                                    ? 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)'
                                                    : '#ffffff',
                                                  border: isSelected ? 'none' : '1px solid #cbd5e1',
                                                  color: isSelected ? '#ffffff' : '#334155',
                                                  borderRadius: '16px',
                                                  padding: '0.25rem 0.65rem',
                                                  fontWeight: 800,
                                                  fontSize: '0.725rem',
                                                  cursor: 'pointer',
                                                  boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
                                                }}
                                              >
                                                <CheckCircle2 size={12} />
                                                {isSelected ? 'Selected' : 'Select'}
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Right Side Selected Quote & Additional Cost Container - Ultra-Compact Layout */}
                                    <div style={{ flex: '1 1 260px', minWidth: '240px' }}>
                                      {selectedCategoryQuote ? (
                                        <div
                                          style={{
                                            background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                                            border: '2px solid #2563eb',
                                            borderRadius: '10px',
                                            padding: '0.65rem 0.85rem',
                                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.4rem',
                                          }}
                                        >
                                          <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                Selected Option
                                              </span>
                                              <Badge variant="cyan">Active Choice</Badge>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem' }}>
                                              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                                                {selectedCategoryQuote.providerName}
                                              </h4>
                                              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                                                ${selectedCategoryQuote.baseRate.toLocaleString()}
                                              </span>
                                            </div>

                                            <div style={{ fontSize: '0.675rem', color: '#64748b', marginTop: '0.1rem' }}>
                                              Transit: {selectedCategoryQuote.transitTime || '1-2 Days'} • Valid: {selectedCategoryQuote.validUntil || '2026-11-15'}
                                            </div>

                                            {/* Additional Cost / Markup Input */}
                                            <div style={{ background: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0.35rem 0.5rem', marginTop: '0.4rem' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155' }}>
                                                  + Additional Cost / Markup ($):
                                                </label>
                                                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid #3b82f6', borderRadius: '4px', padding: '0.15rem 0.35rem' }}>
                                                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', marginRight: '2px' }}>$</span>
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={selectedCategoryQuote.markupValue || ''}
                                                    onChange={(e) =>
                                                      handleUpdateCategoryMarkup(stage.id, group.categoryName, Math.max(0, Number(e.target.value) || 0))
                                                    }
                                                    style={{
                                                      width: '60px',
                                                      border: 'none',
                                                      background: 'transparent',
                                                      fontWeight: 800,
                                                      fontSize: '0.8rem',
                                                      color: '#0f172a',
                                                      outline: 'none',
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          <div style={{ background: '#1e293b', color: '#ffffff', borderRadius: '6px', padding: '0.4rem 0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                              <span style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                                                Final Stage Amount
                                              </span>
                                              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#4ade80' }}>
                                                ${selectedCategoryQuote.finalRate.toLocaleString()}
                                              </span>
                                            </div>
                                            <CheckCircle2 size={16} style={{ color: '#4ade80' }} />
                                          </div>
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            background: '#f8fafc',
                                            border: '1.5px dashed #cbd5e1',
                                            borderRadius: '10px',
                                            padding: '0.75rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textAlign: 'center',
                                            minHeight: '120px',
                                          }}
                                        >
                                          <CheckCircle2 size={18} style={{ color: '#3b82f6', marginBottom: '0.25rem' }} />
                                          <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.15rem' }}>
                                            No Quote Selected
                                          </h5>
                                          <p style={{ margin: 0, fontSize: '0.675rem', color: '#64748b', maxWidth: '180px' }}>
                                            Click "Select" on a card to configure rate & markup.
                                           </p>
                                         </div>
                                       )}
                                     </div>
                                   </div>
                                 </div>
                               )}

                               {isLiveLoadingPitchBlocked && (
                                 <div
                                   style={{
                                     padding: '0.85rem 1.15rem',
                                     background: '#f8fafc',
                                     borderRadius: '10px',
                                     border: '1px dashed #cbd5e1',
                                     fontSize: '0.82rem',
                                     color: '#475569',
                                     display: 'flex',
                                     alignItems: 'center',
                                     justifyContent: 'space-between',
                                     marginTop: '0.5rem',
                                   }}
                                 >
                                   <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                     <Truck size={16} style={{ color: '#d97706' }} />
                                     Container is loaded live at origin factory. Standalone 1st Mile vendor rates are not quoted.
                                   </span>
                                   <Badge variant="warning">$0 (Included in Factory Freight)</Badge>
                                 </div>
                               )}

                               {/* Viewed Category Quote Breakdown Section (Toggled via View Details) */}
                              {(() => {
                                const viewedCategoryQuote = group.categoryQuotes.find((q) => expandedCategoryQuotes[q.id]);
                                if (!viewedCategoryQuote) return null;

                                const currentMode = viewedCategoryQuote.rateMode || 'category_lump';
                                const isItemizedMode = currentMode === 'itemized_charge';

                                return (
                                  <div style={{ marginTop: '1.25rem', borderTop: '2px dashed #cbd5e1', paddingTop: '1rem' }}>
                                    <div
                                      style={{
                                        background: isItemizedMode ? '#f0fdf4' : '#ffffff',
                                        border: isItemizedMode ? '1px solid #86efac' : '1px solid #bfdbfe',
                                        borderRadius: '8px',
                                        padding: '0.75rem 1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: '0.75rem',
                                        marginBottom: '1rem',
                                        transition: 'all 0.2s ease',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.775rem', fontWeight: 800, color: '#1e293b' }}>
                                          Pitched Rate Details ({group.categoryName} – {viewedCategoryQuote.providerName})
                                        </span>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                                            Category Pitched Rate:
                                          </span>
                                          <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2563eb' }}>
                                            ${viewedCategoryQuote.baseRate.toLocaleString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Itemized Charge Line Items & Bundled Sets Section */}
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                                          Charge Breakdown for {group.categoryName}:
                                        </span>
                                        {viewedCategoryQuote?.rateMode === 'grouped_sets' || (viewedCategoryQuote?.bundles && viewedCategoryQuote.bundles.length > 0) ? (
                                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7e22ce', background: '#f3e8ff', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                            📦 Combined Charge Sets Active
                                          </span>
                                        ) : viewedCategoryQuote?.rateMode === 'itemized_charge' ? (
                                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                            ⚡ ChargeName-Wise Mode Active
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e40af', background: '#eff6ff', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                            🏷️ Category Lump-Sum Mode Active
                                          </span>
                                        )}
                                      </div>

                                      {/* RENDER BUNDLED SETS IF BUNDLES EXIST */}
                                      {viewedCategoryQuote?.bundles && viewedCategoryQuote.bundles.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
                                          {viewedCategoryQuote.bundles.map((bundle) => {
                                            const bundledItems = group.lineItems.filter((li) => bundle.lineItemIds.includes(li.id));

                                            return (
                                              <div
                                                key={bundle.groupId}
                                                style={{
                                                  background: '#faf5ff',
                                                  borderRadius: '8px',
                                                  border: '1.5px solid #c084fc',
                                                  padding: '0.75rem 1rem',
                                                }}
                                              >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                  <div>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#6b21a8' }}>
                                                      📦 {bundle.groupName} ({bundledItems.length} Charge Items Combined)
                                                    </span>
                                                    <span style={{ fontSize: '0.7rem', color: '#7e22ce', display: 'block', fontStyle: 'italic' }}>
                                                      Combined Package Rate for this set
                                                    </span>
                                                  </div>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#ffffff', border: '1.5px solid #a855f7', borderRadius: '6px', padding: '0.25rem 0.5rem' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7e22ce' }}>Combined Set Rate: $</span>
                                                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#6b21a8' }}>
                                                      {bundle.bundleRate.toLocaleString()}
                                                    </span>
                                                  </div>
                                                </div>

                                                {/* Items inside bundle */}
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.4rem', background: '#ffffff', borderRadius: '6px', padding: '0.5rem', border: '1px solid #e9d5ff' }}>
                                                  {bundledItems.map((item) => (
                                                    <div key={item.id} style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                      <span style={{ color: '#a855f7', fontWeight: 800 }}>•</span>
                                                      {item.chargeName}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* RENDER INDIVIDUAL CHARGE ITEMS */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {group.lineItems.map((item) => {
                                          const isInBundle = viewedCategoryQuote?.bundles?.some((b) => b.lineItemIds.includes(item.id));
                                          if (isInBundle && viewedCategoryQuote?.rateMode === 'grouped_sets') {
                                            return null;
                                          }

                                          const currentLineVal = isItemizedMode
                                            ? viewedCategoryQuote?.itemizedAmounts?.[item.id] ?? item.selectedRate ?? 0
                                            : item.selectedRate ?? 0;

                                          return (
                                            <div
                                              key={item.id}
                                              style={{
                                                background: '#ffffff',
                                                borderRadius: '6px',
                                                border: '1px solid #e2e8f0',
                                                padding: '0.65rem 0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                              }}
                                            >
                                              <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#1e293b' }}>
                                                  {item.chargeName}
                                                </div>
                                                <div style={{ fontSize: '0.725rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.1rem' }}>
                                                  {item.notes}
                                                </div>
                                              </div>

                                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Rate:</span>
                                                {isItemizedMode ? (
                                                  <div style={{ display: 'flex', alignItems: 'center', background: '#eff6ff', border: '1px solid #3b82f6', borderRadius: '6px', padding: '0.2rem 0.45rem' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', marginRight: '2px' }}>$</span>
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      value={currentLineVal}
                                                      onChange={(e) =>
                                                        handleUpdateLineItemRate(stage.id, group.categoryName, item.id, Math.max(0, Number(e.target.value) || 0))
                                                      }
                                                      style={{
                                                        width: '75px',
                                                        border: 'none',
                                                        background: 'transparent',
                                                        fontWeight: 800,
                                                        fontSize: '0.85rem',
                                                        color: '#0f172a',
                                                        outline: 'none',
                                                      }}
                                                    />
                                                  </div>
                                                ) : (
                                                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                                                    ${currentLineVal.toLocaleString()}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

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
          </div>
        );
      })()}

      {/* Add New Quote Modal */}
      {addingQuoteStageId && (() => {
        const targetStage = stages.find((s) => s.id === addingQuoteStageId);
        const activeQuote = targetStage?.quotes.find((q) => q.isSelected) || targetStage?.quotes[0];
        const targetCategoryGroup = activeQuote?.categoryGroups?.find((cg) => cg.categoryName === addingQuoteCategoryName);

        return (
          <div className="add-quote-modal-overlay">
            <div className="add-quote-modal-card animate-scale-up" style={{ maxWidth: '650px' }}>
              <div className="modal-title-row">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    Add New Quote {addingQuoteCategoryName ? `for ${addingQuoteCategoryName}` : ''}
                  </h3>
                  {addingQuoteCategoryName && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Pitch vendor rate at Category-level or combine individual line item charge rates.
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddingQuoteStageId(null);
                    setAddingQuoteCategoryName(null);
                  }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateQuote}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group-row">
                    <label className="form-group-label">Provider / Carrier Name *</label>
                    <input
                      type="text"
                      className="form-group-input"
                      placeholder="e.g. DHL Express / FastTrack Logistics"
                      value={newQuoteForm.providerName}
                      onChange={(e) => setNewQuoteForm({ ...newQuoteForm, providerName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-row">
                    <label className="form-group-label">Quote Currency *</label>
                    <select
                      className="form-group-input"
                      value={newQuoteForm.currency}
                      onChange={(e) => setNewQuoteForm({ ...newQuoteForm, currency: e.target.value as CurrencyType })}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                </div>

                {/* Rate Entry Mode Selector */}
                {addingQuoteCategoryName && targetCategoryGroup && (
                  <div className="form-group-row" style={{ marginTop: '0.5rem', marginBottom: '0.85rem' }}>
                    <label className="form-group-label" style={{ fontWeight: 800, color: '#1e293b' }}>
                      Rate Calculation Mode
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setNewQuoteForm({ ...newQuoteForm, rateMode: 'category_lump' })}
                        style={{
                          padding: '0.5rem 0.35rem',
                          borderRadius: '6px',
                          border: newQuoteForm.rateMode === 'category_lump' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          background: newQuoteForm.rateMode === 'category_lump' ? '#eff6ff' : '#f8fafc',
                          color: newQuoteForm.rateMode === 'category_lump' ? '#1e40af' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.725rem',
                          cursor: 'pointer',
                        }}
                      >
                        🏷️ Category Lump-Sum
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const currentAmounts = newQuoteForm.itemizedAmounts || {};
                          const sum = Object.values(currentAmounts).reduce((a, b) => a + b, 0);
                          setNewQuoteForm({
                            ...newQuoteForm,
                            rateMode: 'itemized_charge',
                            baseRate: sum > 0 ? String(sum) : newQuoteForm.baseRate,
                          });
                        }}
                        style={{
                          padding: '0.5rem 0.35rem',
                          borderRadius: '6px',
                          border: newQuoteForm.rateMode === 'itemized_charge' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                          background: newQuoteForm.rateMode === 'itemized_charge' ? '#f0fdf4' : '#f8fafc',
                          color: newQuoteForm.rateMode === 'itemized_charge' ? '#15803d' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.725rem',
                          cursor: 'pointer',
                        }}
                      >
                        📝 Individual Line Rates
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNewQuoteForm({
                            ...newQuoteForm,
                            rateMode: 'grouped_sets',
                          });
                        }}
                        style={{
                          padding: '0.5rem 0.35rem',
                          borderRadius: '6px',
                          border: newQuoteForm.rateMode === 'grouped_sets' ? '2px solid #9333ea' : '1px solid #cbd5e1',
                          background: newQuoteForm.rateMode === 'grouped_sets' ? '#faf5ff' : '#f8fafc',
                          color: newQuoteForm.rateMode === 'grouped_sets' ? '#7e22ce' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.725rem',
                          cursor: 'pointer',
                        }}
                      >
                        📦 Combined Sets (2 or 3)
                      </button>
                    </div>
                  </div>
                )}

                {/* MODE 1: INDIVIDUAL ITEM RATES */}
                {newQuoteForm.rateMode === 'itemized_charge' && targetCategoryGroup && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534' }}>
                        Individual Charge Item Rates for {addingQuoteCategoryName}:
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                        Fetched Base Rate: {getCurrencySymbol(newQuoteForm.currency)}{newQuoteForm.baseRate || 0}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                      {targetCategoryGroup.lineItems.map((li) => {
                        const val = newQuoteForm.itemizedAmounts[li.id] !== undefined ? newQuoteForm.itemizedAmounts[li.id] : (li.selectedRate || 0);
                        return (
                          <div key={li.id} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '0.5rem' }}>
                              {li.chargeName}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', border: '1px solid #94a3b8', borderRadius: '4px', padding: '0.1rem 0.3rem' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>{getCurrencySymbol(newQuoteForm.currency)}</span>
                              <input
                                type="number"
                                min="0"
                                value={val}
                                onChange={(e) => {
                                  const newNum = Math.max(0, Number(e.target.value) || 0);
                                  const updatedItemized = {
                                    ...newQuoteForm.itemizedAmounts,
                                    [li.id]: newNum,
                                  };
                                  const sum = Object.values(updatedItemized).reduce((a, b) => a + b, 0);
                                  setNewQuoteForm({
                                    ...newQuoteForm,
                                    itemizedAmounts: updatedItemized,
                                    baseRate: String(sum),
                                  });
                                }}
                                style={{ width: '60px', border: 'none', background: 'transparent', fontWeight: 800, fontSize: '0.8rem', outline: 'none' }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* MODE 2: COMBINED CHARGE SETS (SET OF 2 OR 3) */}
                {newQuoteForm.rateMode === 'grouped_sets' && targetCategoryGroup && (
                  <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6b21a8' }}>
                        Combine Charges into Sets (Group of 2, 3, etc.):
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#7e22ce', background: '#f3e8ff', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                        Fetched Base Rate: {getCurrencySymbol(newQuoteForm.currency)}{newQuoteForm.baseRate || 0}
                      </span>
                    </div>

                    {/* Existing Created Bundles */}
                    {newQuoteForm.bundles.length > 0 && (
                      <div style={{ marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {newQuoteForm.bundles.map((bundle) => (
                          <div key={bundle.groupId} style={{ background: '#ffffff', border: '1.5px solid #c084fc', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                              <span style={{ fontSize: '0.775rem', fontWeight: 800, color: '#6b21a8' }}>
                                📦 {bundle.groupName} ({bundle.lineItemIds.length} Items Bundle)
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', background: '#f3e8ff', border: '1px solid #a855f7', borderRadius: '4px', padding: '0.1rem 0.35rem' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7e22ce' }}>{getCurrencySymbol(newQuoteForm.currency)}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={bundle.bundleRate}
                                    onChange={(e) => {
                                      const newRate = Math.max(0, Number(e.target.value) || 0);
                                      const updatedBundles = newQuoteForm.bundles.map((b) =>
                                        b.groupId === bundle.groupId ? { ...b, bundleRate: newRate } : b
                                      );
                                      const sumBundles = updatedBundles.reduce((acc, curr) => acc + curr.bundleRate, 0);
                                      const bundledIds = updatedBundles.flatMap((b) => b.lineItemIds);
                                      const sumStandalone = targetCategoryGroup.lineItems
                                        .filter((li) => !bundledIds.includes(li.id))
                                        .reduce((acc, li) => acc + (newQuoteForm.itemizedAmounts[li.id] || li.selectedRate || 0), 0);
                                      setNewQuoteForm({
                                        ...newQuoteForm,
                                        bundles: updatedBundles,
                                        baseRate: String(sumBundles + sumStandalone),
                                      });
                                    }}
                                    style={{ width: '65px', border: 'none', background: 'transparent', fontWeight: 800, fontSize: '0.8rem', outline: 'none' }}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedBundles = newQuoteForm.bundles.filter((b) => b.groupId !== bundle.groupId);
                                    const sumBundles = updatedBundles.reduce((acc, curr) => acc + curr.bundleRate, 0);
                                    const bundledIds = updatedBundles.flatMap((b) => b.lineItemIds);
                                    const sumStandalone = targetCategoryGroup.lineItems
                                      .filter((li) => !bundledIds.includes(li.id))
                                      .reduce((acc, li) => acc + (newQuoteForm.itemizedAmounts[li.id] || li.selectedRate || 0), 0);
                                    setNewQuoteForm({
                                      ...newQuoteForm,
                                      bundles: updatedBundles,
                                      baseRate: String(sumBundles + sumStandalone),
                                    });
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}
                                >
                                  ✖ Remove Set
                                </button>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              Includes:{' '}
                              {bundle.lineItemIds
                                .map((id) => targetCategoryGroup.lineItems.find((li) => li.id === id)?.chargeName)
                                .filter(Boolean)
                                .join(' + ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Unbundled Line Items Checklist to Create New Sets */}
                    {(() => {
                      const bundledItemIds = newQuoteForm.bundles.flatMap((b) => b.lineItemIds);
                      const unbundledItems = targetCategoryGroup.lineItems.filter((li) => !bundledItemIds.includes(li.id));

                      return (
                        <div>
                          {unbundledItems.length > 0 ? (
                            <>
                              <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                                Select unbundled charges to combine into a set (Check 2 or 3 items below):
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', maxHeight: '140px', overflowY: 'auto', marginBottom: '0.5rem' }}>
                                {unbundledItems.map((li) => {
                                  const isChecked = selectedForBundle.includes(li.id);
                                  return (
                                    <label
                                      key={li.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        background: isChecked ? '#f3e8ff' : '#ffffff',
                                        border: isChecked ? '1px solid #a855f7' : '1px solid #cbd5e1',
                                        borderRadius: '4px',
                                        padding: '0.35rem 0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.725rem',
                                        fontWeight: 600,
                                        color: '#1e293b',
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedForBundle([...selectedForBundle, li.id]);
                                          } else {
                                            setSelectedForBundle(selectedForBundle.filter((id) => id !== li.id));
                                          }
                                        }}
                                      />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {li.chargeName}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                              {selectedForBundle.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const setNum = newQuoteForm.bundles.length + 1;
                                    const defaultSetRate = selectedForBundle.reduce((acc, id) => {
                                      const item = targetCategoryGroup.lineItems.find((li) => li.id === id);
                                      return acc + (item?.selectedRate || 100);
                                    }, 0);

                                    const newBundle: ChargeItemGroupBundle = {
                                      groupId: `bundle-${Date.now()}`,
                                      groupName: `Group Set #${setNum} (Set of ${selectedForBundle.length})`,
                                      lineItemIds: [...selectedForBundle],
                                      bundleRate: defaultSetRate,
                                    };

                                    const updatedBundles = [...newQuoteForm.bundles, newBundle];
                                    const sumBundles = updatedBundles.reduce((acc, curr) => acc + curr.bundleRate, 0);
                                    const bundledIds = updatedBundles.flatMap((b) => b.lineItemIds);
                                    const sumStandalone = targetCategoryGroup.lineItems
                                      .filter((li) => !bundledIds.includes(li.id))
                                      .reduce((acc, li) => acc + (newQuoteForm.itemizedAmounts[li.id] || li.selectedRate || 0), 0);

                                    setNewQuoteForm({
                                      ...newQuoteForm,
                                      bundles: updatedBundles,
                                      baseRate: String(sumBundles + sumStandalone),
                                    });
                                    setSelectedForBundle([]);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.4rem',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: '#9333ea',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                  }}
                                >
                                  + Combine {selectedForBundle.length} Selected Charges into a Set (Bundled Package)
                                </button>
                              )}
                            </>
                          ) : (
                            <div style={{ fontSize: '0.725rem', color: '#16a34a', fontWeight: 700 }}>
                              ✓ All charge items in this category have been grouped into sets!
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* MODE 3: CATEGORY LUMP-SUM BASE RATE */}
                {newQuoteForm.rateMode === 'category_lump' && (
                  <div className="form-group-row">
                    <label className="form-group-label">
                      Category Base Rate Amount ({getCurrencySymbol(newQuoteForm.currency)} {newQuoteForm.currency}) *
                    </label>
                    <input
                      type="number"
                      className="form-group-input"
                      placeholder="e.g. 575"
                      value={newQuoteForm.baseRate}
                      onChange={(e) => setNewQuoteForm({ ...newQuoteForm, baseRate: e.target.value })}
                      required
                    />
                  </div>
                )}



                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group-row">
                    <label className="form-group-label">Estimated Transit Time</label>
                    <input
                      type="text"
                      className="form-group-input"
                      placeholder="e.g. 1-2 Days"
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
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      setAddingQuoteStageId(null);
                      setAddingQuoteCategoryName(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" leftIcon={<Plus size={16} />}>
                    Save & Add Vendor Rate
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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