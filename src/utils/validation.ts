import type { FormData, FormErrors } from '../types/form';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // optional unless specified
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
  return phoneRegex.test(phone) && phone.length >= 7;
};

export const validateFormData = (data: FormData): FormErrors => {
  const errors: FormErrors = {};

  if (!data.fullName.trim()) {
    errors.fullName = 'Full name is required';
  } else if (data.fullName.trim().length < 2) {
    errors.fullName = 'Name must be at least 2 characters';
  }

  if (!data.email.trim()) {
    errors.email = 'Email address is required';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (data.phone && !validatePhone(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  if (!data.company.trim()) {
    errors.company = 'Company / Organization name is required';
  }

  if (!data.serviceType) {
    errors.serviceType = 'Please select a service category';
  }

  if (!data.budget) {
    errors.budget = 'Please select an estimated budget range';
  }

  if (!data.timeline) {
    errors.timeline = 'Please select a timeline';
  }

  if (!data.title.trim()) {
    errors.title = 'Requirement title is required';
  } else if (data.title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters';
  }

  if (!data.description.trim()) {
    errors.description = 'Please provide details about your request';
  } else if (data.description.trim().length < 20) {
    errors.description = 'Description should be at least 20 characters for clear understanding';
  }

  if (!data.termsAgreed) {
    errors.termsAgreed = 'You must agree to the terms and privacy policy';
  }

  return errors;
};
