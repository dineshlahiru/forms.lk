// Claude AI-powered website scraper for extracting institution contacts
// This service fetches website content and uses Claude to intelligently extract contact data

import Anthropic from '@anthropic-ai/sdk';
import { initDatabase, saveDatabase, generateId, nowTimestamp } from '../../lib/localDb';
import type {
  ExtractedData,
  ExtractedContact,
  ScrapeResult,
  CreateContactInput,
} from '../../types/institution-intel';
import { detectHierarchyLevel, isHeadPosition } from './contacts';

// Claude API client - initialized lazily
let anthropicClient: Anthropic | null = null;

// Get or create Anthropic client
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_ANTHROPIC_API_KEY is not set. Add it to your .env.local file.');
    }
    anthropicClient = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true, // Required for browser usage
    });
  }
  return anthropicClient;
}

// Cost per 1M tokens (Claude 3.5 Sonnet pricing as of Dec 2024)
const COST_PER_1M_INPUT_TOKENS = 3.0;  // $3.00 per 1M input tokens
const COST_PER_1M_OUTPUT_TOKENS = 15.0; // $15.00 per 1M output tokens

// Calculate cost from token usage
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * COST_PER_1M_INPUT_TOKENS;
  const outputCost = (outputTokens / 1_000_000) * COST_PER_1M_OUTPUT_TOKENS;
  return Math.round((inputCost + outputCost) * 1000) / 1000; // Round to 3 decimal places
}

// Generate content hash for change detection
export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// Fetch HTML content from URL
async function fetchHtmlContent(url: string): Promise<string> {
  // For browser-based fetching, we need to handle CORS
  // Option 1: Use a CORS proxy for development
  // Option 2: Use a backend endpoint in production

  // Try direct fetch first (works for some government sites)
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; FormsLK/1.0)',
      },
    });

    if (response.ok) {
      return await response.text();
    }
  } catch {
    console.log('[Scraper] Direct fetch failed, trying CORS proxy...');
  }

  // Try with CORS proxy for development
  const corsProxies = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
  ];

  for (const proxy of corsProxies) {
    try {
      const response = await fetch(proxy + encodeURIComponent(url));
      if (response.ok) {
        return await response.text();
      }
    } catch {
      continue;
    }
  }

  throw new Error(`Failed to fetch content from ${url}. The website may be blocking requests.`);
}

// Clean HTML for Claude processing (reduce token usage)
function cleanHtml(html: string): string {
  // Remove scripts, styles, and comments
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

  // Remove excessive whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><');

  // If still too long, try to extract just the body
  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    cleaned = bodyMatch[1];
  }

  // Truncate if still too long (keep under ~100k chars for reasonable token usage)
  if (cleaned.length > 100000) {
    cleaned = cleaned.slice(0, 100000);
  }

  return cleaned;
}

// The extraction prompt for Claude
const EXTRACTION_PROMPT = `You are an expert at extracting structured contact information from government websites.

Analyze the provided HTML content and extract all contact information for staff members, departments, and divisions.

Return a JSON object with this exact structure:
{
  "headOffice": [
    {
      "name": "Person's full name or null if not available",
      "position": "Job title/position (required)",
      "division": "Department/Division name or null",
      "phones": ["array", "of", "phone", "numbers"],
      "email": "email@example.com or null",
      "fax": "fax number or null"
    }
  ],
  "branches": [
    {
      "name": null,
      "position": null,
      "division": "Branch/Unit name",
      "phones": ["phone numbers"],
      "email": "email or null",
      "fax": null
    }
  ],
  "divisions": ["List", "of", "unique", "division/department", "names", "found"]
}

Guidelines:
1. "headOffice" contains contacts with named individuals or leadership positions
2. "branches" contains general department/unit contacts without named individuals
3. Extract ALL phone numbers, including variations and extensions
4. Normalize phone numbers to include country code (+94 for Sri Lanka)
5. "divisions" should list all unique department/division names found
6. If no email is found, use null (not empty string)
7. Position is REQUIRED - if unclear, use the division name as position

Return ONLY the JSON object, no other text.`;

// Extract contacts using Claude
export async function extractContactsWithClaude(
  html: string,
  sourceUrl: string
): Promise<{ data: ExtractedData; inputTokens: number; outputTokens: number }> {
  const client = getAnthropicClient();
  const cleanedHtml = cleanHtml(html);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Extract contact information from this government website HTML:\n\nSource URL: ${sourceUrl}\n\n${cleanedHtml}`,
      },
    ],
    system: EXTRACTION_PROMPT,
  });

  // Extract text content from response
  const responseText = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');

  // Parse JSON response
  let extractedData: ExtractedData;
  try {
    // Try to extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
                      responseText.match(/```\n?([\s\S]*?)\n?```/) ||
                      [null, responseText];
    const jsonStr = jsonMatch[1] || responseText;
    const parsed = JSON.parse(jsonStr.trim());

    extractedData = {
      source: sourceUrl,
      headOffice: parsed.headOffice || [],
      branches: parsed.branches || [],
      divisions: parsed.divisions || [],
    };
  } catch (parseError) {
    console.error('[Scraper] Failed to parse Claude response:', parseError);
    console.log('[Scraper] Raw response:', responseText);
    throw new Error('Failed to parse extraction results. Claude may have returned invalid JSON.');
  }

  return {
    data: extractedData,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}

// Main scrape function
export async function scrapeInstitutionWebsite(
  url: string,
  institutionId?: string
): Promise<ScrapeResult> {
  console.log(`[Scraper] Starting scrape for: ${url}`);

  try {
    // Step 1: Fetch HTML
    console.log('[Scraper] Fetching HTML content...');
    const html = await fetchHtmlContent(url);
    console.log(`[Scraper] Fetched ${html.length} characters`);

    // Step 2: Generate content hash
    const contentHash = await generateContentHash(html);
    console.log(`[Scraper] Content hash: ${contentHash}`);

    // Step 3: Extract with Claude
    console.log('[Scraper] Extracting contacts with Claude...');
    const { data, inputTokens, outputTokens } = await extractContactsWithClaude(html, url);

    // Step 4: Calculate cost
    const costUsd = calculateCost(inputTokens, outputTokens);
    const tokensUsed = inputTokens + outputTokens;

    console.log(`[Scraper] Extraction complete:`);
    console.log(`  - Head office contacts: ${data.headOffice.length}`);
    console.log(`  - Branch contacts: ${data.branches.length}`);
    console.log(`  - Divisions found: ${data.divisions.length}`);
    console.log(`  - Tokens used: ${tokensUsed} (${inputTokens} input + ${outputTokens} output)`);
    console.log(`  - Estimated cost: $${costUsd}`);

    // Step 5: Log API usage
    await logApiUsage('claude', 'institution-sync', tokensUsed, costUsd, institutionId);

    return {
      success: true,
      data,
      contentHash,
      tokensUsed,
      costUsd,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scraper] Scrape failed:', errorMessage);

    return {
      success: false,
      contentHash: '',
      tokensUsed: 0,
      costUsd: 0,
      error: errorMessage,
    };
  }
}

// Log API usage to database
async function logApiUsage(
  service: string,
  operation: string,
  tokensUsed: number,
  costUsd: number,
  institutionId?: string
): Promise<void> {
  const db = await initDatabase();
  const now = nowTimestamp();
  const monthKey = now.slice(0, 7); // "2024-12"

  db.run(
    `INSERT INTO api_usage (id, service, operation, institution_id, tokens_used, cost_usd, month_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [generateId(), service, operation, institutionId || null, tokensUsed, costUsd, monthKey, now]
  );

  await saveDatabase();
}

// Get current month's API usage
export async function getMonthlyApiUsage(): Promise<{
  tokensUsed: number;
  costUsd: number;
  syncCount: number;
}> {
  const db = await initDatabase();
  const monthKey = nowTimestamp().slice(0, 7);

  const result = db.exec(
    `SELECT
       COALESCE(SUM(tokens_used), 0) as total_tokens,
       COALESCE(SUM(cost_usd), 0) as total_cost,
       COUNT(*) as sync_count
     FROM api_usage
     WHERE month_key = ?`,
    [monthKey]
  );

  if (!result.length || !result[0].values.length) {
    return { tokensUsed: 0, costUsd: 0, syncCount: 0 };
  }

  const row = result[0].values[0];
  return {
    tokensUsed: (row[0] as number) || 0,
    costUsd: (row[1] as number) || 0,
    syncCount: (row[2] as number) || 0,
  };
}

// Get API budget settings
export async function getApiBudgetSettings(): Promise<{
  monthlyLimitUsd: number;
  alertThresholdPercent: number;
  pauseOnExhausted: boolean;
}> {
  const db = await initDatabase();

  const result = db.exec(`SELECT * FROM api_budget_settings WHERE id = 'default'`);

  if (!result.length || !result[0].values.length) {
    // Return defaults and create record
    const now = nowTimestamp();
    db.run(
      `INSERT OR IGNORE INTO api_budget_settings (id, monthly_limit_usd, alert_threshold_percent, pause_on_exhausted, updated_at)
       VALUES ('default', 5.0, 80, 1, ?)`,
      [now]
    );
    await saveDatabase();

    return {
      monthlyLimitUsd: 5.0,
      alertThresholdPercent: 80,
      pauseOnExhausted: true,
    };
  }

  const columns = result[0].columns;
  const row = result[0].values[0];
  const obj: Record<string, unknown> = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });

  return {
    monthlyLimitUsd: (obj.monthly_limit_usd as number) || 5.0,
    alertThresholdPercent: (obj.alert_threshold_percent as number) || 80,
    pauseOnExhausted: Boolean(obj.pause_on_exhausted),
  };
}

// Update API budget settings
export async function updateApiBudgetSettings(settings: {
  monthlyLimitUsd?: number;
  alertThresholdPercent?: number;
  pauseOnExhausted?: boolean;
}): Promise<void> {
  const db = await initDatabase();
  const now = nowTimestamp();

  // Ensure record exists
  await getApiBudgetSettings();

  const updates: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (settings.monthlyLimitUsd !== undefined) {
    updates.push('monthly_limit_usd = ?');
    values.push(settings.monthlyLimitUsd);
  }
  if (settings.alertThresholdPercent !== undefined) {
    updates.push('alert_threshold_percent = ?');
    values.push(settings.alertThresholdPercent);
  }
  if (settings.pauseOnExhausted !== undefined) {
    updates.push('pause_on_exhausted = ?');
    values.push(settings.pauseOnExhausted ? 1 : 0);
  }

  db.run(
    `UPDATE api_budget_settings SET ${updates.join(', ')} WHERE id = 'default'`,
    values
  );

  await saveDatabase();
}

// Check if budget allows a sync operation
export async function checkBudgetAllowsSync(): Promise<{
  allowed: boolean;
  reason?: string;
  usage: { usedUsd: number; limitUsd: number; percentUsed: number };
}> {
  const settings = await getApiBudgetSettings();
  const usage = await getMonthlyApiUsage();

  const percentUsed = settings.monthlyLimitUsd > 0
    ? Math.round((usage.costUsd / settings.monthlyLimitUsd) * 100)
    : 0;

  const usageInfo = {
    usedUsd: usage.costUsd,
    limitUsd: settings.monthlyLimitUsd,
    percentUsed,
  };

  if (settings.pauseOnExhausted && usage.costUsd >= settings.monthlyLimitUsd) {
    return {
      allowed: false,
      reason: `Monthly budget exhausted ($${usage.costUsd.toFixed(2)} / $${settings.monthlyLimitUsd.toFixed(2)})`,
      usage: usageInfo,
    };
  }

  return { allowed: true, usage: usageInfo };
}

// Convert extracted contacts to CreateContactInput format
export function convertExtractedToContactInputs(
  extracted: ExtractedData,
  institutionId: string,
  divisionMap: Map<string, string> // division name -> division id
): CreateContactInput[] {
  const contacts: CreateContactInput[] = [];

  // Process head office contacts
  for (let i = 0; i < extracted.headOffice.length; i++) {
    const contact = extracted.headOffice[i];
    const divisionName = contact.division || 'Head Office';
    const divisionId = divisionMap.get(divisionName);

    if (!divisionId) {
      console.warn(`[Scraper] Division not found: ${divisionName}`);
      continue;
    }

    contacts.push({
      divisionId,
      institutionId,
      name: contact.name || undefined,
      position: contact.position,
      phones: contact.phones || [],
      email: contact.email || undefined,
      fax: contact.fax || undefined,
      isHead: isHeadPosition(contact.position),
      hierarchyLevel: detectHierarchyLevel(contact.position),
      displayOrder: i,
    });
  }

  // Process branch contacts
  for (let i = 0; i < extracted.branches.length; i++) {
    const contact = extracted.branches[i];
    const divisionName = contact.division || 'Branches';
    const divisionId = divisionMap.get(divisionName);

    if (!divisionId) {
      console.warn(`[Scraper] Division not found: ${divisionName}`);
      continue;
    }

    contacts.push({
      divisionId,
      institutionId,
      name: contact.name || undefined,
      position: contact.position || divisionName,
      phones: contact.phones || [],
      email: contact.email || undefined,
      fax: contact.fax || undefined,
      isHead: false,
      hierarchyLevel: 6, // Branch level
      displayOrder: extracted.headOffice.length + i,
    });
  }

  // Process district office contacts
  if (extracted.districtOffices) {
    let districtContactIndex = 0;
    for (const office of extracted.districtOffices) {
      const divisionName = `District Office - ${office.district}`;
      const divisionId = divisionMap.get(divisionName);

      if (!divisionId) {
        console.warn(`[Scraper] Division not found: ${divisionName}`);
        continue;
      }

      // Add contacts for this district office
      if (office.contacts) {
        for (const contact of office.contacts) {
          contacts.push({
            divisionId,
            institutionId,
            name: contact.name || undefined,
            position: contact.position || 'District Office Contact',
            phones: contact.phones || [],
            email: contact.email || undefined,
            fax: contact.fax || undefined,
            isHead: false,
            hierarchyLevel: 5, // District office level
            displayOrder: extracted.headOffice.length + extracted.branches.length + districtContactIndex,
          });
          districtContactIndex++;
        }
      }
    }
  }

  return contacts;
}

// Log sync operation to database
export async function logSyncOperation(
  institutionId: string,
  sourceUrl: string,
  result: ScrapeResult,
  contactsImported: number,
  divisionsCreated: number,
  previousHash?: string
): Promise<string> {
  const db = await initDatabase();
  const now = nowTimestamp();
  const id = generateId();

  const changesDetected = previousHash ? previousHash !== result.contentHash : false;

  db.run(
    `INSERT INTO institution_sync_logs (
      id, institution_id, source_url, content_hash, status, contacts_found,
      contacts_imported, divisions_created, changes_detected, tokens_used,
      cost_usd, error_message, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      institutionId,
      sourceUrl,
      result.contentHash,
      result.success ? 'success' : 'failed',
      result.data ? result.data.headOffice.length + result.data.branches.length : 0,
      contactsImported,
      divisionsCreated,
      changesDetected ? 1 : 0,
      result.tokensUsed,
      result.costUsd,
      result.error || null,
      now,
    ]
  );

  await saveDatabase();
  return id;
}

// Get sync history for an institution
export async function getSyncHistory(institutionId: string, limit = 10): Promise<{
  id: string;
  sourceUrl: string;
  status: string;
  contactsFound: number;
  contactsImported: number;
  changesDetected: boolean;
  tokensUsed: number;
  costUsd: number;
  errorMessage?: string;
  syncedAt: string;
}[]> {
  const db = await initDatabase();

  const result = db.exec(
    `SELECT * FROM institution_sync_logs
     WHERE institution_id = ?
     ORDER BY synced_at DESC
     LIMIT ?`,
    [institutionId, limit]
  );

  if (!result.length) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });

    return {
      id: obj.id as string,
      sourceUrl: obj.source_url as string,
      status: obj.status as string,
      contactsFound: (obj.contacts_found as number) || 0,
      contactsImported: (obj.contacts_imported as number) || 0,
      changesDetected: Boolean(obj.changes_detected),
      tokensUsed: (obj.tokens_used as number) || 0,
      costUsd: (obj.cost_usd as number) || 0,
      errorMessage: obj.error_message as string | undefined,
      syncedAt: obj.synced_at as string,
    };
  });
}
