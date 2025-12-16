import { initDatabase, saveDatabase, generateId, nowTimestamp, parseJson, toJson, type SqlValue } from '../../lib/localDb';
import type { FirebaseUser, Language, UserRole } from '../../types/firebase';

// Local auth state
let currentUser: FirebaseUser | null = null;
const authListeners: Set<(user: FirebaseUser | null) => void> = new Set();

// Storage key for auth
const AUTH_KEY = 'local_auth_user';

// Convert DB row to FirebaseUser
function rowToUser(row: Record<string, unknown>): FirebaseUser {
  return {
    uid: row.uid as string,
    phone: row.phone as string,
    displayName: row.display_name as string,
    email: row.email as string | undefined,
    role: (row.role as UserRole) || 'user',
    institutionId: row.institution_id as string | undefined,
    preferredLanguage: (row.preferred_language as Language) || 'en',
    bookmarkedForms: parseJson(row.bookmarked_forms as string, []),
    createdAt: { toDate: () => new Date(row.created_at as string) } as FirebaseUser['createdAt'],
    updatedAt: { toDate: () => new Date(row.updated_at as string) } as FirebaseUser['updatedAt'],
    lastLoginAt: { toDate: () => new Date(row.last_login_at as string) } as FirebaseUser['lastLoginAt'],
  };
}

// Load user from localStorage on init
function loadStoredUser(): void {
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    try {
      currentUser = JSON.parse(stored);
      notifyListeners();
    } catch {
      localStorage.removeItem(AUTH_KEY);
    }
  }
}

// Save user to localStorage
function saveUserToStorage(user: FirebaseUser | null): void {
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

// Notify auth listeners
function notifyListeners(): void {
  authListeners.forEach((callback) => callback(currentUser));
}

// Initialize auth on module load
loadStoredUser();

// Initialize recaptcha (no-op for local)
export function initRecaptcha(): void {
  // No-op for local auth
}

// Clear recaptcha (no-op for local)
export function clearRecaptcha(): void {
  // No-op for local auth
}

// Send OTP (simulated - instant success)
export async function sendOtp(phoneNumber: string): Promise<void> {
  console.log(`[Local Auth] OTP sent to ${phoneNumber} (simulated)`);
  // Store phone for verification
  sessionStorage.setItem('pending_phone', phoneNumber);
}

// Verify OTP (simulated - any code works)
export async function verifyOtp(_code: string): Promise<FirebaseUser> {
  const phoneNumber = sessionStorage.getItem('pending_phone') || '+94000000000';
  sessionStorage.removeItem('pending_phone');

  const db = await initDatabase();

  // Check if user exists
  const result = db.exec(`SELECT * FROM users WHERE phone = ?`, [phoneNumber]);

  let user: FirebaseUser;

  if (result.length > 0 && result[0].values.length > 0) {
    // Existing user
    const columns = result[0].columns;
    const values = result[0].values[0];
    const row = Object.fromEntries(columns.map((col: string, i: number) => [col, values[i]]));
    user = rowToUser(row);

    // Update last login
    const now = nowTimestamp();
    db.run(`UPDATE users SET last_login_at = ? WHERE uid = ?`, [now, user.uid]);
    await saveDatabase();
  } else {
    // Create new user
    const uid = generateId();
    const now = nowTimestamp();

    db.run(
      `INSERT INTO users (
        id, uid, phone, display_name, role, preferred_language, bookmarked_forms,
        created_at, updated_at, last_login_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid, uid, phoneNumber, 'User', 'user', 'en', '[]', now, now, now]
    );
    await saveDatabase();

    user = {
      uid,
      phone: phoneNumber,
      displayName: 'User',
      role: 'user',
      preferredLanguage: 'en',
      bookmarkedForms: [],
      createdAt: { toDate: () => new Date(now) } as FirebaseUser['createdAt'],
      updatedAt: { toDate: () => new Date(now) } as FirebaseUser['updatedAt'],
      lastLoginAt: { toDate: () => new Date(now) } as FirebaseUser['lastLoginAt'],
    };
  }

  currentUser = user;
  saveUserToStorage(user);
  notifyListeners();

  return user;
}

// Sign in with Google (simulated)
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const db = await initDatabase();
  const uid = generateId();
  const now = nowTimestamp();
  const email = `user_${Date.now()}@local.dev`;

  // Create user
  db.run(
    `INSERT INTO users (
      id, uid, phone, display_name, email, role, preferred_language, bookmarked_forms,
      created_at, updated_at, last_login_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uid, uid, '', 'Google User', email, 'user', 'en', '[]', now, now, now]
  );
  await saveDatabase();

  const user: FirebaseUser = {
    uid,
    phone: '',
    displayName: 'Google User',
    email,
    role: 'user',
    preferredLanguage: 'en',
    bookmarkedForms: [],
    createdAt: { toDate: () => new Date(now) } as FirebaseUser['createdAt'],
    updatedAt: { toDate: () => new Date(now) } as FirebaseUser['updatedAt'],
    lastLoginAt: { toDate: () => new Date(now) } as FirebaseUser['lastLoginAt'],
  };

  currentUser = user;
  saveUserToStorage(user);
  notifyListeners();

  return user;
}

// Sign in with email (simulated)
export async function signInWithEmail(email: string, _password: string): Promise<FirebaseUser> {
  const db = await initDatabase();

  // Check if user exists
  const result = db.exec(`SELECT * FROM users WHERE email = ?`, [email]);

  let user: FirebaseUser;

  if (result.length > 0 && result[0].values.length > 0) {
    const columns = result[0].columns;
    const values = result[0].values[0];
    const row = Object.fromEntries(columns.map((col: string, i: number) => [col, values[i]]));
    user = rowToUser(row);

    const now = nowTimestamp();
    db.run(`UPDATE users SET last_login_at = ? WHERE uid = ?`, [now, user.uid]);
    await saveDatabase();
  } else {
    throw new Error('User not found');
  }

  currentUser = user;
  saveUserToStorage(user);
  notifyListeners();

  return user;
}

// Sign up with email
export async function signUpWithEmail(email: string, _password: string, displayName: string): Promise<FirebaseUser> {
  const db = await initDatabase();
  const uid = generateId();
  const now = nowTimestamp();

  db.run(
    `INSERT INTO users (
      id, uid, phone, display_name, email, role, preferred_language, bookmarked_forms,
      created_at, updated_at, last_login_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uid, uid, '', displayName, email, 'user', 'en', '[]', now, now, now]
  );
  await saveDatabase();

  const user: FirebaseUser = {
    uid,
    phone: '',
    displayName,
    email,
    role: 'user',
    preferredLanguage: 'en',
    bookmarkedForms: [],
    createdAt: { toDate: () => new Date(now) } as FirebaseUser['createdAt'],
    updatedAt: { toDate: () => new Date(now) } as FirebaseUser['updatedAt'],
    lastLoginAt: { toDate: () => new Date(now) } as FirebaseUser['lastLoginAt'],
  };

  currentUser = user;
  saveUserToStorage(user);
  notifyListeners();

  return user;
}

// Sign out
export async function signOut(): Promise<void> {
  currentUser = null;
  saveUserToStorage(null);
  notifyListeners();
}

// Get current user profile
export async function getCurrentUserProfile(): Promise<FirebaseUser | null> {
  return currentUser;
}

// Update user profile
export async function updateUserProfile(updates: Partial<FirebaseUser>): Promise<void> {
  if (!currentUser) throw new Error('Not authenticated');

  const db = await initDatabase();
  const now = nowTimestamp();

  const setClauses: string[] = ['updated_at = ?'];
  const values: SqlValue[] = [now];

  if (updates.displayName !== undefined) { setClauses.push('display_name = ?'); values.push(updates.displayName ?? null); }
  if (updates.email !== undefined) { setClauses.push('email = ?'); values.push(updates.email ?? null); }
  if (updates.preferredLanguage !== undefined) { setClauses.push('preferred_language = ?'); values.push(updates.preferredLanguage); }
  if (updates.bookmarkedForms !== undefined) { setClauses.push('bookmarked_forms = ?'); values.push(toJson(updates.bookmarkedForms)); }

  values.push(currentUser.uid);
  db.run(`UPDATE users SET ${setClauses.join(', ')} WHERE uid = ?`, values);
  await saveDatabase();

  // Update local state
  currentUser = { ...currentUser, ...updates };
  saveUserToStorage(currentUser);
  notifyListeners();
}

// Add bookmark
export async function addBookmark(formId: string): Promise<void> {
  if (!currentUser) throw new Error('Not authenticated');

  const bookmarks = [...currentUser.bookmarkedForms];
  if (!bookmarks.includes(formId)) {
    bookmarks.push(formId);
    await updateUserProfile({ bookmarkedForms: bookmarks });
  }
}

// Remove bookmark
export async function removeBookmark(formId: string): Promise<void> {
  if (!currentUser) throw new Error('Not authenticated');

  const bookmarks = currentUser.bookmarkedForms.filter((id) => id !== formId);
  await updateUserProfile({ bookmarkedForms: bookmarks });
}

// On auth change
export function onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
  authListeners.add(callback);
  // Immediately call with current state
  callback(currentUser);

  return () => {
    authListeners.delete(callback);
  };
}

// Check role
export function hasRole(user: FirebaseUser | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// Is admin
export function isAdmin(user: FirebaseUser | null): boolean {
  return hasRole(user, ['admin', 'institution_admin', 'super_admin']);
}

// Is super admin
export function isSuperAdmin(user: FirebaseUser | null): boolean {
  return hasRole(user, ['super_admin']);
}

// Quick login for development (creates admin user)
export async function devLogin(): Promise<FirebaseUser> {
  const db = await initDatabase();
  const now = nowTimestamp();

  // Check if dev admin exists
  const result = db.exec(`SELECT * FROM users WHERE email = 'admin@local.dev'`);

  let user: FirebaseUser;

  if (result.length > 0 && result[0].values.length > 0) {
    const columns = result[0].columns;
    const values = result[0].values[0];
    const row = Object.fromEntries(columns.map((col: string, i: number) => [col, values[i]]));
    user = rowToUser(row);
  } else {
    const uid = generateId();
    db.run(
      `INSERT INTO users (
        id, uid, phone, display_name, email, role, preferred_language, bookmarked_forms,
        created_at, updated_at, last_login_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid, uid, '+94000000000', 'Dev Admin', 'admin@local.dev', 'super_admin', 'en', '[]', now, now, now]
    );
    await saveDatabase();

    user = {
      uid,
      phone: '+94000000000',
      displayName: 'Dev Admin',
      email: 'admin@local.dev',
      role: 'super_admin',
      preferredLanguage: 'en',
      bookmarkedForms: [],
      createdAt: { toDate: () => new Date(now) } as FirebaseUser['createdAt'],
      updatedAt: { toDate: () => new Date(now) } as FirebaseUser['updatedAt'],
      lastLoginAt: { toDate: () => new Date(now) } as FirebaseUser['lastLoginAt'],
    };
  }

  currentUser = user;
  saveUserToStorage(user);
  notifyListeners();

  return user;
}
