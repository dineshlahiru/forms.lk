import { doc, setDoc, getDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { categoriesSeed } from './categories';
import { institutionsSeed } from './institutions';
import { systemConfigSeed, systemStatsSeed } from './system';

const CATEGORIES_COLLECTION = 'categories';
const INSTITUTIONS_COLLECTION = 'institutions';
const SYSTEM_COLLECTION = 'system';

export interface SeedResult {
  success: boolean;
  categoriesSeeded: number;
  institutionsSeeded: number;
  systemConfigSeeded: boolean;
  errors: string[];
}

// Check if database is already seeded
export async function isDatabaseSeeded(): Promise<boolean> {
  try {
    const configDoc = await getDoc(doc(db, SYSTEM_COLLECTION, 'config'));
    return configDoc.exists();
  } catch {
    return false;
  }
}

// Seed categories
async function seedCategories(): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  const batch = writeBatch(db);
  const now = Timestamp.now();

  for (const category of categoriesSeed) {
    try {
      const docRef = doc(db, CATEGORIES_COLLECTION, category.id);
      batch.set(docRef, {
        ...category,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    } catch (error) {
      errors.push(`Failed to seed category ${category.id}: ${error}`);
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    errors.push(`Failed to commit categories batch: ${error}`);
    count = 0;
  }

  return { count, errors };
}

// Seed institutions
async function seedInstitutions(): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  const batch = writeBatch(db);
  const now = Timestamp.now();

  for (const institution of institutionsSeed) {
    try {
      const docRef = doc(db, INSTITUTIONS_COLLECTION, institution.id);
      batch.set(docRef, {
        ...institution,
        createdAt: now,
        updatedAt: now,
      });
      count++;
    } catch (error) {
      errors.push(`Failed to seed institution ${institution.id}: ${error}`);
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    errors.push(`Failed to commit institutions batch: ${error}`);
    count = 0;
  }

  return { count, errors };
}

// Seed system config
async function seedSystemConfig(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  const now = Timestamp.now();

  try {
    // Seed config document
    await setDoc(doc(db, SYSTEM_COLLECTION, 'config'), {
      ...systemConfigSeed,
      updatedAt: now,
    });

    // Seed stats document
    await setDoc(doc(db, SYSTEM_COLLECTION, 'stats'), {
      ...systemStatsSeed,
      updatedAt: now,
    });

    return { success: true, errors };
  } catch (error) {
    errors.push(`Failed to seed system config: ${error}`);
    return { success: false, errors };
  }
}

// Main seed function
export async function seedDatabase(force: boolean = false): Promise<SeedResult> {
  const result: SeedResult = {
    success: false,
    categoriesSeeded: 0,
    institutionsSeeded: 0,
    systemConfigSeeded: false,
    errors: [],
  };

  // Check if already seeded
  if (!force) {
    const seeded = await isDatabaseSeeded();
    if (seeded) {
      result.errors.push('Database is already seeded. Use force=true to reseed.');
      return result;
    }
  }

  // Seed categories
  console.log('Seeding categories...');
  const categoriesResult = await seedCategories();
  result.categoriesSeeded = categoriesResult.count;
  result.errors.push(...categoriesResult.errors);

  // Seed institutions
  console.log('Seeding institutions...');
  const institutionsResult = await seedInstitutions();
  result.institutionsSeeded = institutionsResult.count;
  result.errors.push(...institutionsResult.errors);

  // Seed system config
  console.log('Seeding system config...');
  const systemResult = await seedSystemConfig();
  result.systemConfigSeeded = systemResult.success;
  result.errors.push(...systemResult.errors);

  // Determine overall success
  result.success =
    result.categoriesSeeded > 0 &&
    result.institutionsSeeded > 0 &&
    result.systemConfigSeeded &&
    result.errors.length === 0;

  console.log('Seeding complete:', result);
  return result;
}

// Export for use in admin panel or CLI
export { categoriesSeed, institutionsSeed, systemConfigSeed, systemStatsSeed };
