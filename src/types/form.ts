export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type ContactMethod = 'email' | 'phone' | 'video';

export interface FormData {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  serviceType: string;
  budget: string;
  timeline: string;
  priority: PriorityLevel;
  title: string;
  description: string;
  contactMethod: ContactMethod;
  termsAgreed: boolean;
}

export type FormErrors = Partial<Record<keyof FormData, string>>;

export interface SubmittedRecord extends FormData {
  id: string;
  referenceNo: string;
  submittedAt: string;
}

export interface OptionItem {
  label: string;
  value: string;
  icon?: string;
  description?: string;
}
