import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentSnapshot,
  increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { FirebaseForm, FirebaseFormField, FormStatus, Language } from '../types/firebase';

const FORMS_COLLECTION = 'forms';
const FIELDS_SUBCOLLECTION = 'fields';
const PAGE_SIZE = 20;

// Get a single form by ID
export async function getForm(formId: string): Promise<FirebaseForm | null> {
  const docRef = doc(db, FORMS_COLLECTION, formId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return { id: docSnap.id, ...docSnap.data() } as FirebaseForm;
}

// Get a form by slug
export async function getFormBySlug(slug: string): Promise<FirebaseForm | null> {
  const q = query(
    collection(db, FORMS_COLLECTION),
    where('slug', '==', slug),
    where('status', '==', 'published'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as FirebaseForm;
}

// Get published forms with pagination
export async function getPublishedForms(
  lastDoc?: DocumentSnapshot,
  pageSize: number = PAGE_SIZE
): Promise<{ forms: FirebaseForm[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    collection(db, FORMS_COLLECTION),
    where('status', '==', 'published'),
    orderBy('updatedAt', 'desc'),
    limit(pageSize)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const forms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseForm));
  const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

  return { forms, lastDoc: newLastDoc };
}

// Get forms by category
export async function getFormsByCategory(
  categoryId: string,
  lastDoc?: DocumentSnapshot,
  pageSize: number = PAGE_SIZE
): Promise<{ forms: FirebaseForm[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    collection(db, FORMS_COLLECTION),
    where('status', '==', 'published'),
    where('categoryId', '==', categoryId),
    orderBy('updatedAt', 'desc'),
    limit(pageSize)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const forms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseForm));
  const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

  return { forms, lastDoc: newLastDoc };
}

// Get forms by institution
export async function getFormsByInstitution(
  institutionId: string,
  lastDoc?: DocumentSnapshot,
  pageSize: number = PAGE_SIZE
): Promise<{ forms: FirebaseForm[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    collection(db, FORMS_COLLECTION),
    where('status', '==', 'published'),
    where('institutionId', '==', institutionId),
    orderBy('updatedAt', 'desc'),
    limit(pageSize)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const forms = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseForm));
  const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

  return { forms, lastDoc: newLastDoc };
}

// Get popular forms
export async function getPopularForms(pageSize: number = 10): Promise<FirebaseForm[]> {
  const q = query(
    collection(db, FORMS_COLLECTION),
    where('status', '==', 'published'),
    orderBy('downloadCount', 'desc'),
    limit(pageSize)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseForm));
}

// Get all published forms (for library page - client-side filtering)
export async function getAllPublishedForms(): Promise<FirebaseForm[]> {
  const q = query(
    collection(db, FORMS_COLLECTION),
    where('status', '==', 'published'),
    orderBy('updatedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseForm));
}

// Search forms by text (client-side search helper)
export function searchForms(
  forms: FirebaseForm[],
  searchQuery: string,
  _language: Language = 'en'
): FirebaseForm[] {
  if (!searchQuery.trim()) return forms;

  const query = searchQuery.toLowerCase().trim();

  return forms.filter((form) => {
    // Search in all language titles
    const matchesTitle =
      form.title.toLowerCase().includes(query) ||
      (form.titleSi && form.titleSi.toLowerCase().includes(query)) ||
      (form.titleTa && form.titleTa.toLowerCase().includes(query));

    // Search in descriptions
    const matchesDescription =
      (form.description && form.description.toLowerCase().includes(query)) ||
      (form.descriptionSi && form.descriptionSi.toLowerCase().includes(query)) ||
      (form.descriptionTa && form.descriptionTa.toLowerCase().includes(query));

    // Search in tags
    const matchesTags = form.tags.some(tag => tag.toLowerCase().includes(query));

    // Search in form number
    const matchesFormNumber = form.formNumber && form.formNumber.toLowerCase().includes(query);

    return matchesTitle || matchesDescription || matchesTags || matchesFormNumber;
  });
}

// Detect language of search query
export function detectSearchLanguage(query: string): Language {
  // Check for Sinhala characters (Unicode range: 0D80-0DFF)
  if (/[\u0D80-\u0DFF]/.test(query)) return 'si';
  // Check for Tamil characters (Unicode range: 0B80-0BFF)
  if (/[\u0B80-\u0BFF]/.test(query)) return 'ta';
  return 'en';
}

// Get form fields
export async function getFormFields(formId: string): Promise<FirebaseFormField[]> {
  const q = query(
    collection(db, FORMS_COLLECTION, formId, FIELDS_SUBCOLLECTION),
    orderBy('order', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseFormField));
}

// Increment form view count
export async function incrementViewCount(formId: string): Promise<void> {
  const docRef = doc(db, FORMS_COLLECTION, formId);
  await updateDoc(docRef, {
    viewCount: increment(1),
  });
}

// Increment form download count
export async function incrementDownloadCount(formId: string): Promise<void> {
  const docRef = doc(db, FORMS_COLLECTION, formId);
  await updateDoc(docRef, {
    downloadCount: increment(1),
  });
}

// Increment form fill count
export async function incrementFillCount(formId: string): Promise<void> {
  const docRef = doc(db, FORMS_COLLECTION, formId);
  await updateDoc(docRef, {
    fillCount: increment(1),
  });
}

// Admin: Create a new form
export async function createForm(
  formData: Omit<FirebaseForm, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'downloadCount' | 'fillCount'>
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, FORMS_COLLECTION), {
    ...formData,
    viewCount: 0,
    downloadCount: 0,
    fillCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// Admin: Update a form
export async function updateForm(
  formId: string,
  updates: Partial<Omit<FirebaseForm, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, FORMS_COLLECTION, formId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// Admin: Update form status
export async function updateFormStatus(formId: string, status: FormStatus): Promise<void> {
  const docRef = doc(db, FORMS_COLLECTION, formId);
  const updates: Record<string, unknown> = {
    status,
    updatedAt: Timestamp.now(),
  };

  if (status === 'published') {
    updates.publishedAt = Timestamp.now();
  }

  await updateDoc(docRef, updates);
}

// Admin: Delete a form
export async function deleteForm(formId: string): Promise<void> {
  const docRef = doc(db, FORMS_COLLECTION, formId);
  await deleteDoc(docRef);
}

// Admin: Add a field to a form
export async function addFormField(
  formId: string,
  fieldData: Omit<FirebaseFormField, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, FORMS_COLLECTION, formId, FIELDS_SUBCOLLECTION), {
    ...fieldData,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// Admin: Update a field
export async function updateFormField(
  formId: string,
  fieldId: string,
  updates: Partial<Omit<FirebaseFormField, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, FORMS_COLLECTION, formId, FIELDS_SUBCOLLECTION, fieldId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// Admin: Delete a field
export async function deleteFormField(formId: string, fieldId: string): Promise<void> {
  const docRef = doc(db, FORMS_COLLECTION, formId, FIELDS_SUBCOLLECTION, fieldId);
  await deleteDoc(docRef);
}

// Helper: Get localized title
export function getLocalizedTitle(form: FirebaseForm, language: Language): string {
  if (language === 'si' && form.titleSi) return form.titleSi;
  if (language === 'ta' && form.titleTa) return form.titleTa;
  return form.title;
}

// Helper: Get localized description
export function getLocalizedDescription(form: FirebaseForm, language: Language): string | undefined {
  if (language === 'si' && form.descriptionSi) return form.descriptionSi;
  if (language === 'ta' && form.descriptionTa) return form.descriptionTa;
  return form.description;
}
