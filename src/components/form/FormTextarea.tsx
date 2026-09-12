import React, { type TextareaHTMLAttributes } from 'react';
import './FormTextarea.css';

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  maxLength?: number;
  helperText?: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  name,
  error,
  required,
  maxLength = 500,
  helperText,
  value = '',
  className = '',
  ...props
}) => {
  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className={`form-field ${error ? 'has-error' : ''} ${className}`}>
      <div className="textarea-header-row">
        <label htmlFor={name} className="field-label">
          <span>{label}</span>
          {required && <span className="required-star">*</span>}
        </label>
        <span className="char-counter">
          {currentLength} / {maxLength}
        </span>
      </div>

      <div className="input-wrapper">
        <textarea
          id={name}
          name={name}
          value={value}
          maxLength={maxLength}
          rows={4}
          className="field-textarea"
          {...props}
        />
      </div>

      {error ? (
        <div className="field-error">{error}</div>
      ) : helperText ? (
        <div className="field-helper">{helperText}</div>
      ) : null}
    </div>
  );
};
