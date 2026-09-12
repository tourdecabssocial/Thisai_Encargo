import React from 'react';
import type { RFQFormData } from '../../types/rfq';
import { FormSelect } from '../form/FormSelect';
import { Shield, Building2, ShieldCheck, TreePine } from 'lucide-react';

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
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={20} className="text-indigo" /> 1. Cargo Insurance & Transit Protection
        </h3>

        <div
          onClick={() => {
            if (!isInsuranceMandatory) {
              onSetFieldValue('insurance_required', !formData.insurance_required);
            }
          }}
          style={{
            padding: '1.15rem 1.25rem',
            borderRadius: '12px',
            border: (formData.insurance_required || isInsuranceMandatory) ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
            background: (formData.insurance_required || isInsuranceMandatory) ? '#f0f6ff' : '#ffffff',
            cursor: isInsuranceMandatory ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ background: (formData.insurance_required || isInsuranceMandatory) ? '#dbeafe' : '#f1f5f9', color: (formData.insurance_required || isInsuranceMandatory) ? '#1d4ed8' : '#64748b', padding: '0.65rem', borderRadius: '10px', display: 'flex' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', display: 'block', color: '#1e293b' }}>
                Include Comprehensive Marine & Transit Insurance
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Covers loss, damage, or theft during door-to-door transit
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: (formData.insurance_required || isInsuranceMandatory) ? '#1d4ed8' : '#64748b' }}>
              {formData.currency} {formData.cargo_value ? formData.cargo_value.toLocaleString() : 0} Value Protected
            </span>
            <input
              type="checkbox"
              checked={formData.insurance_required || isInsuranceMandatory}
              disabled={isInsuranceMandatory}
              onChange={() => {}}
              style={{ width: '20px', height: '20px', accentColor: '#2563eb', cursor: 'pointer' }}
            />
          </div>
        </div>
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
                  { value: 'Customer Broker', label: 'Customer / External Customs Broker' },
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
                  { value: 'Customer Broker', label: 'Customer / External Customs Broker' },
                ]}
                error={errors.destination_customs_broker}
              />
            )}
          </div>
        </div>
      </div>

      {/* 3. Wood Packaging Material & Compliance (Swapped from Step 4) */}
      <div className="section-card">
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TreePine size={20} className="text-emerald" style={{ color: '#059669' }} /> 3. Wood Packaging Material & Compliance
        </h3>

        <div
          style={{
            padding: '1.15rem',
            borderRadius: '12px',
            border: formData.has_wood_packaging ? '2px solid #059669' : '1.5px solid #cbd5e1',
            background: formData.has_wood_packaging ? '#ecfdf5' : '#ffffff',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
              <input
                type="checkbox"
                id="wood-pkg"
                checked={formData.has_wood_packaging}
                onChange={(e) => onSetFieldValue('has_wood_packaging', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#059669', cursor: 'pointer' }}
              />
              <TreePine size={18} style={{ color: '#059669' }} /> Wood Packaging Material
            </label>
            {formData.has_wood_packaging && (
              <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#047857', background: '#d1fae5', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                ISPM-15 Required
              </span>
            )}
          </div>

          {formData.has_wood_packaging && (
            <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600, marginTop: '0.4rem' }}>
              ✓ ISPM-15 Heat Treatment / Fumigation Stamp Certification Required for International Import/Export.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
