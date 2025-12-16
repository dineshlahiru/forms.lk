import { useState, useEffect, useCallback } from 'react';
import {
  getUserDrafts,
  getDraftForForm,
  saveDraft,
  deleteDraft,
  calculateCompletion,
} from '../services';
import { useAuth } from '../context/AuthContext';
import type { FirebaseDraft, Language } from '../types/firebase';

interface DraftsState {
  drafts: FirebaseDraft[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface DraftState {
  draft: FirebaseDraft | null;
  loading: boolean;
  error: Error | null;
  saving: boolean;
  save: (data: Record<string, unknown>, totalFields?: number) => Promise<string | void>;
  remove: () => Promise<void>;
}

// Hook for fetching all user drafts
export function useUserDrafts(): DraftsState {
  const { user, isAuthenticated } = useAuth();
  const [drafts, setDrafts] = useState<FirebaseDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setDrafts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userDrafts = await getUserDrafts(user.uid);
      setDrafts(userDrafts);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch drafts'));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { drafts, loading, error, refetch: fetch };
}

// Hook for managing a draft for a specific form
export function useFormDraft(
  formId: string | undefined,
  language: Language = 'en'
): DraftState {
  const { user, isAuthenticated } = useAuth();
  const [draft, setDraft] = useState<FirebaseDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch existing draft
  const fetch = useCallback(async () => {
    if (!isAuthenticated || !user || !formId) {
      setDraft(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const existingDraft = await getDraftForForm(user.uid, formId);
      setDraft(existingDraft);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch draft'));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, formId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Save draft
  const save = useCallback(
    async (data: Record<string, unknown>, totalFields?: number) => {
      if (!isAuthenticated || !user || !formId) {
        throw new Error('Must be authenticated to save draft');
      }

      try {
        setSaving(true);
        setError(null);

        const completion = totalFields ? calculateCompletion(data, totalFields) : 0;
        const lastField = Object.keys(data).pop();

        const draftId = await saveDraft(
          user.uid,
          formId,
          data,
          language,
          completion,
          lastField
        );

        // Refetch to get updated draft
        const updatedDraft = await getDraftForForm(user.uid, formId);
        setDraft(updatedDraft);

        return draftId;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to save draft'));
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [isAuthenticated, user, formId, language]
  );

  // Delete draft
  const remove = useCallback(async () => {
    if (!draft) return;

    try {
      setError(null);
      await deleteDraft(draft.id);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete draft'));
      throw err;
    }
  }, [draft]);

  return { draft, loading, error, saving, save, remove };
}
