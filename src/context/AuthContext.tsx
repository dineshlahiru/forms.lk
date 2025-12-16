import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthChange, getCurrentUserProfile, signOut as authSignOut, isLocalStorage } from '../services';
import type { FirebaseUser, Language } from '../types/firebase';

interface AuthContextType {
  // User profile (from Firestore or local SQLite)
  user: FirebaseUser | null;
  // Loading state
  loading: boolean;
  // Is authenticated
  isAuthenticated: boolean;
  // Is admin
  isAdmin: boolean;
  // Is super admin
  isSuperAdmin: boolean;
  // Preferred language
  preferredLanguage: Language;
  // Refresh user profile
  refreshUser: () => Promise<void>;
  // Sign out
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    try {
      const profile = await getCurrentUserProfile();
      setUser(profile);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUser(null);
    }
  }, []);

  // Refresh user profile
  const refreshUser = useCallback(async () => {
    await fetchUserProfile();
  }, [fetchUserProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await authSignOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthChange(async (authState) => {
      if (isLocalStorage()) {
        // In local mode, onAuthChange passes FirebaseUser directly
        setUser(authState as FirebaseUser | null);
      } else {
        // In Firebase mode, onAuthChange passes Firebase Auth User
        // We need to fetch the profile from Firestore
        if (authState) {
          await fetchUserProfile();
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  // Computed values
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin' || user?.role === 'institution_admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const preferredLanguage = user?.preferredLanguage || 'en';

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    preferredLanguage,
    refreshUser,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for checking if user has specific role
export function useHasRole(roles: FirebaseUser['role'][]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return roles.includes(user.role);
}

// Hook for preferred language
export function usePreferredLanguage(): Language {
  const { preferredLanguage } = useAuth();
  return preferredLanguage;
}
