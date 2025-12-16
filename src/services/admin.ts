import { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { FirebaseUser, UserRole } from '../types/firebase';

const USERS_COLLECTION = 'users';

// Create a super admin user (first-time setup)
export async function createSuperAdmin(
  uid: string,
  phone: string,
  displayName: string,
  email?: string
): Promise<FirebaseUser> {
  const now = Timestamp.now();

  const adminUser: FirebaseUser = {
    uid,
    phone,
    displayName,
    email,
    role: 'super_admin',
    preferredLanguage: 'en',
    bookmarkedForms: [],
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), adminUser);
  return adminUser;
}

// Promote a user to admin
export async function promoteToAdmin(userId: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  await updateDoc(userRef, {
    role: 'admin',
    updatedAt: Timestamp.now(),
  });
}

// Promote a user to super admin
export async function promoteToSuperAdmin(userId: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  await updateDoc(userRef, {
    role: 'super_admin',
    updatedAt: Timestamp.now(),
  });
}

// Set user as institution admin
export async function setInstitutionAdmin(
  userId: string,
  institutionId: string
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  await updateDoc(userRef, {
    role: 'institution_admin',
    institutionId,
    updatedAt: Timestamp.now(),
  });
}

// Demote a user to regular user
export async function demoteToUser(userId: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  await updateDoc(userRef, {
    role: 'user',
    institutionId: null,
    updatedAt: Timestamp.now(),
  });
}

// Get all admin users
export async function getAdminUsers(): Promise<FirebaseUser[]> {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('role', 'in', ['admin', 'super_admin', 'institution_admin'])
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as FirebaseUser);
}

// Check if super admin exists
export async function hasSuperAdmin(): Promise<boolean> {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('role', '==', 'super_admin')
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// Get user by phone number
export async function getUserByPhone(phone: string): Promise<FirebaseUser | null> {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('phone', '==', phone)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  return snapshot.docs[0].data() as FirebaseUser;
}

// Update user role
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  const updates: Record<string, unknown> = {
    role,
    updatedAt: Timestamp.now(),
  };

  // Clear institutionId if not institution_admin
  if (role !== 'institution_admin') {
    updates.institutionId = null;
  }

  await updateDoc(userRef, updates);
}
