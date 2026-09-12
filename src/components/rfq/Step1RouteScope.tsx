import React from 'react';
import type { RFQFormData, ServiceScope, ShipmentType } from '../../types/rfq';
import { FormSelect } from '../form/FormSelect';
import { FormInput } from '../form/FormInput';
import { PortAutocomplete } from '../form/PortAutocomplete';
import { mockAddresses } from '../../hooks/useRFQForm';
import {
  Plane,
  Ship,
  MapPin,
  Anchor,
  Calendar,
  ArrowRightLeft,
  Building2,
  Truck,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { getMinReadyDate, getMinDeliveryDate, SCOPE_INCOTERMS_MAP } from '../../utils/rfqConstants';
import './Step1RouteScope.css';

interface Step1RouteScopeProps {
  formData: RFQFormData;
  errors: Record<string, string>;
  hasPrivilegedAccess?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSetFieldValue: (field: keyof RFQFormData, value: any) => void;
}

export const Step1RouteScope: React.FC<Step1RouteScopeProps> = ({
  formData,
  errors,
  onChange,
  onSetFieldValue,
}) => {
  const minReadyDate = getMinReadyDate();
  const minDeliveryDate = getMinDeliveryDate(formData.ready_date, formData.mode);

  const isFromAddress = ['D2D', 'D2P'].includes(formData.service_scope);
  const isToAddress = ['D2D', 'P2D'].includes(formData.service_scope);

  const fromError = errors.from_address_id || errors.from_port_code || errors.from_address;
  const toError = errors.to_address_id || errors.to_port_code || errors.to_address;

  const allowedIncoterms = SCOPE_INCOTERMS_MAP[formData.service_scope] || ['FOB', 'EXW', 'CIF', 'DDP'];

  const scopeOptions: { code: ServiceScope; title: string; desc: string; badge: string; icon: React.ReactNode }[] = [
    {
      code: 'D2D',
      title: 'Door to Door',
      desc: 'Pickup at origin address & delivery to destination door',
      badge: 'Address ➔ Address',
      icon: <Building2 size={20} />,
    },
    {
      code: 'P2P',
      title: 'Port to Port',
      desc: 'Origin seaport/airport to destination port discharge',
      badge: 'Port ➔ Port',
      icon: <Anchor size={20} />,
    },
    {
      code: 'P2D',
      title: 'Port to Door',
      desc: 'Origin port pickup to destination door delivery',
      badge: 'Port ➔ Address',
      icon: <ArrowRightLeft size={20} />,
    },
    {
      code: 'D2P',
      title: 'Door to Port',
      desc: 'Origin door pickup to destination port discharge',
      badge: 'Address ➔ Port',
      icon: <Truck size={20} />,
    },
  ];

  const shipmentTypeOptions: { value: ShipmentType; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      value: 'Export',
      label: 'Export Shipment',
      desc: 'Outbound international freight dispatch',
      icon: <ArrowUpRight size={22} />,
    },
    {
      value: 'Import',
      label: 'Import Shipment',
      desc: 'Inbound international freight entry',
      icon: <ArrowDownLeft size={22} />,
    },
  ];

  return (
    <div className="step-container animate-fade-in">
      {/* 1. Transport Mode & Service Scope */}
      <div className="section-card">
        <h3 className="section-title" style={{ marginBottom: '0.85rem' }}>1. Transport Mode & Service Scope</h3>

        {/* Compact Mode Switcher */}
        <div className="form-field" style={{ marginBottom: '1rem' }}>
          <label className="field-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>Transport Mode *</label>
          <div className="mode-btn-group" style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              className={`mode-btn ${formData.mode === 'Air' ? 'active' : ''}`}
              onClick={() => onSetFieldValue('mode', 'Air')}
              style={{
                flex: 1,
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: formData.mode === 'Air' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: formData.mode === 'Air' ? '#eff6ff' : '#ffffff',
                color: formData.mode === 'Air' ? '#1d4ed8' : '#475569',
                cursor: 'pointer',
                boxShadow: formData.mode === 'Air' ? '0 0 10px rgba(37, 99, 235, 0.12)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Plane size={17} /> Air Freight
            </button>
            <button
              type="button"
              className={`mode-btn ${formData.mode === 'Ship' ? 'active' : ''}`}
              onClick={() => onSetFieldValue('mode', 'Ship')}
              style={{
                flex: 1,
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: formData.mode === 'Ship' ? '2px solid #0891b2' : '1px solid #cbd5e1',
                background: formData.mode === 'Ship' ? '#ecfeff' : '#ffffff',
                color: formData.mode === 'Ship' ? '#0e7490' : '#475569',
                cursor: 'pointer',
                boxShadow: formData.mode === 'Ship' ? '0 0 10px rgba(8, 145, 178, 0.12)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Ship size={17} /> Vessel / Ship Freight
            </button>
          </div>
          {errors.mode && <div className="field-error-text">{errors.mode}</div>}
        </div>

        {/* High Density Service Scope Grid */}
        <div className="form-field" style={{ marginBottom: '1rem' }}>
          <label className="field-label" style={{ fontWeight: 600, fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Service Scope *</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
              Determines Address vs Port inputs & Incoterms
            </span>
          </label>

          <div className="scope-rich-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem', marginTop: '0.3rem' }}>
            {scopeOptions.map((option) => {
              const isSelected = formData.service_scope === option.code;
              return (
                <div
                  key={option.code}
                  className={`scope-rich-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSetFieldValue('service_scope', option.code)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.65rem',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0f6ff' : '#ffffff',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease-in-out',
                    boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.1)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isSelected ? '#1d4ed8' : '#475569' }}>
                      <div className="scope-icon-wrap" style={{ background: isSelected ? '#dbeafe' : '#f1f5f9', padding: '0.25rem', borderRadius: '6px', display: 'flex' }}>
                        {React.cloneElement(option.icon as React.ReactElement<{ size?: number }>, { size: 15 })}
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.80rem', color: isSelected ? '#1e3a8a' : '#0f172a' }}>
                        {option.code}
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 size={15} style={{ color: '#2563eb' }} />}
                  </div>

                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.78rem', display: 'block', color: isSelected ? '#1d4ed8' : '#334155', lineHeight: 1.25 }}>
                      {option.title}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: isSelected ? '#2563eb' : '#64748b' }}>
                      {option.badge}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {errors.service_scope && <div className="field-error-text">{errors.service_scope}</div>}
        </div>

        {/* Compact Shipment Type Grid */}
        <div className="form-field">
          <label className="field-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>Shipment Type *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', marginTop: '0.3rem' }}>
            {shipmentTypeOptions.map((typeOpt) => {
              const isSelected = formData.shipment_type === typeOpt.value;
              return (
                <div
                  key={typeOpt.value}
                  onClick={() => onSetFieldValue('shipment_type', typeOpt.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0f6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.1)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ background: isSelected ? '#dbeafe' : '#f1f5f9', color: isSelected ? '#1d4ed8' : '#475569', padding: '0.3rem', borderRadius: '6px', display: 'flex' }}>
                      {React.cloneElement(typeOpt.icon as React.ReactElement<{ size?: number }>, { size: 16 })}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', display: 'block', color: isSelected ? '#1e3a8a' : '#1e293b' }}>
                        {typeOpt.label}
                      </span>
                      <span style={{ fontSize: '0.70rem', color: '#64748b' }}>
                        {typeOpt.desc}
                      </span>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 size={16} style={{ color: '#2563eb' }} />}
                </div>
              );
            })}
          </div>
          {errors.shipment_type && <div className="field-error-text">{errors.shipment_type}</div>}
        </div>
      </div>

      {/* 2. From & To Dynamic Origin & Destination Locations */}
      <div className="section-card" style={{ marginTop: '0.75rem' }}>
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontSize: '0.90rem' }}>
          <ArrowRightLeft size={16} className="text-indigo" /> 2. Origin (From) & Destination (To)
        </h3>

        <div className="grid-2col" style={{ gap: '0.75rem' }}>
          {/* FROM Field */}
          <div className="form-field">
            {isFromAddress ? (
              <FormSelect
                label="From (Origin Pickup Address) *"
                name="from_address_id"
                value={formData.from_address_id || ''}
                onChange={(e) => {
                  const addr = mockAddresses.find((a) => a.id === e.target.value);
                  onSetFieldValue('from_address_id', e.target.value);
                  onSetFieldValue('from_address', addr || null);
                  if (addr?.countryCode) onSetFieldValue('originCountry', addr.countryCode);
                }}
                options={mockAddresses.map((a) => ({ value: a.id, label: `${a.label} (${a.city}, ${a.country})` }))}
                error={fromError}
                icon={<MapPin size={15} />}
              />
            ) : (
              <PortAutocomplete
                label="From (Origin Port) *"
                value={formData.from_port_code || ''}
                selectedPortName={formData.from_port_name || ''}
                mode={formData.mode}
                countryCode={formData.originCountry}
                error={fromError}
                onChange={(code, name, country) => {
                  onSetFieldValue('from_port_code', code);
                  onSetFieldValue('from_port_name', name);
                  onSetFieldValue('origin_port_code', code);
                  onSetFieldValue('origin_port_name', name);
                  if (country) onSetFieldValue('originCountry', country);
                }}
              />
            )}
          </div>

          {/* TO Field */}
          <div className="form-field">
            {isToAddress ? (
              <FormSelect
                label="To (Destination Delivery Address) *"
                name="to_address_id"
                value={formData.to_address_id || ''}
                onChange={(e) => {
                  const addr = mockAddresses.find((a) => a.id === e.target.value);
                  onSetFieldValue('to_address_id', e.target.value);
                  onSetFieldValue('to_address', addr || null);
                  if (addr?.countryCode) onSetFieldValue('destCountry', addr.countryCode);
                }}
                options={mockAddresses.map((a) => ({ value: a.id, label: `${a.label} (${a.city}, ${a.country})` }))}
                error={toError}
                icon={<MapPin size={15} />}
              />
            ) : (
              <PortAutocomplete
                label="To (Destination Port) *"
                value={formData.to_port_code || ''}
                selectedPortName={formData.to_port_name || ''}
                mode={formData.mode}
                countryCode={formData.destCountry}
                error={toError}
                onChange={(code, name, country) => {
                  onSetFieldValue('to_port_code', code);
                  onSetFieldValue('to_port_name', name);
                  onSetFieldValue('destination_port_code', code);
                  onSetFieldValue('destination_port_name', name);
                  if (country) onSetFieldValue('destCountry', country);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Combined Compact Row: 3. Schedule & 4. Incoterms */}
      <div className="grid-2col" style={{ gap: '0.75rem', marginTop: '0.75rem' }}>
        {/* 3. Schedule / Ready Date & Delivery Date */}
        <div className="section-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontSize: '0.90rem' }}>
            <Calendar size={16} className="text-indigo" /> 3. Schedule & Lead Times
          </h3>

          <div className="grid-2col" style={{ gap: '0.6rem' }}>
            <FormInput
              type="date"
              label="Ready Date *"
              name="ready_date"
              min={minReadyDate}
              value={formData.ready_date}
              onChange={onChange}
              error={errors.ready_date}
              helperText={`Min ${minReadyDate}`}
            />

            <FormInput
              type="date"
              label="Target Delivery *"
              name="delivery_date"
              min={minDeliveryDate}
              value={formData.delivery_date}
              onChange={onChange}
              error={errors.delivery_date}
              helperText={`Min ${minDeliveryDate}`}
            />
          </div>
        </div>

        {/* 4. International Commercial Terms (Incoterms) */}
        <div className="section-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem', fontSize: '0.90rem' }}>
            <FileCheck size={16} className="text-indigo" /> 4. Incoterms
          </h3>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <FormSelect
              label="Incoterm *"
              name="incoterm"
              value={formData.incoterm}
              onChange={onChange}
              options={allowedIncoterms.map((inc) => {
                const map: Record<string, string> = {
                  DDP: 'DDP - Delivered Duty Paid',
                  DAP: 'DAP - Delivered at Place',
                  DPU: 'DPU - Delivered at Place Unloaded',
                  EXW: 'EXW - Ex Works',
                  FOB: 'FOB - Free on Board',
                  CIF: 'CIF - Cost, Insurance & Freight',
                  CFR: 'CFR - Cost & Freight',
                  FCA: 'FCA - Free Carrier',
                  CPT: 'CPT - Carriage Paid To',
                  CIP: 'CIP - Carriage & Insurance Paid',
                };
                return { value: inc, label: map[inc] || inc };
              })}
              error={errors.incoterm}
            />

            <div
              style={{
                marginTop: '0.35rem',
                padding: '0.4rem 0.65rem',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ color: '#475569', fontWeight: 600 }}>
                Selected Rule Scope: <strong style={{ color: '#0f172a' }}>{formData.service_scope}</strong>
              </span>
              <span style={{ fontSize: '0.70rem', fontWeight: 800, color: ['CIF', 'CIP'].includes(formData.incoterm) ? '#059669' : '#2563eb', background: ['CIF', 'CIP'].includes(formData.incoterm) ? '#d1fae5' : '#dbeafe', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                {['CIF', 'CIP'].includes(formData.incoterm) ? '✓ Marine Insurance' : `${formData.incoterm} Active`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
