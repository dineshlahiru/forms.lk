// Contact CRUD operations for local SQLite database

import { initDatabase, saveDatabase, generateId, nowTimestamp, parseJson, toJson, type SqlValue } from '../../lib/localDb';
import type { Contact, CreateContactInput, UpdateContactInput } from '../../types/institution-intel';
import { updateDivisionContactCount } from './divisions';

// Map database row to Contact type
function mapRowToContact(row: SqlValue[], columns: string[]): Contact {
  const obj: Record<string, SqlValue> = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });

  return {
    id: obj.id as string,
    divisionId: obj.division_id as string,
    institutionId: obj.institution_id as string,
    name: obj.name as string | undefined,
    position: obj.position as string,
    positionSi: obj.position_si as string | undefined,
    positionTa: obj.position_ta as string | undefined,
    phones: parseJson<string[]>(obj.phones as string, []),
    email: obj.email as string | undefined,
    fax: obj.fax as string | undefined,
    isHead: Boolean(obj.is_head),
    hierarchyLevel: (obj.hierarchy_level as number) || 5,
    reportsToId: obj.reports_to_id as string | undefined,
    displayOrder: (obj.display_order as number) || 0,
    isActive: Boolean(obj.is_active),
    createdAt: obj.created_at as string,
    updatedAt: obj.updated_at as string,
  };
}

// Get all contacts for a division
export async function getContactsByDivision(divisionId: string): Promise<Contact[]> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT * FROM contacts WHERE division_id = ? AND is_active = 1 ORDER BY hierarchy_level, display_order, position`,
    [divisionId]
  );

  if (!result.length) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => mapRowToContact(row, columns));
}

// Get all contacts for an institution
export async function getContactsByInstitution(institutionId: string): Promise<Contact[]> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT * FROM contacts WHERE institution_id = ? AND is_active = 1 ORDER BY hierarchy_level, display_order, position`,
    [institutionId]
  );

  if (!result.length) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => mapRowToContact(row, columns));
}

// Get all contacts (for admin)
export async function getAllContacts(): Promise<Contact[]> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT * FROM contacts ORDER BY institution_id, division_id, hierarchy_level, display_order`
  );

  if (!result.length) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => mapRowToContact(row, columns));
}

// Get a single contact by ID
export async function getContact(id: string): Promise<Contact | null> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM contacts WHERE id = ?`, [id]);

  if (!result.length || !result[0].values.length) return null;

  return mapRowToContact(result[0].values[0], result[0].columns);
}

// Get contact by email within an institution
export async function getContactByEmail(institutionId: string, email: string): Promise<Contact | null> {
  if (!email) return null;

  const db = await initDatabase();
  const result = db.exec(
    `SELECT * FROM contacts WHERE institution_id = ? AND email = ? AND is_active = 1`,
    [institutionId, email.toLowerCase()]
  );

  if (!result.length || !result[0].values.length) return null;

  return mapRowToContact(result[0].values[0], result[0].columns);
}

// Get head contacts for an institution
export async function getHeadContacts(institutionId: string): Promise<Contact[]> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT * FROM contacts WHERE institution_id = ? AND is_head = 1 AND is_active = 1 ORDER BY hierarchy_level, display_order`,
    [institutionId]
  );

  if (!result.length) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => mapRowToContact(row, columns));
}

// Create a new contact
export async function createContact(input: CreateContactInput): Promise<string> {
  const db = await initDatabase();
  const now = nowTimestamp();
  const id = generateId();

  db.run(
    `INSERT INTO contacts (
      id, division_id, institution_id, name, position, position_si, position_ta,
      phones, email, fax, is_head, hierarchy_level, reports_to_id, display_order,
      is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      input.divisionId,
      input.institutionId,
      input.name || null,
      input.position,
      input.positionSi || null,
      input.positionTa || null,
      toJson(input.phones || []),
      input.email?.toLowerCase() || null,
      input.fax || null,
      input.isHead ? 1 : 0,
      input.hierarchyLevel || 5,
      input.reportsToId || null,
      input.displayOrder || 0,
      now,
      now,
    ]
  );

  await saveDatabase();

  // Update division contact count
  await updateDivisionContactCount(input.divisionId);

  console.log(`[Contacts] Created contact: ${input.name || input.position} (${id})`);
  return id;
}

// Update a contact
export async function updateContact(id: string, input: UpdateContactInput): Promise<void> {
  const db = await initDatabase();
  const now = nowTimestamp();

  // Get current contact to check if division changed
  const current = await getContact(id);
  const oldDivisionId = current?.divisionId;

  // Build dynamic update query
  const updates: string[] = ['updated_at = ?'];
  const values: SqlValue[] = [now];

  if (input.divisionId !== undefined) {
    updates.push('division_id = ?');
    values.push(input.divisionId);
  }
  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name || null);
  }
  if (input.position !== undefined) {
    updates.push('position = ?');
    values.push(input.position);
  }
  if (input.positionSi !== undefined) {
    updates.push('position_si = ?');
    values.push(input.positionSi || null);
  }
  if (input.positionTa !== undefined) {
    updates.push('position_ta = ?');
    values.push(input.positionTa || null);
  }
  if (input.phones !== undefined) {
    updates.push('phones = ?');
    values.push(toJson(input.phones));
  }
  if (input.email !== undefined) {
    updates.push('email = ?');
    values.push(input.email?.toLowerCase() || null);
  }
  if (input.fax !== undefined) {
    updates.push('fax = ?');
    values.push(input.fax || null);
  }
  if (input.isHead !== undefined) {
    updates.push('is_head = ?');
    values.push(input.isHead ? 1 : 0);
  }
  if (input.hierarchyLevel !== undefined) {
    updates.push('hierarchy_level = ?');
    values.push(input.hierarchyLevel);
  }
  if (input.reportsToId !== undefined) {
    updates.push('reports_to_id = ?');
    values.push(input.reportsToId || null);
  }
  if (input.displayOrder !== undefined) {
    updates.push('display_order = ?');
    values.push(input.displayOrder);
  }
  if (input.isActive !== undefined) {
    updates.push('is_active = ?');
    values.push(input.isActive ? 1 : 0);
  }

  values.push(id);

  db.run(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`, values);
  await saveDatabase();

  // Update division contact counts if division changed
  if (input.divisionId && oldDivisionId && input.divisionId !== oldDivisionId) {
    await updateDivisionContactCount(oldDivisionId);
    await updateDivisionContactCount(input.divisionId);
  } else if (input.isActive !== undefined && current?.divisionId) {
    await updateDivisionContactCount(current.divisionId);
  }

  console.log(`[Contacts] Updated contact: ${id}`);
}

// Delete a contact (soft delete)
export async function deleteContact(id: string): Promise<void> {
  const contact = await getContact(id);
  const db = await initDatabase();

  db.run(`UPDATE contacts SET is_active = 0, updated_at = ? WHERE id = ?`, [nowTimestamp(), id]);
  await saveDatabase();

  // Update division contact count
  if (contact?.divisionId) {
    await updateDivisionContactCount(contact.divisionId);
  }

  console.log(`[Contacts] Deleted contact: ${id}`);
}

// Hard delete a contact
export async function hardDeleteContact(id: string): Promise<void> {
  const contact = await getContact(id);
  const db = await initDatabase();

  db.run(`DELETE FROM contacts WHERE id = ?`, [id]);
  await saveDatabase();

  // Update division contact count
  if (contact?.divisionId) {
    await updateDivisionContactCount(contact.divisionId);
  }

  console.log(`[Contacts] Hard deleted contact: ${id}`);
}

// Bulk create contacts (for import)
export async function bulkCreateContacts(contacts: CreateContactInput[]): Promise<string[]> {
  const db = await initDatabase();
  const now = nowTimestamp();
  const ids: string[] = [];
  const divisionIds = new Set<string>();

  for (const input of contacts) {
    const id = generateId();
    ids.push(id);
    divisionIds.add(input.divisionId);

    db.run(
      `INSERT INTO contacts (
        id, division_id, institution_id, name, position, position_si, position_ta,
        phones, email, fax, is_head, hierarchy_level, reports_to_id, display_order,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        input.divisionId,
        input.institutionId,
        input.name || null,
        input.position,
        input.positionSi || null,
        input.positionTa || null,
        toJson(input.phones || []),
        input.email?.toLowerCase() || null,
        input.fax || null,
        input.isHead ? 1 : 0,
        input.hierarchyLevel || 5,
        input.reportsToId || null,
        input.displayOrder || 0,
        now,
        now,
      ]
    );
  }

  await saveDatabase();

  // Update all affected division contact counts
  for (const divisionId of divisionIds) {
    await updateDivisionContactCount(divisionId);
  }

  console.log(`[Contacts] Bulk created ${ids.length} contacts`);
  return ids;
}

// Delete all contacts for an institution (for re-import)
export async function deleteAllContactsForInstitution(institutionId: string): Promise<number> {
  const db = await initDatabase();

  // Get count before delete
  const countResult = db.exec(
    `SELECT COUNT(*) FROM contacts WHERE institution_id = ?`,
    [institutionId]
  );
  const count = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

  // Delete all contacts
  db.run(`DELETE FROM contacts WHERE institution_id = ?`, [institutionId]);
  await saveDatabase();

  console.log(`[Contacts] Deleted ${count} contacts for institution ${institutionId}`);
  return count;
}

// Get contact hierarchy for an institution (for org chart)
export async function getContactHierarchy(institutionId: string): Promise<Contact[]> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT * FROM contacts WHERE institution_id = ? AND is_active = 1 ORDER BY hierarchy_level, display_order`,
    [institutionId]
  );

  if (!result.length) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => mapRowToContact(row, columns));
}

// Determine hierarchy level from position title
export function detectHierarchyLevel(position: string): number {
  const positionLower = position.toLowerCase();

  // Level 1: Top leadership
  if (positionLower.includes('commissioner general') ||
      positionLower.includes('director general') ||
      positionLower.includes('secretary') ||
      positionLower.includes('chairman')) {
    return 1;
  }

  // Level 2: Commissioners/Directors
  if ((positionLower.includes('commissioner') && !positionLower.includes('deputy') && !positionLower.includes('assistant')) ||
      (positionLower.includes('director') && !positionLower.includes('deputy') && !positionLower.includes('assistant')) ||
      positionLower.includes('chief financial officer') ||
      positionLower.includes('cfo')) {
    return 2;
  }

  // Level 3: Deputy level
  if (positionLower.includes('deputy commissioner') ||
      positionLower.includes('deputy director') ||
      positionLower.includes('chief accountant') ||
      positionLower.includes('chief internal auditor')) {
    return 3;
  }

  // Level 4: Assistant level
  if (positionLower.includes('assistant commissioner') ||
      positionLower.includes('assistant director')) {
    return 4;
  }

  // Level 5: Officers/Accountants
  if (positionLower.includes('accountant') ||
      positionLower.includes('legal') ||
      positionLower.includes('administrative officer') ||
      positionLower.includes('audit superintendent')) {
    return 5;
  }

  // Default level
  return 6;
}

// Check if position is head-level
export function isHeadPosition(position: string): boolean {
  const level = detectHierarchyLevel(position);
  return level <= 2;
}
