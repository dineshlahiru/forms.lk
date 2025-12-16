import { useState, useEffect, useCallback } from 'react';
import {
  getUserSubmissions,
  getSubmissionsForForm,
  createSubmission,
  updateSubmissionStatus,
  deleteSubmission,
} from '../services';
import { useAuth } from '../context/AuthContext';
import type { FirebaseSubmission, SubmissionStatus, Language } from '../types/firebase';
import type { DocumentSnapshot } from 'firebase/firestore';

interface SubmissionsState {
  submissions: FirebaseSubmission[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

interface SubmissionActions {
  submitting: boolean;
  error: Error | null;
  submit: (
    formId: string,
    formTitle: string,
    formNumber: string | undefined,
    language: Language,
    data: Record<string, unknown>,
    pdfPath?: string
  ) => Promise<string>;
  updateStatus: (submissionId: string, status: SubmissionStatus) => Promise<void>;
  remove: (submissionId: string) => Promise<void>;
}

// Hook for fetching user submissions with pagination
export function useUserSubmissions(): SubmissionsState {
  const { user, isAuthenticated } = useAuth();
  const [submissions, setSubmissions] = useState<FirebaseSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  const fetch = useCallback(
    async (isLoadMore: boolean = false) => {
      if (!isAuthenticated || !user) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await getUserSubmissions(
          user.uid,
          isLoadMore ? lastDoc ?? undefined : undefined
        );

        if (isLoadMore) {
          setSubmissions((prev) => [...prev, ...result.submissions]);
        } else {
          setSubmissions(result.submissions);
        }

        setLastDoc(result.lastDoc);
        setHasMore(result.submissions.length === 20);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch submissions'));
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, user, lastDoc]
  );

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetch(true);
    }
  }, [loading, hasMore, fetch]);

  const refetch = useCallback(async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetch(false);
  }, [fetch]);

  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    fetch(false);
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return { submissions, loading, error, hasMore, loadMore, refetch };
}

// Hook for fetching submissions for a specific form
export function useFormSubmissions(formId: string | undefined): {
  submissions: FirebaseSubmission[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { user, isAuthenticated } = useAuth();
  const [submissions, setSubmissions] = useState<FirebaseSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!isAuthenticated || !user || !formId) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const formSubmissions = await getSubmissionsForForm(user.uid, formId);
      setSubmissions(formSubmissions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch form submissions'));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, formId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { submissions, loading, error, refetch: fetch };
}

// Hook for submission actions
export function useSubmissionActions(): SubmissionActions {
  const { user, isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submit = useCallback(
    async (
      formId: string,
      formTitle: string,
      formNumber: string | undefined,
      language: Language,
      data: Record<string, unknown>,
      pdfPath?: string
    ): Promise<string> => {
      if (!isAuthenticated || !user) {
        throw new Error('Must be authenticated to submit form');
      }

      try {
        setSubmitting(true);
        setError(null);

        const submissionId = await createSubmission(
          user.uid,
          formId,
          formTitle,
          formNumber,
          language,
          data,
          pdfPath
        );

        return submissionId;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to submit form');
        setError(error);
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [isAuthenticated, user]
  );

  const updateStatus = useCallback(
    async (submissionId: string, status: SubmissionStatus) => {
      try {
        setError(null);
        await updateSubmissionStatus(submissionId, status);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update submission status');
        setError(error);
        throw error;
      }
    },
    []
  );

  const remove = useCallback(async (submissionId: string) => {
    try {
      setError(null);
      await deleteSubmission(submissionId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete submission');
      setError(error);
      throw error;
    }
  }, []);

  return { submitting, error, submit, updateStatus, remove };
}
