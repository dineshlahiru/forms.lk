// Local file storage using IndexedDB

const FILES_DB_NAME = 'forms_lk_files';
const FILES_STORE_NAME = 'files';

export type UploadProgress = {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
};

export type UploadProgressCallback = (progress: UploadProgress) => void;

// Helper to open IndexedDB for files
function openFilesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FILES_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(FILES_STORE_NAME)) {
        db.createObjectStore(FILES_STORE_NAME);
      }
    };
  });
}

// Store a file in IndexedDB
async function storeFile(path: string, data: Blob | ArrayBuffer | string): Promise<void> {
  const idb = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(FILES_STORE_NAME, 'readwrite');
    const store = tx.objectStore(FILES_STORE_NAME);
    const request = store.put(data, path);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Get a file from IndexedDB
async function getFile(path: string): Promise<Blob | ArrayBuffer | string | null> {
  const idb = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(FILES_STORE_NAME, 'readonly');
    const store = tx.objectStore(FILES_STORE_NAME);
    const request = store.get(path);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// Delete a file from IndexedDB
export async function deleteFile(path: string): Promise<void> {
  const idb = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(FILES_STORE_NAME, 'readwrite');
    const store = tx.objectStore(FILES_STORE_NAME);
    const request = store.delete(path);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Delete files by prefix
async function deleteFilesByPrefix(prefix: string): Promise<void> {
  const idb = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(FILES_STORE_NAME, 'readwrite');
    const store = tx.objectStore(FILES_STORE_NAME);
    const request = store.openCursor();

    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
  });
}

// Upload form PDF - accepts File or base64 string
export async function uploadFormPdf(
  formId: string,
  language: string,
  fileOrBase64: File | string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const path = `forms/${formId}/pdf_${language}.pdf`;

  let dataToStore: ArrayBuffer | string;
  let totalSize: number;

  if (typeof fileOrBase64 === 'string') {
    // It's a base64 string - store directly
    dataToStore = fileOrBase64;
    totalSize = fileOrBase64.length;
  } else {
    // It's a File object - convert to ArrayBuffer
    dataToStore = await fileOrBase64.arrayBuffer();
    totalSize = fileOrBase64.size;
  }

  // Simulate progress
  if (onProgress) {
    onProgress({ bytesTransferred: 0, totalBytes: totalSize, progress: 0 });
  }

  if (onProgress) {
    onProgress({ bytesTransferred: totalSize / 2, totalBytes: totalSize, progress: 50 });
  }

  await storeFile(path, dataToStore);

  if (onProgress) {
    onProgress({ bytesTransferred: totalSize, totalBytes: totalSize, progress: 100 });
  }

  return path;
}

// Upload form thumbnails
export async function uploadFormThumbnails(
  formId: string,
  language: string,
  thumbnails: string[],
  onProgress?: UploadProgressCallback
): Promise<string[]> {
  const paths: string[] = [];
  const total = thumbnails.length;

  for (let i = 0; i < thumbnails.length; i++) {
    const path = `forms/${formId}/thumb_${language}_${i}.jpg`;

    if (onProgress) {
      onProgress({
        bytesTransferred: i,
        totalBytes: total,
        progress: Math.round((i / total) * 100),
      });
    }

    // Store base64 thumbnail
    await storeFile(path, thumbnails[i]);
    paths.push(path);
  }

  if (onProgress) {
    onProgress({ bytesTransferred: total, totalBytes: total, progress: 100 });
  }

  return paths;
}

// Delete form files
export async function deleteFormFiles(formId: string): Promise<void> {
  await deleteFilesByPrefix(`forms/${formId}/`);
}

// Get form PDF path (for local storage, returns the same path)
export function getFormPdfPath(storagePath: string): string {
  return storagePath;
}

// Get file as data URL (for displaying)
export async function getFileAsDataUrl(path: string): Promise<string | null> {
  const data = await getFile(path);
  if (!data) return null;

  // If it's already a data URL string (like thumbnails)
  if (typeof data === 'string' && data.startsWith('data:')) {
    return data;
  }

  // If it's a Blob
  if (data instanceof Blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(data);
    });
  }

  // If it's an ArrayBuffer (PDF)
  if (data instanceof ArrayBuffer) {
    const blob = new Blob([data], { type: 'application/pdf' });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }

  return null;
}

// Get file as Blob (for downloads)
export async function getFileAsBlob(path: string): Promise<Blob | null> {
  const data = await getFile(path);
  if (!data) return null;

  // If it's already a Blob
  if (data instanceof Blob) {
    return data;
  }

  // If it's an ArrayBuffer
  if (data instanceof ArrayBuffer) {
    const isPdf = path.endsWith('.pdf');
    return new Blob([data], { type: isPdf ? 'application/pdf' : 'application/octet-stream' });
  }

  // If it's a data URL string
  if (typeof data === 'string' && data.startsWith('data:')) {
    const response = await fetch(data);
    return response.blob();
  }

  return null;
}

// Get download URL for a file (returns object URL)
export async function getDownloadUrl(path: string): Promise<string | null> {
  const blob = await getFileAsBlob(path);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

// Store raw file data
export async function storeRawFile(path: string, data: ArrayBuffer | Blob | string): Promise<void> {
  await storeFile(path, data);
}

// Check if file exists
export async function fileExists(path: string): Promise<boolean> {
  const data = await getFile(path);
  return data !== null;
}

// List all files (for debugging)
export async function listAllFiles(): Promise<string[]> {
  const idb = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(FILES_STORE_NAME, 'readonly');
    const store = tx.objectStore(FILES_STORE_NAME);
    const request = store.getAllKeys();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as string[]);
  });
}

// Clear all files (for debugging/reset)
export async function clearAllFiles(): Promise<void> {
  const idb = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(FILES_STORE_NAME, 'readwrite');
    const store = tx.objectStore(FILES_STORE_NAME);
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
