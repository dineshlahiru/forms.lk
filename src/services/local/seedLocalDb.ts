// Seed the local SQLite database with sample data

import { initDatabase, saveDatabase, nowTimestamp, toJson } from '../../lib/localDb';
import { categoriesSeed } from '../../seed/categories';
import { institutionsSeed } from '../../seed/institutions';

export interface LocalSeedResult {
  success: boolean;
  categoriesSeeded: number;
  institutionsSeeded: number;
  errors: string[];
}

// Check if local database is already seeded
export async function isLocalDatabaseSeeded(): Promise<boolean> {
  try {
    const db = await initDatabase();
    const result = db.exec(`SELECT COUNT(*) as count FROM categories`);
    if (result.length > 0 && result[0].values.length > 0) {
      return (result[0].values[0][0] as number) > 0;
    }
    return false;
  } catch {
    return false;
  }
}

// Seed categories to local database
async function seedLocalCategories(): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;
  const db = await initDatabase();
  const now = nowTimestamp();

  for (const category of categoriesSeed) {
    try {
      db.run(
        `INSERT OR REPLACE INTO categories (
          id, slug, name, name_si, name_ta, description, description_si, description_ta,
          icon, color, display_order, form_count, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          category.id,
          category.slug,
          category.name,
          category.nameSi || null,
          category.nameTa || null,
          category.description || null,
          category.descriptionSi || null,
          category.descriptionTa || null,
          category.icon,
          category.color || null,
          category.order || 0,
          category.formCount || 0,
          category.isActive ? 1 : 0,
          now,
          now,
        ]
      );
      count++;
    } catch (error) {
      errors.push(`Failed to seed category ${category.id}: ${error}`);
    }
  }

  return { count, errors };
}

// Seed institutions to local database
async function seedLocalInstitutions(): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;
  const db = await initDatabase();
  const now = nowTimestamp();

  for (const institution of institutionsSeed) {
    try {
      db.run(
        `INSERT OR REPLACE INTO institutions (
          id, name, name_si, name_ta, description, description_si, description_ta,
          type, parent_institution_id, website, email, phone, telephone_numbers,
          address, office_hours, logo_url, form_count, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          institution.id,
          institution.name,
          institution.nameSi || null,
          institution.nameTa || null,
          institution.description || null,
          institution.descriptionSi || null,
          institution.descriptionTa || null,
          institution.type || 'other',
          institution.parentInstitutionId || null,
          institution.website || null,
          institution.email || null,
          institution.phone || null,
          toJson(institution.telephoneNumbers || []),
          institution.address || null,
          institution.officeHours || null,
          institution.logoUrl || null,
          institution.formCount || 0,
          institution.isActive ? 1 : 0,
          now,
          now,
        ]
      );
      count++;
    } catch (error) {
      errors.push(`Failed to seed institution ${institution.id}: ${error}`);
    }
  }

  return { count, errors };
}

// Main seed function for local database
export async function seedLocalDatabase(force: boolean = false): Promise<LocalSeedResult> {
  const result: LocalSeedResult = {
    success: false,
    categoriesSeeded: 0,
    institutionsSeeded: 0,
    errors: [],
  };

  // Check if already seeded
  if (!force) {
    const seeded = await isLocalDatabaseSeeded();
    if (seeded) {
      result.errors.push('Local database is already seeded. Use force=true to reseed.');
      return result;
    }
  }

  try {
    // Ensure database is initialized
    await initDatabase();

    // Seed categories
    console.log('[Local Seed] Seeding categories...');
    const categoriesResult = await seedLocalCategories();
    result.categoriesSeeded = categoriesResult.count;
    result.errors.push(...categoriesResult.errors);

    // Seed institutions
    console.log('[Local Seed] Seeding institutions...');
    const institutionsResult = await seedLocalInstitutions();
    result.institutionsSeeded = institutionsResult.count;
    result.errors.push(...institutionsResult.errors);

    // Save database to IndexedDB
    await saveDatabase();

    // Determine overall success
    result.success =
      result.categoriesSeeded > 0 &&
      result.institutionsSeeded > 0 &&
      result.errors.length === 0;

    console.log('[Local Seed] Seeding complete:', result);
  } catch (error) {
    result.errors.push(`Failed to seed local database: ${error}`);
  }

  return result;
}

// Clear all data from local database
export async function clearLocalDatabase(): Promise<void> {
  const db = await initDatabase();

  // Clear all tables
  db.run(`DELETE FROM analytics_events`);
  db.run(`DELETE FROM drafts`);
  db.run(`DELETE FROM submissions`);
  db.run(`DELETE FROM form_fields`);
  db.run(`DELETE FROM forms`);
  db.run(`DELETE FROM categories`);
  db.run(`DELETE FROM institutions`);
  db.run(`DELETE FROM users`);
  db.run(`DELETE FROM system_config`);

  await saveDatabase();
  console.log('[Local Seed] Database cleared');
}

// Reset and reseed the database
export async function resetLocalDatabase(): Promise<LocalSeedResult> {
  await clearLocalDatabase();
  return seedLocalDatabase(true);
}
