import React, { type InputHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';
import './FormInput.css';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  icon?: React.ReactNode;
  required?: boolean;
  helperText?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  error,
  icon,
  required,
  helperText,
  className = '',
  type,
  ...props
}) => {
  const isDateInput = type === 'date';

  return (
    <div className={`form-field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={name} className="field-label">
        <span>{label}</span>
        {required && <span className="required-star">*</span>}
      </label>

      <div className="input-wrapper">
        {icon && <div className="field-icon">{icon}</div>}
        <input
          id={name}
          name={name}
          type={type}
          className={`field-input ${icon ? 'has-icon' : ''} ${isDateInput ? 'is-date-input' : ''}`}
          {...props}
        />
        {error && !isDateInput && (
          <div className="error-icon-wrapper" title={error}>
            <AlertCircle size={18} className="error-icon" />
          </div>
        )}
      </div>

      {error ? (
        <div className="field-error">{error}</div>
      ) : helperText ? (
        <div className="field-helper">{helperText}</div>
      ) : null}
    </div>
  );
};
