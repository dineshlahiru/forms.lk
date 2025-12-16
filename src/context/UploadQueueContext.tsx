import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getLocalForms,
  getLocalForm,
  uploadFormToFirebase,
  updateLocalFormStatus,
  removeLocalForm,
  type LocalFormData,
  type FormUploadStatus,
} from '../services';
import { invalidateCacheByType } from '../lib/cache';

interface UploadQueueContextType {
  // Queue state
  pendingUploads: LocalFormData[];
  currentUpload: FormUploadStatus | null;
  isUploading: boolean;

  // Actions
  startUpload: (formId: string) => void;
  retryUpload: (formId: string) => void;
  cancelUpload: (formId: string) => void;
  refreshQueue: () => void;
}

const UploadQueueContext = createContext<UploadQueueContextType | null>(null);

export function UploadQueueProvider({ children }: { children: React.ReactNode }) {
  const [pendingUploads, setPendingUploads] = useState<LocalFormData[]>([]);
  const [currentUpload, setCurrentUpload] = useState<FormUploadStatus | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadingRef = useRef(false);
  const queueRef = useRef<string[]>([]);

  // Load pending uploads from localStorage
  const refreshQueue = useCallback(() => {
    try {
      const forms = getLocalForms().filter(f => f.uploadStatus !== 'completed');
      setPendingUploads(forms);
    } catch (error) {
      console.error('Error loading pending uploads:', error);
      setPendingUploads([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  // Process upload queue
  const processQueue = useCallback(async () => {
    if (uploadingRef.current || queueRef.current.length === 0) return;

    uploadingRef.current = true;
    setIsUploading(true);

    while (queueRef.current.length > 0) {
      const formId = queueRef.current[0];
      const localForm = getLocalForm(formId);

      if (!localForm) {
        queueRef.current.shift();
        continue;
      }

      try {
        setCurrentUpload({
          formId,
          state: 'pending',
          progress: 0,
          currentStep: 'Starting upload...',
          retryCount: 0,
        });

        await uploadFormToFirebase(localForm, (status) => {
          setCurrentUpload(status);
        });

        // Success - remove from queue and localStorage
        queueRef.current.shift();
        removeLocalForm(formId);

        // Invalidate forms cache so new form appears
        invalidateCacheByType('forms');

        setCurrentUpload({
          formId,
          state: 'completed',
          progress: 100,
          currentStep: 'Upload complete!',
          retryCount: 0,
        });

        // Clear success status after 3 seconds
        setTimeout(() => {
          setCurrentUpload(null);
        }, 3000);

      } catch (error) {
        console.error('Upload failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        updateLocalFormStatus(formId, 'error', errorMessage);

        setCurrentUpload({
          formId,
          state: 'error',
          progress: 0,
          currentStep: 'Upload failed',
          error: errorMessage,
          retryCount: 0,
        });

        // Remove from queue (user can manually retry)
        queueRef.current.shift();
      }

      refreshQueue();
    }

    uploadingRef.current = false;
    setIsUploading(false);
  }, [refreshQueue]);

  // Start upload for a specific form
  const startUpload = useCallback((formId: string) => {
    if (!queueRef.current.includes(formId)) {
      queueRef.current.push(formId);
      updateLocalFormStatus(formId, 'uploading');
      refreshQueue();
      processQueue();
    }
  }, [processQueue, refreshQueue]);

  // Retry failed upload
  const retryUpload = useCallback((formId: string) => {
    updateLocalFormStatus(formId, 'pending');
    startUpload(formId);
  }, [startUpload]);

  // Cancel/remove upload from queue
  const cancelUpload = useCallback((formId: string) => {
    queueRef.current = queueRef.current.filter(id => id !== formId);
    removeLocalForm(formId);
    refreshQueue();
    if (currentUpload?.formId === formId) {
      setCurrentUpload(null);
    }
  }, [currentUpload, refreshQueue]);

  // Auto-start pending uploads on mount
  useEffect(() => {
    try {
      const pending = getLocalForms().filter(f => f.uploadStatus === 'pending' || f.uploadStatus === 'uploading');
      pending.forEach(form => {
        if (!queueRef.current.includes(form.id)) {
          queueRef.current.push(form.id);
        }
      });
      if (queueRef.current.length > 0) {
        processQueue();
      }
    } catch (error) {
      console.error('Error auto-starting pending uploads:', error);
    }
  }, [processQueue]);

  return (
    <UploadQueueContext.Provider
      value={{
        pendingUploads,
        currentUpload,
        isUploading,
        startUpload,
        retryUpload,
        cancelUpload,
        refreshQueue,
      }}
    >
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue() {
  const context = useContext(UploadQueueContext);
  if (!context) {
    throw new Error('useUploadQueue must be used within UploadQueueProvider');
  }
  return context;
}
