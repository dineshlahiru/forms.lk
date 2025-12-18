import { Timestamp } from 'firebase/firestore';
import { uploadFormPdf, uploadFormThumbnails, type UploadProgress } from './unified/storage';
import { createForm, addFormField } from './unified/forms';
import type { FirebaseForm, Language, FormContactInfo, PdfVariant } from '../types/firebase';

// Local storage key for forms
const LOCAL_FORMS_KEY = 'forms-lk-local-forms';

// Upload status for UI
export interface FormUploadStatus {
  formId: string;
  state: 'pending' | 'uploading_pdf' | 'uploading_thumbnails' | 'saving_to_firestore' | 'completed' | 'error';
  progress: number; // 0-100
  currentStep: string;
  error?: string;
  retryCount: number;
}

export type UploadStatusCallback = (status: FormUploadStatus) => void;

// Local form data structure (stored in localStorage before upload)
export interface LocalFormData {
  id: string;
  formNumber?: string;
  section?: string;
  publishDate?: string; // Official form publish date
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
  contactInfo?: FormContactInfo;
  verificationLevel: 0 | 1 | 2 | 3;
  // PDF data (base64)
  pdfData?: string;
  pdfPages?: string[]; // Thumbnail images
  // Language variants
  languageVariants?: {
    language: Language;
    pdfData?: string;
    pdfPages?: string[];
  }[];
  // Fields with multi-language labels
  fields?: Array<{
    id: string;
    type: string;
    // Multi-language labels
    labelEn: string;
    labelSi?: string;
    labelTa?: string;
    page: number;
    required: boolean;
    placeholder?: string;
    placeholderSi?: string;
    placeholderTa?: string;
    options?: string[];
    helpText?: string;
    helpTextSi?: string;
    helpTextTa?: string;
    position?: {
      x: number;
      y: number;
      width: number;
      height: number;
      fontSize?: number;
      align?: 'left' | 'center' | 'right';
    };
  }>;
  // Upload status
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'error';
  uploadError?: string;
  createdAt: string;
  updatedAt: string;
}

// Save form to localStorage (immediate, before Firebase upload)
export function saveFormLocally(formData: LocalFormData): LocalFormData {
  const forms = getLocalForms();
  const existingIndex = forms.findIndex(f => f.id === formData.id);

  const updatedForm = {
    ...formData,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    forms[existingIndex] = updatedForm;
  } else {
    forms.push(updatedForm);
  }

  localStorage.setItem(LOCAL_FORMS_KEY, JSON.stringify(forms));
  return updatedForm;
}

// Get all local forms
export function getLocalForms(): LocalFormData[] {
  try {
    const data = localStorage.getItem(LOCAL_FORMS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Get a specific local form
export function getLocalForm(formId: string): LocalFormData | null {
  const forms = getLocalForms();
  return forms.find(f => f.id === formId) || null;
}

// Remove local form after successful upload
export function removeLocalForm(formId: string): void {
  const forms = getLocalForms();
  const filtered = forms.filter(f => f.id !== formId);
  localStorage.setItem(LOCAL_FORMS_KEY, JSON.stringify(filtered));
}

// Update local form status
export function updateLocalFormStatus(
  formId: string,
  status: LocalFormData['uploadStatus'],
  error?: string
): void {
  const forms = getLocalForms();
  const form = forms.find(f => f.id === formId);
  if (form) {
    form.uploadStatus = status;
    form.uploadError = error;
    form.updatedAt = new Date().toISOString();
    localStorage.setItem(LOCAL_FORMS_KEY, JSON.stringify(forms));
  }
}

// Upload form to Firebase (PDF to Storage, metadata to Firestore)
export async function uploadFormToFirebase(
  localForm: LocalFormData,
  onStatus?: UploadStatusCallback
): Promise<string> {
  const status: FormUploadStatus = {
    formId: localForm.id,
    state: 'pending',
    progress: 0,
    currentStep: 'Preparing upload...',
    retryCount: 0,
  };

  const updateStatus = (updates: Partial<FormUploadStatus>) => {
    Object.assign(status, updates);
    onStatus?.(status);
  };

  try {
    // Update local status
    updateLocalFormStatus(localForm.id, 'uploading');
    updateStatus({ state: 'uploading_pdf', currentStep: 'Uploading PDF...', progress: 5 });

    // Prepare PDF variants for Firestore
    const pdfVariants: FirebaseForm['pdfVariants'] = {};
    const thumbnails: FirebaseForm['thumbnails'] = {};

    // Upload main PDF
    if (localForm.pdfData) {
      await uploadFormPdf(
        localForm.id,
        localForm.defaultLanguage,
        localForm.pdfData,
        (uploadProgress: UploadProgress) => {
          const progress = 5 + (uploadProgress.progress * 0.4); // 5-45%
          updateStatus({
            progress,
            currentStep: `Uploading PDF... ${Math.round(uploadProgress.progress)}%`,
          });
        }
      );

      pdfVariants[localForm.defaultLanguage] = {
        storagePath: `forms/${localForm.id}/pdf_${localForm.defaultLanguage}.pdf`,
        pageCount: localForm.pdfPages?.length || 1,
        fileSize: localForm.pdfData.length,
      } as PdfVariant;
    }

    // Upload language variants
    if (localForm.languageVariants) {
      for (const variant of localForm.languageVariants) {
        if (variant.pdfData && variant.language !== localForm.defaultLanguage) {
          updateStatus({
            currentStep: `Uploading ${variant.language.toUpperCase()} PDF...`,
          });

          await uploadFormPdf(localForm.id, variant.language, variant.pdfData);

          pdfVariants[variant.language] = {
            storagePath: `forms/${localForm.id}/pdf_${variant.language}.pdf`,
            pageCount: variant.pdfPages?.length || 1,
            fileSize: variant.pdfData.length,
          } as PdfVariant;
        }
      }
    }

    updateStatus({ state: 'uploading_thumbnails', currentStep: 'Uploading thumbnails...', progress: 50 });

    // Upload thumbnails
    if (localForm.pdfPages && localForm.pdfPages.length > 0) {
      const thumbUrls = await uploadFormThumbnails(
        localForm.id,
        localForm.defaultLanguage,
        localForm.pdfPages,
        (uploadProgress: UploadProgress) => {
          const progress = 50 + (uploadProgress.progress * 0.3); // 50-80%
          updateStatus({
            progress,
            currentStep: `Uploading thumbnails... ${Math.round(uploadProgress.progress)}%`,
          });
        }
      );
      thumbnails[localForm.defaultLanguage] = thumbUrls;
    }

    // Upload variant thumbnails
    if (localForm.languageVariants) {
      for (const variant of localForm.languageVariants) {
        if (variant.pdfPages && variant.pdfPages.length > 0 && variant.language !== localForm.defaultLanguage) {
          const thumbUrls = await uploadFormThumbnails(localForm.id, variant.language, variant.pdfPages);
          thumbnails[variant.language] = thumbUrls;
        }
      }
    }

    updateStatus({ state: 'saving_to_firestore', currentStep: 'Saving form data...', progress: 85 });

    // Prepare Firestore document - only include defined fields
    // Firestore doesn't accept undefined values
    const firestoreForm: Record<string, unknown> = {
      slug: localForm.id,
      title: localForm.title,
      categoryId: localForm.categoryId,
      institutionId: localForm.institutionId,
      tags: localForm.tags || [],
      languages: localForm.languages,
      defaultLanguage: localForm.defaultLanguage,
      pdfVariants,
      isDigitized: true,
      hasOnlineFill: (localForm.fields?.length || 0) > 0,
      status: 'published',
      verificationLevel: localForm.verificationLevel || 0,
      viewCount: 0,
      downloadCount: 0,
      fillCount: 0,
      createdBy: 'admin',
      updatedBy: 'admin',
      publishedAt: Timestamp.now(),
    };

    // Add optional fields only if they have values
    if (localForm.formNumber) firestoreForm.formNumber = localForm.formNumber;
    if (localForm.section) firestoreForm.section = localForm.section;
    if (localForm.titleSi) firestoreForm.titleSi = localForm.titleSi;
    if (localForm.titleTa) firestoreForm.titleTa = localForm.titleTa;
    if (localForm.description) firestoreForm.description = localForm.description;
    if (localForm.descriptionSi) firestoreForm.descriptionSi = localForm.descriptionSi;
    if (localForm.descriptionTa) firestoreForm.descriptionTa = localForm.descriptionTa;
    if (Object.keys(thumbnails).length > 0) firestoreForm.thumbnails = thumbnails;
    if (localForm.contactInfo) {
      // Filter out undefined values from contactInfo as well
      const cleanContactInfo: Record<string, unknown> = {};
      if (localForm.contactInfo.address) cleanContactInfo.address = localForm.contactInfo.address;
      if (localForm.contactInfo.officeHours) cleanContactInfo.officeHours = localForm.contactInfo.officeHours;
      if (localForm.contactInfo.telephoneNumbers?.length) cleanContactInfo.telephoneNumbers = localForm.contactInfo.telephoneNumbers;
      if (localForm.contactInfo.faxNumber) cleanContactInfo.faxNumber = localForm.contactInfo.faxNumber;
      if (localForm.contactInfo.email) cleanContactInfo.email = localForm.contactInfo.email;
      if (localForm.contactInfo.website) cleanContactInfo.website = localForm.contactInfo.website;
      if (localForm.contactInfo.officialLocation) cleanContactInfo.officialLocation = localForm.contactInfo.officialLocation;
      if (Object.keys(cleanContactInfo).length > 0) firestoreForm.contactInfo = cleanContactInfo;
    }

    // Create form in Firestore
    const formId = await createForm(firestoreForm as Omit<FirebaseForm, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'>);

    // Save form fields to database
    if (localForm.fields && localForm.fields.length > 0) {
      updateStatus({ currentStep: 'Saving form fields...', progress: 90 });

      for (let i = 0; i < localForm.fields.length; i++) {
        const field = localForm.fields[i];
        await addFormField(formId, {
          type: field.type as 'text' | 'textarea' | 'number' | 'date' | 'email' | 'phone' | 'checkbox' | 'radio' | 'select' | 'signature',
          label: field.labelEn, // Use English label as primary
          labelSi: field.labelSi,
          labelTa: field.labelTa,
          placeholder: field.placeholder,
          placeholderSi: field.placeholderSi,
          placeholderTa: field.placeholderTa,
          helpText: field.helpText,
          helpTextSi: field.helpTextSi,
          helpTextTa: field.helpTextTa,
          required: field.required,
          options: field.options?.map(opt => ({ value: opt, label: opt })),
          position: field.position ? {
            page: field.page, // Include page number in position
            x: field.position.x,
            y: field.position.y,
            width: field.position.width,
            height: field.position.height,
            fontSize: field.position.fontSize,
            align: field.position.align,
          } : undefined,
          order: i,
        });
      }
    }

    updateStatus({ state: 'completed', currentStep: 'Upload complete!', progress: 100 });

    // Update local status and optionally remove
    updateLocalFormStatus(localForm.id, 'completed');

    return formId;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    updateStatus({
      state: 'error',
      currentStep: 'Upload failed',
      error: errorMessage,
    });
    updateLocalFormStatus(localForm.id, 'error', errorMessage);
    throw error;
  }
}

// Retry failed upload
export async function retryUpload(
  formId: string,
  onStatus?: UploadStatusCallback
): Promise<string> {
  const localForm = getLocalForm(formId);
  if (!localForm) {
    throw new Error('Form not found in local storage');
  }

  return uploadFormToFirebase(localForm, onStatus);
}

// Get pending uploads (forms that haven't been uploaded to Firebase yet)
export function getPendingUploads(): LocalFormData[] {
  return getLocalForms().filter(f => f.uploadStatus !== 'completed');
}

// Generate a unique form ID
export function generateFormId(): string {
  return `form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
