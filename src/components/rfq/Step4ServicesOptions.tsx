import React from 'react';
import type { RFQFormData } from '../../types/rfq';
import { FormTextarea } from '../form/FormTextarea';
import { PackageCheck, FileCheck, MessageSquare } from 'lucide-react';

interface Step4Props {
  formData: RFQFormData;
  errors: Record<string, string>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSetFieldValue: (field: keyof RFQFormData, value: any) => void;
}

export const Step4ServicesOptions: React.FC<Step4Props> = ({
  formData,
  errors,
  onChange,
  onSetFieldValue,
}) => {
  return (
    <div className="step-container animate-fade-in">
      {/* 1. Crating Service & Mandatory Fumigation Certificate */}
      <div className="section-card" style={{ marginBottom: '1.25rem' }}>
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PackageCheck size={20} className="text-indigo" /> 1. Industrial Crating & Fumigation Services
        </h3>

        <div
          style={{
            padding: '1.15rem',
            borderRadius: '12px',
            border: formData.crating_service_required ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
            background: formData.crating_service_required ? '#f0f6ff' : '#ffffff',
            marginBottom: formData.crating_service_required ? '0.85rem' : '0',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
              <input
                type="checkbox"
                id="crating-check"
                checked={formData.crating_service_required}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onSetFieldValue('crating_service_required', checked);
                  if (!checked) onSetFieldValue('fumigation_certificate', false);
                }}
                style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
              />
              Crating Service Required
            </label>
            {formData.crating_service_required && (
              <span style={{ fontSize: '0.725rem', fontWeight: 800, color: '#1d4ed8', background: '#dbeafe', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                Industrial Wooden Crating
              </span>
            )}
          </div>
        </div>

        {formData.crating_service_required && (
          <div
            style={{
              padding: '1.15rem',
              borderRadius: '12px',
              border: '2px solid #ea580c',
              background: '#fff7ed',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
              <input
                type="checkbox"
                id="fumi-cert"
                checked={Boolean(formData.fumigation_certificate)}
                onChange={(e) => onSetFieldValue('fumigation_certificate', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#ea580c', cursor: 'pointer' }}
              />
              <label htmlFor="fumi-cert" style={{ fontWeight: 700, cursor: 'pointer', fontSize: '0.925rem', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileCheck size={18} /> Fumigation Certificate Mandatory *
              </label>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#9a3412', margin: 0 }}>
              When Crating Service is requested, ISPM-15 Fumigation Certificate is mandatory for customs clearance compliance.
            </p>
            {errors.fumigation_certificate && (
              <div style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 700, marginTop: '0.35rem' }}>
                {errors.fumigation_certificate}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Other Special Instructions */}
      <div className="section-card">
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={20} className="text-indigo" /> 2. Other Special Instructions (Optional)
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
