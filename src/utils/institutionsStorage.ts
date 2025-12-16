// Institutions Storage Utility
// Stores and manages government institutions for form digitizer

const STORAGE_KEY = 'forms-lk-institutions';

export interface Institution {
  id: string;
  name: string;
  address?: string;
  openingHours?: string;
  telephoneNumbers?: string[];
  email?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

// Get all institutions from localStorage
export function getInstitutions(): Institution[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('Failed to parse institutions from localStorage');
    return [];
  }
}

// Save institutions to localStorage
function saveInstitutions(institutions: Institution[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(institutions));
}

// Generate a unique institution ID
export function generateInstitutionId(): string {
  return `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Add a new institution
export function addInstitution(institution: Omit<Institution, 'id' | 'createdAt' | 'updatedAt'>): Institution {
  const institutions = getInstitutions();

  const newInstitution: Institution = {
    ...institution,
    id: generateInstitutionId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  institutions.push(newInstitution);
  saveInstitutions(institutions);

  return newInstitution;
}

// Update an existing institution
export function updateInstitution(id: string, updates: Partial<Omit<Institution, 'id' | 'createdAt'>>): Institution | null {
  const institutions = getInstitutions();
  const index = institutions.findIndex(inst => inst.id === id);

  if (index === -1) return null;

  institutions[index] = {
    ...institutions[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveInstitutions(institutions);
  return institutions[index];
}

// Delete an institution
export function deleteInstitution(id: string): boolean {
  const institutions = getInstitutions();
  const filtered = institutions.filter(inst => inst.id !== id);

  if (filtered.length === institutions.length) return false;

  saveInstitutions(filtered);
  return true;
}

// Get institution by ID
export function getInstitutionById(id: string): Institution | null {
  const institutions = getInstitutions();
  return institutions.find(inst => inst.id === id) || null;
}

// Get institution by name (case-insensitive)
export function getInstitutionByName(name: string): Institution | null {
  const institutions = getInstitutions();
  return institutions.find(inst => inst.name.toLowerCase() === name.toLowerCase()) || null;
}

// Search institutions by name
export function searchInstitutions(query: string): Institution[] {
  if (!query.trim()) return getInstitutions();

  const lowerQuery = query.toLowerCase();
  return getInstitutions().filter(inst =>
    inst.name.toLowerCase().includes(lowerQuery)
  );
}
