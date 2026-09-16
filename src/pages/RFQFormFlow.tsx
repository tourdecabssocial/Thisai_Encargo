import React, { useState } from 'react';
import { useRFQForm, mockAddresses } from '../hooks/useRFQForm';
import { ShipmentFlowVisualizer } from '../components/rfq/ShipmentFlowVisualizer';
import { Step1RouteScope } from '../components/rfq/Step1RouteScope';
import { Step2CargoPackages } from '../components/rfq/Step2CargoPackages';
import { Step3ContainerLoadConfig } from '../components/rfq/Step3ContainerLoadConfig';
import { RFQSummarySidebar } from '../components/rfq/RFQSummarySidebar';
import { ShipmentLifecycleRouteCard } from '../components/rfq/ShipmentLifecycleRouteCard';
import { RFQSubmissionReport } from '../components/rfq/RFQSubmissionReport';
import { Button } from '../components/ui/Button';
import { parseShipmentDescriptionWithAI } from '../services/aiDescriptionParserService';
import { ArrowLeft, ArrowRight, Send, Layers, Check, Sparkles, ClipboardList, FileText, RotateCcw } from 'lucide-react';
import './RFQFormFlow.css';

export const RFQFormFlow: React.FC = () => {
  const {
    formData,
    entryMode,
    selectEntryMode,
    aiExtractionBanner,
    setAiExtractionBanner,
    applyAIExtractedFields,
    activeStep,
    errors,
    isSubmitting,
    isSubmitted,
    submittedRecord,
    totalVolumeCbm,
    totalGrossWeightKg,
    volumetricWeight,
    hasDocumentsAttached,
    itemReconciliation,
    handleChange,
    setFieldValue,
    nextStep,
    prevStep,
    handleGoToStep,
    handleSubmit,
    resetForm,
  } = useRFQForm();

  const [descriptionInput, setDescriptionInput] = useState<string>(
    'Hi, i want to transport 15 box of carrots from Chennai, India to Simivally, US, which the boxs are 90*20*100 h*w*l respectively. Want FCL only with 20ft Reefer container, DDP incoterm, need insurance coverage and customs clearance.'
  );
  const [isParsingAI, setIsParsingAI] = useState<boolean>(false);

  const handleRunAIExtraction = async () => {
    if (!descriptionInput.trim()) return;
    setIsParsingAI(true);
    try {
      const result = await parseShipmentDescriptionWithAI(descriptionInput);
      applyAIExtractedFields(result.extractedFields, result.summaryText);
    } catch (err) {
      console.error('Failed to parse AI description:', err);
    } finally {
      setIsParsingAI(false);
    }
  };

  if (isSubmitted && submittedRecord) {
    return <RFQSubmissionReport record={submittedRecord} onReset={resetForm} />;
  }

  // Dynamic Selected Address & Port Labels Resolution for Flow Diagrams & Cards
  const getAddressLabel = (addrObj: any, addrId?: string) => {
    if (addrObj) {
      if (typeof addrObj === 'string') return addrObj;
      if (addrObj.label) return addrObj.label;
      if (addrObj.city) return `${addrObj.city}, ${addrObj.countryCode || addrObj.country || ''}`;
    }
    if (addrId) {
      const found = mockAddresses.find((a) => a.id === addrId);
      if (found) return `${found.label} (${found.city})`;
    }
    return '';
  };

  const fromAddrLabel = getAddressLabel(formData.from_address, formData.from_address_id) || 'Origin Address';
  const toAddrLabel = getAddressLabel(formData.to_address, formData.to_address_id) || 'Destination Address';
  const originPortLabel =
    formData.origin_port_name ||
    formData.from_port_name ||
    (formData.from_port_code ? `${formData.from_port_code} Port` : 'Origin Port');
  const destPortLabel =
    formData.destination_port_name ||
    formData.to_port_name ||
    (formData.to_port_code ? `${formData.to_port_code} Port` : 'Destination Port');

  return (
    <div className="rfq-flow-page animate-fade-in">
      <div className="rfq-flow-header">
        <div className="rfq-title-group">
          <div className="rfq-title-row">
            <h1 className="rfq-main-title">Request For Quote (RFQ) Form</h1>
            <div className="rfq-badge">
              <Layers size={13} /> Smart Freight Engine
            </div>
          </div>
          <p className="rfq-subtitle">
            Configure transport mode, service scope, commodity specs, Incoterms, and customs options.
          </p>
        </div>
      </div>

      {/* End-to-End Visual Shipment Flow Diagram (Adapts to Transport Mode & Scope) */}
      <div className="rfq-flow-visualizer-sticky-wrapper">
        <ShipmentFlowVisualizer
          mode={formData.mode}
          serviceScope={formData.service_scope}
          fromAddress={fromAddrLabel}
          toAddress={toAddrLabel}
          originName={originPortLabel}
          destName={destPortLabel}
          currentStep={activeStep}
        />
      </div>

      {/* Main Flow Layout: Left Route Planner + Form Wizard + Right Live Summary */}
      <div className="rfq-flow-grid">
        {/* Left Sidebar Pane: AI Shipment Route & Stage Documentation Map */}
        <aside className="rfq-left-pane">
          <ShipmentLifecycleRouteCard
            input={{
              transportMode: formData.mode === 'Air' ? 'Air' : 'Ship',
              serviceType:
                formData.service_scope === 'D2D'
                  ? 'Door-to-Door'
                  : formData.service_scope === 'P2P'
                  ? 'Port-to-Port'
                  : formData.service_scope === 'D2P'
                  ? 'Door-to-Port'
                  : 'Port-to-Door',
              originPortOrCity: fromAddrLabel || originPortLabel,
              destinationPortOrCity: toAddrLabel || destPortLabel,
              isHazmat: Boolean(formData.hazardous_materials),
              isReefer: Boolean(formData.temperature_control_required),
              incoterm: formData.incoterm || 'DDP',
              hsCode: formData.hs_code || (formData as any).hsCode || '',
            }}
          />
        </aside>

        <form onSubmit={(e) => e.preventDefault()} noValidate className="rfq-form-card">
          {entryMode === 'selection' ? (
            <>
              <div className="rfq-card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <h2 className="step-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={20} style={{ color: '#2563eb' }} /> Select Form Filling Preference
                  </h2>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', background: '#dbeafe', padding: '0.2rem 0.65rem', borderRadius: '6px' }}>
                    Entry Mode
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748b' }}>
                  Choose how you would like to complete your Request For Quote (RFQ).
                </p>
              </div>

              <div className="rfq-card-body" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                  {/* Option 1: Regular Interactive Form Filling */}
                  <div
                    onClick={() => selectEntryMode('regular')}
                    className="mode-selection-card"
                    style={{
                      padding: '1.5rem',
                      borderRadius: '14px',
                      border: '2px solid #2563eb',
                      background: 'linear-gradient(180deg, #f0f6ff 0%, #ffffff 100%)',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.65rem', borderRadius: '12px', display: 'flex' }}>
                          <ClipboardList size={26} />
                        </div>
                        <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#1d4ed8', background: '#e0e7ff', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                          Standard Flow
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
                        Regular Form Filling
                      </h3>
                      <p style={{ fontSize: '0.825rem', color: '#475569', lineHeight: '1.45', margin: '0 0 1rem 0' }}>
                        Fill out origin, destination, cargo metrics, Incoterms, customs, and specs step-by-step.
                      </p>

                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <li style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Check size={14} style={{ color: '#16a34a' }} /> 3-step structured interactive form wizard
                        </li>
                        <li style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Check size={14} style={{ color: '#16a34a' }} /> Live address & port auto-complete engine
                        </li>
                        <li style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Check size={14} style={{ color: '#16a34a' }} /> Real-time volumetric weight & route calculations
                        </li>
                      </ul>
                    </div>

                    <Button variant="primary" style={{ width: '100%', justifyContent: 'center' }}>
                      Start Regular Form <ArrowRight size={16} />
                    </Button>
                  </div>

                  {/* Option 2: AI Auto-Fill with Description */}
                  <div
                    onClick={() => selectEntryMode('ai_autofill')}
                    className="mode-selection-card"
                    style={{
                      padding: '1.5rem',
                      borderRadius: '14px',
                      border: '2px solid #a855f7',
                      background: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      boxShadow: '0 4px 14px rgba(168, 85, 247, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ background: '#f3e8ff', color: '#9333ea', padding: '0.65rem', borderRadius: '12px', display: 'flex' }}>
                          <Sparkles size={26} />
                        </div>
                        <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#9333ea', background: '#f3e8ff', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                          ✨ AI Auto-Fill
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
                        Auto Form Fill with Description
                      </h3>
                      <p style={{ fontSize: '0.825rem', color: '#475569', lineHeight: '1.45', margin: '0 0 1rem 0' }}>
                        Paste raw shipment notes or cargo descriptions to automatically populate form inputs.
                      </p>

                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <li style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Sparkles size={14} style={{ color: '#9333ea' }} /> Natural language description parsing
                        </li>
                        <li style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Sparkles size={14} style={{ color: '#9333ea' }} /> Automatic HS tariff & UN Hazmat detection
                        </li>
                        <li style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Sparkles size={14} style={{ color: '#9333ea' }} /> Instant container & package auto-extraction
                        </li>
                      </ul>
                    </div>

                    <Button variant="outline" style={{ width: '100%', justifyContent: 'center', borderColor: '#a855f7', color: '#9333ea' }}>
                      Use AI Auto-Fill <Sparkles size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : entryMode === 'ai_autofill' ? (
            <>
              <div className="rfq-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ background: '#f3e8ff', color: '#9333ea', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
                    <Sparkles size={18} />
                  </div>
                  <h2 className="step-title" style={{ margin: 0 }}>
                    AI Smart Description Auto-Fill
                  </h2>
                </div>
                <Button variant="outline" onClick={() => selectEntryMode('selection')} style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                  ← Change Mode
                </Button>
              </div>

              <div className="rfq-card-body" style={{ padding: '1.5rem' }}>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
                  Type or paste your raw shipment requirements (e.g. package quantity, dimensions, commodity, origin & destination). Our AI model will automatically extract fields and pre-populate your RFQ form.
                </p>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                    Shipment Requirement Description:
                  </label>
                  <textarea
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    rows={4}
                    placeholder="e.g. Hi, i want to transport 15 box of carrots from Chennai, India to Simivally, US, which the boxs are 90*20*100 h*w*l respectively..."
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: '10px',
                      border: '1.5px solid #c084fc',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      outline: 'none',
                      background: '#faf5ff',
                      color: '#1e293b',
                      lineHeight: '1.5',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                    }}
                  />
                </div>

                {/* Preset Example Chips */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>
                    💡 Quick Test Preset Prompts:
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() =>
                        setDescriptionInput(
                          'Hi, i want to transport 15 box of carrots from Chennai, India to Simivally, US, which the boxs are 90*20*100 h*w*l respectively. Want FCL only with 20ft Reefer container, DDP incoterm, need insurance coverage and customs clearance.'
                        )
                      }
                      style={{
                        fontSize: '0.725rem',
                        background: '#f3e8ff',
                        color: '#7e22ce',
                        border: '1px solid #d8b4fe',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      🥕 15 Boxes Carrots (FCL 20ft Reefer, Chennai → US, DDP + Insured)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDescriptionInput(
                          'Need to ship 20 wooden pallets of apparel textiles from Hamburg, Germany to New York, US. Package size 120x80x160 cm, gross weight 250kg per pallet. FOB incoterm, cargo value $50,000, need customs clearance.'
                        )
                      }
                      style={{
                        fontSize: '0.725rem',
                        background: '#f3e8ff',
                        color: '#7e22ce',
                        border: '1px solid #d8b4fe',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      👕 20 Pallets Apparel (Hamburg → NY, 120x80x160cm, FOB + $50k)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDescriptionInput(
                          'Air freight express request for 5 crates of electronic sensors from Tokyo, Japan to Chennai, India. Dimensions 40x30x25 cm, 15kg each, CIF incoterm, cargo value $12,500, need full insurance.'
                        )
                      }
                      style={{
                        fontSize: '0.725rem',
                        background: '#f3e8ff',
                        color: '#7e22ce',
                        border: '1px solid #d8b4fe',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      ✈️ Air Freight 5 Crates Sensors (Tokyo → Chennai, CIF + Insured)
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <Button variant="outline" onClick={() => selectEntryMode('selection')}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleRunAIExtraction}
                    isLoading={isParsingAI}
                    style={{ background: 'linear-gradient(135deg, #9333ea 0%, #6366f1 100%)', border: 'none' }}
                    leftIcon={<Sparkles size={18} />}
                  >
                    Extract & Auto-Fill Form ✨
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rfq-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 className="step-title">
                    {activeStep === 1 && 'Step 1: Transport Mode, Scope, Incoterms & Route'}
                    {activeStep === 2 && 'Step 2: Commodity, Load & Container Specs'}
                    {activeStep === 3 && 'Step 3: Insurance, Customs Brokers & Special Instructions'}
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => selectEntryMode('selection')}
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      color: '#475569',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                    title="Change form entry mode"
                  >
                    <RotateCcw size={12} /> Switch Mode
                  </button>

                  {/* Compact 1 -> 2 -> 3 Inline Step Flow */}
                  <div className="tiny-step-flow">
                    {[1, 2, 3].map((stepNum, idx) => {
                      const isCompleted = activeStep > stepNum;
                      const isActive = activeStep === stepNum;

                      return (
                        <React.Fragment key={stepNum}>
                          <button
                            type="button"
                            className={`tiny-step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                            onClick={() => handleGoToStep(stepNum)}
                            title={`Go to Step ${stepNum}`}
                          >
                            {isCompleted ? <Check size={12} /> : stepNum}
                          </button>
                          {idx < 2 && <span className="tiny-step-arrow">→</span>}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rfq-card-body">
                {aiExtractionBanner && (
                  <div
                    style={{
                      background: 'linear-gradient(90deg, #f3e8ff 0%, #e0e7ff 100%)',
                      border: '1.5px solid #c084fc',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Sparkles size={20} style={{ color: '#9333ea' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#581c87' }}>
                        ✨ {aiExtractionBanner} Review and adjust any values below.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiExtractionBanner(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#7e22ce',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      Dismiss ✕
                    </button>
                  </div>
                )}

                {activeStep === 1 && (
                  <Step1RouteScope
                    formData={formData}
                    errors={errors}
                    onChange={handleChange}
                    onSetFieldValue={setFieldValue}
                  />
                )}

                {activeStep === 2 && (
                  <Step2CargoPackages
                    formData={formData}
                    errors={errors}
                    hasDocumentsAttached={hasDocumentsAttached}
                    itemReconciliation={itemReconciliation}
                    onSetFieldValue={setFieldValue}
                  />
                )}

                {activeStep === 3 && (
                  <Step3ContainerLoadConfig
                    formData={formData}
                    errors={errors}
                    onChange={handleChange}
                    onSetFieldValue={setFieldValue}
                  />
                )}
              </div>

              <div className="rfq-card-footer">
                {activeStep > 1 ? (
                  <Button type="button" variant="secondary" onClick={prevStep} leftIcon={<ArrowLeft size={18} />}>
                    Previous Step
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={() => selectEntryMode('selection')} leftIcon={<ArrowLeft size={18} />}>
                    Change Mode
                  </Button>
                )}

                {activeStep < 3 ? (
                  <Button type="button" variant="primary" onClick={nextStep} rightIcon={<ArrowRight size={18} />}>
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSubmit}
                    isLoading={isSubmitting}
                    leftIcon={<Send size={18} />}
                  >
                    Submit RFQ Request
                  </Button>
                )}
              </div>
            </>
          )}
        </form>

        {/* Right Sticky Sidebar Pane: Live RFQ Summary */}
        <aside className="rfq-right-pane">
          <RFQSummarySidebar
            formData={formData}
            totalVolumeCbm={totalVolumeCbm}
            totalGrossWeightKg={totalGrossWeightKg}
            volumetricWeight={volumetricWeight}
          />
        </aside>
      </div>
    </div>
  );
};
