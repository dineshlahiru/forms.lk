import initSqlJs, { type Database, type SqlValue } from 'sql.js';

// Database singleton
let db: Database | null = null;
let initPromise: Promise<Database> | null = null;

// IndexedDB for persistent storage
const DB_NAME = 'forms_lk_local';
const STORE_NAME = 'database';
const DB_KEY = 'sqlite_db';

// Helper to open IndexedDB
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// Save database to IndexedDB
async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  const idb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(data, DB_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Load database from IndexedDB
async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  const idb = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(DB_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// Initialize SQLite schema
function initializeSchema(database: Database): void {
  // Users table
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      uid TEXT UNIQUE NOT NULL,
      phone TEXT,
      display_name TEXT,
      email TEXT,
      role TEXT DEFAULT 'user',
      institution_id TEXT,
      preferred_language TEXT DEFAULT 'en',
      bookmarked_forms TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    )
  `);

  // Categories table
  database.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      name_si TEXT,
      name_ta TEXT,
      description TEXT,
      description_si TEXT,
      description_ta TEXT,
      icon TEXT NOT NULL,
      color TEXT,
      display_order INTEGER DEFAULT 0,
      form_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Institutions table
  database.run(`
    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_si TEXT,
      name_ta TEXT,
      description TEXT,
      description_si TEXT,
      description_ta TEXT,
      type TEXT DEFAULT 'other',
      parent_institution_id TEXT,
      website TEXT,
      email TEXT,
      phone TEXT,
      telephone_numbers TEXT DEFAULT '[]',
      address TEXT,
      office_hours TEXT,
      logo_url TEXT,
      form_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (parent_institution_id) REFERENCES institutions(id)
    )
  `);

  // Forms table
  database.run(`
    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY,
      form_number TEXT,
      section TEXT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      title_si TEXT,
      title_ta TEXT,
      description TEXT,
      description_si TEXT,
      description_ta TEXT,
      category_id TEXT,
      institution_id TEXT,
      tags TEXT DEFAULT '[]',
      languages TEXT DEFAULT '["en"]',
      default_language TEXT DEFAULT 'en',
      pdf_variants TEXT DEFAULT '{}',
      thumbnails TEXT DEFAULT '{}',
      is_digitized INTEGER DEFAULT 0,
      has_online_fill INTEGER DEFAULT 0,
      contact_info TEXT,
      status TEXT DEFAULT 'draft',
      verification_level INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      fill_count INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_by TEXT,
      updated_at TEXT NOT NULL,
      published_at TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (institution_id) REFERENCES institutions(id)
    )
  `);

  // Form fields table
  database.run(`
    CREATE TABLE IF NOT EXISTS form_fields (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      label_si TEXT,
      label_ta TEXT,
      placeholder TEXT,
      placeholder_si TEXT,
      placeholder_ta TEXT,
      help_text TEXT,
      help_text_si TEXT,
      help_text_ta TEXT,
      is_required INTEGER DEFAULT 0,
      validation TEXT,
      options TEXT,
      position TEXT,
      position_variants TEXT,
      field_order INTEGER DEFAULT 0,
      section TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    )
  `);

  // Submissions table
  database.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      form_id TEXT NOT NULL,
      form_title TEXT NOT NULL,
      form_number TEXT,
      language_used TEXT DEFAULT 'en',
      data TEXT DEFAULT '{}',
      generated_pdf_path TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (form_id) REFERENCES forms(id)
    )
  `);

  // Drafts table
  database.run(`
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      form_id TEXT NOT NULL,
      data TEXT DEFAULT '{}',
      language_used TEXT DEFAULT 'en',
      completion_percentage INTEGER DEFAULT 0,
      last_field_edited TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (form_id) REFERENCES forms(id)
    )
  `);

  // Analytics events table
  database.run(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      event TEXT NOT NULL,
      form_id TEXT,
      category_id TEXT,
      institution_id TEXT,
      user_id TEXT,
      language TEXT DEFAULT 'en',
      search_query TEXT,
      device_type TEXT,
      user_agent TEXT,
      timestamp TEXT NOT NULL,
      date_key TEXT NOT NULL,
      month_key TEXT NOT NULL
    )
  `);

  // System config table
  database.run(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // ========================================
  // Institution Intelligence Module Tables
  // ========================================

  // Divisions table - organizational divisions within institutions
  database.run(`
    CREATE TABLE IF NOT EXISTS divisions (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_si TEXT,
      name_ta TEXT,
      slug TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      display_order INTEGER DEFAULT 0,
      contact_count INTEGER DEFAULT 0,
      form_count INTEGER DEFAULT 0,
      address TEXT,
      phones TEXT DEFAULT '[]',
      fax TEXT,
      email TEXT,
      location_type TEXT,
      district TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )
  `);

  // Migration: Add new columns to divisions table if they don't exist
  const divisionColumnsResult = database.exec(`PRAGMA table_info(divisions)`);
  if (divisionColumnsResult.length > 0) {
    const existingDivisionColumns = divisionColumnsResult[0].values.map(row => row[1] as string);

    if (!existingDivisionColumns.includes('address')) {
      database.run(`ALTER TABLE divisions ADD COLUMN address TEXT`);
    }
    if (!existingDivisionColumns.includes('phones')) {
      database.run(`ALTER TABLE divisions ADD COLUMN phones TEXT DEFAULT '[]'`);
    }
    if (!existingDivisionColumns.includes('fax')) {
      database.run(`ALTER TABLE divisions ADD COLUMN fax TEXT`);
    }
    if (!existingDivisionColumns.includes('email')) {
      database.run(`ALTER TABLE divisions ADD COLUMN email TEXT`);
    }
    if (!existingDivisionColumns.includes('location_type')) {
      database.run(`ALTER TABLE divisions ADD COLUMN location_type TEXT`);
    }
    if (!existingDivisionColumns.includes('district')) {
      database.run(`ALTER TABLE divisions ADD COLUMN district TEXT`);
    }
  }

  // Contacts table - individual contacts within divisions
  database.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      division_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      name TEXT,
      position TEXT NOT NULL,
      position_si TEXT,
      position_ta TEXT,
      phones TEXT DEFAULT '[]',
      email TEXT,
      fax TEXT,
      is_head INTEGER DEFAULT 0,
      hierarchy_level INTEGER DEFAULT 5,
      reports_to_id TEXT,
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
      FOREIGN KEY (reports_to_id) REFERENCES contacts(id) ON DELETE SET NULL
    )
  `);

  // Institution sync logs - track website scraping history
  database.run(`
    CREATE TABLE IF NOT EXISTS institution_sync_logs (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      content_hash TEXT,
      status TEXT DEFAULT 'pending',
      contacts_found INTEGER DEFAULT 0,
      contacts_imported INTEGER DEFAULT 0,
      divisions_created INTEGER DEFAULT 0,
      changes_detected INTEGER DEFAULT 0,
      changes_summary TEXT,
      tokens_used INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      error_message TEXT,
      synced_at TEXT NOT NULL,
      synced_by TEXT,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )
  `);

  // API usage tracking - monitor Claude API costs
  database.run(`
    CREATE TABLE IF NOT EXISTS api_usage (
      id TEXT PRIMARY KEY,
      service TEXT NOT NULL,
      operation TEXT NOT NULL,
      institution_id TEXT,
      tokens_used INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      month_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
    )
  `);

  // API budget settings
  database.run(`
    CREATE TABLE IF NOT EXISTS api_budget_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      monthly_limit_usd REAL DEFAULT 5.0,
      alert_threshold_percent INTEGER DEFAULT 80,
      pause_on_exhausted INTEGER DEFAULT 1,
      alert_email TEXT,
      updated_at TEXT NOT NULL
    )
  `);

  // Create indexes for better performance
  database.run(`CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_forms_category ON forms(category_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_forms_institution ON forms(institution_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms(slug)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_form_fields_form ON form_fields(form_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_submissions_form ON submissions(form_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_drafts_user ON drafts(user_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_drafts_form ON drafts(form_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(date_key)`);

  // Institution Intelligence indexes
  database.run(`CREATE INDEX IF NOT EXISTS idx_divisions_institution ON divisions(institution_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_divisions_slug ON divisions(slug)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_contacts_division ON contacts(division_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_contacts_institution ON contacts(institution_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_contacts_reports_to ON contacts(reports_to_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_sync_logs_institution ON institution_sync_logs(institution_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_api_usage_month ON api_usage(month_key)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_api_usage_institution ON api_usage(institution_id)`);
}

// Run migrations for existing databases
function runMigrations(database: Database): void {
  // Check if institutions table needs sync columns
  const institutionColumns = database.exec("PRAGMA table_info(institutions)");
  if (institutionColumns.length > 0) {
    const columnNames = institutionColumns[0].values.map(row => row[1] as string);

    // Add sync tracking columns if they don't exist
    if (!columnNames.includes('source_url')) {
      database.run(`ALTER TABLE institutions ADD COLUMN source_url TEXT`);
    }
    if (!columnNames.includes('content_hash')) {
      database.run(`ALTER TABLE institutions ADD COLUMN content_hash TEXT`);
    }
    if (!columnNames.includes('last_synced_at')) {
      database.run(`ALTER TABLE institutions ADD COLUMN last_synced_at TEXT`);
    }
    if (!columnNames.includes('auto_sync_enabled')) {
      database.run(`ALTER TABLE institutions ADD COLUMN auto_sync_enabled INTEGER DEFAULT 0`);
    }
    if (!columnNames.includes('sync_frequency')) {
      database.run(`ALTER TABLE institutions ADD COLUMN sync_frequency TEXT DEFAULT 'weekly'`);
    }
  }

  // Create new tables if they don't exist (for existing DBs)
  // Divisions table
  database.run(`
    CREATE TABLE IF NOT EXISTS divisions (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_si TEXT,
      name_ta TEXT,
      slug TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      display_order INTEGER DEFAULT 0,
      contact_count INTEGER DEFAULT 0,
      form_count INTEGER DEFAULT 0,
      address TEXT,
      phones TEXT DEFAULT '[]',
      fax TEXT,
      email TEXT,
      location_type TEXT,
      district TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )
  `);

  // Migration: Add new columns to existing divisions table
  const divisionColumnsResult = database.exec(`PRAGMA table_info(divisions)`);
  if (divisionColumnsResult.length > 0) {
    const existingDivisionColumns = divisionColumnsResult[0].values.map(row => row[1] as string);

    if (!existingDivisionColumns.includes('address')) {
      database.run(`ALTER TABLE divisions ADD COLUMN address TEXT`);
    }
    if (!existingDivisionColumns.includes('phones')) {
      database.run(`ALTER TABLE divisions ADD COLUMN phones TEXT DEFAULT '[]'`);
    }
    if (!existingDivisionColumns.includes('fax')) {
      database.run(`ALTER TABLE divisions ADD COLUMN fax TEXT`);
    }
    if (!existingDivisionColumns.includes('email')) {
      database.run(`ALTER TABLE divisions ADD COLUMN email TEXT`);
    }
    if (!existingDivisionColumns.includes('location_type')) {
      database.run(`ALTER TABLE divisions ADD COLUMN location_type TEXT`);
    }
    if (!existingDivisionColumns.includes('district')) {
      database.run(`ALTER TABLE divisions ADD COLUMN district TEXT`);
    }
  }

  // Contacts table
  database.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      division_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      name TEXT,
      position TEXT NOT NULL,
      position_si TEXT,
      position_ta TEXT,
      phones TEXT DEFAULT '[]',
      email TEXT,
      fax TEXT,
      is_head INTEGER DEFAULT 0,
      hierarchy_level INTEGER DEFAULT 5,
      reports_to_id TEXT,
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
      FOREIGN KEY (reports_to_id) REFERENCES contacts(id) ON DELETE SET NULL
    )
  `);

  // Institution sync logs
  database.run(`
    CREATE TABLE IF NOT EXISTS institution_sync_logs (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      content_hash TEXT,
      status TEXT DEFAULT 'pending',
      contacts_found INTEGER DEFAULT 0,
      contacts_imported INTEGER DEFAULT 0,
      divisions_created INTEGER DEFAULT 0,
      changes_detected INTEGER DEFAULT 0,
      changes_summary TEXT,
      tokens_used INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      error_message TEXT,
      synced_at TEXT NOT NULL,
      synced_by TEXT,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )
  `);

  // API usage tracking
  database.run(`
    CREATE TABLE IF NOT EXISTS api_usage (
      id TEXT PRIMARY KEY,
      service TEXT NOT NULL,
      operation TEXT NOT NULL,
      institution_id TEXT,
      tokens_used INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      month_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
    )
  `);

  // API budget settings
  database.run(`
    CREATE TABLE IF NOT EXISTS api_budget_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      monthly_limit_usd REAL DEFAULT 5.0,
      alert_threshold_percent INTEGER DEFAULT 80,
      pause_on_exhausted INTEGER DEFAULT 1,
      alert_email TEXT,
      updated_at TEXT NOT NULL
    )
  `);

  // Create indexes if they don't exist
  database.run(`CREATE INDEX IF NOT EXISTS idx_divisions_institution ON divisions(institution_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_divisions_slug ON divisions(slug)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_contacts_division ON contacts(division_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_contacts_institution ON contacts(institution_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_contacts_reports_to ON contacts(reports_to_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_sync_logs_institution ON institution_sync_logs(institution_id)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_api_usage_month ON api_usage(month_key)`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_api_usage_institution ON api_usage(institution_id)`);
}

// Initialize database
export async function initDatabase(): Promise<Database> {
  if (db) return db;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Load sql.js WASM
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
    });

    // Try to load existing database from IndexedDB
    const savedData = await loadFromIndexedDB();

    if (savedData) {
      db = new SQL.Database(savedData);
      // Run migrations for existing database
      runMigrations(db);
    } else {
      db = new SQL.Database();
      initializeSchema(db);
    }

    // Save after initialization/migration
    await saveToIndexedDB(db.export());

    return db;
  })();

  return initPromise;
}

// Save database to persistent storage
export async function saveDatabase(): Promise<void> {
  if (!db) return;
  const data = db.export();
  await saveToIndexedDB(data);
}

// Get database instance
export function getDatabase(): Database | null {
  return db;
}

// Generate UUID
export function generateId(): string {
  return crypto.randomUUID();
}

// Get current ISO timestamp
export function nowTimestamp(): string {
  return new Date().toISOString();
}

// Helper to parse JSON safely
export function parseJson<T>(json: string | null, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

// Helper to stringify JSON
export function toJson(value: unknown): string {
  return JSON.stringify(value);
}

// Export database to downloadable file (for backup)
export async function exportDatabase(): Promise<Blob> {
  if (!db) {
    await initDatabase();
  }
  const data = db!.export();
  return new Blob([data], { type: 'application/octet-stream' });
}

// Import database from file (restore backup)
export async function importDatabase(file: File): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  // Load sql.js if not already loaded
  const SQL = await import('sql.js').then(m => m.default({
    locateFile: (f: string) => `https://sql.js.org/dist/${f}`,
  }));

  // Create new database from imported data
  db = new SQL.Database(data);

  // Save to IndexedDB
  await saveDatabase();

  console.log('[LocalDB] Database imported successfully');
}

// Get database size info
export async function getDatabaseInfo(): Promise<{ sizeBytes: number; tables: string[] }> {
  if (!db) {
    await initDatabase();
  }

  const data = db!.export();
  const sizeBytes = data.length;

  // Get table names
  const result = db!.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  const tables = result.length > 0
    ? result[0].values.map(row => row[0] as string)
    : [];

  return { sizeBytes, tables };
}

// Export database types for use in services
export type { Database, SqlValue };
