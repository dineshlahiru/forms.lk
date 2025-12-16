// Complete backup and restore functionality for local mode
// Backs up both SQLite database AND file storage

import { exportDatabase, importDatabase } from '../../lib/localDb';

const FILES_DB_NAME = 'forms_lk_files';
const FILES_STORE_NAME = 'files';

// Helper to convert Uint8Array to base64 without stack overflow
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000; // 32KB chunks
  let result = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    result += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(result);
}

interface BackupData {
  version: number;
  createdAt: string;
  database: string; // Base64 encoded SQLite database
  files: { path: string; data: string; type: string }[]; // Base64 encoded files
}

// Helper to open files IndexedDB
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

// Get all files from IndexedDB
async function getAllFiles(): Promise<{ path: string; data: string; type: string }[]> {
  const idb = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(FILES_STORE_NAME, 'readonly');
    const store = tx.objectStore(FILES_STORE_NAME);
    const files: { path: string; data: string; type: string }[] = [];

    const cursorRequest = store.openCursor();
    cursorRequest.onerror = () => reject(cursorRequest.error);
    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const path = cursor.key as string;
        const value = cursor.value;

        // Convert to base64 if needed
        let data: string;
        let type: string;

        if (value instanceof ArrayBuffer) {
          const bytes = new Uint8Array(value);
          data = uint8ArrayToBase64(bytes);
          type = 'arraybuffer';
        } else if (value instanceof Blob) {
          // This shouldn't happen in our implementation, but handle it
          type = 'blob';
          data = ''; // Will be handled separately
        } else if (typeof value === 'string') {
          data = value;
          type = 'string';
        } else {
          data = JSON.stringify(value);
          type = 'json';
        }

        files.push({ path, data, type });
        cursor.continue();
      } else {
        resolve(files);
      }
    };
  });
}

// Restore files to IndexedDB
async function restoreFiles(files: { path: string; data: string; type: string }[]): Promise<void> {
  const idb = await openFilesDB();

  for (const file of files) {
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(FILES_STORE_NAME, 'readwrite');
      const store = tx.objectStore(FILES_STORE_NAME);

      let value: ArrayBuffer | string;
      if (file.type === 'arraybuffer') {
        const binary = atob(file.data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        value = bytes.buffer;
      } else {
        value = file.data;
      }

      const request = store.put(value, file.path);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

// Clear all files from IndexedDB
async function clearFiles(): Promise<void> {
  const idb = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(FILES_STORE_NAME, 'readwrite');
    const store = tx.objectStore(FILES_STORE_NAME);
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Create a complete backup of database and files
 */
export async function createFullBackup(): Promise<Blob> {
  console.log('[Backup] Starting full backup...');

  // Export SQLite database
  const dbBlob = await exportDatabase();
  const dbArrayBuffer = await dbBlob.arrayBuffer();
  const dbBytes = new Uint8Array(dbArrayBuffer);
  const dbBase64 = uint8ArrayToBase64(dbBytes);

  // Export all files
  const files = await getAllFiles();

  const backup: BackupData = {
    version: 1,
    createdAt: new Date().toISOString(),
    database: dbBase64,
    files,
  };

  console.log(`[Backup] Backup created: ${files.length} files, DB size: ${dbBytes.length} bytes`);

  const jsonStr = JSON.stringify(backup);
  return new Blob([jsonStr], { type: 'application/json' });
}

/**
 * Restore from a full backup
 */
export async function restoreFullBackup(file: File): Promise<{ success: boolean; message: string }> {
  try {
    console.log('[Backup] Starting restore...');

    const text = await file.text();
    const backup: BackupData = JSON.parse(text);

    if (!backup.version || !backup.database) {
      return { success: false, message: 'Invalid backup file format' };
    }

    // Restore SQLite database
    const dbBinary = atob(backup.database);
    const dbBytes = new Uint8Array(dbBinary.length);
    for (let i = 0; i < dbBinary.length; i++) {
      dbBytes[i] = dbBinary.charCodeAt(i);
    }
    const dbBlob = new Blob([dbBytes]);
    const dbFile = new File([dbBlob], 'database.db');
    await importDatabase(dbFile);

    // Clear existing files and restore from backup
    await clearFiles();
    if (backup.files && backup.files.length > 0) {
      await restoreFiles(backup.files);
    }

    console.log(`[Backup] Restore complete: ${backup.files?.length || 0} files restored`);

    return {
      success: true,
      message: `Restored ${backup.files?.length || 0} files from backup created on ${new Date(backup.createdAt).toLocaleString()}`,
    };
  } catch (error) {
    console.error('[Backup] Restore failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during restore',
    };
  }
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
  databaseSizeKB: number;
  fileCount: number;
  totalFileSizeKB: number;
}> {
  // Get database size
  const dbBlob = await exportDatabase();
  const databaseSizeKB = Math.round(dbBlob.size / 1024);

  // Get files info
  const files = await getAllFiles();
  let totalFileSize = 0;
  for (const file of files) {
    totalFileSize += file.data.length;
  }
  const totalFileSizeKB = Math.round(totalFileSize / 1024);

  return {
    databaseSizeKB,
    fileCount: files.length,
    totalFileSizeKB,
  };
}

/**
 * Download backup as file
 */
export async function downloadBackup(): Promise<void> {
  const blob = await createFullBackup();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  a.download = `forms-backup-${date}-${time}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
