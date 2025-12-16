import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import type { ConfirmationResult, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { FirebaseUser, UserRole } from '../types/firebase';

const USERS_COLLECTION = 'users';

// Store for RecaptchaVerifier instance
let recaptchaVerifier: RecaptchaVerifier | null = null;

// Initialize RecaptchaVerifier
export function initRecaptcha(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
  }

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
  });

  return recaptchaVerifier;
}

// Clear RecaptchaVerifier
export function clearRecaptcha(): void {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
}

// Send OTP to phone number
export async function sendOtp(
  phoneNumber: string,
  recaptcha: RecaptchaVerifier
): Promise<ConfirmationResult> {
  // Ensure phone number is in international format
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+94${phoneNumber.replace(/^0/, '')}`;
  return signInWithPhoneNumber(auth, formattedPhone, recaptcha);
}

// Verify OTP and sign in
export async function verifyOtp(
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<FirebaseUser> {
  const userCredential = await confirmationResult.confirm(otp);
  const firebaseUser = userCredential.user;

  // Check if user exists in Firestore
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid));

  if (userDoc.exists()) {
    // Update last login
    await updateDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), {
      lastLoginAt: Timestamp.now(),
    });
    return userDoc.data() as FirebaseUser;
  } else {
    // Create new user profile
    const newUser: FirebaseUser = {
      uid: firebaseUser.uid,
      phone: firebaseUser.phoneNumber || '',
      displayName: '',
      role: 'user',
      preferredLanguage: 'en',
      bookmarkedForms: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
    };

    await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), newUser);
    return newUser;
  }
}

// Sign in with Google (optional)
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const firebaseUser = userCredential.user;

  // Check if user exists in Firestore
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid));

  if (userDoc.exists()) {
    await updateDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), {
      lastLoginAt: Timestamp.now(),
    });
    return userDoc.data() as FirebaseUser;
  } else {
    const newUser: FirebaseUser = {
      uid: firebaseUser.uid,
      phone: firebaseUser.phoneNumber || '',
      displayName: firebaseUser.displayName || '',
      email: firebaseUser.email || undefined,
      role: 'user',
      preferredLanguage: 'en',
      bookmarkedForms: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
    };

    await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), newUser);
    return newUser;
  }
}

// Sign in with email/password (fallback)
export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid));

  if (userDoc.exists()) {
    await updateDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), {
      lastLoginAt: Timestamp.now(),
    });
    return userDoc.data() as FirebaseUser;
  }

  throw new Error('User profile not found');
}

// Sign up with email/password (fallback)
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  const newUser: FirebaseUser = {
    uid: firebaseUser.uid,
    phone: '',
    displayName,
    email,
    role: 'user',
    preferredLanguage: 'en',
    bookmarkedForms: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    lastLoginAt: Timestamp.now(),
  };

  await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), newUser);
  return newUser;
}

// Sign out
export async function signOut(): Promise<void> {
  clearRecaptcha();
  await firebaseSignOut(auth);
}

// Get current user profile from Firestore
export async function getCurrentUserProfile(): Promise<FirebaseUser | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid));
  if (!userDoc.exists()) return null;

  return userDoc.data() as FirebaseUser;
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<FirebaseUser, 'displayName' | 'email' | 'preferredLanguage'>>
): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// Add form to bookmarks
export async function addBookmark(userId: string, formId: string): Promise<void> {
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
  if (!userDoc.exists()) throw new Error('User not found');

  const bookmarks = userDoc.data().bookmarkedForms || [];
  if (!bookmarks.includes(formId)) {
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      bookmarkedForms: [...bookmarks, formId],
      updatedAt: Timestamp.now(),
    });
  }
}

// Remove form from bookmarks
export async function removeBookmark(userId: string, formId: string): Promise<void> {
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
  if (!userDoc.exists()) throw new Error('User not found');

  const bookmarks = userDoc.data().bookmarkedForms || [];
  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    bookmarkedForms: bookmarks.filter((id: string) => id !== formId),
    updatedAt: Timestamp.now(),
  });
}

// Subscribe to auth state changes
export function onAuthChange(callback: (user: FirebaseAuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// Check if user has role
export function hasRole(user: FirebaseUser | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// Check if user is admin
export function isAdmin(user: FirebaseUser | null): boolean {
  return hasRole(user, ['admin', 'super_admin']);
}

// Check if user is super admin
export function isSuperAdmin(user: FirebaseUser | null): boolean {
  return hasRole(user, ['super_admin']);
}
