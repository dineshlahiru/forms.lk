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
    } else {
      db = new SQL.Database();
      initializeSchema(db);
    }

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
