import React from 'react';
import { useRFQForm, mockAddresses } from '../hooks/useRFQForm';
import { StepIndicator } from '../components/form/StepIndicator';
import { ShipmentFlowVisualizer } from '../components/rfq/ShipmentFlowVisualizer';
import { Step1RouteScope } from '../components/rfq/Step1RouteScope';
import { Step2CargoPackages } from '../components/rfq/Step2CargoPackages';
import { Step3ContainerLoadConfig } from '../components/rfq/Step3ContainerLoadConfig';
import { RFQSummarySidebar } from '../components/rfq/RFQSummarySidebar';
import { ShipmentLifecycleRouteCard } from '../components/rfq/ShipmentLifecycleRouteCard';
import { RFQSubmissionReport } from '../components/rfq/RFQSubmissionReport';
import { Button } from '../components/ui/Button';
import { ArrowLeft, ArrowRight, Send, Layers } from 'lucide-react';
import './RFQFormFlow.css';

export const RFQFormFlow: React.FC = () => {
  const {
    formData,
    activeStep,
    setActiveStep,
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
    handleSubmit,
    resetForm,
  } = useRFQForm();

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

      {/* Step Indicator */}
      <StepIndicator currentStep={activeStep} onStepClick={(step) => setActiveStep(step)} />

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
          <div className="rfq-card-header">
            <h2 className="step-title">
              {activeStep === 1 && 'Step 1: Transport Mode, Scope, Incoterms & Route'}
              {activeStep === 2 && 'Step 2: Commodity, Load & Container Specs'}
              {activeStep === 3 && 'Step 3: Insurance, Customs Brokers & Special Instructions'}
            </h2>
            <span className="step-count">Step {activeStep} of 3</span>
          </div>

          <div className="rfq-card-body">
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
              <div />
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
