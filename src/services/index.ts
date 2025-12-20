// Services index - uses unified layer for local/Firebase switching

import { isLocalStorage } from '../lib/serviceConfig';

// Forms service - from unified layer
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
} from './unified/forms';

// Categories service - from unified layer
export {
  getCategories,
  getCategory,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryLocalizedName,
  getCategoryLocalizedDescription,
} from './unified/categories';

// Institutions service - from unified layer
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
} from './unified/institutions';

// Auth service - from unified layer
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
} from './unified/auth';

// Storage service - from unified layer
export {
  uploadFormPdf,
  uploadFormThumbnails,
  deleteFormFiles,
  getFormPdfPath,
  getFileAsDataUrl,
  getFileAsBlob,
  getDownloadUrl,
} from './unified/storage';
export type { UploadProgress, UploadProgressCallback } from './storage';

// Re-export storage config helpers
export { isLocalStorage, isFirebaseStorage, STORAGE_BACKEND } from '../lib/serviceConfig';

// Local database seeding (only in local mode)
export { seedLocalDatabase, isLocalDatabaseSeeded, clearLocalDatabase, resetLocalDatabase } from './local/seedLocalDb';

// Database backup/restore (only in local mode)
export { exportDatabase, importDatabase, getDatabaseInfo } from '../lib/localDb';

// Full backup (database + files) - only in local mode
export {
  createFullBackup,
  restoreFullBackup,
  getBackupStats,
  downloadBackup,
} from './local/backup';

// Sync local data to Firebase - only in local mode
export { syncToFirebase } from './local/syncToFirebase';
export type { SyncProgress, SyncProgressCallback } from './local/syncToFirebase';

// ========================================
// Institution Intelligence Module
// ========================================

// Divisions service
export {
  getDivisions,
  getAllDivisions,
  getDivision,
  getDivisionBySlug,
  createDivision,
  updateDivision,
  deleteDivision,
  hardDeleteDivision,
  bulkCreateDivisions,
  getOrCreateDivision,
  updateDivisionContactCount,
} from './local/divisions';

// Contacts service
export {
  getContactsByDivision,
  getContactsByInstitution,
  getAllContacts,
  getContact,
  getContactByEmail,
  getHeadContacts,
  createContact,
  updateContact,
  deleteContact,
  hardDeleteContact,
  bulkCreateContacts,
  deleteAllContactsForInstitution,
  getContactHierarchy,
  detectHierarchyLevel,
  isHeadPosition,
} from './local/contacts';

// Institution Intelligence types
export type {
  Division,
  CreateDivisionInput,
  UpdateDivisionInput,
  Contact,
  CreateContactInput,
  UpdateContactInput,
  InstitutionSyncLog,
  CreateSyncLogInput,
  InstitutionSyncSettings,
  ApiUsage,
  CreateApiUsageInput,
  ApiBudgetSettings,
  UpdateApiBudgetInput,
  BudgetStatus,
  ExtractedContact,
  ExtractedData,
  ScrapeResult,
  SyncPhase,
  SyncProgressState,
  ImportOptions,
} from '../types/institution-intel';

// Claude AI Scraper service
export {
  scrapeInstitutionWebsite,
  extractContactsWithClaude,
  generateContentHash,
  getMonthlyApiUsage,
  getApiBudgetSettings,
  updateApiBudgetSettings,
  checkBudgetAllowsSync,
  convertExtractedToContactInputs,
  logSyncOperation,
  getSyncHistory,
} from './local/scraper';

// Sync Orchestrator service
export {
  preSyncCheck,
  fetchAndExtract,
  importContacts,
  fullSync,
  getInstitutionSyncSettings,
  updateInstitutionSyncSettings,
  getInstitutionSyncStatus,
  institutionNeedsSync,
  getInstitutionsNeedingSync,
} from './local/syncOrchestrator';
export type { SyncProgressCallback, SyncResult } from './local/syncOrchestrator';

// ========================================
// Firebase-only services (not yet migrated to local)
// These will use Firebase even in local mode
// ========================================

// Drafts service
export {
  getUserDrafts,
  getDraft,
  getDraftForForm,
  saveDraft,
  deleteDraft,
  deleteDraftsForForm,
  calculateCompletion,
} from './drafts';

// Submissions service
export {
  getUserSubmissions,
  getSubmission,
  getSubmissionsForForm,
  createSubmission,
  updateSubmissionStatus,
  updateSubmissionPdf,
  deleteSubmission,
  getRecentSubmissionsCount,
} from './submissions';

// Analytics service
export {
  trackEvent,
  trackFormView,
  trackFormDownload,
  trackFillStart,
  trackFillComplete,
  trackSearch,
  trackCategoryView,
  trackInstitutionView,
} from './analytics';

// Admin service
export {
  createSuperAdmin,
  promoteToAdmin,
  promoteToSuperAdmin,
  setInstitutionAdmin,
  demoteToUser,
  getAdminUsers,
  hasSuperAdmin,
  getUserByPhone,
  updateUserRole,
} from './admin';

// Form upload service
export {
  saveFormLocally,
  getLocalForms,
  getLocalForm,
  removeLocalForm,
  updateLocalFormStatus,
  uploadFormToFirebase,
  retryUpload,
  getPendingUploads,
  generateFormId,
} from './formUpload';
export type { FormUploadStatus, UploadStatusCallback, LocalFormData } from './formUpload';

// Log storage mode on load
if (import.meta.env.DEV) {
  console.log(`[Services] Storage backend: ${isLocalStorage() ? 'LOCAL (SQLite)' : 'FIREBASE'}`);
}
