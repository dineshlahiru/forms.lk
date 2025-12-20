// Division CRUD operations for local SQLite database

import { initDatabase, saveDatabase, generateId, nowTimestamp, parseJson, toJson, type SqlValue } from '../../lib/localDb';
import type { Division, CreateDivisionInput, UpdateDivisionInput } from '../../types/institution-intel';

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Map database row to Division type
function mapRowToDivision(row: SqlValue[], columns: string[]): Division {
  const obj: Record<string, SqlValue> = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });

  return {
    id: obj.id as string,
    institutionId: obj.institution_id as string,
    name: obj.name as string,
    nameSi: obj.name_si as string | undefined,
    nameTa: obj.name_ta as string | undefined,
    slug: obj.slug as string,
    description: obj.description as string | undefined,
    icon: obj.icon as string | undefined,
    color: obj.color as string | undefined,
    displayOrder: (obj.display_order as number) || 0,
    contactCount: (obj.contact_count as number) || 0,
    formCount: (obj.form_count as number) || 0,
    // Location info for district/branch offices
    address: obj.address as string | undefined,
    phones: parseJson<string[]>(obj.phones as string, []),
    fax: obj.fax as string | undefined,
    email: obj.email as string | undefined,
    locationType: obj.location_type as Division['locationType'],
    district: obj.district as string | undefined,
    isActive: Boolean(obj.is_active),
    createdAt: obj.created_at as string,
    updatedAt: obj.updated_at as string,
  };
}

// Get all divisions for an institution
export async function getDivisions(institutionId: string): Promise<Division[]> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT * FROM divisions WHERE institution_id = ? AND is_active = 1 ORDER BY display_order, name`,
    [institutionId]
  );

  if (!result.length) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => mapRowToDivision(row, columns));
}

// Get all divisions (for admin)
export async function getAllDivisions(): Promise<Division[]> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT * FROM divisions ORDER BY institution_id, display_order, name`
  );

  if (!result.length) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => mapRowToDivision(row, columns));
}

// Get a single division by ID
export async function getDivision(id: string): Promise<Division | null> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM divisions WHERE id = ?`, [id]);

  if (!result.length || !result[0].values.length) return null;

  return mapRowToDivision(result[0].values[0], result[0].columns);
}

// Get division by slug within an institution
export async function getDivisionBySlug(institutionId: string, slug: string): Promise<Division | null> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT * FROM divisions WHERE institution_id = ? AND slug = ?`,
    [institutionId, slug]
  );

  if (!result.length || !result[0].values.length) return null;

  return mapRowToDivision(result[0].values[0], result[0].columns);
}

// Create a new division
export async function createDivision(input: CreateDivisionInput): Promise<string> {
  const db = await initDatabase();
  const now = nowTimestamp();
  const id = generateId();
  const slug = input.slug || generateSlug(input.name);

  // Check for duplicate slug in institution
  const existing = await getDivisionBySlug(input.institutionId, slug);
  const finalSlug = existing ? `${slug}-${id.slice(0, 8)}` : slug;

  db.run(
    `INSERT INTO divisions (
      id, institution_id, name, name_si, name_ta, slug, description,
      icon, color, display_order, contact_count, form_count,
      address, phones, fax, email, location_type, district,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      input.institutionId,
      input.name,
      input.nameSi || null,
      input.nameTa || null,
      finalSlug,
      input.description || null,
      input.icon || null,
      input.color || null,
      input.displayOrder || 0,
      input.address || null,
      toJson(input.phones || []),
      input.fax || null,
      input.email || null,
      input.locationType || null,
      input.district || null,
      now,
      now,
    ]
  );

  await saveDatabase();
  console.log(`[Divisions] Created division: ${input.name} (${id})`);
  return id;
}

// Update a division
export async function updateDivision(id: string, input: UpdateDivisionInput): Promise<void> {
  const db = await initDatabase();
  const now = nowTimestamp();

  // Build dynamic update query
  const updates: string[] = ['updated_at = ?'];
  const values: SqlValue[] = [now];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.nameSi !== undefined) {
    updates.push('name_si = ?');
    values.push(input.nameSi || null);
  }
  if (input.nameTa !== undefined) {
    updates.push('name_ta = ?');
    values.push(input.nameTa || null);
  }
  if (input.slug !== undefined) {
    updates.push('slug = ?');
    values.push(input.slug);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description || null);
  }
  if (input.icon !== undefined) {
    updates.push('icon = ?');
    values.push(input.icon || null);
  }
  if (input.color !== undefined) {
    updates.push('color = ?');
    values.push(input.color || null);
  }
  if (input.displayOrder !== undefined) {
    updates.push('display_order = ?');
    values.push(input.displayOrder);
  }
  if (input.isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(input.isActive ? 1 : 0);
  }
  // Location info for district/branch offices
  if (input.address !== undefined) {
    updates.push('address = ?');
    values.push(input.address || null);
  }
  if (input.phones !== undefined) {
    updates.push('phones = ?');
    values.push(toJson(input.phones));
  }
  if (input.fax !== undefined) {
    updates.push('fax = ?');
    values.push(input.fax || null);
  }
  if (input.email !== undefined) {
    updates.push('email = ?');
    values.push(input.email || null);
  }
  if (input.locationType !== undefined) {
    updates.push('location_type = ?');
    values.push(input.locationType || null);
  }
  if (input.district !== undefined) {
    updates.push('district = ?');
    values.push(input.district || null);
  }

  values.push(id);

  db.run(`UPDATE divisions SET ${updates.join(', ')} WHERE id = ?`, values);
  await saveDatabase();
  console.log(`[Divisions] Updated division: ${id}`);
}

// Delete a division (soft delete)
export async function deleteDivision(id: string): Promise<void> {
  const db = await initDatabase();
  db.run(`UPDATE divisions SET is_active = 0, updated_at = ? WHERE id = ?`, [nowTimestamp(), id]);
  await saveDatabase();
  console.log(`[Divisions] Deleted division: ${id}`);
}

// Hard delete a division and all its contacts
export async function hardDeleteDivision(id: string): Promise<void> {
  const db = await initDatabase();
  // Contacts will be deleted automatically due to ON DELETE CASCADE
  db.run(`DELETE FROM divisions WHERE id = ?`, [id]);
  await saveDatabase();
  console.log(`[Divisions] Hard deleted division: ${id}`);
}

// Update contact count for a division
export async function updateDivisionContactCount(divisionId: string): Promise<void> {
  const db = await initDatabase();
  db.run(
    `UPDATE divisions SET contact_count = (
      SELECT COUNT(*) FROM contacts WHERE division_id = ? AND is_active = 1
    ), updated_at = ? WHERE id = ?`,
    [divisionId, nowTimestamp(), divisionId]
  );
  await saveDatabase();
}

// Bulk create divisions (for import)
export async function bulkCreateDivisions(
  institutionId: string,
  divisionNames: string[]
): Promise<Map<string, string>> {
  const db = await initDatabase();
  const now = nowTimestamp();
  const result = new Map<string, string>(); // name -> id

  for (const name of divisionNames) {
    const slug = generateSlug(name);

    // Check if already exists
    const existing = await getDivisionBySlug(institutionId, slug);
    if (existing) {
      result.set(name, existing.id);
      continue;
    }

    const id = generateId();
    db.run(
      `INSERT INTO divisions (
        id, institution_id, name, slug, display_order, contact_count, form_count,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 0, 1, ?, ?)`,
      [id, institutionId, name, slug, 0, now, now]
    );
    result.set(name, id);
  }

  await saveDatabase();
  console.log(`[Divisions] Bulk created ${result.size} divisions for institution ${institutionId}`);
  return result;
}

// Get or create a division by name
export async function getOrCreateDivision(institutionId: string, name: string): Promise<string> {
  const slug = generateSlug(name);
  const existing = await getDivisionBySlug(institutionId, slug);

  if (existing) {
    return existing.id;
  }

  return createDivision({ institutionId, name, slug });
}
