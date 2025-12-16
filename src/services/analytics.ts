import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AnalyticsEventType, DeviceType, Language } from '../types/firebase';

const ANALYTICS_COLLECTION = 'analytics';

// Detect device type from user agent
function getDeviceType(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();

  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }

  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}

// Get date keys for partitioning
function getDateKeys(): { dateKey: string; monthKey: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return {
    dateKey: `${year}-${month}-${day}`,
    monthKey: `${year}-${month}`,
  };
}

// Track a generic analytics event
export async function trackEvent(
  event: AnalyticsEventType,
  language: Language,
  options?: {
    formId?: string;
    categoryId?: string;
    institutionId?: string;
    userId?: string;
    searchQuery?: string;
  }
): Promise<void> {
  try {
    const { dateKey, monthKey } = getDateKeys();

    await addDoc(collection(db, ANALYTICS_COLLECTION), {
      event,
      formId: options?.formId,
      categoryId: options?.categoryId,
      institutionId: options?.institutionId,
      userId: options?.userId,
      language,
      searchQuery: options?.searchQuery,
      deviceType: getDeviceType(),
      userAgent: navigator.userAgent,
      timestamp: Timestamp.now(),
      dateKey,
      monthKey,
    });
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.error('Analytics tracking failed:', error);
  }
}

// Track form view
export async function trackFormView(
  formId: string,
  language: Language,
  userId?: string
): Promise<void> {
  await trackEvent('view', language, { formId, userId });
}

// Track form download
export async function trackFormDownload(
  formId: string,
  language: Language,
  userId?: string
): Promise<void> {
  await trackEvent('download', language, { formId, userId });
}

// Track form fill start
export async function trackFillStart(
  formId: string,
  language: Language,
  userId?: string
): Promise<void> {
  await trackEvent('fill_start', language, { formId, userId });
}

// Track form fill complete
export async function trackFillComplete(
  formId: string,
  language: Language,
  userId?: string
): Promise<void> {
  await trackEvent('fill_complete', language, { formId, userId });
}

// Track search
export async function trackSearch(
  searchQuery: string,
  language: Language,
  userId?: string
): Promise<void> {
  await trackEvent('search', language, { searchQuery, userId });
}

// Track category view
export async function trackCategoryView(
  categoryId: string,
  language: Language,
  userId?: string
): Promise<void> {
  await trackEvent('view', language, { categoryId, userId });
}

// Track institution view
export async function trackInstitutionView(
  institutionId: string,
  language: Language,
  userId?: string
): Promise<void> {
  await trackEvent('view', language, { institutionId, userId });
}
