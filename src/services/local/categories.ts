import { initDatabase, saveDatabase, generateId, nowTimestamp, type SqlValue } from '../../lib/localDb';
import type { FirebaseCategory, Language } from '../../types/firebase';

// Convert DB row to FirebaseCategory
function rowToCategory(row: Record<string, unknown>): FirebaseCategory {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    nameSi: row.name_si as string | undefined,
    nameTa: row.name_ta as string | undefined,
    description: row.description as string | undefined,
    descriptionSi: row.description_si as string | undefined,
    descriptionTa: row.description_ta as string | undefined,
    icon: row.icon as string,
    color: row.color as string | undefined,
    order: (row.display_order as number) || 0,
    formCount: (row.form_count as number) || 0,
    isActive: Boolean(row.is_active),
    createdAt: { toDate: () => new Date(row.created_at as string) } as FirebaseCategory['createdAt'],
    updatedAt: { toDate: () => new Date(row.updated_at as string) } as FirebaseCategory['updatedAt'],
  };
}

// Get all active categories
export async function getCategories(): Promise<FirebaseCategory[]> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC`);
  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map((vals: unknown[]) => {
    const row = Object.fromEntries(columns.map((col: string, i: number) => [col, vals[i]]));
    return rowToCategory(row);
  });
}

// Get a single category by ID
export async function getCategory(categoryId: string): Promise<FirebaseCategory | null> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM categories WHERE id = ?`, [categoryId]);
  if (result.length === 0 || result[0].values.length === 0) return null;

  const columns = result[0].columns;
  const values = result[0].values[0];
  const row = Object.fromEntries(columns.map((col: string, i: number) => [col, values[i]]));
  return rowToCategory(row);
}

// Get a category by slug
export async function getCategoryBySlug(slug: string): Promise<FirebaseCategory | null> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM categories WHERE slug = ? AND is_active = 1 LIMIT 1`, [slug]);
  if (result.length === 0 || result[0].values.length === 0) return null;

  const columns = result[0].columns;
  const values = result[0].values[0];
  const row = Object.fromEntries(columns.map((col: string, i: number) => [col, values[i]]));
  return rowToCategory(row);
}

// Create a new category
export async function createCategory(
  categoryData: Omit<FirebaseCategory, 'id' | 'createdAt' | 'updatedAt' | 'formCount'>
): Promise<string> {
  const db = await initDatabase();
  const id = generateId();
  const now = nowTimestamp();

  db.run(
    `INSERT INTO categories (
      id, slug, name, name_si, name_ta, description, description_si, description_ta,
      icon, color, display_order, form_count, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      categoryData.slug,
      categoryData.name,
      categoryData.nameSi || null,
      categoryData.nameTa || null,
      categoryData.description || null,
      categoryData.descriptionSi || null,
      categoryData.descriptionTa || null,
      categoryData.icon,
      categoryData.color || null,
      categoryData.order || 0,
      0, // formCount
      categoryData.isActive ? 1 : 0,
      now,
      now,
    ]
  );

  await saveDatabase();
  return id;
}

// Update a category
export async function updateCategory(
  categoryId: string,
  updates: Partial<Omit<FirebaseCategory, 'id' | 'createdAt'>>
): Promise<void> {
  const db = await initDatabase();
  const now = nowTimestamp();

  const setClauses: string[] = ['updated_at = ?'];
  const values: SqlValue[] = [now];

  if (updates.slug !== undefined) { setClauses.push('slug = ?'); values.push(updates.slug); }
  if (updates.name !== undefined) { setClauses.push('name = ?'); values.push(updates.name); }
  if (updates.nameSi !== undefined) { setClauses.push('name_si = ?'); values.push(updates.nameSi ?? null); }
  if (updates.nameTa !== undefined) { setClauses.push('name_ta = ?'); values.push(updates.nameTa ?? null); }
  if (updates.description !== undefined) { setClauses.push('description = ?'); values.push(updates.description ?? null); }
  if (updates.descriptionSi !== undefined) { setClauses.push('description_si = ?'); values.push(updates.descriptionSi ?? null); }
  if (updates.descriptionTa !== undefined) { setClauses.push('description_ta = ?'); values.push(updates.descriptionTa ?? null); }
  if (updates.icon !== undefined) { setClauses.push('icon = ?'); values.push(updates.icon); }
  if (updates.color !== undefined) { setClauses.push('color = ?'); values.push(updates.color ?? null); }
  if (updates.order !== undefined) { setClauses.push('display_order = ?'); values.push(updates.order); }
  if (updates.formCount !== undefined) { setClauses.push('form_count = ?'); values.push(updates.formCount); }
  if (updates.isActive !== undefined) { setClauses.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }

  values.push(categoryId);
  db.run(`UPDATE categories SET ${setClauses.join(', ')} WHERE id = ?`, values);
  await saveDatabase();
}

// Delete a category
export async function deleteCategory(categoryId: string): Promise<void> {
  const db = await initDatabase();
  db.run(`DELETE FROM categories WHERE id = ?`, [categoryId]);
  await saveDatabase();
}

// Helper: Get localized name
export function getLocalizedName(category: FirebaseCategory, language: Language): string {
  if (language === 'si' && category.nameSi) return category.nameSi;
  if (language === 'ta' && category.nameTa) return category.nameTa;
  return category.name;
}

// Helper: Get localized description
export function getLocalizedDescription(category: FirebaseCategory, language: Language): string | undefined {
  if (language === 'si' && category.descriptionSi) return category.descriptionSi;
  if (language === 'ta' && category.descriptionTa) return category.descriptionTa;
  return category.description;
}
