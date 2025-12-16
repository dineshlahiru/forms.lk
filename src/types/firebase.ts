import { Timestamp } from 'firebase/firestore';

// Language type
export type Language = 'en' | 'si' | 'ta';

// User roles
export type UserRole = 'anonymous' | 'user' | 'admin' | 'institution_admin' | 'super_admin';

// User document
export interface FirebaseUser {
  uid: string;
  phone: string;
  displayName: string;
  email?: string;
  role: UserRole;
  institutionId?: string;
  preferredLanguage: Language;
  bookmarkedForms: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}

// PDF variant for a specific language
export interface PdfVariant {
  storagePath: string;
  pageCount: number;
  fileSize: number;
}

// Form contact information
export interface FormContactInfo {
  address?: string;
  officeHours?: string;
  telephoneNumbers?: string[];
  faxNumber?: string;
  email?: string;
  website?: string;
  officialLocation?: string;
}

// Form status
export type FormStatus = 'draft' | 'pending' | 'published' | 'archived';

// Form document
export interface FirebaseForm {
  id: string;
  formNumber?: string;
  section?: string;
  slug: string;
  title: string;
  titleSi?: string;
  titleTa?: string;
  description?: string;
  descriptionSi?: string;
  descriptionTa?: string;
  categoryId: string;
  institutionId: string;
  tags: string[];
  languages: Language[];
  defaultLanguage: Language;
  pdfVariants: {
    en?: PdfVariant;
    si?: PdfVariant;
    ta?: PdfVariant;
  };
  thumbnails?: {
    en?: string[];
    si?: string[];
    ta?: string[];
  };
  isDigitized: boolean;
  hasOnlineFill: boolean;
  contactInfo?: FormContactInfo;
  status: FormStatus;
  verificationLevel: 0 | 1 | 2 | 3;
  viewCount: number;
  downloadCount: number;
  fillCount: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
}

// Field position for PDF overlay
export interface FieldPosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
}

// Field validation rules
export interface FieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

// Field option (for dropdown, radio, checkbox)
export interface FieldOption {
  value: string;
  label: string;
  labelSi?: string;
  labelTa?: string;
}

// Field type
export type FieldType = 'text' | 'date' | 'checkbox' | 'radio' | 'dropdown' | 'paragraph' | 'signature';

// Form field document (subcollection)
export interface FirebaseFormField {
  id: string;
  type: FieldType;
  label: string;
  labelSi?: string;
  labelTa?: string;
  placeholder?: string;
  placeholderSi?: string;
  placeholderTa?: string;
  helpText?: string;
  helpTextSi?: string;
  helpTextTa?: string;
  required: boolean;
  validation?: FieldValidation;
  options?: FieldOption[];
  position?: FieldPosition;
  positionVariants?: {
    en?: FieldPosition;
    si?: FieldPosition;
    ta?: FieldPosition;
  };
  order: number;
  section?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Institution type
export type InstitutionType = 'ministry' | 'department' | 'authority' | 'council' | 'other';

// Institution document
export interface FirebaseInstitution {
  id: string;
  name: string;
  nameSi?: string;
  nameTa?: string;
  description?: string;
  descriptionSi?: string;
  descriptionTa?: string;
  type: InstitutionType;
  parentInstitutionId?: string;
  website?: string;
  email?: string;
  phone?: string;
  telephoneNumbers?: string[];
  address?: string;
  officeHours?: string;
  logoUrl?: string;
  formCount: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Category document
export interface FirebaseCategory {
  id: string;
  slug: string;
  name: string;
  nameSi?: string;
  nameTa?: string;
  description?: string;
  descriptionSi?: string;
  descriptionTa?: string;
  icon: string;
  color?: string;
  order: number;
  formCount: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Submission status
export type SubmissionStatus = 'completed' | 'downloaded' | 'printed';

// Submission document
export interface FirebaseSubmission {
  id: string;
  userId: string;
  formId: string;
  formTitle: string;
  formNumber?: string;
  languageUsed: Language;
  data: Record<string, unknown>;
  generatedPdfPath?: string;
  status: SubmissionStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

// Draft document
export interface FirebaseDraft {
  id: string;
  userId: string;
  formId: string;
  data: Record<string, unknown>;
  languageUsed: Language;
  completionPercentage: number;
  lastFieldEdited?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
}

// Analytics event type
export type AnalyticsEventType = 'view' | 'download' | 'fill_start' | 'fill_complete' | 'search';

// Device type
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

// Analytics event document
export interface FirebaseAnalyticsEvent {
  id: string;
  event: AnalyticsEventType;
  formId?: string;
  categoryId?: string;
  institutionId?: string;
  userId?: string;
  language: Language;
  searchQuery?: string;
  deviceType: DeviceType;
  userAgent?: string;
  timestamp: Timestamp;
  dateKey: string;
  monthKey: string;
}

// System config document
export interface FirebaseSystemConfig {
  maintenanceMode: boolean;
  maintenanceMessage?: {
    en: string;
    si: string;
    ta: string;
  };
  features: {
    onlineFill: boolean;
    userAccounts: boolean;
    analytics: boolean;
  };
  cacheVersions: {
    forms: number;
    categories: number;
    institutions: number;
  };
  updatedAt: Timestamp;
}

// System stats document
export interface FirebaseSystemStats {
  totalForms: number;
  totalUsers: number;
  totalSubmissions: number;
  totalDownloads: number;
  updatedAt: Timestamp;
}
