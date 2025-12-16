import { initDatabase, saveDatabase, generateId, nowTimestamp, parseJson, toJson, type SqlValue } from '../../lib/localDb';
import type { FirebaseInstitution, InstitutionType, Language } from '../../types/firebase';

// Convert DB row to FirebaseInstitution
function rowToInstitution(row: Record<string, unknown>): FirebaseInstitution {
  return {
    id: row.id as string,
    name: row.name as string,
    nameSi: row.name_si as string | undefined,
    nameTa: row.name_ta as string | undefined,
    description: row.description as string | undefined,
    descriptionSi: row.description_si as string | undefined,
    descriptionTa: row.description_ta as string | undefined,
    type: (row.type as InstitutionType) || 'other',
    parentInstitutionId: row.parent_institution_id as string | undefined,
    website: row.website as string | undefined,
    email: row.email as string | undefined,
    phone: row.phone as string | undefined,
    telephoneNumbers: parseJson(row.telephone_numbers as string, []),
    address: row.address as string | undefined,
    officeHours: row.office_hours as string | undefined,
    logoUrl: row.logo_url as string | undefined,
    formCount: (row.form_count as number) || 0,
    isActive: Boolean(row.is_active),
    createdAt: { toDate: () => new Date(row.created_at as string) } as FirebaseInstitution['createdAt'],
    updatedAt: { toDate: () => new Date(row.updated_at as string) } as FirebaseInstitution['updatedAt'],
  };
}

// Get all active institutions
export async function getInstitutions(): Promise<FirebaseInstitution[]> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM institutions WHERE is_active = 1 ORDER BY name ASC`);
  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map((vals: unknown[]) => {
    const row = Object.fromEntries(columns.map((col: string, i: number) => [col, vals[i]]));
    return rowToInstitution(row);
  });
}

// Get a single institution by ID
export async function getInstitution(institutionId: string): Promise<FirebaseInstitution | null> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM institutions WHERE id = ?`, [institutionId]);
  if (result.length === 0 || result[0].values.length === 0) return null;

  const columns = result[0].columns;
  const values = result[0].values[0];
  const row = Object.fromEntries(columns.map((col: string, i: number) => [col, values[i]]));
  return rowToInstitution(row);
}

// Get institutions by type
export async function getInstitutionsByType(type: InstitutionType): Promise<FirebaseInstitution[]> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM institutions WHERE type = ? AND is_active = 1 ORDER BY name ASC`, [type]);
  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map((vals: unknown[]) => {
    const row = Object.fromEntries(columns.map((col: string, i: number) => [col, vals[i]]));
    return rowToInstitution(row);
  });
}

// Get child institutions
export async function getChildInstitutions(parentId: string): Promise<FirebaseInstitution[]> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT * FROM institutions WHERE parent_institution_id = ? AND is_active = 1 ORDER BY name ASC`,
    [parentId]
  );
  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map((vals: unknown[]) => {
    const row = Object.fromEntries(columns.map((col: string, i: number) => [col, vals[i]]));
    return rowToInstitution(row);
  });
}

// Create a new institution
export async function createInstitution(
  institutionData: Omit<FirebaseInstitution, 'id' | 'createdAt' | 'updatedAt' | 'formCount'>
): Promise<string> {
  const db = await initDatabase();
  const id = generateId();
  const now = nowTimestamp();

  db.run(
    `INSERT INTO institutions (
      id, name, name_si, name_ta, description, description_si, description_ta,
      type, parent_institution_id, website, email, phone, telephone_numbers,
      address, office_hours, logo_url, form_count, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      institutionData.name,
      institutionData.nameSi || null,
      institutionData.nameTa || null,
      institutionData.description || null,
      institutionData.descriptionSi || null,
      institutionData.descriptionTa || null,
      institutionData.type || 'other',
      institutionData.parentInstitutionId || null,
      institutionData.website || null,
      institutionData.email || null,
      institutionData.phone || null,
      toJson(institutionData.telephoneNumbers || []),
      institutionData.address || null,
      institutionData.officeHours || null,
      institutionData.logoUrl || null,
      0, // formCount
      institutionData.isActive ? 1 : 0,
      now,
      now,
    ]
  );

  await saveDatabase();
  return id;
}

// Update an institution
export async function updateInstitution(
  institutionId: string,
  updates: Partial<Omit<FirebaseInstitution, 'id' | 'createdAt'>>
): Promise<void> {
  const db = await initDatabase();
  const now = nowTimestamp();

  const setClauses: string[] = ['updated_at = ?'];
  const values: SqlValue[] = [now];

  if (updates.name !== undefined) { setClauses.push('name = ?'); values.push(updates.name); }
  if (updates.nameSi !== undefined) { setClauses.push('name_si = ?'); values.push(updates.nameSi ?? null); }
  if (updates.nameTa !== undefined) { setClauses.push('name_ta = ?'); values.push(updates.nameTa ?? null); }
  if (updates.description !== undefined) { setClauses.push('description = ?'); values.push(updates.description ?? null); }
  if (updates.descriptionSi !== undefined) { setClauses.push('description_si = ?'); values.push(updates.descriptionSi ?? null); }
  if (updates.descriptionTa !== undefined) { setClauses.push('description_ta = ?'); values.push(updates.descriptionTa ?? null); }
  if (updates.type !== undefined) { setClauses.push('type = ?'); values.push(updates.type); }
  if (updates.parentInstitutionId !== undefined) { setClauses.push('parent_institution_id = ?'); values.push(updates.parentInstitutionId ?? null); }
  if (updates.website !== undefined) { setClauses.push('website = ?'); values.push(updates.website ?? null); }
  if (updates.email !== undefined) { setClauses.push('email = ?'); values.push(updates.email ?? null); }
  if (updates.phone !== undefined) { setClauses.push('phone = ?'); values.push(updates.phone ?? null); }
  if (updates.telephoneNumbers !== undefined) { setClauses.push('telephone_numbers = ?'); values.push(toJson(updates.telephoneNumbers)); }
  if (updates.address !== undefined) { setClauses.push('address = ?'); values.push(updates.address ?? null); }
  if (updates.officeHours !== undefined) { setClauses.push('office_hours = ?'); values.push(updates.officeHours ?? null); }
  if (updates.logoUrl !== undefined) { setClauses.push('logo_url = ?'); values.push(updates.logoUrl ?? null); }
  if (updates.formCount !== undefined) { setClauses.push('form_count = ?'); values.push(updates.formCount); }
  if (updates.isActive !== undefined) { setClauses.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }

  values.push(institutionId);
  db.run(`UPDATE institutions SET ${setClauses.join(', ')} WHERE id = ?`, values);
  await saveDatabase();
}

// Delete an institution
export async function deleteInstitution(institutionId: string): Promise<void> {
  const db = await initDatabase();
  db.run(`DELETE FROM institutions WHERE id = ?`, [institutionId]);
  await saveDatabase();
}

// Helper: Get localized name
export function getLocalizedName(institution: FirebaseInstitution, language: Language): string {
  if (language === 'si' && institution.nameSi) return institution.nameSi;
  if (language === 'ta' && institution.nameTa) return institution.nameTa;
  return institution.name;
}

// Helper: Get localized description
export function getLocalizedDescription(institution: FirebaseInstitution, language: Language): string | undefined {
  if (language === 'si' && institution.descriptionSi) return institution.descriptionSi;
  if (language === 'ta' && institution.descriptionTa) return institution.descriptionTa;
  return institution.description;
}
