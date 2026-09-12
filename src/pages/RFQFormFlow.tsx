import React from 'react';
import { useRFQForm } from '../hooks/useRFQForm';
import { StepIndicator } from '../components/form/StepIndicator';
import { ShipmentFlowVisualizer } from '../components/rfq/ShipmentFlowVisualizer';
import { Step1RouteScope } from '../components/rfq/Step1RouteScope';
import { Step2CargoPackages } from '../components/rfq/Step2CargoPackages';
import { Step3ContainerLoadConfig } from '../components/rfq/Step3ContainerLoadConfig';
import { Step4ServicesOptions } from '../components/rfq/Step4ServicesOptions';
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

  return (
    <div className="rfq-flow-page animate-fade-in">
      <div className="rfq-flow-header">
        <div className="rfq-title-group">
          <div className="rfq-badge">
            <Layers size={14} /> Smart Freight Engine
          </div>
          <h1 className="rfq-main-title">Request For Quote (RFQ) Form</h1>
          <p className="rfq-subtitle">
            Configure transport mode, service scope, commodity specs, Incoterms, and customs options.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={activeStep} onStepClick={(step) => setActiveStep(step)} />

      {/* End-to-End Visual Shipment Flow Diagram (Adapts to Transport Mode & Scope) */}
      <ShipmentFlowVisualizer
        mode={formData.mode}
        serviceScope={formData.service_scope}
        originName={formData.origin_port_name || formData.from_port_name}
        destName={formData.destination_port_name || formData.to_port_name}
        currentStep={activeStep}
      />

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
              originPortOrCity: formData.origin_port_name || formData.from_port_name || 'Origin Location',
              destinationPortOrCity: formData.destination_port_name || formData.to_port_name || 'Destination Location',
              isHazmat: Boolean(formData.hazardous_materials),
              isReefer: Boolean(formData.temperature_control_required),
              incoterm: formData.incoterm || 'DDP',
            }}
          />
        </aside>

        <form onSubmit={(e) => e.preventDefault()} noValidate className="rfq-form-card">
          <div className="rfq-card-header">
            <h2 className="step-title">
              {activeStep === 1 && 'Step 1: Transport Mode, Scope, Incoterms & Route'}
              {activeStep === 2 && 'Step 2: Commodity, Load & Container Specs'}
              {activeStep === 3 && 'Step 3: Insurance, Customs Brokers & Wood Packaging'}
              {activeStep === 4 && 'Step 4: Industrial Crating & Special Instructions'}
            </h2>
            <span className="step-count">Step {activeStep} of 4</span>
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

            {activeStep === 4 && (
              <Step4ServicesOptions
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

            {activeStep < 4 ? (
              <Button type="button" variant="primary" onClick={nextStep} rightIcon={<ArrowRight size={18} />}>
                Next Step
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                rightIcon={<Send size={18} />}
              >
                Submit Request for Quote
              </Button>
            )}
          </div>
        </form>

        {/* Live Calculation Sidebar */}
        <aside className="rfq-sidebar-pane">
          <RFQSummarySidebar
            formData={formData}
            totalVolumeCbm={totalVolumeCbm}
            totalGrossWeightKg={totalGrossWeightKg}
            volumetricWeight={volumetricWeight}
            hasDocumentsAttached={hasDocumentsAttached}
            itemReconciliationPassed={itemReconciliation.passed}
          />
        </aside>
      </div>
    </div>
  );
};
