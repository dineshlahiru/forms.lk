// Sync Orchestrator - Coordinates the full sync process for institution contacts
// This service ties together: budget check → scrape → preview → import

import { initDatabase, saveDatabase, nowTimestamp, type SqlValue } from '../../lib/localDb';
import type {
  SyncPhase,
  SyncProgressState,
  ExtractedData,
  ImportOptions,
  Contact,
  CreateContactInput,
} from '../../types/institution-intel';
import {
  scrapeInstitutionWebsite,
  checkBudgetAllowsSync,
  convertExtractedToContactInputs,
  logSyncOperation,
  generateContentHash,
} from './scraper';
import { bulkCreateDivisions, getDivisions, getOrCreateDivision, createDivision } from './divisions';
import {
  bulkCreateContacts,
  deleteAllContactsForInstitution,
  getContactsByInstitution,
  getContactByEmail,
  updateContact,
} from './contacts';

// Progress callback type
export type SyncProgressCallback = (state: SyncProgressState) => void;

// Sync result type
export interface SyncResult {
  success: boolean;
  phase: SyncPhase;
  extractedData?: ExtractedData;
  contactsImported: number;
  divisionsCreated: number;
  tokensUsed: number;
  costUsd: number;
  changesDetected: boolean;
  error?: string;
}

// Get institution sync settings from database
export async function getInstitutionSyncSettings(institutionId: string): Promise<{
  sourceUrl?: string;
  contentHash?: string;
  lastSyncedAt?: string;
  autoSyncEnabled: boolean;
  syncFrequency: string;
} | null> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT source_url, content_hash, last_synced_at, auto_sync_enabled, sync_frequency
     FROM institutions WHERE id = ?`,
    [institutionId]
  );

  if (!result.length || !result[0].values.length) {
    return null;
  }

  const row = result[0].values[0];
  const columns = result[0].columns;
  const obj: Record<string, SqlValue> = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });

  return {
    sourceUrl: obj.source_url as string | undefined,
    contentHash: obj.content_hash as string | undefined,
    lastSyncedAt: obj.last_synced_at as string | undefined,
    autoSyncEnabled: Boolean(obj.auto_sync_enabled),
    syncFrequency: (obj.sync_frequency as string) || 'weekly',
  };
}

// Update institution sync settings
export async function updateInstitutionSyncSettings(
  institutionId: string,
  settings: {
    sourceUrl?: string;
    contentHash?: string;
    lastSyncedAt?: string;
    autoSyncEnabled?: boolean;
    syncFrequency?: string;
  }
): Promise<void> {
  const db = await initDatabase();
  const now = nowTimestamp();

  const updates: string[] = ['updated_at = ?'];
  const values: SqlValue[] = [now];

  if (settings.sourceUrl !== undefined) {
    updates.push('source_url = ?');
    values.push(settings.sourceUrl || null);
  }
  if (settings.contentHash !== undefined) {
    updates.push('content_hash = ?');
    values.push(settings.contentHash || null);
  }
  if (settings.lastSyncedAt !== undefined) {
    updates.push('last_synced_at = ?');
    values.push(settings.lastSyncedAt || null);
  }
  if (settings.autoSyncEnabled !== undefined) {
    updates.push('auto_sync_enabled = ?');
    values.push(settings.autoSyncEnabled ? 1 : 0);
  }
  if (settings.syncFrequency !== undefined) {
    updates.push('sync_frequency = ?');
    values.push(settings.syncFrequency);
  }

  values.push(institutionId);
  db.run(`UPDATE institutions SET ${updates.join(', ')} WHERE id = ?`, values);
  await saveDatabase();
}

// Phase 1: Pre-sync checks
export async function preSyncCheck(institutionId: string, sourceUrl?: string): Promise<{
  canSync: boolean;
  reason?: string;
  budgetInfo?: { usedUsd: number; limitUsd: number; percentUsed: number };
  currentSettings?: Awaited<ReturnType<typeof getInstitutionSyncSettings>>;
}> {
  // Check budget
  const budgetCheck = await checkBudgetAllowsSync();
  if (!budgetCheck.allowed) {
    return {
      canSync: false,
      reason: budgetCheck.reason,
      budgetInfo: budgetCheck.usage,
    };
  }

  // Get current settings
  const settings = await getInstitutionSyncSettings(institutionId);
  if (!settings && !sourceUrl) {
    return {
      canSync: false,
      reason: 'Institution not found or no source URL provided',
      budgetInfo: budgetCheck.usage,
    };
  }

  const effectiveUrl = sourceUrl || settings?.sourceUrl;
  if (!effectiveUrl) {
    return {
      canSync: false,
      reason: 'No source URL configured for this institution',
      budgetInfo: budgetCheck.usage,
      currentSettings: settings ?? undefined,
    };
  }

  return {
    canSync: true,
    budgetInfo: budgetCheck.usage,
    currentSettings: settings ?? undefined,
  };
}

// Phase 2: Fetch and extract (returns data for preview)
export async function fetchAndExtract(
  institutionId: string,
  sourceUrl: string,
  onProgress?: SyncProgressCallback
): Promise<{
  success: boolean;
  data?: ExtractedData;
  contentHash?: string;
  tokensUsed: number;
  costUsd: number;
  changesDetected: boolean;
  error?: string;
}> {
  // Update progress: fetching
  onProgress?.({
    phase: 'fetching',
    progress: 10,
    currentStep: 'Fetching website content...',
  });

  try {
    // Get current content hash
    const settings = await getInstitutionSyncSettings(institutionId);
    const previousHash = settings?.contentHash;

    // Scrape website
    onProgress?.({
      phase: 'extracting',
      progress: 30,
      currentStep: 'Analyzing content with Claude AI...',
    });

    const result = await scrapeInstitutionWebsite(sourceUrl, institutionId);

    if (!result.success || !result.data) {
      return {
        success: false,
        tokensUsed: result.tokensUsed,
        costUsd: result.costUsd,
        changesDetected: false,
        error: result.error || 'Extraction failed',
      };
    }

    // Check for changes
    const changesDetected = !previousHash || previousHash !== result.contentHash;

    // Update progress: preview ready
    onProgress?.({
      phase: 'preview',
      progress: 50,
      currentStep: changesDetected ? 'Changes detected! Review extracted contacts.' : 'Content unchanged since last sync.',
      extractedData: result.data,
    });

    return {
      success: true,
      data: result.data,
      contentHash: result.contentHash,
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      changesDetected,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during extraction';
    onProgress?.({
      phase: 'error',
      progress: 0,
      currentStep: errorMessage,
      error: errorMessage,
    });

    return {
      success: false,
      tokensUsed: 0,
      costUsd: 0,
      changesDetected: false,
      error: errorMessage,
    };
  }
}

// Phase 3: Import contacts (after user confirms preview)
export async function importContacts(
  institutionId: string,
  extractedData: ExtractedData,
  contentHash: string,
  options: ImportOptions,
  onProgress?: SyncProgressCallback
): Promise<{
  success: boolean;
  contactsImported: number;
  divisionsCreated: number;
  error?: string;
}> {
  onProgress?.({
    phase: 'importing',
    progress: 60,
    currentStep: 'Creating divisions...',
  });

  try {
    let divisionsCreated = 0;
    const divisionMap = new Map<string, string>();

    // Step 1: Create divisions
    if (options.createDivisionsAutomatically) {
      // Add "Head Office" as default division if not in list
      const allDivisions = [...extractedData.divisions];
      if (!allDivisions.includes('Head Office')) {
        allDivisions.unshift('Head Office');
      }
      // Add "Branches" if there are branch contacts
      if (extractedData.branches.length > 0 && !allDivisions.includes('Branches')) {
        allDivisions.push('Branches');
      }

      // Filter out district office divisions (they'll be created separately with location info)
      const regularDivisions = allDivisions.filter(d => !d.startsWith('District Office - '));

      // Create regular divisions in bulk
      const createdDivisions = await bulkCreateDivisions(institutionId, regularDivisions);
      divisionsCreated = createdDivisions.size;
      createdDivisions.forEach((id, name) => divisionMap.set(name, id));

      // Create district office divisions with location info
      if (extractedData.districtOffices) {
        for (const office of extractedData.districtOffices) {
          const divisionName = `District Office - ${office.district}`;

          // Check if already exists
          const existingDivisions = await getDivisions(institutionId);
          const existing = existingDivisions.find(d => d.name === divisionName);

          if (existing) {
            divisionMap.set(divisionName, existing.id);
          } else {
            // Create with location info
            const divisionId = await createDivision({
              institutionId,
              name: divisionName,
              address: office.address,
              phones: office.phones,
              fax: office.fax || undefined,
              email: office.email || undefined,
              locationType: 'district_office',
              district: office.district,
            });
            divisionMap.set(divisionName, divisionId);
            divisionsCreated++;
          }
        }
      }
    } else {
      // Use existing divisions
      const existingDivisions = await getDivisions(institutionId);
      existingDivisions.forEach(div => divisionMap.set(div.name, div.id));

      // Ensure Head Office exists
      if (!divisionMap.has('Head Office')) {
        const headOfficeId = await getOrCreateDivision(institutionId, 'Head Office');
        divisionMap.set('Head Office', headOfficeId);
        divisionsCreated++;
      }
    }

    onProgress?.({
      phase: 'importing',
      progress: 75,
      currentStep: `Created ${divisionsCreated} divisions. Importing contacts...`,
    });

    // Step 2: Handle existing contacts
    if (options.replaceAllContacts) {
      await deleteAllContactsForInstitution(institutionId);
    }

    // Step 3: Convert and create contacts
    const contactInputs = convertExtractedToContactInputs(extractedData, institutionId, divisionMap);
    let contactsImported = 0;

    if (options.updateExistingContacts && !options.replaceAllContacts) {
      // Update existing contacts by email, create new ones
      for (const input of contactInputs) {
        if (input.email) {
          const existing = await getContactByEmail(institutionId, input.email);
          if (existing) {
            await updateContact(existing.id, {
              name: input.name,
              position: input.position,
              phones: input.phones,
              fax: input.fax,
              isHead: input.isHead,
              hierarchyLevel: input.hierarchyLevel,
              divisionId: input.divisionId,
            });
            contactsImported++;
            continue;
          }
        }
        // Create new contact (will be handled in bulk below)
      }

      // Create contacts that don't exist
      const newContacts = contactInputs.filter(async input => {
        if (!input.email) return true;
        const existing = await getContactByEmail(institutionId, input.email);
        return !existing;
      });

      if (newContacts.length > 0) {
        const createdIds = await bulkCreateContacts(newContacts);
        contactsImported += createdIds.length;
      }
    } else {
      // Bulk create all contacts
      const createdIds = await bulkCreateContacts(contactInputs);
      contactsImported = createdIds.length;
    }

    // Step 4: Update institution sync settings
    await updateInstitutionSyncSettings(institutionId, {
      contentHash,
      lastSyncedAt: nowTimestamp(),
    });

    onProgress?.({
      phase: 'complete',
      progress: 100,
      currentStep: `Import complete! ${contactsImported} contacts, ${divisionsCreated} divisions.`,
    });

    return {
      success: true,
      contactsImported,
      divisionsCreated,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during import';
    onProgress?.({
      phase: 'error',
      progress: 0,
      currentStep: errorMessage,
      error: errorMessage,
    });

    return {
      success: false,
      contactsImported: 0,
      divisionsCreated: 0,
      error: errorMessage,
    };
  }
}

// Full sync (combines all phases - for automated/scheduled syncs)
export async function fullSync(
  institutionId: string,
  sourceUrl?: string,
  options: ImportOptions = {
    createDivisionsAutomatically: true,
    updateExistingContacts: true,
    replaceAllContacts: false,
  },
  onProgress?: SyncProgressCallback
): Promise<SyncResult> {
  console.log(`[SyncOrchestrator] Starting full sync for institution ${institutionId}`);

  // Phase 1: Pre-sync checks
  onProgress?.({
    phase: 'idle',
    progress: 0,
    currentStep: 'Checking sync prerequisites...',
  });

  const preCheck = await preSyncCheck(institutionId, sourceUrl);
  if (!preCheck.canSync) {
    return {
      success: false,
      phase: 'error',
      contactsImported: 0,
      divisionsCreated: 0,
      tokensUsed: 0,
      costUsd: 0,
      changesDetected: false,
      error: preCheck.reason,
    };
  }

  const effectiveUrl = sourceUrl || preCheck.currentSettings?.sourceUrl;
  if (!effectiveUrl) {
    return {
      success: false,
      phase: 'error',
      contactsImported: 0,
      divisionsCreated: 0,
      tokensUsed: 0,
      costUsd: 0,
      changesDetected: false,
      error: 'No source URL available',
    };
  }

  // Update source URL if provided
  if (sourceUrl && sourceUrl !== preCheck.currentSettings?.sourceUrl) {
    await updateInstitutionSyncSettings(institutionId, { sourceUrl });
  }

  // Phase 2: Fetch and extract
  const extraction = await fetchAndExtract(institutionId, effectiveUrl, onProgress);

  if (!extraction.success || !extraction.data) {
    // Log failed sync
    await logSyncOperation(
      institutionId,
      effectiveUrl,
      {
        success: false,
        contentHash: extraction.contentHash || '',
        tokensUsed: extraction.tokensUsed,
        costUsd: extraction.costUsd,
        error: extraction.error,
      },
      0,
      0,
      preCheck.currentSettings?.contentHash
    );

    return {
      success: false,
      phase: 'error',
      extractedData: extraction.data,
      contactsImported: 0,
      divisionsCreated: 0,
      tokensUsed: extraction.tokensUsed,
      costUsd: extraction.costUsd,
      changesDetected: extraction.changesDetected,
      error: extraction.error,
    };
  }

  // Phase 3: Import
  const importResult = await importContacts(
    institutionId,
    extraction.data,
    extraction.contentHash!,
    options,
    onProgress
  );

  // Log sync operation
  await logSyncOperation(
    institutionId,
    effectiveUrl,
    {
      success: importResult.success,
      data: extraction.data,
      contentHash: extraction.contentHash!,
      tokensUsed: extraction.tokensUsed,
      costUsd: extraction.costUsd,
      error: importResult.error,
    },
    importResult.contactsImported,
    importResult.divisionsCreated,
    preCheck.currentSettings?.contentHash
  );

  console.log(`[SyncOrchestrator] Sync complete for institution ${institutionId}:`, {
    contacts: importResult.contactsImported,
    divisions: importResult.divisionsCreated,
    tokens: extraction.tokensUsed,
    cost: extraction.costUsd,
  });

  return {
    success: importResult.success,
    phase: importResult.success ? 'complete' : 'error',
    extractedData: extraction.data,
    contactsImported: importResult.contactsImported,
    divisionsCreated: importResult.divisionsCreated,
    tokensUsed: extraction.tokensUsed,
    costUsd: extraction.costUsd,
    changesDetected: extraction.changesDetected,
    error: importResult.error,
  };
}

// Get sync status for an institution
export async function getInstitutionSyncStatus(institutionId: string): Promise<{
  hasSourceUrl: boolean;
  lastSyncedAt?: string;
  autoSyncEnabled: boolean;
  syncFrequency: string;
  contactCount: number;
  divisionCount: number;
}> {
  const settings = await getInstitutionSyncSettings(institutionId);
  const contacts = await getContactsByInstitution(institutionId);
  const divisions = await getDivisions(institutionId);

  return {
    hasSourceUrl: Boolean(settings?.sourceUrl),
    lastSyncedAt: settings?.lastSyncedAt,
    autoSyncEnabled: settings?.autoSyncEnabled ?? false,
    syncFrequency: settings?.syncFrequency ?? 'weekly',
    contactCount: contacts.length,
    divisionCount: divisions.length,
  };
}

// Check if institution needs sync (based on frequency)
export async function institutionNeedsSync(institutionId: string): Promise<boolean> {
  const settings = await getInstitutionSyncSettings(institutionId);

  if (!settings?.autoSyncEnabled || !settings.sourceUrl) {
    return false;
  }

  if (!settings.lastSyncedAt) {
    return true; // Never synced
  }

  const lastSync = new Date(settings.lastSyncedAt);
  const now = new Date();
  const daysSinceSync = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24));

  switch (settings.syncFrequency) {
    case 'daily':
      return daysSinceSync >= 1;
    case 'weekly':
      return daysSinceSync >= 7;
    case 'monthly':
      return daysSinceSync >= 30;
    default:
      return false; // manual
  }
}

// Get all institutions that need syncing
export async function getInstitutionsNeedingSync(): Promise<string[]> {
  const db = await initDatabase();
  const result = db.exec(
    `SELECT id FROM institutions WHERE auto_sync_enabled = 1 AND source_url IS NOT NULL`
  );

  if (!result.length) return [];

  const institutionIds = result[0].values.map(row => row[0] as string);
  const needsSync: string[] = [];

  for (const id of institutionIds) {
    if (await institutionNeedsSync(id)) {
      needsSync.push(id);
    }
  }

  return needsSync;
}
