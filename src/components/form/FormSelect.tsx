import React, { type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import type { OptionItem } from '../../types/form';
import './FormSelect.css';

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  options: OptionItem[];
  error?: string;
  icon?: React.ReactNode;
  required?: boolean;
  helperText?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  name,
  options,
  error,
  icon,
  required,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className={`form-field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={name} className="field-label">
        <span>{label}</span>
        {required && <span className="required-star">*</span>}
      </label>

      <div className="select-wrapper">
        {icon && <div className="field-icon">{icon}</div>}
        <select
          id={name}
          name={name}
          className={`field-select ${icon ? 'has-icon' : ''}`}
          {...props}
        >
          {options.map((opt, index) => (
            <option key={`${opt.value}-${index}`} value={opt.value} className="select-option">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="select-arrow">
          <ChevronDown size={16} />
        </div>
      </div>

      {error ? (
        <div className="field-error">{error}</div>
      ) : helperText ? (
        <div className="field-helper">{helperText}</div>
      ) : null}
    </div>
  );
};
