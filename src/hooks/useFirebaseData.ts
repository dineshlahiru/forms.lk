import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCategories,
  getInstitutions,
  getPublishedForms,
  getAllPublishedForms,
  getFormsByCategory,
  getFormsByInstitution,
  getPopularForms,
  getForm,
  getFormFields,
} from '../services';
import type {
  FirebaseCategory,
  FirebaseInstitution,
  FirebaseForm,
  FirebaseFormField,
} from '../types/firebase';
import type { DocumentSnapshot } from 'firebase/firestore';
import { getFromCache, setToCache, invalidateCacheByType } from '../lib/cache';

// Generic fetch state
interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Paginated fetch state
interface PaginatedFetchState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

// Hook for fetching categories (with cache)
export function useCategories(): FetchState<FirebaseCategory[]> {
  const [data, setData] = useState<FirebaseCategory[] | null>(() =>
    getFromCache<FirebaseCategory[]>('categories')
  );
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);
  const fetchedRef = useRef(false);

  const fetch = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getFromCache<FirebaseCategory[]>('categories');
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      const categories = await getCategories();
      setData(categories);
      setToCache('categories', categories);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch categories'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if not already fetched and no cached data
    if (!fetchedRef.current && !data) {
      fetchedRef.current = true;
      fetch();
    }
  }, [fetch, data]);

  const refetch = useCallback(async () => {
    invalidateCacheByType('categories');
    await fetch(true);
  }, [fetch]);

  return { data, loading, error, refetch };
}

// Hook for fetching institutions (with cache)
export function useInstitutions(): FetchState<FirebaseInstitution[]> {
  const [data, setData] = useState<FirebaseInstitution[] | null>(() =>
    getFromCache<FirebaseInstitution[]>('institutions')
  );
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);
  const fetchedRef = useRef(false);

  const fetch = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getFromCache<FirebaseInstitution[]>('institutions');
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      const institutions = await getInstitutions();
      setData(institutions);
      setToCache('institutions', institutions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch institutions'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current && !data) {
      fetchedRef.current = true;
      fetch();
    }
  }, [fetch, data]);

  const refetch = useCallback(async () => {
    invalidateCacheByType('institutions');
    await fetch(true);
  }, [fetch]);

  return { data, loading, error, refetch };
}

// Hook for fetching a single form (with cache)
export function useForm(formId: string | undefined): FetchState<FirebaseForm> {
  const [data, setData] = useState<FirebaseForm | null>(() =>
    formId ? getFromCache<FirebaseForm>('form', formId) : null
  );
  const [loading, setLoading] = useState(!data && !!formId);
  const [error, setError] = useState<Error | null>(null);
  const fetchedRef = useRef<string | null>(null);

  const fetch = useCallback(async (forceRefresh = false) => {
    if (!formId) {
      setData(null);
      setLoading(false);
      return;
    }

    if (!forceRefresh) {
      const cached = getFromCache<FirebaseForm>('form', formId);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      const form = await getForm(formId);
      setData(form);
      if (form) {
        setToCache('form', form, formId);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch form'));
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    if (formId && fetchedRef.current !== formId && !data) {
      fetchedRef.current = formId;
      fetch();
    }
  }, [fetch, formId, data]);

  const refetch = useCallback(async () => {
    if (formId) {
      invalidateCacheByType('form');
      await fetch(true);
    }
  }, [fetch, formId]);

  return { data, loading, error, refetch };
}

// Hook for fetching form fields
export function useFormFields(formId: string | undefined): FetchState<FirebaseFormField[]> {
  const [data, setData] = useState<FirebaseFormField[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!formId) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fields = await getFormFields(formId);
      setData(fields);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch form fields'));
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// Hook for fetching popular forms (with cache)
export function usePopularForms(count: number = 10): FetchState<FirebaseForm[]> {
  const cacheKey = `popular-${count}`;
  const [data, setData] = useState<FirebaseForm[] | null>(() =>
    getFromCache<FirebaseForm[]>('popularForms', cacheKey)
  );
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);
  const fetchedRef = useRef(false);

  const fetch = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getFromCache<FirebaseForm[]>('popularForms', cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      const forms = await getPopularForms(count);
      setData(forms);
      setToCache('popularForms', forms, cacheKey);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch popular forms'));
    } finally {
      setLoading(false);
    }
  }, [count, cacheKey]);

  useEffect(() => {
    if (!fetchedRef.current && !data) {
      fetchedRef.current = true;
      fetch();
    }
  }, [fetch, data]);

  const refetch = useCallback(async () => {
    invalidateCacheByType('popularForms');
    await fetch(true);
  }, [fetch]);

  return { data, loading, error, refetch };
}

// Hook for fetching all published forms (with cache)
export function useAllForms(): FetchState<FirebaseForm[]> {
  const [data, setData] = useState<FirebaseForm[] | null>(() =>
    getFromCache<FirebaseForm[]>('forms')
  );
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);
  const fetchedRef = useRef(false);

  const fetch = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getFromCache<FirebaseForm[]>('forms');
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      const forms = await getAllPublishedForms();
      setData(forms);
      setToCache('forms', forms);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch forms'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current && !data) {
      fetchedRef.current = true;
      fetch();
    }
  }, [fetch, data]);

  const refetch = useCallback(async () => {
    invalidateCacheByType('forms');
    await fetch(true);
  }, [fetch]);

  return { data, loading, error, refetch };
}

// Hook for paginated forms list
export function useForms(
  categoryId?: string,
  institutionId?: string
): PaginatedFetchState<FirebaseForm> {
  const [data, setData] = useState<FirebaseForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  const fetchForms = useCallback(
    async (isLoadMore: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        let result;
        if (categoryId) {
          result = await getFormsByCategory(categoryId, isLoadMore ? lastDoc ?? undefined : undefined);
        } else if (institutionId) {
          result = await getFormsByInstitution(institutionId, isLoadMore ? lastDoc ?? undefined : undefined);
        } else {
          result = await getPublishedForms(isLoadMore ? lastDoc ?? undefined : undefined);
        }

        if (isLoadMore) {
          setData((prev) => [...prev, ...result.forms]);
        } else {
          setData(result.forms);
        }

        setLastDoc(result.lastDoc as DocumentSnapshot | null);
        setHasMore(result.forms.length === 20); // PAGE_SIZE
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch forms'));
      } finally {
        setLoading(false);
      }
    },
    [categoryId, institutionId, lastDoc]
  );

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchForms(true);
    }
  }, [loading, hasMore, fetchForms]);

  const refetch = useCallback(async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetchForms(false);
  }, [fetchForms]);

  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    setData([]);
    fetchForms(false);
  }, [categoryId, institutionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, hasMore, loadMore, refetch };
}
