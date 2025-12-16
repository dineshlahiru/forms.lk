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
import type { FirebaseCategory, Language } from '../types/firebase';

const CATEGORIES_COLLECTION = 'categories';

// Get all active categories
export async function getCategories(): Promise<FirebaseCategory[]> {
  const q = query(
    collection(db, CATEGORIES_COLLECTION),
    where('isActive', '==', true),
    orderBy('order', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseCategory));
}

// Get a single category by ID
export async function getCategory(categoryId: string): Promise<FirebaseCategory | null> {
  const docRef = doc(db, CATEGORIES_COLLECTION, categoryId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return { id: docSnap.id, ...docSnap.data() } as FirebaseCategory;
}

// Get a category by slug
export async function getCategoryBySlug(slug: string): Promise<FirebaseCategory | null> {
  const q = query(
    collection(db, CATEGORIES_COLLECTION),
    where('slug', '==', slug),
    where('isActive', '==', true)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as FirebaseCategory;
}

// Admin: Create a new category
export async function createCategory(
  categoryData: Omit<FirebaseCategory, 'id' | 'createdAt' | 'updatedAt' | 'formCount'>
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
    ...categoryData,
    formCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// Admin: Update a category
export async function updateCategory(
  categoryId: string,
  updates: Partial<Omit<FirebaseCategory, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, CATEGORIES_COLLECTION, categoryId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// Admin: Delete a category
export async function deleteCategory(categoryId: string): Promise<void> {
  const docRef = doc(db, CATEGORIES_COLLECTION, categoryId);
  await deleteDoc(docRef);
}

// Helper: Get localized name
export function getLocalizedName(category: FirebaseCategory, language: Language): string {
  if (language === 'si' && category.nameSi) return category.nameSi;
  if (language === 'ta' && category.nameTa) return category.nameTa;
  return category.name;
}

// Helper: Get localized description
export function getLocalizedDescription(
  category: FirebaseCategory,
  language: Language
): string | undefined {
  if (language === 'si' && category.descriptionSi) return category.descriptionSi;
  if (language === 'ta' && category.descriptionTa) return category.descriptionTa;
  return category.description;
}
