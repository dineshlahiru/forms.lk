import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { FirebaseSubmission, SubmissionStatus, Language } from '../types/firebase';

const SUBMISSIONS_COLLECTION = 'submissions';
const PAGE_SIZE = 20;

// Get user's submissions with pagination
export async function getUserSubmissions(
  userId: string,
  lastDoc?: DocumentSnapshot,
  pageSize: number = PAGE_SIZE
): Promise<{ submissions: FirebaseSubmission[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const submissions = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as FirebaseSubmission)
  );
  const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

  return { submissions, lastDoc: newLastDoc };
}

// Get a specific submission
export async function getSubmission(submissionId: string): Promise<FirebaseSubmission | null> {
  const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return { id: docSnap.id, ...docSnap.data() } as FirebaseSubmission;
}

// Get submissions for a specific form
export async function getSubmissionsForForm(
  userId: string,
  formId: string
): Promise<FirebaseSubmission[]> {
  const q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where('userId', '==', userId),
    where('formId', '==', formId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseSubmission));
}

// Create a new submission
export async function createSubmission(
  userId: string,
  formId: string,
  formTitle: string,
  formNumber: string | undefined,
  languageUsed: Language,
  data: Record<string, unknown>,
  generatedPdfPath?: string
): Promise<string> {
  const now = Timestamp.now();

  const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), {
    userId,
    formId,
    formTitle,
    formNumber,
    languageUsed,
    data,
    generatedPdfPath,
    status: 'completed' as SubmissionStatus,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
  });

  return docRef.id;
}

// Update submission status
export async function updateSubmissionStatus(
  submissionId: string,
  status: SubmissionStatus
): Promise<void> {
  const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  await updateDoc(docRef, {
    status,
    updatedAt: Timestamp.now(),
  });
}

// Update submission with generated PDF path
export async function updateSubmissionPdf(
  submissionId: string,
  generatedPdfPath: string
): Promise<void> {
  const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  await updateDoc(docRef, {
    generatedPdfPath,
    updatedAt: Timestamp.now(),
  });
}

// Delete a submission
export async function deleteSubmission(submissionId: string): Promise<void> {
  const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  await deleteDoc(docRef);
}

// Get recent submissions count for a user
export async function getRecentSubmissionsCount(
  userId: string,
  daysBack: number = 30
): Promise<number> {
  const cutoffDate = Timestamp.fromMillis(
    Date.now() - daysBack * 24 * 60 * 60 * 1000
  );

  const q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where('userId', '==', userId),
    where('createdAt', '>=', cutoffDate)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}
