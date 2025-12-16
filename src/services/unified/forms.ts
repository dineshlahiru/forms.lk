// Unified forms service - switches between Firebase and Local based on config

import { isLocalStorage } from '../../lib/serviceConfig';
import type { FirebaseForm, FirebaseFormField, FormStatus, Language } from '../../types/firebase';

// Import both backends
import * as localForms from '../local/forms';
import * as firebaseForms from '../forms';

// Get the correct backend
const backend = isLocalStorage() ? localForms : firebaseForms;

// Re-export all functions
export const getForm = (formId: string): Promise<FirebaseForm | null> => backend.getForm(formId);

export const getFormBySlug = (slug: string): Promise<FirebaseForm | null> => backend.getFormBySlug(slug);

export const getPublishedForms = (
  lastDoc?: unknown,
  pageSize?: number
): Promise<{ forms: FirebaseForm[]; lastDoc: unknown }> =>
  backend.getPublishedForms(lastDoc as never, pageSize);

export const getAllPublishedForms = (): Promise<FirebaseForm[]> => backend.getAllPublishedForms();

export const getFormsByCategory = (
  categoryId: string,
  lastDoc?: unknown,
  pageSize?: number
): Promise<{ forms: FirebaseForm[]; lastDoc: unknown }> =>
  backend.getFormsByCategory(categoryId, lastDoc as never, pageSize);

export const getFormsByInstitution = (
  institutionId: string,
  lastDoc?: unknown,
  pageSize?: number
): Promise<{ forms: FirebaseForm[]; lastDoc: unknown }> =>
  backend.getFormsByInstitution(institutionId, lastDoc as never, pageSize);

export const getPopularForms = (pageSize?: number): Promise<FirebaseForm[]> =>
  backend.getPopularForms(pageSize);

export const getFormFields = (formId: string): Promise<FirebaseFormField[]> =>
  backend.getFormFields(formId);

export const incrementViewCount = (formId: string): Promise<void> =>
  backend.incrementViewCount(formId);

export const incrementDownloadCount = (formId: string): Promise<void> =>
  backend.incrementDownloadCount(formId);

export const incrementFillCount = (formId: string): Promise<void> =>
  backend.incrementFillCount(formId);

export const createForm = (
  formData: Omit<FirebaseForm, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'downloadCount' | 'fillCount'>
): Promise<string> => backend.createForm(formData);

export const updateForm = (
  formId: string,
  updates: Partial<Omit<FirebaseForm, 'id' | 'createdAt'>>
): Promise<void> => backend.updateForm(formId, updates);

export const updateFormStatus = (formId: string, status: FormStatus): Promise<void> =>
  backend.updateFormStatus(formId, status);

export const deleteForm = (formId: string): Promise<void> => backend.deleteForm(formId);

export const addFormField = (
  formId: string,
  fieldData: Omit<FirebaseFormField, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => backend.addFormField(formId, fieldData);

export const updateFormField = (
  formId: string,
  fieldId: string,
  updates: Partial<Omit<FirebaseFormField, 'id' | 'createdAt'>>
): Promise<void> => backend.updateFormField(formId, fieldId, updates);

export const deleteFormField = (formId: string, fieldId: string): Promise<void> =>
  backend.deleteFormField(formId, fieldId);

export const getLocalizedTitle = (form: FirebaseForm, language: Language): string =>
  backend.getLocalizedTitle(form, language);

export const getLocalizedDescription = (form: FirebaseForm, language: Language): string | undefined =>
  backend.getLocalizedDescription(form, language);

export const searchForms = (forms: FirebaseForm[], searchQuery: string, language?: Language): FirebaseForm[] =>
  backend.searchForms(forms, searchQuery, language);

export const detectSearchLanguage = (query: string): Language =>
  backend.detectSearchLanguage(query);

// Aliases for index exports
export const getFormLocalizedTitle = getLocalizedTitle;
export const getFormLocalizedDescription = getLocalizedDescription;
