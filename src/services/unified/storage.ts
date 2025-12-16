// Unified storage service - switches between Firebase and Local based on config

import { isLocalStorage } from '../../lib/serviceConfig';

// Import both backends
import * as localStorage from '../local/storage';
import * as firebaseStorage from '../storage';

// Re-export types
export type { UploadProgress, UploadProgressCallback } from '../storage';

// Get the correct backend based on storage type
const backend = isLocalStorage() ? localStorage : firebaseStorage;

// Re-export all functions
export const uploadFormPdf = (
  formId: string,
  language: string,
  fileOrBase64: File | string,
  onProgress?: (progress: { bytesTransferred: number; totalBytes: number; progress: number }) => void
): Promise<string> => {
  if (isLocalStorage()) {
    // Local storage accepts both File and base64 string
    return (localStorage as typeof localStorage).uploadFormPdf(formId, language, fileOrBase64, onProgress);
  }
  // Firebase requires File object - convert base64 to File if needed
  if (typeof fileOrBase64 === 'string') {
    // Convert base64 to File for Firebase
    const byteString = atob(fileOrBase64.split(',')[1] || fileOrBase64);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const file = new File([blob], `pdf_${language}.pdf`, { type: 'application/pdf' });
    return (firebaseStorage as typeof firebaseStorage).uploadFormPdf(formId, language, file, onProgress);
  }
  return (firebaseStorage as typeof firebaseStorage).uploadFormPdf(formId, language, fileOrBase64, onProgress);
};

export const uploadFormThumbnails = (
  formId: string,
  language: string,
  thumbnails: string[],
  onProgress?: (progress: { bytesTransferred: number; totalBytes: number; progress: number }) => void
): Promise<string[]> => {
  if (isLocalStorage()) {
    return localStorage.uploadFormThumbnails(formId, language, thumbnails, onProgress);
  }
  return firebaseStorage.uploadFormThumbnails(formId, language, thumbnails, onProgress);
};

export const deleteFormFiles = (formId: string): Promise<void> => backend.deleteFormFiles(formId);

// getFormPdfPath has different signatures in each backend
// Local: takes a storagePath and returns it as-is
// Firebase: takes (formId, language) and constructs the path
export const getFormPdfPath = (formIdOrPath: string, language?: string): string => {
  if (isLocalStorage()) {
    return localStorage.getFormPdfPath(formIdOrPath);
  }
  // Firebase needs language parameter
  return firebaseStorage.getFormPdfPath(formIdOrPath, language || 'en');
};

// Local-only functions (gracefully no-op for Firebase)
export const getFileAsDataUrl = async (path: string): Promise<string | null> => {
  if (isLocalStorage()) {
    return (localStorage as typeof localStorage).getFileAsDataUrl(path);
  }
  // For Firebase, we'd need to get the download URL and fetch
  console.warn('[Storage] getFileAsDataUrl not implemented for Firebase');
  return null;
};

export const getFileAsBlob = async (path: string): Promise<Blob | null> => {
  if (isLocalStorage()) {
    return (localStorage as typeof localStorage).getFileAsBlob(path);
  }
  console.warn('[Storage] getFileAsBlob not implemented for Firebase');
  return null;
};

export const getDownloadUrl = async (path: string): Promise<string | null> => {
  if (isLocalStorage()) {
    return (localStorage as typeof localStorage).getDownloadUrl(path);
  }
  // For Firebase, use the Firebase storage getDownloadURL
  console.warn('[Storage] getDownloadUrl not implemented for Firebase in unified layer');
  return null;
};

export const storeRawFile = async (path: string, data: ArrayBuffer | Blob | string): Promise<void> => {
  if (isLocalStorage()) {
    return (localStorage as typeof localStorage).storeRawFile(path, data);
  }
  console.warn('[Storage] storeRawFile not implemented for Firebase');
};

export const fileExists = async (path: string): Promise<boolean> => {
  if (isLocalStorage()) {
    return (localStorage as typeof localStorage).fileExists(path);
  }
  console.warn('[Storage] fileExists not implemented for Firebase');
  return false;
};

export const listAllFiles = async (): Promise<string[]> => {
  if (isLocalStorage()) {
    return (localStorage as typeof localStorage).listAllFiles();
  }
  console.warn('[Storage] listAllFiles not implemented for Firebase');
  return [];
};

export const clearAllFiles = async (): Promise<void> => {
  if (isLocalStorage()) {
    return (localStorage as typeof localStorage).clearAllFiles();
  }
  console.warn('[Storage] clearAllFiles not implemented for Firebase');
};
