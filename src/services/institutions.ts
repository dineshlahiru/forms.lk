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
import type { FirebaseInstitution, Language } from '../types/firebase';

const INSTITUTIONS_COLLECTION = 'institutions';

// Get all active institutions
export async function getInstitutions(): Promise<FirebaseInstitution[]> {
  const q = query(
    collection(db, INSTITUTIONS_COLLECTION),
    where('isActive', '==', true),
    orderBy('name', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseInstitution));
}

// Get a single institution by ID
export async function getInstitution(institutionId: string): Promise<FirebaseInstitution | null> {
  const docRef = doc(db, INSTITUTIONS_COLLECTION, institutionId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return { id: docSnap.id, ...docSnap.data() } as FirebaseInstitution;
}

// Get institutions by type
export async function getInstitutionsByType(
  type: FirebaseInstitution['type']
): Promise<FirebaseInstitution[]> {
  const q = query(
    collection(db, INSTITUTIONS_COLLECTION),
    where('type', '==', type),
    where('isActive', '==', true),
    orderBy('name', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseInstitution));
}

// Get child institutions
export async function getChildInstitutions(
  parentInstitutionId: string
): Promise<FirebaseInstitution[]> {
  const q = query(
    collection(db, INSTITUTIONS_COLLECTION),
    where('parentInstitutionId', '==', parentInstitutionId),
    where('isActive', '==', true),
    orderBy('name', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseInstitution));
}

// Admin: Create a new institution
export async function createInstitution(
  institutionData: Omit<FirebaseInstitution, 'id' | 'createdAt' | 'updatedAt' | 'formCount'>
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, INSTITUTIONS_COLLECTION), {
    ...institutionData,
    formCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// Admin: Update an institution
export async function updateInstitution(
  institutionId: string,
  updates: Partial<Omit<FirebaseInstitution, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, INSTITUTIONS_COLLECTION, institutionId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// Admin: Delete an institution
export async function deleteInstitution(institutionId: string): Promise<void> {
  const docRef = doc(db, INSTITUTIONS_COLLECTION, institutionId);
  await deleteDoc(docRef);
}

// Helper: Get localized name
export function getLocalizedName(institution: FirebaseInstitution, language: Language): string {
  if (language === 'si' && institution.nameSi) return institution.nameSi;
  if (language === 'ta' && institution.nameTa) return institution.nameTa;
  return institution.name;
}

// Helper: Get localized description
export function getLocalizedDescription(
  institution: FirebaseInstitution,
  language: Language
): string | undefined {
  if (language === 'si' && institution.descriptionSi) return institution.descriptionSi;
  if (language === 'ta' && institution.descriptionTa) return institution.descriptionTa;
  return institution.description;
}
