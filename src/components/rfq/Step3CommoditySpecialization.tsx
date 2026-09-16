import React from 'react';
import type { RFQFormData } from '../../types/rfq';
import { FormInput } from '../form/FormInput';
import { FormSelect } from '../form/FormSelect';
import {
  ShieldAlert,
  FileCheck2,
  DollarSign,
  Package,
  Truck,
  CheckSquare,
} from 'lucide-react';
import './Step3CommoditySpecialization.css';

interface Step3CommoditySpecializationProps {
  formData: RFQFormData;
  errors: Record<string, string>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export const Step3CommoditySpecialization: React.FC<Step3CommoditySpecializationProps> = ({
  formData,
  errors,
  onChange,
}) => {
  const commodityOptions = [
    { label: 'General Commercial Cargo', value: 'general' },
    { label: 'Hazardous Materials / Dangerous Goods', value: 'hazardous' },
    { label: 'FDA Regulated Goods', value: 'fda_regulated' },
    { label: 'Agricultural & Wood Products', value: 'agri_wood' },
    { label: 'High Value / Fine Jewelry', value: 'jewelry_high_value' },
  ];

  const loadingTypeOptions = [
    { label: 'Live Loading (Container at Factory)', value: 'live_loading' },
    { label: 'CFS Loading (Container Freight Station)', value: 'cfs_loading' },
    { label: 'Fumigation & Treated Loading', value: 'fumigation' },
  ];

  const currencyOptions = [
    { label: 'USD ($)', value: 'USD' },
    { label: 'EUR (€)', value: 'EUR' },
    { label: 'GBP (£)', value: 'GBP' },
    { label: 'INR (₹)', value: 'INR' },
  ];

  const showFclLoadingType =
    formData.mode === 'Ship' && formData.load_type === 'FCL' && formData.service_scope === 'D2D';

  return (
    <div className="step3-container animate-fade-in">
      {/* 1. Commodity Category */}
      <FormSelect
        label="Commodity Category"
        name="commodity_category"
        options={commodityOptions}
        value={formData.commodity_category}
        error={errors.commodity_category}
        onChange={onChange}
        icon={<Package size={18} />}
        required
      />

      {/* Conditional FDA Registration No */}
      {formData.commodity_category === 'fda_regulated' && (
        <FormInput
          label="FDA Registration Number"
          name="fda_registration_no"
          placeholder="e.g. 12345678901"
          value={formData.fda_registration_no}
          error={errors.fda_registration_no}
          onChange={onChange}
          icon={<FileCheck2 size={18} />}
          required
        />
      )}

      {/* Conditional UN Class Code for Hazardous Cargo */}
      {(formData.commodity_category === 'hazardous' || formData.hazardous_materials) && (
        <FormInput
          label="UN Class Code & Classification"
          name="un_class_code"
          placeholder="e.g. UN 1993 Class 3 Flammable Liquid"
          value={formData.un_class_code}
          error={errors.un_class_code}
          onChange={onChange}
          icon={<ShieldAlert size={18} />}
          required
        />
      )}

      {/* 2. Ocean FCL Loading Type Condition */}
      {showFclLoadingType && (
        <FormSelect
          label="Ocean FCL Factory Loading Strategy"
          name="loading_type"
          options={loadingTypeOptions}
          value={formData.loading_type}
          onChange={onChange}
          icon={<Truck size={18} />}
        />
      )}

      {/* 3. Special Handling Checkboxes */}
      <div className="special-handling-card">
        <h4 className="card-heading">
          <CheckSquare size={18} className="text-purple" /> Special Handling & Regulatory Clearances
        </h4>
        <div className="checkboxes-grid">
          <label className="checkbox-item">
            <input
              type="checkbox"
              name="has_wood_packaging"
              checked={formData.has_wood_packaging}
              onChange={onChange}
              className="checkbox-input"
            />
            <div>
              <span className="chk-title">Contains Wood Packaging (ISPM-15)</span>
              <span className="chk-sub">Requires heat treatment or fumigation stamp</span>
            </div>
          </label>

          <label className="checkbox-item">
            <input
              type="checkbox"
              name="hazardous_materials"
              checked={formData.hazardous_materials}
              onChange={onChange}
              className="checkbox-input"
            />
            <div>
              <span className="chk-title">Hazardous / Dangerous Goods (DG)</span>
              <span className="chk-sub">Auto-enforces UN Class Code validation</span>
            </div>
          </label>

          <label className="checkbox-item">
            <input
              type="checkbox"
              name="customs_clearance"
              checked={formData.customs_clearance}
              onChange={onChange}
              className="checkbox-input"
            />
            <div>
              <span className="chk-title">Origin Customs Clearance Required</span>
              <span className="chk-sub">Includes export declaration filing & brokerage</span>
            </div>
          </label>
        </div>
      </div>

      {/* 4. Declared Cargo Value & Currency */}
      <div className="grid-2col">
        <FormInput
          label="Declared Cargo Commercial Value"
          name="declared_value"
          type="number"
          value={formData.declared_value}
          error={errors.declared_value}
          onChange={onChange}
          icon={<DollarSign size={18} />}
          required
        />

        <FormSelect
          label="Value Currency"
          name="currency"
          options={currencyOptions}
          value={formData.currency}
          onChange={onChange}
        />
      </div>

      {/* 5. Explicit Submission Manual Click Callout */}
      <div className="alert-banner banner-info" style={{ marginTop: '1.25rem' }}>
        <CheckSquare size={18} />
        <div>
          <strong>Ready for Quote Generation:</strong> Please review your commodity specifications above and explicitly click the <strong>"Submit RFQ & Inform Details"</strong> button below to trigger submission.
        </div>
      </div>
    </div>
  );
};
