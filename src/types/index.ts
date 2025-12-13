// Supported Languages
export type Language = 'en' | 'si' | 'ta';

export const LANGUAGES = {
  en: { label: 'English', nativeLabel: 'English' },
  si: { label: 'Sinhala', nativeLabel: 'සිංහල' },
  ta: { label: 'Tamil', nativeLabel: 'தமிழ்' },
} as const;

// Language variant for multi-language forms
export interface LanguageVariant {
  language: Language;
  pdfPath?: string;           // Path to PDF file for this language
  pdfData?: string;           // Base64 PDF data
  pdfPages?: string[];        // Base64 page images
}

// Form Element Types
export type ElementType =
  | 'text'
  | 'paragraph'
  | 'heading'
  | 'checkbox'
  | 'radio'
  | 'dropdown'
  | 'date'
  | 'signature'
  | 'table'
  | 'divider'
  | 'static-text';

export interface FormElement {
  id: string;
  type: ElementType;
  label: string;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  options?: string[]; // For radio, checkbox, dropdown
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
}

export interface FormPage {
  id: string;
  elements: FormElement[];
}

export interface Form {
  id: string;
  title: string;
  titleSi?: string;  // Sinhala title (සිංහල)
  titleTa?: string;  // Tamil title (தமிழ்)
  institution: string;
  category: string;
  description: string;
  pages: FormPage[];
  languages?: Language[]; // Supported languages for the form
  languageVariants?: LanguageVariant[]; // PDF data for each language
  defaultLanguage?: Language; // Default/primary language
  verificationLevel: 0 | 1 | 2 | 3;
  rating: number;
  ratingCount: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: 'draft' | 'published';
  thumbnail?: string;
  originalFile?: string; // Path or URL to original PDF file

  // Additional metadata fields
  releaseDate?: string; // Official release date of the form
  validationInfo?: string; // Validation requirements or notes
  applicationProcedure?: string; // Steps to apply/submit the form
  postAddress?: string; // Postal address for submission
  telephoneNumbers?: string[]; // Contact phone numbers
  faxNumber?: string; // Fax number if available
  email?: string; // Contact email
  website?: string; // Related website URL
  officeHours?: string; // Office hours for in-person submission
  fees?: string; // Application fees if any
  processingTime?: string; // Expected processing time
  requiredDocuments?: string[]; // List of required documents
  officialLocation?: string; // Official location where form can be obtained/submitted
}

export interface FilledFormData {
  formId: string;
  values: Record<string, string | string[] | boolean>;
  filledAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdForms: string[];
  filledForms: FilledFormData[];
}

// Verification Levels
export const VERIFICATION_LEVELS = {
  0: { label: 'Unverified', color: 'gray', badge: '' },
  1: { label: 'Community Verified', color: 'blue', badge: 'checkmark' },
  2: { label: 'Trusted Verified', color: 'green', badge: 'shield' },
  3: { label: 'Official', color: 'gold', badge: 'star' },
} as const;

// Categories
export const CATEGORIES = [
  'Divisional Secretariat',
  'Police',
  'Motor Traffic',
  'Banks',
  'Immigration',
  'Registrar General',
  'Inland Revenue',
  'Education',
  'Grama Niladhari',
  'Electricity Board',
  'Water Board',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];
