import React from 'react';
import type { RFQFormData } from '../../types/rfq';
import { FormSelect } from '../form/FormSelect';
import { FormTextarea } from '../form/FormTextarea';
import { Shield, Building2, ShieldCheck, ShieldAlert, AlertTriangle, MessageSquare } from 'lucide-react';

interface Step3Props {
  formData: RFQFormData;
  errors: Record<string, string>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSetFieldValue: (field: keyof RFQFormData, value: any) => void;
}

export const Step3ContainerLoadConfig: React.FC<Step3Props> = ({
  formData,
  errors,
  onChange,
  onSetFieldValue,
}) => {
  const isInsuranceMandatory = ['CIF', 'CIP'].includes(formData.incoterm);

  return (
    <div className="step-container animate-fade-in">
      {/* 1. Marine Cargo Insurance Protection Card */}
      <div className="section-card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} className="text-indigo" /> 1. Cargo Insurance & Transit Protection
          </span>
          {isInsuranceMandatory && (
            <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
              Mandatory by Incoterm {formData.incoterm}
            </span>
          )}
        </h3>

        {/* Primary Selection: Include Insurance vs Decline Insurance */}
        <div className="grid-2col" style={{ gap: '1rem', marginBottom: '0.75rem' }}>
          {/* Choice 1: Yes, Include Insurance */}
          <div
            onClick={() => {
              if (!isInsuranceMandatory) {
                onSetFieldValue('insurance_required', true);
                if (!formData.insurance_provider_type) {
                  onSetFieldValue('insurance_provider_type', 'thisai');
                }
              }
            }}
            style={{
              padding: '1.1rem 1.25rem',
              borderRadius: '12px',
              border: formData.insurance_required ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
              background: formData.insurance_required ? '#f0f6ff' : '#ffffff',
              cursor: isInsuranceMandatory ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
            }}
          >
            <input
              type="radio"
              name="insurance_required_option"
              checked={formData.insurance_required}
              disabled={isInsuranceMandatory}
              onChange={() => {}}
              style={{ marginTop: '0.2rem', width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '0.925rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldCheck size={18} style={{ color: '#2563eb' }} /> Yes, Include Cargo Insurance
                </strong>
                {formData.insurance_required && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d4ed8' }}>
                    {formData.currency} {formData.cargo_value ? formData.cargo_value.toLocaleString() : 0} Protected
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
                Full coverage for loss, damage, or theft during marine & inland transit.
              </span>
            </div>
          </div>

          {/* Choice 2: No, Decline Insurance */}
          <div
            onClick={() => {
              if (!isInsuranceMandatory) {
                onSetFieldValue('insurance_required', false);
              }
            }}
            style={{
              padding: '1.1rem 1.25rem',
              borderRadius: '12px',
              border: !formData.insurance_required ? '2px solid #dc2626' : '1.5px solid #cbd5e1',
              background: !formData.insurance_required ? '#fff5f5' : '#ffffff',
              cursor: isInsuranceMandatory ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
            }}
          >
            <input
              type="radio"
              name="insurance_required_option"
              checked={!formData.insurance_required}
              disabled={isInsuranceMandatory}
              onChange={() => {}}
              style={{ marginTop: '0.2rem', width: '18px', height: '18px', accentColor: '#dc2626', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '0.925rem', color: !formData.insurance_required ? '#991b1b' : '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <AlertTriangle size={18} style={{ color: '#dc2626' }} /> No, Decline Cargo Insurance
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
                Customer assumes full responsibility for any transit loss or damage.
              </span>
            </div>
          </div>
        </div>

        {/* IF YES: Show Responsibility Sub-Options */}
        {formData.insurance_required ? (
          <div style={{ background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1.15rem', marginTop: '0.75rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} className="text-indigo" /> Who will arrange & take care of the insurance coverage?
            </h4>

            <div className="grid-2col" style={{ gap: '0.85rem', marginBottom: '0.85rem' }}>
              {/* Option A: Thisai Cargo Takes Care */}
              <div
                onClick={() => onSetFieldValue('insurance_provider_type', 'thisai')}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: formData.insurance_provider_type === 'thisai' || !formData.insurance_provider_type ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: formData.insurance_provider_type === 'thisai' || !formData.insurance_provider_type ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                    Thisai Cargo Takes Care (Recommended)
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                    Complete Protection
                  </span>
                </div>
                <span style={{ fontSize: '0.775rem', color: '#475569', display: 'block' }}>
                  Thisai Cargo arranges end-to-end policy coverage & full claim settlement support.
                </span>
              </div>

              {/* Option B: Customer Takes Responsibility */}
              <div
                onClick={() => onSetFieldValue('insurance_provider_type', 'customer_external')}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: formData.insurance_provider_type === 'customer_external' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: formData.insurance_provider_type === 'customer_external' ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                    Customer / External Policy
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                    Self-Arranged
                  </span>
                </div>
                <span style={{ fontSize: '0.775rem', color: '#475569', display: 'block' }}>
                  Customer takes full responsibility to arrange external marine insurance policy.
                </span>
              </div>
            </div>

            {/* If Customer / External Policy: Show Instruction Text Field */}
            {formData.insurance_provider_type === 'customer_external' && (
              <div style={{ marginTop: '0.75rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <FormTextarea
                  label="Customer Insurance Instructions & Policy Details (Optional)"
                  name="insurance_instructions"
                  placeholder="Pass any policy number, external insurer contact details, or special policy instructions..."
                  value={formData.insurance_instructions || ''}
                  onChange={onChange}
                  rows={2}
                />
              </div>
            )}
          </div>
        ) : (
          /* IF NO: Show Warning Note & Liability Disclaimer Box */
          <div
            style={{
              padding: '1rem 1.15rem',
              borderRadius: '12px',
              border: '1px solid #fca5a5',
              background: '#fef2f2',
              marginTop: '0.75rem',
              display: 'flex',
              gap: '0.85rem',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.55rem', borderRadius: '10px', display: 'flex' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <strong style={{ fontSize: '0.875rem', color: '#991b1b', display: 'block', marginBottom: '0.25rem' }}>
                ⚠️ Transit Risk Warning & Liability Disclaimer Notice
              </strong>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#7f1d1d', lineHeight: '1.4' }}>
                By choosing not to include cargo insurance, you explicitly confirm that <strong>any product damage, total loss, theft, ocean peril, or transit accident is solely at the customer's responsibility</strong>.
                <strong> Thisai Cargo and carrier lines shall NOT be responsible or liable for any cause, loss, or damages incurred during shipment.</strong>
              </p>
            </div>
          </div>
        )}

        {errors.insurance_required && <div className="field-error-text" style={{ marginTop: '0.5rem' }}>{errors.insurance_required}</div>}
      </div>

      {/* 2. Customs Clearance & Assigned Brokers */}
      <div className="section-card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={20} className="text-indigo" /> 2. Customs Clearances & Assigned Brokers
        </h3>

        <div className="grid-2col" style={{ gap: '1rem' }}>
          {/* Origin Customs Broker Card */}
          <div
            style={{
              padding: '1.15rem',
              borderRadius: '12px',
              border: formData.origin_customs_clearance ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
              background: formData.origin_customs_clearance ? '#f0f6ff' : '#ffffff',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                <input
                  type="checkbox"
                  checked={formData.origin_customs_clearance}
                  onChange={(e) => onSetFieldValue('origin_customs_clearance', e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
                />
                Origin Customs Clearance Required
              </label>
              {formData.origin_customs_clearance && (
                <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                  Active Coverage
                </span>
              )}
            </div>

            {formData.origin_customs_clearance && (
              <FormSelect
                label="Assigned Origin Customs Broker *"
                name="origin_customs_broker"
                value={formData.origin_customs_broker}
                onChange={onChange}
                options={[
                  { value: 'Thisai Customs Broker', label: 'Thisai Customs Broker (Recommended - Fast Track)' },
                  { value: 'Customer Broker', label: "Hari - Customer's Customs Broker" },
                  { value: 'Customer Broker', label: "Kavitha - Customer's Customs Broker" },
                ]}
                error={errors.origin_customs_broker}
              />
            )}
          </div>

          {/* Destination Customs Broker Card */}
          <div
            style={{
              padding: '1.15rem',
              borderRadius: '12px',
              border: formData.destination_customs_clearance ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
              background: formData.destination_customs_clearance ? '#f0f6ff' : '#ffffff',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                <input
                  type="checkbox"
                  checked={formData.destination_customs_clearance}
                  onChange={(e) => onSetFieldValue('destination_customs_clearance', e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
                />
                Destination Customs Clearance Required
              </label>
              {formData.destination_customs_clearance && (
                <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                  Active Coverage
                </span>
              )}
            </div>

            {formData.destination_customs_clearance && (
              <FormSelect
                label="Assigned Destination Customs Broker *"
                name="destination_customs_broker"
                value={formData.destination_customs_broker}
                onChange={onChange}
                options={[
                  { value: 'Thisai Customs Broker', label: 'Thisai Customs Broker (Recommended - Fast Track)' },
                  { value: 'Customer Broker', label: "Diana - Customer's Customs Broker" },
                  { value: 'Customer Broker', label: "Sham - Customer's Customs Broker" },
                ]}
                error={errors.destination_customs_broker}
              />
            )}
          </div>
        </div>
      </div>

      {/* 3. Special Instructions & Operations (Moved from Step 4) */}
      <div className="section-card">
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={20} className="text-indigo" /> 3. Special Instructions & Operations (Optional)
        </h3>

        <FormTextarea
          label="Operational / Customs / Carrier Instructions"
          name="other_special_instructions"
          placeholder="Provide any additional operational guidelines, warehouse access constraints, or carrier instructions..."
          value={formData.other_special_instructions}
          onChange={onChange}
          rows={3}
          error={errors.other_special_instructions}
        />
      </div>
    </div>
  );
};
