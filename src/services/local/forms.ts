import { initDatabase, saveDatabase, generateId, nowTimestamp, parseJson, toJson, type SqlValue } from '../../lib/localDb';
import type { FirebaseForm, FirebaseFormField, FormStatus, Language } from '../../types/firebase';

// Convert DB row to FirebaseForm
function rowToForm(row: Record<string, unknown>): FirebaseForm {
  return {
    id: row.id as string,
    formNumber: row.form_number as string | undefined,
    section: row.section as string | undefined,
    slug: row.slug as string,
    title: row.title as string,
    titleSi: row.title_si as string | undefined,
    titleTa: row.title_ta as string | undefined,
    description: row.description as string | undefined,
    descriptionSi: row.description_si as string | undefined,
    descriptionTa: row.description_ta as string | undefined,
    categoryId: row.category_id as string,
    institutionId: row.institution_id as string,
    tags: parseJson(row.tags as string, []),
    languages: parseJson(row.languages as string, ['en']),
    defaultLanguage: (row.default_language as Language) || 'en',
    pdfVariants: parseJson(row.pdf_variants as string, {}),
    thumbnails: parseJson(row.thumbnails as string, {}),
    isDigitized: Boolean(row.is_digitized),
    hasOnlineFill: Boolean(row.has_online_fill),
    contactInfo: row.contact_info ? parseJson(row.contact_info as string, undefined) : undefined,
    status: (row.status as FormStatus) || 'draft',
    verificationLevel: (row.verification_level as 0 | 1 | 2 | 3) || 0,
    viewCount: (row.view_count as number) || 0,
    downloadCount: (row.download_count as number) || 0,
    fillCount: (row.fill_count as number) || 0,
    createdBy: row.created_by as string,
    createdAt: { toDate: () => new Date(row.created_at as string) } as FirebaseForm['createdAt'],
    updatedBy: row.updated_by as string,
    updatedAt: { toDate: () => new Date(row.updated_at as string) } as FirebaseForm['updatedAt'],
    publishedAt: row.published_at
      ? ({ toDate: () => new Date(row.published_at as string) } as FirebaseForm['publishedAt'])
      : undefined,
  };
}

// Convert DB row to FirebaseFormField
function rowToField(row: Record<string, unknown>): FirebaseFormField {
  return {
    id: row.id as string,
    type: row.type as FirebaseFormField['type'],
    label: row.label as string,
    labelSi: row.label_si as string | undefined,
    labelTa: row.label_ta as string | undefined,
    placeholder: row.placeholder as string | undefined,
    placeholderSi: row.placeholder_si as string | undefined,
    placeholderTa: row.placeholder_ta as string | undefined,
    helpText: row.help_text as string | undefined,
    helpTextSi: row.help_text_si as string | undefined,
    helpTextTa: row.help_text_ta as string | undefined,
    required: Boolean(row.is_required),
    validation: row.validation ? parseJson(row.validation as string, undefined) : undefined,
    options: row.options ? parseJson(row.options as string, undefined) : undefined,
    position: row.position ? parseJson(row.position as string, undefined) : undefined,
    positionVariants: row.position_variants ? parseJson(row.position_variants as string, undefined) : undefined,
    order: (row.field_order as number) || 0,
    section: row.section as string | undefined,
    createdAt: { toDate: () => new Date(row.created_at as string) } as FirebaseFormField['createdAt'],
    updatedAt: { toDate: () => new Date(row.updated_at as string) } as FirebaseFormField['updatedAt'],
  };
}

// Get a single form by ID
export async function getForm(formId: string): Promise<FirebaseForm | null> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM forms WHERE id = ?`, [formId]);
  if (result.length === 0 || result[0].values.length === 0) return null;

  const columns = result[0].columns;
  const values = result[0].values[0];
  const row = Object.fromEntries(columns.map((col: string, i: number) => [col, values[i]]));
  return rowToForm(row);
}

// Get a form by slug
export async function getFormBySlug(slug: string): Promise<FirebaseForm | null> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM forms WHERE slug = ? AND status = 'published' LIMIT 1`, [slug]);
  if (result.length === 0 || result[0].values.length === 0) return null;

  const columns = result[0].columns;
  const values = result[0].values[0];
  const row = Object.fromEntries(columns.map((col: string, i: number) => [col, values[i]]));
  return rowToForm(row);
}

// Get published forms with pagination (simplified - returns all)
export async function getPublishedForms(
  _lastDoc?: unknown,
  pageSize: number = 20
): Promise<{ forms: FirebaseForm[]; lastDoc: unknown }> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM forms WHERE status = 'published' ORDER BY updated_at DESC LIMIT ?`, [pageSize]);
  if (result.length === 0) return { forms: [], lastDoc: null };

  const columns = result[0].columns;
  const forms = result[0].values.map((vals: unknown[]) => {
    const row = Object.fromEntries(columns.map((col: string, i: number) => [col, vals[i]]));
    return rowToForm(row);
  });

  return { forms, lastDoc: null };
}

// Get all published forms
export async function getAllPublishedForms(): Promise<FirebaseForm[]> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM forms WHERE status = 'published' ORDER BY updated_at DESC`);
  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map((vals: unknown[]) => {
    const row = Object.fromEntries(columns.map((col: string, i: number) => [col, vals[i]]));
    return rowToForm(row);
  });
}

// Get forms by category
export async function getFormsByCategory(
  categoryId: string,
  _lastDoc?: unknown,
  pageSize: number = 20
): Promise<{ forms: FirebaseForm[]; lastDoc: unknown }> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT * FROM forms WHERE status = 'published' AND category_id = ? ORDER BY updated_at DESC LIMIT ?`,
    [categoryId, pageSize]
  );
  if (result.length === 0) return { forms: [], lastDoc: null };

  const columns = result[0].columns;
  const forms = result[0].values.map((vals: unknown[]) => {
    const row = Object.fromEntries(columns.map((col: string, i: number) => [col, vals[i]]));
    return rowToForm(row);
  });

  return { forms, lastDoc: null };
}

// Get forms by institution
export async function getFormsByInstitution(
  institutionId: string,
  _lastDoc?: unknown,
  pageSize: number = 20
): Promise<{ forms: FirebaseForm[]; lastDoc: unknown }> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT * FROM forms WHERE status = 'published' AND institution_id = ? ORDER BY updated_at DESC LIMIT ?`,
    [institutionId, pageSize]
  );
  if (result.length === 0) return { forms: [], lastDoc: null };

  const columns = result[0].columns;
  const forms = result[0].values.map((vals: unknown[]) => {
    const row = Object.fromEntries(columns.map((col: string, i: number) => [col, vals[i]]));
    return rowToForm(row);
  });

  return { forms, lastDoc: null };
}

// Get popular forms
export async function getPopularForms(pageSize: number = 10): Promise<FirebaseForm[]> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT * FROM forms WHERE status = 'published' ORDER BY download_count DESC LIMIT ?`,
    [pageSize]
  );
  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map((vals: unknown[]) => {
    const row = Object.fromEntries(columns.map((col: string, i: number) => [col, vals[i]]));
    return rowToForm(row);
  });
}

// Search forms (client-side - same as Firebase version)
export function searchForms(forms: FirebaseForm[], searchQuery: string, _language: Language = 'en'): FirebaseForm[] {
  if (!searchQuery.trim()) return forms;

  const query = searchQuery.toLowerCase().trim();

  return forms.filter((form) => {
    const matchesTitle =
      form.title.toLowerCase().includes(query) ||
      (form.titleSi && form.titleSi.toLowerCase().includes(query)) ||
      (form.titleTa && form.titleTa.toLowerCase().includes(query));

    const matchesDescription =
      (form.description && form.description.toLowerCase().includes(query)) ||
      (form.descriptionSi && form.descriptionSi.toLowerCase().includes(query)) ||
      (form.descriptionTa && form.descriptionTa.toLowerCase().includes(query));

    const matchesTags = form.tags.some((tag) => tag.toLowerCase().includes(query));
    const matchesFormNumber = form.formNumber && form.formNumber.toLowerCase().includes(query);

    return matchesTitle || matchesDescription || matchesTags || matchesFormNumber;
  });
}

// Detect search language
export function detectSearchLanguage(query: string): Language {
  if (/[\u0D80-\u0DFF]/.test(query)) return 'si';
  if (/[\u0B80-\u0BFF]/.test(query)) return 'ta';
  return 'en';
}

// Get form fields
export async function getFormFields(formId: string): Promise<FirebaseFormField[]> {
  const db = await initDatabase();
  const result = db.exec(`SELECT * FROM form_fields WHERE form_id = ? ORDER BY field_order ASC`, [formId]);
  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map((vals: unknown[]) => {
    const row = Object.fromEntries(columns.map((col: string, i: number) => [col, vals[i]]));
    return rowToField(row);
  });
}

// Increment view count
export async function incrementViewCount(formId: string): Promise<void> {
  const db = await initDatabase();
  db.run(`UPDATE forms SET view_count = view_count + 1 WHERE id = ?`, [formId]);
  await saveDatabase();
}

// Increment download count
export async function incrementDownloadCount(formId: string): Promise<void> {
  const db = await initDatabase();
  db.run(`UPDATE forms SET download_count = download_count + 1 WHERE id = ?`, [formId]);
  await saveDatabase();
}

// Increment fill count
export async function incrementFillCount(formId: string): Promise<void> {
  const db = await initDatabase();
  db.run(`UPDATE forms SET fill_count = fill_count + 1 WHERE id = ?`, [formId]);
  await saveDatabase();
}

// Create a new form
export async function createForm(
  formData: Omit<FirebaseForm, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'downloadCount' | 'fillCount'>
): Promise<string> {
  const db = await initDatabase();
  const id = generateId();
  const now = nowTimestamp();

  db.run(
    `INSERT INTO forms (
      id, form_number, section, slug, title, title_si, title_ta,
      description, description_si, description_ta, category_id, institution_id,
      tags, languages, default_language, pdf_variants, thumbnails,
      is_digitized, has_online_fill, contact_info, status, verification_level,
      view_count, download_count, fill_count, created_by, created_at, updated_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      formData.formNumber || null,
      formData.section || null,
      formData.slug,
      formData.title,
      formData.titleSi || null,
      formData.titleTa || null,
      formData.description || null,
      formData.descriptionSi || null,
      formData.descriptionTa || null,
      formData.categoryId,
      formData.institutionId,
      toJson(formData.tags || []),
      toJson(formData.languages || ['en']),
      formData.defaultLanguage || 'en',
      toJson(formData.pdfVariants || {}),
      toJson(formData.thumbnails || {}),
      formData.isDigitized ? 1 : 0,
      formData.hasOnlineFill ? 1 : 0,
      formData.contactInfo ? toJson(formData.contactInfo) : null,
      formData.status || 'draft',
      formData.verificationLevel || 0,
      0, // viewCount
      0, // downloadCount
      0, // fillCount
      formData.createdBy,
      now,
      formData.updatedBy,
      now,
    ]
  );

  await saveDatabase();
  return id;
}

// Update a form
export async function updateForm(
  formId: string,
  updates: Partial<Omit<FirebaseForm, 'id' | 'createdAt'>>
): Promise<void> {
  const db = await initDatabase();
  const now = nowTimestamp();

  // Build dynamic update query
  const setClauses: string[] = ['updated_at = ?'];
  const values: SqlValue[] = [now];

  if (updates.formNumber !== undefined) { setClauses.push('form_number = ?'); values.push(updates.formNumber); }
  if (updates.section !== undefined) { setClauses.push('section = ?'); values.push(updates.section); }
  if (updates.slug !== undefined) { setClauses.push('slug = ?'); values.push(updates.slug); }
  if (updates.title !== undefined) { setClauses.push('title = ?'); values.push(updates.title); }
  if (updates.titleSi !== undefined) { setClauses.push('title_si = ?'); values.push(updates.titleSi); }
  if (updates.titleTa !== undefined) { setClauses.push('title_ta = ?'); values.push(updates.titleTa); }
  if (updates.description !== undefined) { setClauses.push('description = ?'); values.push(updates.description); }
  if (updates.descriptionSi !== undefined) { setClauses.push('description_si = ?'); values.push(updates.descriptionSi); }
  if (updates.descriptionTa !== undefined) { setClauses.push('description_ta = ?'); values.push(updates.descriptionTa); }
  if (updates.categoryId !== undefined) { setClauses.push('category_id = ?'); values.push(updates.categoryId); }
  if (updates.institutionId !== undefined) { setClauses.push('institution_id = ?'); values.push(updates.institutionId); }
  if (updates.tags !== undefined) { setClauses.push('tags = ?'); values.push(toJson(updates.tags)); }
  if (updates.languages !== undefined) { setClauses.push('languages = ?'); values.push(toJson(updates.languages)); }
  if (updates.defaultLanguage !== undefined) { setClauses.push('default_language = ?'); values.push(updates.defaultLanguage); }
  if (updates.pdfVariants !== undefined) { setClauses.push('pdf_variants = ?'); values.push(toJson(updates.pdfVariants)); }
  if (updates.thumbnails !== undefined) { setClauses.push('thumbnails = ?'); values.push(toJson(updates.thumbnails)); }
  if (updates.isDigitized !== undefined) { setClauses.push('is_digitized = ?'); values.push(updates.isDigitized ? 1 : 0); }
  if (updates.hasOnlineFill !== undefined) { setClauses.push('has_online_fill = ?'); values.push(updates.hasOnlineFill ? 1 : 0); }
  if (updates.contactInfo !== undefined) { setClauses.push('contact_info = ?'); values.push(toJson(updates.contactInfo)); }
  if (updates.status !== undefined) { setClauses.push('status = ?'); values.push(updates.status); }
  if (updates.verificationLevel !== undefined) { setClauses.push('verification_level = ?'); values.push(updates.verificationLevel); }
  if (updates.updatedBy !== undefined) { setClauses.push('updated_by = ?'); values.push(updates.updatedBy); }

  values.push(formId);
  db.run(`UPDATE forms SET ${setClauses.join(', ')} WHERE id = ?`, values);
  await saveDatabase();
}

// Update form status
export async function updateFormStatus(formId: string, status: FormStatus): Promise<void> {
  const db = await initDatabase();
  const now = nowTimestamp();

  if (status === 'published') {
    db.run(`UPDATE forms SET status = ?, updated_at = ?, published_at = ? WHERE id = ?`, [status, now, now, formId]);
  } else {
    db.run(`UPDATE forms SET status = ?, updated_at = ? WHERE id = ?`, [status, now, formId]);
  }

  await saveDatabase();
}

// Delete a form
export async function deleteForm(formId: string): Promise<void> {
  const db = await initDatabase();
  db.run(`DELETE FROM form_fields WHERE form_id = ?`, [formId]);
  db.run(`DELETE FROM forms WHERE id = ?`, [formId]);
  await saveDatabase();
}

// Add a field to a form
export async function addFormField(
  formId: string,
  fieldData: Omit<FirebaseFormField, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = await initDatabase();
  const id = generateId();
  const now = nowTimestamp();

  db.run(
    `INSERT INTO form_fields (
      id, form_id, type, label, label_si, label_ta,
      placeholder, placeholder_si, placeholder_ta,
      help_text, help_text_si, help_text_ta,
      is_required, validation, options, position, position_variants,
      field_order, section, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      formId,
      fieldData.type,
      fieldData.label,
      fieldData.labelSi || null,
      fieldData.labelTa || null,
      fieldData.placeholder || null,
      fieldData.placeholderSi || null,
      fieldData.placeholderTa || null,
      fieldData.helpText || null,
      fieldData.helpTextSi || null,
      fieldData.helpTextTa || null,
      fieldData.required ? 1 : 0,
      fieldData.validation ? toJson(fieldData.validation) : null,
      fieldData.options ? toJson(fieldData.options) : null,
      fieldData.position ? toJson(fieldData.position) : null,
      fieldData.positionVariants ? toJson(fieldData.positionVariants) : null,
      fieldData.order || 0,
      fieldData.section || null,
      now,
      now,
    ]
  );

  await saveDatabase();
  return id;
}

// Update a field
export async function updateFormField(
  formId: string,
  fieldId: string,
  updates: Partial<Omit<FirebaseFormField, 'id' | 'createdAt'>>
): Promise<void> {
  const db = await initDatabase();
  const now = nowTimestamp();

  const setClauses: string[] = ['updated_at = ?'];
  const values: SqlValue[] = [now];

  if (updates.type !== undefined) { setClauses.push('type = ?'); values.push(updates.type); }
  if (updates.label !== undefined) { setClauses.push('label = ?'); values.push(updates.label); }
  if (updates.labelSi !== undefined) { setClauses.push('label_si = ?'); values.push(updates.labelSi ?? null); }
  if (updates.labelTa !== undefined) { setClauses.push('label_ta = ?'); values.push(updates.labelTa ?? null); }
  if (updates.placeholder !== undefined) { setClauses.push('placeholder = ?'); values.push(updates.placeholder ?? null); }
  if (updates.placeholderSi !== undefined) { setClauses.push('placeholder_si = ?'); values.push(updates.placeholderSi ?? null); }
  if (updates.placeholderTa !== undefined) { setClauses.push('placeholder_ta = ?'); values.push(updates.placeholderTa ?? null); }
  if (updates.helpText !== undefined) { setClauses.push('help_text = ?'); values.push(updates.helpText ?? null); }
  if (updates.helpTextSi !== undefined) { setClauses.push('help_text_si = ?'); values.push(updates.helpTextSi ?? null); }
  if (updates.helpTextTa !== undefined) { setClauses.push('help_text_ta = ?'); values.push(updates.helpTextTa ?? null); }
  if (updates.required !== undefined) { setClauses.push('is_required = ?'); values.push(updates.required ? 1 : 0); }
  if (updates.validation !== undefined) { setClauses.push('validation = ?'); values.push(updates.validation ? toJson(updates.validation) : null); }
  if (updates.options !== undefined) { setClauses.push('options = ?'); values.push(updates.options ? toJson(updates.options) : null); }
  if (updates.position !== undefined) { setClauses.push('position = ?'); values.push(updates.position ? toJson(updates.position) : null); }
  if (updates.positionVariants !== undefined) { setClauses.push('position_variants = ?'); values.push(updates.positionVariants ? toJson(updates.positionVariants) : null); }
  if (updates.order !== undefined) { setClauses.push('field_order = ?'); values.push(updates.order); }
  if (updates.section !== undefined) { setClauses.push('section = ?'); values.push(updates.section ?? null); }

  values.push(formId, fieldId);
  db.run(`UPDATE form_fields SET ${setClauses.join(', ')} WHERE form_id = ? AND id = ?`, values);
  await saveDatabase();
}

// Delete a field
export async function deleteFormField(formId: string, fieldId: string): Promise<void> {
  const db = await initDatabase();
  db.run(`DELETE FROM form_fields WHERE form_id = ? AND id = ?`, [formId, fieldId]);
  await saveDatabase();
}

// Helper: Get localized title
export function getLocalizedTitle(form: FirebaseForm, language: Language): string {
  if (language === 'si' && form.titleSi) return form.titleSi;
  if (language === 'ta' && form.titleTa) return form.titleTa;
  return form.title;
}

// Helper: Get localized description
export function getLocalizedDescription(form: FirebaseForm, language: Language): string | undefined {
  if (language === 'si' && form.descriptionSi) return form.descriptionSi;
  if (language === 'ta' && form.descriptionTa) return form.descriptionTa;
  return form.description;
}
