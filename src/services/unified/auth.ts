// Unified auth service - re-exports from local when in local mode
// Note: Firebase and Local auth have different APIs due to different auth mechanisms
// Local mode simulates auth without recaptcha/OTP complexity

import { isLocalStorage } from '../../lib/serviceConfig';
import type { FirebaseUser, UserRole } from '../../types/firebase';

// Import local auth
import * as localAuth from '../local/auth';

// Helper to check role
export function hasRole(user: FirebaseUser | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// Check if user is admin
export function isAdmin(user: FirebaseUser | null): boolean {
  return hasRole(user, ['admin', 'institution_admin', 'super_admin']);
}

// Check if user is super admin
export function isSuperAdmin(user: FirebaseUser | null): boolean {
  return hasRole(user, ['super_admin']);
}

// Local-only: Quick dev login (creates super admin user)
export async function devLogin(): Promise<FirebaseUser | null> {
  if (isLocalStorage()) {
    return localAuth.devLogin();
  }
  console.warn('[Auth] devLogin is only available in local mode');
  return null;
}

// Re-export local auth functions for local mode
// When using Firebase, import directly from ../auth
export const signOut = localAuth.signOut;
export const getCurrentUserProfile = localAuth.getCurrentUserProfile;
export const updateUserProfile = localAuth.updateUserProfile;
export const addBookmark = localAuth.addBookmark;
export const removeBookmark = localAuth.removeBookmark;
export const onAuthChange = localAuth.onAuthChange;

// Simplified auth for local mode - just returns a user
export async function quickAuth(): Promise<FirebaseUser> {
  if (isLocalStorage()) {
    return localAuth.devLogin();
  }
  throw new Error('quickAuth is only available in local mode');
}

// Recaptcha (no-op for local)
export function initRecaptcha(): void {
  // No-op for local mode
}

export function clearRecaptcha(): void {
  // No-op for local mode
}

// Simplified OTP flow for local mode
export async function sendOtp(phoneNumber: string): Promise<void> {
  if (isLocalStorage()) {
    return localAuth.sendOtp(phoneNumber);
  }
  throw new Error('Use Firebase auth directly for OTP in production mode');
}

export async function verifyOtp(code: string): Promise<FirebaseUser> {
  if (isLocalStorage()) {
    return localAuth.verifyOtp(code);
  }
  throw new Error('Use Firebase auth directly for OTP in production mode');
}

// Social sign-in
export async function signInWithGoogle(): Promise<FirebaseUser> {
  if (isLocalStorage()) {
    return localAuth.signInWithGoogle();
  }
  throw new Error('Use Firebase auth directly for Google sign-in in production mode');
}

// Email auth
export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  if (isLocalStorage()) {
    return localAuth.signInWithEmail(email, password);
  }
  throw new Error('Use Firebase auth directly for email sign-in in production mode');
}

export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<FirebaseUser> {
  if (isLocalStorage()) {
    return localAuth.signUpWithEmail(email, password, displayName);
  }
  throw new Error('Use Firebase auth directly for email sign-up in production mode');
}
