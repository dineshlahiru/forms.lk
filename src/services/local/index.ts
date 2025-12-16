// Local SQLite services index

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
  getLocalizedTitle as getFormLocalizedTitle,
  getLocalizedDescription as getFormLocalizedDescription,
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
  getLocalizedName as getCategoryLocalizedName,
  getLocalizedDescription as getCategoryLocalizedDescription,
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
  getLocalizedName as getInstitutionLocalizedName,
  getLocalizedDescription as getInstitutionLocalizedDescription,
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

// Re-export database utilities
export { initDatabase, saveDatabase, generateId, nowTimestamp } from '../../lib/localDb';
