import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface UploadProgress {
  state: 'idle' | 'uploading' | 'completed' | 'error' | 'paused';
  progress: number; // 0-100
  bytesTransferred: number;
  totalBytes: number;
  downloadUrl?: string;
  error?: string;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

// Upload PDF to Firebase Storage
export async function uploadFormPdf(
  formId: string,
  language: string,
  pdfData: string | Blob | File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  // Create storage path: forms/{formId}/pdf_{language}.pdf
  const storagePath = `forms/${formId}/pdf_${language}.pdf`;
  const storageRef = ref(storage, storagePath);

  // Convert base64 to Blob if needed
  let blob: Blob;
  if (typeof pdfData === 'string') {
    // Remove data URL prefix if present
    const base64 = pdfData.includes(',') ? pdfData.split(',')[1] : pdfData;
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    blob = new Blob([byteArray], { type: 'application/pdf' });
  } else if (pdfData instanceof File) {
    blob = pdfData;
  } else {
    blob = pdfData;
  }

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'application/pdf',
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          state: snapshot.state === 'paused' ? 'paused' : 'uploading',
          progress,
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
        });
      },
      (error) => {
        onProgress?.({
          state: 'error',
          progress: 0,
          bytesTransferred: 0,
          totalBytes: 0,
          error: error.message,
        });
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.({
            state: 'completed',
            progress: 100,
            bytesTransferred: uploadTask.snapshot.totalBytes,
            totalBytes: uploadTask.snapshot.totalBytes,
            downloadUrl,
          });
          resolve(downloadUrl);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

// Upload thumbnail images to Firebase Storage
export async function uploadFormThumbnails(
  formId: string,
  language: string,
  thumbnails: string[], // Base64 images
  onProgress?: UploadProgressCallback
): Promise<string[]> {
  const uploadedUrls: string[] = [];
  const totalImages = thumbnails.length;

  for (let i = 0; i < thumbnails.length; i++) {
    const thumbnail = thumbnails[i];
    const storagePath = `forms/${formId}/thumbnails/${language}_page_${i + 1}.jpg`;
    const storageRef = ref(storage, storagePath);

    // Convert base64 to Blob
    const base64 = thumbnail.includes(',') ? thumbnail.split(',')[1] : thumbnail;
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let j = 0; j < byteCharacters.length; j++) {
      byteNumbers[j] = byteCharacters.charCodeAt(j);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg',
    });

    await new Promise<void>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const imageProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          const overallProgress = ((i + imageProgress / 100) / totalImages) * 100;
          onProgress?.({
            state: 'uploading',
            progress: overallProgress,
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
          });
        },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          uploadedUrls.push(url);
          resolve();
        }
      );
    });
  }

  return uploadedUrls;
}

// Delete form files from storage
export async function deleteFormFiles(formId: string): Promise<void> {
  // Note: Firebase Storage doesn't support directory deletion directly
  // You need to list and delete files individually or use Cloud Functions
  // For now, we'll delete known paths
  const languages = ['en', 'si', 'ta'];

  for (const lang of languages) {
    try {
      const pdfRef = ref(storage, `forms/${formId}/pdf_${lang}.pdf`);
      await deleteObject(pdfRef);
    } catch {
      // File might not exist, ignore
    }
  }
}

// Get storage path for a form PDF
export function getFormPdfPath(formId: string, language: string): string {
  return `forms/${formId}/pdf_${language}.pdf`;
}
