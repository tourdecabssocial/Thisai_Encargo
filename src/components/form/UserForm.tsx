import React from 'react';
import type { FormData, FormErrors, OptionItem, PriorityLevel, ContactMethod } from '../../types/form';
import { StepIndicator } from './StepIndicator';
import { FormInput } from './FormInput';
import { FormSelect } from './FormSelect';
import { FormTextarea } from './FormTextarea';
import { Button } from '../ui/Button';
import {
  User,
  Mail,
  Phone,
  Building,
  Layers,
  DollarSign,
  Clock,
  Tag,
  ArrowRight,
  ArrowLeft,
  Send,
  Video,
} from 'lucide-react';
import './UserForm.css';

interface UserFormProps {
  formData: FormData;
  errors: FormErrors;
  activeStep: number;
  isSubmitting: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBlur: (field: keyof FormData) => void;
  onSetFieldValue: (field: keyof FormData, value: any) => void;
  onNext: () => void;
  onPrev: () => void;
  onStepClick: (step: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const serviceOptions: OptionItem[] = [
  { label: 'Web & Mobile Development', value: 'web_development' },
  { label: 'UI/UX & Product Design', value: 'ui_ux_design' },
  { label: 'Cloud Architecture & DevOps', value: 'cloud_architecture' },
  { label: 'Logistics & Cargo RFQ', value: 'logistics_freight' },
  { label: 'Custom Enterprise Solution', value: 'custom_software' },
];

const budgetOptions: OptionItem[] = [
  { label: '$1,000 - $5,000', value: '$1k - $5k' },
  { label: '$5,000 - $15,000', value: '$5k - $15k' },
  { label: '$15,000 - $50,000', value: '$15k - $50k' },
  { label: '$50,000+', value: '$50k+' },
];

const timelineOptions: OptionItem[] = [
  { label: 'Immediate (< 2 Weeks)', value: 'Immediate' },
  { label: '1 - 3 Months', value: '1-3 months' },
  { label: '3 - 6 Months', value: '3-6 months' },
  { label: 'Flexible / TBD', value: 'Flexible' },
];

export const UserForm: React.FC<UserFormProps> = ({
  formData,
  errors,
  activeStep,
  isSubmitting,
  onChange,
  onBlur,
  onSetFieldValue,
  onNext,
  onPrev,
  onStepClick,
  onSubmit,
}) => {
  const priorityLevels: { level: PriorityLevel; label: string; class: string }[] = [
    { level: 'low', label: 'Low Priority', class: 'p-low' },
    { level: 'medium', label: 'Medium', class: 'p-medium' },
    { level: 'high', label: 'High Priority', class: 'p-high' },
    { level: 'urgent', label: 'Urgent', class: 'p-urgent' },
  ];

  const contactMethods: { method: ContactMethod; label: string; icon: any }[] = [
    { method: 'email', label: 'Email Communication', icon: Mail },
    { method: 'phone', label: 'Phone Call', icon: Phone },
    { method: 'video', label: 'Video Conference', icon: Video },
  ];

  return (
    <div className="user-form-container glass-panel">
      <StepIndicator currentStep={activeStep} onStepClick={onStepClick} />

      <form onSubmit={onSubmit} noValidate>
        {/* STEP 1: Personal & Contact Information */}
        {activeStep === 1 && (
          <div className="form-step-pane animate-fade-in">
            <div className="step-pane-header">
              <h3 className="pane-title">Contact Information</h3>
              <p className="pane-subtitle">Enter your primary contact and organizational details</p>
            </div>

            <div className="grid-2col">
              <FormInput
                label="Full Name"
                name="fullName"
                placeholder="e.g. Sarah Jenkins"
                value={formData.fullName}
                error={errors.fullName}
                onChange={onChange}
                onBlur={() => onBlur('fullName')}
                icon={<User size={18} />}
                required
              />

              <FormInput
                label="Email Address"
                name="email"
                type="email"
                placeholder="e.g. sarah@acme-corp.com"
                value={formData.email}
                error={errors.email}
                onChange={onChange}
                onBlur={() => onBlur('email')}
                icon={<Mail size={18} />}
                required
              />
            </div>

            <div className="grid-2col">
              <FormInput
                label="Phone Number (Optional)"
                name="phone"
                type="tel"
                placeholder="+1 (555) 019-2834"
                value={formData.phone}
                error={errors.phone}
                onChange={onChange}
                onBlur={() => onBlur('phone')}
                icon={<Phone size={18} />}
              />

              <FormInput
                label="Company / Organization"
                name="company"
                placeholder="e.g. Acme Enterprise Global"
                value={formData.company}
                error={errors.company}
                onChange={onChange}
                onBlur={() => onBlur('company')}
                icon={<Building size={18} />}
                required
              />
            </div>
          </div>
        )}

        {/* STEP 2: Project Scope & Budget */}
        {activeStep === 2 && (
          <div className="form-step-pane animate-fade-in">
            <div className="step-pane-header">
              <h3 className="pane-title">Project Scope & Budget</h3>
              <p className="pane-subtitle">Specify your target service category and financial plan</p>
            </div>

            <FormSelect
              label="Service Category"
              name="serviceType"
              options={serviceOptions}
              value={formData.serviceType}
              error={errors.serviceType}
              onChange={onChange}
              onBlur={() => onBlur('serviceType')}
              icon={<Layers size={18} />}
              required
            />

            <div className="grid-2col">
              <FormSelect
                label="Estimated Budget Range"
                name="budget"
                options={budgetOptions}
                value={formData.budget}
                error={errors.budget}
                onChange={onChange}
                onBlur={() => onBlur('budget')}
                icon={<DollarSign size={18} />}
                required
              />

              <FormSelect
                label="Expected Timeline"
                name="timeline"
                options={timelineOptions}
                value={formData.timeline}
                error={errors.timeline}
                onChange={onChange}
                onBlur={() => onBlur('timeline')}
                icon={<Clock size={18} />}
                required
              />
            </div>

            {/* Priority Selector */}
            <div className="form-field">
              <label className="field-label">
                <span>Priority Level</span>
              </label>
              <div className="priority-selector-grid">
                {priorityLevels.map((p) => (
                  <button
                    key={p.level}
                    type="button"
                    className={`priority-pill-btn ${p.class} ${
                      formData.priority === p.level ? 'selected' : ''
                    }`}
                    onClick={() => onSetFieldValue('priority', p.level)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Requirement Details & Review */}
        {activeStep === 3 && (
          <div className="form-step-pane animate-fade-in">
            <div className="step-pane-header">
              <h3 className="pane-title">Form Specifications & Details</h3>
              <p className="pane-subtitle">Describe your detailed needs to inform our proposal</p>
            </div>

            <FormInput
              label="Requirement Title / Subject"
              name="title"
              placeholder="e.g. Modern Freight Logistics System Upgrade"
              value={formData.title}
              error={errors.title}
              onChange={onChange}
              onBlur={() => onBlur('title')}
              icon={<Tag size={18} />}
              required
            />

            <FormTextarea
              label="Detailed Project Description"
              name="description"
              placeholder="Provide specific details, deliverables, integrations, or operational goals..."
              value={formData.description}
              error={errors.description}
              onChange={onChange}
              onBlur={() => onBlur('description')}
              maxLength={600}
              required
            />

            {/* Preferred Contact Method */}
            <div className="form-field">
              <label className="field-label">Preferred Contact Channel</label>
              <div className="contact-methods-grid">
                {contactMethods.map((m) => {
                  const Icon = m.icon;
                  const isSelected = formData.contactMethod === m.method;
                  return (
                    <div
                      key={m.method}
                      className={`contact-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => onSetFieldValue('contactMethod', m.method)}
                    >
                      <Icon size={20} className="contact-icon" />
                      <span>{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className={`checkbox-field ${errors.termsAgreed ? 'has-error' : ''}`}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="termsAgreed"
                  checked={formData.termsAgreed}
                  onChange={onChange}
                  className="checkbox-input"
                />
                <span className="checkbox-text">
                  I agree that the form details provided will be informed and transmitted to the review team for quotation processing.
                </span>
              </label>
              {errors.termsAgreed && <div className="field-error">{errors.termsAgreed}</div>}
            </div>
          </div>
        )}

        {/* Step Action Buttons */}
        <div className="form-pane-footer">
          {activeStep > 1 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onPrev}
              leftIcon={<ArrowLeft size={18} />}
            >
              Previous
            </Button>
          ) : (
            <div></div>
          )}

          {activeStep < 3 ? (
            <Button
              type="button"
              variant="primary"
              onClick={onNext}
              rightIcon={<ArrowRight size={18} />}
            >
              Next Step
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              rightIcon={<Send size={18} />}
            >
              Submit & Inform Details
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
