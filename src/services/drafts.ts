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
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { FirebaseDraft, Language } from '../types/firebase';

const DRAFTS_COLLECTION = 'drafts';

// Default expiry: 30 days
const DEFAULT_EXPIRY_DAYS = 30;

// Get user's drafts
export async function getUserDrafts(userId: string): Promise<FirebaseDraft[]> {
  const q = query(
    collection(db, DRAFTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseDraft));
}

// Get a specific draft
export async function getDraft(draftId: string): Promise<FirebaseDraft | null> {
  const docRef = doc(db, DRAFTS_COLLECTION, draftId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return { id: docSnap.id, ...docSnap.data() } as FirebaseDraft;
}

// Get draft for a specific form by user
export async function getDraftForForm(
  userId: string,
  formId: string
): Promise<FirebaseDraft | null> {
  const q = query(
    collection(db, DRAFTS_COLLECTION),
    where('userId', '==', userId),
    where('formId', '==', formId)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as FirebaseDraft;
}

// Create or update draft
export async function saveDraft(
  userId: string,
  formId: string,
  data: Record<string, unknown>,
  languageUsed: Language,
  completionPercentage: number = 0,
  lastFieldEdited?: string
): Promise<string> {
  // Check if draft exists
  const existingDraft = await getDraftForForm(userId, formId);

  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(
    now.toMillis() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  if (existingDraft) {
    // Update existing draft
    await updateDoc(doc(db, DRAFTS_COLLECTION, existingDraft.id), {
      data,
      languageUsed,
      completionPercentage,
      lastFieldEdited,
      updatedAt: now,
      expiresAt,
    });
    return existingDraft.id;
  } else {
    // Create new draft
    const docRef = await addDoc(collection(db, DRAFTS_COLLECTION), {
      userId,
      formId,
      data,
      languageUsed,
      completionPercentage,
      lastFieldEdited,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });
    return docRef.id;
  }
}

// Delete a draft
export async function deleteDraft(draftId: string): Promise<void> {
  const docRef = doc(db, DRAFTS_COLLECTION, draftId);
  await deleteDoc(docRef);
}

// Delete all drafts for a form
export async function deleteDraftsForForm(userId: string, formId: string): Promise<void> {
  const q = query(
    collection(db, DRAFTS_COLLECTION),
    where('userId', '==', userId),
    where('formId', '==', formId)
  );

  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

// Calculate completion percentage based on filled fields
export function calculateCompletion(
  data: Record<string, unknown>,
  totalFields: number
): number {
  if (totalFields === 0) return 0;

  const filledFields = Object.values(data).filter((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }).length;

  return Math.round((filledFields / totalFields) * 100);
}
