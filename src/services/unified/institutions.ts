// Unified institutions service - switches between Firebase and Local based on config

import { isLocalStorage } from '../../lib/serviceConfig';
import type { FirebaseInstitution, InstitutionType, Language } from '../../types/firebase';

// Import both backends
import * as localInstitutions from '../local/institutions';
import * as firebaseInstitutions from '../institutions';

// Get the correct backend
const backend = isLocalStorage() ? localInstitutions : firebaseInstitutions;

// Re-export all functions
export const getInstitutions = (): Promise<FirebaseInstitution[]> => backend.getInstitutions();

export const getInstitution = (institutionId: string): Promise<FirebaseInstitution | null> =>
  backend.getInstitution(institutionId);

export const getInstitutionsByType = (type: InstitutionType): Promise<FirebaseInstitution[]> =>
  backend.getInstitutionsByType(type);

export const getChildInstitutions = (parentId: string): Promise<FirebaseInstitution[]> =>
  backend.getChildInstitutions(parentId);

export const createInstitution = (
  institutionData: Omit<FirebaseInstitution, 'id' | 'createdAt' | 'updatedAt' | 'formCount'>
): Promise<string> => backend.createInstitution(institutionData);

export const updateInstitution = (
  institutionId: string,
  updates: Partial<Omit<FirebaseInstitution, 'id' | 'createdAt'>>
): Promise<void> => backend.updateInstitution(institutionId, updates);

export const deleteInstitution = (institutionId: string): Promise<void> =>
  backend.deleteInstitution(institutionId);

export const getLocalizedName = (institution: FirebaseInstitution, language: Language): string =>
  backend.getLocalizedName(institution, language);

export const getLocalizedDescription = (institution: FirebaseInstitution, language: Language): string | undefined =>
  backend.getLocalizedDescription(institution, language);

// Aliases for index exports
export const getInstitutionLocalizedName = getLocalizedName;
export const getInstitutionLocalizedDescription = getLocalizedDescription;
