// Institution Intelligence Module Types

import type { Timestamp } from 'firebase/firestore';

// ========================================
// Division Types
// ========================================

export interface Division {
  id: string;
  institutionId: string;
  name: string;
  nameSi?: string;
  nameTa?: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder: number;
  contactCount: number;
  formCount: number;
  // Location info for district/branch offices
  address?: string;
  phones?: string[];
  fax?: string;
  email?: string;
  locationType?: 'head_office' | 'district_office' | 'branch' | 'regional';
  district?: string;
  isActive: boolean;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface CreateDivisionInput {
  institutionId: string;
  name: string;
  nameSi?: string;
  nameTa?: string;
  slug?: string; // Auto-generated if not provided
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
  // Location info for district/branch offices
  address?: string;
  phones?: string[];
  fax?: string;
  email?: string;
  locationType?: 'head_office' | 'district_office' | 'branch' | 'regional';
  district?: string;
}

export interface UpdateDivisionInput {
  name?: string;
  nameSi?: string;
  nameTa?: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
  isActive?: boolean;
  // Location info for district/branch offices
  address?: string;
  phones?: string[];
  fax?: string;
  email?: string;
  locationType?: 'head_office' | 'district_office' | 'branch' | 'regional';
  district?: string;
}

// ========================================
// Contact Types
// ========================================

export interface Contact {
  id: string;
  divisionId: string;
  institutionId: string;
  name?: string;
  position: string;
  positionSi?: string;
  positionTa?: string;
  phones: string[];
  email?: string;
  fax?: string;
  isHead: boolean;
  hierarchyLevel: number; // 1=top (Commissioner General), 2=Commissioner, 3=Deputy, etc.
  reportsToId?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface CreateContactInput {
  divisionId: string;
  institutionId: string;
  name?: string;
  position: string;
  positionSi?: string;
  positionTa?: string;
  phones?: string[];
  email?: string;
  fax?: string;
  isHead?: boolean;
  hierarchyLevel?: number;
  reportsToId?: string;
  displayOrder?: number;
}

export interface UpdateContactInput {
  divisionId?: string;
  name?: string;
  position?: string;
  positionSi?: string;
  positionTa?: string;
  phones?: string[];
  email?: string;
  fax?: string;
  isHead?: boolean;
  hierarchyLevel?: number;
  reportsToId?: string;
  displayOrder?: number;
  isActive?: boolean;
}

// ========================================
// Sync Types
// ========================================

export type SyncStatus = 'pending' | 'in_progress' | 'success' | 'partial' | 'failed';

export interface InstitutionSyncLog {
  id: string;
  institutionId: string;
  sourceUrl: string;
  contentHash?: string;
  status: SyncStatus;
  contactsFound: number;
  contactsImported: number;
  divisionsCreated: number;
  changesDetected: boolean;
  changesSummary?: string;
  tokensUsed: number;
  costUsd: number;
  errorMessage?: string;
  syncedAt: Timestamp | string;
  syncedBy?: string;
}

export interface CreateSyncLogInput {
  institutionId: string;
  sourceUrl: string;
  contentHash?: string;
  status?: SyncStatus;
  contactsFound?: number;
  contactsImported?: number;
  divisionsCreated?: number;
  changesDetected?: boolean;
  changesSummary?: string;
  tokensUsed?: number;
  costUsd?: number;
  errorMessage?: string;
  syncedBy?: string;
}

// Institution sync settings (extends base institution)
export interface InstitutionSyncSettings {
  sourceUrl?: string;
  contentHash?: string;
  lastSyncedAt?: string;
  autoSyncEnabled: boolean;
  syncFrequency: 'daily' | 'weekly' | 'monthly' | 'manual';
}

// ========================================
// API Budget Types
// ========================================

export type ApiService = 'claude' | 'web-fetch';
export type ApiOperation = 'institution-sync' | 'hierarchy-detect' | 'content-extract';

export interface ApiUsage {
  id: string;
  service: ApiService;
  operation: ApiOperation;
  institutionId?: string;
  tokensUsed: number;
  costUsd: number;
  monthKey: string; // Format: "2024-12"
  createdAt: Timestamp | string;
}

export interface CreateApiUsageInput {
  service: ApiService;
  operation: ApiOperation;
  institutionId?: string;
  tokensUsed: number;
  costUsd: number;
}

export interface ApiBudgetSettings {
  id: string;
  monthlyLimitUsd: number;
  alertThresholdPercent: number;
  pauseOnExhausted: boolean;
  alertEmail?: string;
  updatedAt: Timestamp | string;
}

export interface UpdateApiBudgetInput {
  monthlyLimitUsd?: number;
  alertThresholdPercent?: number;
  pauseOnExhausted?: boolean;
  alertEmail?: string;
}

export interface BudgetStatus {
  monthlyLimitUsd: number;
  usedUsd: number;
  remainingUsd: number;
  percentUsed: number;
  isExhausted: boolean;
  isWarning: boolean; // > alertThresholdPercent
  syncCount: number;
  monthKey: string;
}

// ========================================
// Extraction Types (for AI scraping)
// ========================================

export interface ExtractedContact {
  name?: string;
  position: string;
  division?: string;
  phones: string[];
  email?: string;
  fax?: string;
}

export interface ExtractedDistrictOffice {
  district: string;
  location?: string;
  address?: string;
  phones: string[];
  fax?: string;
  email?: string;
  contacts?: ExtractedContact[];
}

export interface ExtractedData {
  source: string;
  headOffice: ExtractedContact[];
  branches: ExtractedContact[];
  districtOffices?: ExtractedDistrictOffice[];
  divisions: string[];
  hierarchy?: {
    position: string;
    level: number;
    reportsTo?: string;
  }[];
}

export interface ScrapeResult {
  success: boolean;
  data?: ExtractedData;
  contentHash: string;
  tokensUsed: number;
  costUsd: number;
  error?: string;
}

// ========================================
// UI State Types
// ========================================

export type SyncPhase = 'idle' | 'fetching' | 'extracting' | 'preview' | 'importing' | 'complete' | 'error';

export interface SyncProgressState {
  phase: SyncPhase;
  progress: number; // 0-100
  currentStep: string;
  extractedData?: ExtractedData;
  selectedContacts?: Set<string>;
  error?: string;
}

export interface ImportOptions {
  createDivisionsAutomatically: boolean;
  updateExistingContacts: boolean; // Match by email
  replaceAllContacts: boolean;
}
