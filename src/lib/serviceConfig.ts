// Service configuration - controls whether to use Firebase or Local SQLite

export type StorageBackend = 'firebase' | 'local';

// Get the storage backend from environment variable
// Default to 'local' for faster development
export const STORAGE_BACKEND: StorageBackend =
  (import.meta.env.VITE_STORAGE_BACKEND as StorageBackend) || 'local';

// Helper to check if using local storage
export const isLocalStorage = (): boolean => STORAGE_BACKEND === 'local';

// Helper to check if using Firebase
export const isFirebaseStorage = (): boolean => STORAGE_BACKEND === 'firebase';

// Log the current storage backend on load
if (import.meta.env.DEV) {
  console.log(`[Storage Backend] Using: ${STORAGE_BACKEND}`);
}
