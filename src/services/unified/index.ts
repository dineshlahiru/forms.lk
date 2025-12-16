// Unified service layer - exports correct services based on environment

import { STORAGE_BACKEND } from '../../lib/serviceConfig';

// Forms service
export {
  getForm,
  getFormBySlug,
  getPublishedForms,
  getAllPublishedForms,
  getFormsByCategory,
  getFormsByInstitution,
  getPopularForms,
  getFormFields,
  incrementViewCount,
  incrementDownloadCount,
  incrementFillCount,
  createForm,
  updateForm,
  updateFormStatus,
  deleteForm,
  addFormField,
  updateFormField,
  deleteFormField,
  getFormLocalizedTitle,
  getFormLocalizedDescription,
  searchForms,
  detectSearchLanguage,
} from './forms';

// Categories service
export {
  getCategories,
  getCategory,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryLocalizedName,
  getCategoryLocalizedDescription,
} from './categories';

// Institutions service
export {
  getInstitutions,
  getInstitution,
  getInstitutionsByType,
  getChildInstitutions,
  createInstitution,
  updateInstitution,
  deleteInstitution,
  getInstitutionLocalizedName,
  getInstitutionLocalizedDescription,
} from './institutions';

// Auth service
export {
  initRecaptcha,
  clearRecaptcha,
  sendOtp,
  verifyOtp,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentUserProfile,
  updateUserProfile,
  addBookmark,
  removeBookmark,
  onAuthChange,
  hasRole,
  isAdmin,
  isSuperAdmin,
  devLogin,
} from './auth';

// Storage service
export {
  uploadFormPdf,
  uploadFormThumbnails,
  deleteFormFiles,
  getFormPdfPath,
  getFileAsDataUrl,
  getFileAsBlob,
  getDownloadUrl,
  storeRawFile,
  fileExists,
  listAllFiles,
  clearAllFiles,
} from './storage';
export type { UploadProgress, UploadProgressCallback } from './storage';

// Re-export config helpers
export { isLocalStorage, isFirebaseStorage, STORAGE_BACKEND } from '../../lib/serviceConfig';

// Log which backend is active
if (import.meta.env.DEV) {
  console.log(`[Services] Active backend: ${STORAGE_BACKEND}`);
}
