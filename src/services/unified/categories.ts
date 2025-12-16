// Unified categories service - switches between Firebase and Local based on config

import { isLocalStorage } from '../../lib/serviceConfig';
import type { FirebaseCategory, Language } from '../../types/firebase';

// Import both backends
import * as localCategories from '../local/categories';
import * as firebaseCategories from '../categories';

// Get the correct backend
const backend = isLocalStorage() ? localCategories : firebaseCategories;

// Re-export all functions
export const getCategories = (): Promise<FirebaseCategory[]> => backend.getCategories();

export const getCategory = (categoryId: string): Promise<FirebaseCategory | null> =>
  backend.getCategory(categoryId);

export const getCategoryBySlug = (slug: string): Promise<FirebaseCategory | null> =>
  backend.getCategoryBySlug(slug);

export const createCategory = (
  categoryData: Omit<FirebaseCategory, 'id' | 'createdAt' | 'updatedAt' | 'formCount'>
): Promise<string> => backend.createCategory(categoryData);

export const updateCategory = (
  categoryId: string,
  updates: Partial<Omit<FirebaseCategory, 'id' | 'createdAt'>>
): Promise<void> => backend.updateCategory(categoryId, updates);

export const deleteCategory = (categoryId: string): Promise<void> =>
  backend.deleteCategory(categoryId);

export const getLocalizedName = (category: FirebaseCategory, language: Language): string =>
  backend.getLocalizedName(category, language);

export const getLocalizedDescription = (category: FirebaseCategory, language: Language): string | undefined =>
  backend.getLocalizedDescription(category, language);

// Aliases for index exports
export const getCategoryLocalizedName = getLocalizedName;
export const getCategoryLocalizedDescription = getLocalizedDescription;
