import { useState, type ChangeEvent } from 'react';
import type { FormData, FormErrors, SubmittedRecord } from '../types/form';
import { validateFormData } from '../utils/validation';
import { generateReferenceNo } from '../utils/formatters';

const initialFormData: FormData = {
  fullName: '',
  email: '',
  phone: '',
  company: '',
  serviceType: 'web_development',
  budget: '$5k - $15k',
  timeline: '1-3 months',
  priority: 'medium',
  title: '',
  description: '',
  contactMethod: 'email',
  termsAgreed: false,
};

export const useFormState = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submittedRecord, setSubmittedRecord] = useState<SubmittedRecord | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    const newValue = type === 'checkbox' ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Clear error on change if already touched
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const currentErrors = validateFormData(formData);
    if (currentErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: currentErrors[field] }));
    }
  };

  const setFieldValue = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const allErrors = validateFormData(formData);
    let stepErrors: FormErrors = {};

    if (step === 1) {
      if (allErrors.fullName) stepErrors.fullName = allErrors.fullName;
      if (allErrors.email) stepErrors.email = allErrors.email;
      if (allErrors.phone) stepErrors.phone = allErrors.phone;
      if (allErrors.company) stepErrors.company = allErrors.company;
    } else if (step === 2) {
      if (allErrors.serviceType) stepErrors.serviceType = allErrors.serviceType;
      if (allErrors.budget) stepErrors.budget = allErrors.budget;
      if (allErrors.timeline) stepErrors.timeline = allErrors.timeline;
    } else if (step === 3) {
      if (allErrors.title) stepErrors.title = allErrors.title;
      if (allErrors.description) stepErrors.description = allErrors.description;
      if (allErrors.termsAgreed) stepErrors.termsAgreed = allErrors.termsAgreed;
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setActiveStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const validationErrors = validateFormData(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      // Find first error step
      if (validationErrors.fullName || validationErrors.email || validationErrors.company) {
        setActiveStep(1);
      } else if (validationErrors.serviceType || validationErrors.budget || validationErrors.timeline) {
        setActiveStep(2);
      } else {
        setActiveStep(3);
      }
      return;
    }

    setIsSubmitting(true);

    // Simulate API call processing
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const record: SubmittedRecord = {
      ...formData,
      id: `REC-${Date.now()}`,
      referenceNo: generateReferenceNo(),
      submittedAt: new Date().toISOString(),
    };

    setSubmittedRecord(record);
    setIsSubmitting(false);
    setIsSubmitted(true);
    setToastMessage('Form submitted successfully!');
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setTouched({});
    setIsSubmitted(false);
    setSubmittedRecord(null);
    setActiveStep(1);
  };

  return {
    formData,
    errors,
    touched,
    isSubmitting,
    isSubmitted,
    submittedRecord,
    activeStep,
    toastMessage,
    setToastMessage,
    handleChange,
    handleBlur,
    setFieldValue,
    nextStep,
    prevStep,
    setActiveStep,
    handleSubmit,
    resetForm,
  };
};
