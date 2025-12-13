import type { Form } from '../types';

const STORAGE_KEY = 'forms-lk-custom-forms';

export interface ContactInfo {
  address?: string;
  officeHours?: string;
  telephoneNumbers?: string[]; // Up to 5 phone numbers
  faxNumber?: string;
  email?: string;
  website?: string;
  officialLocation?: string;
  // Legacy field for backward compatibility
  phone?: string;
}

export interface StoredForm extends Omit<Form, 'pdfUrl' | 'previewUrl'> {
  pdfData?: string; // Base64 PDF data
  pdfPages?: string[]; // Base64 page images
  isImagePdf?: boolean;
  fields?: FormFieldData[];
  contactInfo?: ContactInfo;
}

// Field position for PDF overlay mapping
export interface FieldPosition {
  x: number;      // X coordinate (percentage of page width)
  y: number;      // Y coordinate (percentage of page height)
  width: number;  // Width (percentage of page width)
  height: number; // Height (percentage of page height)
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
  fontStyle?: 'normal' | 'italic';
}

export interface FormFieldData {
  id: string;
  type: 'text' | 'date' | 'checkbox' | 'radio' | 'dropdown' | 'paragraph' | 'signature';
  label: string;
  page: number;
  required: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
  // Position mapping for PDF overlay (optional - used by Advanced Fill)
  position?: FieldPosition;
}

// Get all custom forms from localStorage
export function getCustomForms(): StoredForm[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('Failed to parse custom forms from localStorage');
    return [];
  }
}

// Save a new form
export function saveForm(form: StoredForm): StoredForm {
  const forms = getCustomForms();
  const existingIndex = forms.findIndex(f => f.id === form.id);

  if (existingIndex >= 0) {
    forms[existingIndex] = form;
  } else {
    forms.push(form);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
  return form;
}

// Update a form
export function updateForm(id: string, updates: Partial<StoredForm>): StoredForm | null {
  const forms = getCustomForms();
  const index = forms.findIndex(f => f.id === id);

  if (index === -1) return null;

  forms[index] = { ...forms[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(forms));
  return forms[index];
}

// Delete a form
export function deleteForm(id: string): boolean {
  const forms = getCustomForms();
  const filtered = forms.filter(f => f.id !== id);

  if (filtered.length === forms.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

// Get a single form by ID
export function getFormById(id: string): StoredForm | null {
  const forms = getCustomForms();
  return forms.find(f => f.id === id) || null;
}

// Update verification level
export function updateVerificationLevel(id: string, level: 0 | 1 | 2 | 3): StoredForm | null {
  return updateForm(id, { verificationLevel: level });
}

// Approve form (set to published)
export function approveForm(id: string): StoredForm | null {
  return updateForm(id, { status: 'published' });
}

// Generate a unique form ID
export function generateFormId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to get phone numbers from ContactInfo (handles legacy format)
export function getPhoneNumbers(contactInfo?: ContactInfo): string[] {
  if (!contactInfo) return [];

  // If telephoneNumbers array exists, use it
  if (contactInfo.telephoneNumbers && contactInfo.telephoneNumbers.length > 0) {
    return contactInfo.telephoneNumbers.filter(p => p.trim());
  }

  // Fall back to legacy phone field (comma-separated)
  if (contactInfo.phone) {
    return contactInfo.phone.split(',').map(p => p.trim()).filter(p => p);
  }

  return [];
}

// Helper to create ContactInfo from form fields
export function createContactInfo(data: {
  address?: string;
  officeHours?: string;
  telephoneNumbers?: string[];
  faxNumber?: string;
  email?: string;
  website?: string;
  officialLocation?: string;
}): ContactInfo {
  return {
    address: data.address || undefined,
    officeHours: data.officeHours || undefined,
    telephoneNumbers: data.telephoneNumbers?.filter(p => p.trim()) || undefined,
    faxNumber: data.faxNumber || undefined,
    email: data.email || undefined,
    website: data.website || undefined,
    officialLocation: data.officialLocation || undefined,
  };
}

// Convert File to base64
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
