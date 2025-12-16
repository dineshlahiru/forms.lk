// Sync local data to Firebase
// This allows working locally and pushing to production when ready

import { isLocalStorage } from '../../lib/serviceConfig';
import { initDatabase } from '../../lib/localDb';
import type { FirebaseForm, FirebaseCategory, FirebaseInstitution } from '../../types/firebase';

// Import Firebase services directly (not unified layer)
import { createForm as createFirebaseForm, updateForm as updateFirebaseForm, getForm as getFirebaseForm } from '../forms';
import { createCategory as createFirebaseCategory, getCategory as getFirebaseCategory } from '../categories';
import { createInstitution as createFirebaseInstitution, getInstitution as getFirebaseInstitution } from '../institutions';
import { ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../lib/firebase';

// IndexedDB for files
const FILES_DB_NAME = 'forms_lk_files';
const FILES_STORE_NAME = 'files';

export interface SyncProgress {
  phase: 'categories' | 'institutions' | 'forms' | 'files' | 'complete';
  current: number;
  total: number;
  currentItem: string;
  errors: string[];
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

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
async function getAllLocalFiles(): Promise<Map<string, ArrayBuffer>> {
  const idb = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(FILES_STORE_NAME, 'readonly');
    const store = tx.objectStore(FILES_STORE_NAME);
    const files = new Map<string, ArrayBuffer>();

    const cursorRequest = store.openCursor();
    cursorRequest.onerror = () => reject(cursorRequest.error);
    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const path = cursor.key as string;
        const value = cursor.value;
        if (value instanceof ArrayBuffer) {
          files.set(path, value);
        }
        cursor.continue();
      } else {
        resolve(files);
      }
    };
  });
}

// Get local categories from SQLite
async function getLocalCategories(): Promise<FirebaseCategory[]> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM categories WHERE is_active = 1`);
  if (!result.length) return [];

  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return {
      id: obj.id as string,
      slug: obj.slug as string,
      name: obj.name as string,
      nameSi: obj.name_si as string | undefined,
      nameTa: obj.name_ta as string | undefined,
      description: obj.description as string | undefined,
      descriptionSi: obj.description_si as string | undefined,
      descriptionTa: obj.description_ta as string | undefined,
      icon: obj.icon as string,
      color: obj.color as string | undefined,
      displayOrder: obj.display_order as number,
      formCount: obj.form_count as number,
      isActive: true,
      createdAt: { toDate: () => new Date(obj.created_at as string) },
      updatedAt: { toDate: () => new Date(obj.updated_at as string) },
    } as unknown as FirebaseCategory;
  });
}

// Get local institutions from SQLite
async function getLocalInstitutions(): Promise<FirebaseInstitution[]> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM institutions WHERE is_active = 1`);
  if (!result.length) return [];

  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return {
      id: obj.id as string,
      name: obj.name as string,
      nameSi: obj.name_si as string | undefined,
      nameTa: obj.name_ta as string | undefined,
      description: obj.description as string | undefined,
      descriptionSi: obj.description_si as string | undefined,
      descriptionTa: obj.description_ta as string | undefined,
      type: obj.type as string,
      parentInstitutionId: obj.parent_institution_id as string | undefined,
      website: obj.website as string | undefined,
      email: obj.email as string | undefined,
      phone: obj.phone as string | undefined,
      telephoneNumbers: JSON.parse((obj.telephone_numbers as string) || '[]'),
      address: obj.address as string | undefined,
      officeHours: obj.office_hours as string | undefined,
      logoUrl: obj.logo_url as string | undefined,
      formCount: obj.form_count as number,
      isActive: true,
      createdAt: { toDate: () => new Date(obj.created_at as string) },
      updatedAt: { toDate: () => new Date(obj.updated_at as string) },
    } as unknown as FirebaseInstitution;
  });
}

// Get local forms from SQLite
async function getLocalFormsFromDb(): Promise<FirebaseForm[]> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM forms`);
  if (!result.length) return [];

  const columns = result[0].columns;
  return result[0].values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return {
      id: obj.id as string,
      formNumber: obj.form_number as string | undefined,
      section: obj.section as string | undefined,
      slug: obj.slug as string,
      title: obj.title as string,
      titleSi: obj.title_si as string | undefined,
      titleTa: obj.title_ta as string | undefined,
      description: obj.description as string | undefined,
      descriptionSi: obj.description_si as string | undefined,
      descriptionTa: obj.description_ta as string | undefined,
      categoryId: obj.category_id as string,
      institutionId: obj.institution_id as string,
      tags: JSON.parse((obj.tags as string) || '[]'),
      languages: JSON.parse((obj.languages as string) || '["en"]'),
      defaultLanguage: obj.default_language as string || 'en',
      pdfVariants: JSON.parse((obj.pdf_variants as string) || '{}'),
      thumbnails: JSON.parse((obj.thumbnails as string) || '{}'),
      isDigitized: Boolean(obj.is_digitized),
      hasOnlineFill: Boolean(obj.has_online_fill),
      contactInfo: obj.contact_info ? JSON.parse(obj.contact_info as string) : undefined,
      status: obj.status as string || 'draft',
      verificationLevel: (obj.verification_level as number) || 0,
      viewCount: (obj.view_count as number) || 0,
      downloadCount: (obj.download_count as number) || 0,
      fillCount: (obj.fill_count as number) || 0,
      createdBy: obj.created_by as string | undefined,
      createdAt: { toDate: () => new Date(obj.created_at as string), toMillis: () => new Date(obj.created_at as string).getTime() },
      updatedBy: obj.updated_by as string | undefined,
      updatedAt: { toDate: () => new Date(obj.updated_at as string), toMillis: () => new Date(obj.updated_at as string).getTime() },
      publishedAt: obj.published_at ? { toDate: () => new Date(obj.published_at as string) } : undefined,
    } as unknown as FirebaseForm;
  });
}

/**
 * Sync all local data to Firebase
 */
export async function syncToFirebase(onProgress?: SyncProgressCallback): Promise<{ success: boolean; message: string }> {
  if (!isLocalStorage()) {
    return { success: false, message: 'Sync is only available in local mode' };
  }

  const progress: SyncProgress = {
    phase: 'categories',
    current: 0,
    total: 0,
    currentItem: '',
    errors: [],
  };

  const updateProgress = (updates: Partial<SyncProgress>) => {
    Object.assign(progress, updates);
    onProgress?.(progress);
  };

  try {
    // 1. Sync Categories
    updateProgress({ phase: 'categories', currentItem: 'Loading categories...' });
    const localCategories = await getLocalCategories();
    updateProgress({ total: localCategories.length });

    for (let i = 0; i < localCategories.length; i++) {
      const cat = localCategories[i];
      updateProgress({ current: i + 1, currentItem: `Category: ${cat.name}` });

      try {
        // Check if exists in Firebase
        const existing = await getFirebaseCategory(cat.id);
        if (!existing) {
          await createFirebaseCategory({
            slug: cat.slug,
            name: cat.name,
            nameSi: cat.nameSi,
            nameTa: cat.nameTa,
            description: cat.description,
            descriptionSi: cat.descriptionSi,
            descriptionTa: cat.descriptionTa,
            icon: cat.icon,
            color: cat.color,
            displayOrder: cat.displayOrder,
          });
        }
      } catch (err) {
        progress.errors.push(`Category ${cat.name}: ${err}`);
      }
    }

    // 2. Sync Institutions
    updateProgress({ phase: 'institutions', current: 0, currentItem: 'Loading institutions...' });
    const localInstitutions = await getLocalInstitutions();
    updateProgress({ total: localInstitutions.length });

    for (let i = 0; i < localInstitutions.length; i++) {
      const inst = localInstitutions[i];
      updateProgress({ current: i + 1, currentItem: `Institution: ${inst.name}` });

      try {
        const existing = await getFirebaseInstitution(inst.id);
        if (!existing) {
          await createFirebaseInstitution({
            name: inst.name,
            nameSi: inst.nameSi,
            nameTa: inst.nameTa,
            description: inst.description,
            type: inst.type as 'ministry' | 'department' | 'authority' | 'board' | 'commission' | 'council' | 'corporation' | 'other',
            website: inst.website,
            email: inst.email,
            phone: inst.phone,
            telephoneNumbers: inst.telephoneNumbers,
            address: inst.address,
            officeHours: inst.officeHours,
          });
        }
      } catch (err) {
        progress.errors.push(`Institution ${inst.name}: ${err}`);
      }
    }

    // 3. Sync Files to Firebase Storage
    updateProgress({ phase: 'files', current: 0, currentItem: 'Loading files...' });
    const localFiles = await getAllLocalFiles();
    updateProgress({ total: localFiles.size });

    let fileIndex = 0;
    for (const [path, data] of localFiles) {
      fileIndex++;
      updateProgress({ current: fileIndex, currentItem: `File: ${path}` });

      try {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, data);
      } catch (err) {
        progress.errors.push(`File ${path}: ${err}`);
      }
    }

    // 4. Sync Forms
    updateProgress({ phase: 'forms', current: 0, currentItem: 'Loading forms...' });
    const localForms = await getLocalFormsFromDb();
    updateProgress({ total: localForms.length });

    for (let i = 0; i < localForms.length; i++) {
      const form = localForms[i];
      updateProgress({ current: i + 1, currentItem: `Form: ${form.title}` });

      try {
        const existing = await getFirebaseForm(form.id);
        if (existing) {
          // Update existing form
          await updateFirebaseForm(form.id, {
            title: form.title,
            titleSi: form.titleSi,
            titleTa: form.titleTa,
            description: form.description,
            descriptionSi: form.descriptionSi,
            descriptionTa: form.descriptionTa,
            categoryId: form.categoryId,
            institutionId: form.institutionId,
            tags: form.tags,
            pdfVariants: form.pdfVariants,
            thumbnails: form.thumbnails,
            status: form.status as 'draft' | 'published' | 'archived',
            verificationLevel: form.verificationLevel as 0 | 1 | 2 | 3,
          });
        } else {
          // Create new form
          await createFirebaseForm({
            formNumber: form.formNumber,
            section: form.section,
            slug: form.slug,
            title: form.title,
            titleSi: form.titleSi,
            titleTa: form.titleTa,
            description: form.description,
            descriptionSi: form.descriptionSi,
            descriptionTa: form.descriptionTa,
            categoryId: form.categoryId,
            institutionId: form.institutionId,
            tags: form.tags,
            languages: form.languages,
            defaultLanguage: form.defaultLanguage,
            pdfVariants: form.pdfVariants,
            thumbnails: form.thumbnails,
            isDigitized: form.isDigitized,
            hasOnlineFill: form.hasOnlineFill,
            contactInfo: form.contactInfo,
            status: form.status as 'draft' | 'published' | 'archived',
            verificationLevel: form.verificationLevel as 0 | 1 | 2 | 3,
          });
        }
      } catch (err) {
        progress.errors.push(`Form ${form.title}: ${err}`);
      }
    }

    updateProgress({ phase: 'complete', currentItem: 'Sync complete!' });

    const errorCount = progress.errors.length;
    if (errorCount > 0) {
      return {
        success: true,
        message: `Sync completed with ${errorCount} error(s). Check console for details.`,
      };
    }

    return {
      success: true,
      message: `Successfully synced ${localCategories.length} categories, ${localInstitutions.length} institutions, ${localForms.length} forms, and ${localFiles.size} files to Firebase.`,
    };
  } catch (error) {
    console.error('[Sync] Failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error during sync',
    };
  }
}
