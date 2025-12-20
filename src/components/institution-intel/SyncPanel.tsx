// Sync Panel Component - Controls sync operations with progress UI

import { useState, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Globe,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Play,
  Clock,
  Zap,
  FileJson,
  Upload,
  Download,
} from 'lucide-react';
import { Button } from '../ui/Button';
import type { SyncPhase, SyncProgressState, ExtractedData, ExtractedDistrictOffice, ImportOptions } from '../../types/institution-intel';
import {
  preSyncCheck,
  fetchAndExtract,
  importContacts,
  getInstitutionSyncSettings,
  updateInstitutionSyncSettings,
  generateContentHash,
} from '../../services';
import { BudgetMonitor } from './BudgetMonitor';

// JSON import format - supports both snake_case and camelCase
interface JsonImportContact {
  name?: string | null;
  position?: string | null;
  division?: string | null;
  phones?: string[];
  fax?: string | null;
  email?: string | null;
}

interface JsonImportDistrictOffice {
  district: string;
  location?: string;
  address?: string;
  phones?: string[];
  fax?: string | null;
  email?: string | null;
  contacts?: JsonImportContact[];
}

interface JsonImportData {
  source?: string;
  // Support both snake_case and camelCase
  head_office?: JsonImportContact[];
  headoffice?: JsonImportContact[];
  branches?: JsonImportContact[];
  district_offices?: JsonImportDistrictOffice[];
  districtOffices?: JsonImportDistrictOffice[];
}

// Convert JSON to ExtractedData format (supports both snake_case and camelCase)
function convertJsonToExtractedData(json: JsonImportData): ExtractedData {
  // Support both headoffice and head_office
  const headOfficeInput = json.headoffice || json.head_office || [];
  const headOffice = headOfficeInput.map(c => ({
    name: c.name || undefined,
    position: c.position || 'Unknown Position',
    division: c.division || undefined,
    phones: c.phones || [],
    fax: c.fax || undefined,
    email: c.email || undefined,
  }));

  const branches = (json.branches || []).map(c => ({
    name: c.name || undefined,
    position: c.position || c.division || 'Branch Contact',
    division: c.division || undefined,
    phones: c.phones || [],
    fax: c.fax || undefined,
    email: c.email || undefined,
  }));

  // Support both districtOffices and district_offices
  const districtOfficesInput = json.districtOffices || json.district_offices || [];
  const districtOffices: ExtractedDistrictOffice[] = districtOfficesInput.map(office => ({
    district: office.district,
    location: office.location,
    address: office.address,
    phones: office.phones || [],
    fax: office.fax || undefined,
    email: office.email || undefined,
    contacts: (office.contacts || []).map(c => ({
      name: c.name || undefined,
      position: c.position || 'District Office Contact',
      division: office.district, // Use district as division
      phones: c.phones || [],
      fax: c.fax || undefined,
      email: c.email || undefined,
    })),
  }));

  // Extract unique divisions from contacts and district offices
  const divisionSet = new Set<string>();
  headOffice.forEach(c => c.division && divisionSet.add(c.division));
  branches.forEach(c => c.division && divisionSet.add(c.division));
  // Add district offices as divisions
  districtOffices.forEach(office => divisionSet.add(`District Office - ${office.district}`));

  return {
    source: json.source || 'JSON Import',
    headOffice,
    branches,
    districtOffices: districtOffices.length > 0 ? districtOffices : undefined,
    divisions: Array.from(divisionSet),
  };
}

interface SyncPanelProps {
  institutionId: string;
  institutionName: string;
  onSyncComplete?: () => void;
  onExtractedData?: (data: ExtractedData) => void;
}

export function SyncPanel({
  institutionId,
  institutionName,
  onSyncComplete,
  onExtractedData,
}: SyncPanelProps) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState<string>('weekly');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [syncState, setSyncState] = useState<SyncProgressState>({
    phase: 'idle',
    progress: 0,
    currentStep: '',
  });

  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [contentHash, setContentHash] = useState<string>('');
  const [tokensUsed, setTokensUsed] = useState(0);
  const [costUsd, setCostUsd] = useState(0);
  const [budgetBlocked, setBudgetBlocked] = useState(false);
  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import options
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    createDivisionsAutomatically: true,
    updateExistingContacts: true,
    replaceAllContacts: false,
  });

  // Load existing settings
  useState(() => {
    const loadSettings = async () => {
      const settings = await getInstitutionSyncSettings(institutionId);
      if (settings) {
        setSourceUrl(settings.sourceUrl || '');
        setSavedUrl(settings.sourceUrl || '');
        setLastSynced(settings.lastSyncedAt || null);
        setAutoSync(settings.autoSyncEnabled);
        setSyncFrequency(settings.syncFrequency);
      }
      setSettingsLoaded(true);
    };
    loadSettings();
  });

  // Save URL when changed
  const handleSaveUrl = async () => {
    if (sourceUrl !== savedUrl) {
      await updateInstitutionSyncSettings(institutionId, { sourceUrl });
      setSavedUrl(sourceUrl);
    }
  };

  // Save auto-sync settings
  const handleSaveAutoSync = async () => {
    await updateInstitutionSyncSettings(institutionId, {
      autoSyncEnabled: autoSync,
      syncFrequency,
    });
  };

  // Progress callback
  const handleProgress = useCallback((state: SyncProgressState) => {
    setSyncState(state);
    if (state.extractedData) {
      setExtractedData(state.extractedData);
      onExtractedData?.(state.extractedData);
    }
  }, [onExtractedData]);

  // Start sync (fetch + extract only)
  const handleStartSync = async () => {
    if (!sourceUrl) return;

    setSyncState({ phase: 'fetching', progress: 5, currentStep: 'Checking prerequisites...' });
    setExtractedData(null);

    try {
      // Pre-sync check
      const preCheck = await preSyncCheck(institutionId, sourceUrl);
      if (!preCheck.canSync) {
        setSyncState({
          phase: 'error',
          progress: 0,
          currentStep: preCheck.reason || 'Cannot sync',
          error: preCheck.reason,
        });
        return;
      }

      // Save URL if changed
      await handleSaveUrl();

      // Fetch and extract
      const result = await fetchAndExtract(institutionId, sourceUrl, handleProgress);

      if (result.success && result.data) {
        setExtractedData(result.data);
        setContentHash(result.contentHash || '');
        setTokensUsed(result.tokensUsed);
        setCostUsd(result.costUsd);
        onExtractedData?.(result.data);
      } else {
        setSyncState({
          phase: 'error',
          progress: 0,
          currentStep: result.error || 'Extraction failed',
          error: result.error,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSyncState({
        phase: 'error',
        progress: 0,
        currentStep: message,
        error: message,
      });
    }
  };

  // Import extracted data
  const handleImport = async () => {
    if (!extractedData || !contentHash) return;

    setSyncState({ phase: 'importing', progress: 60, currentStep: 'Importing contacts...' });

    try {
      const result = await importContacts(
        institutionId,
        extractedData,
        contentHash,
        importOptions,
        handleProgress
      );

      if (result.success) {
        setLastSynced(new Date().toISOString());
        onSyncComplete?.();
      } else {
        setSyncState({
          phase: 'error',
          progress: 0,
          currentStep: result.error || 'Import failed',
          error: result.error,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSyncState({
        phase: 'error',
        progress: 0,
        currentStep: message,
        error: message,
      });
    }
  };

  // Reset state
  const handleReset = () => {
    setSyncState({ phase: 'idle', progress: 0, currentStep: '' });
    setExtractedData(null);
    setContentHash('');
    setTokensUsed(0);
    setCostUsd(0);
    setJsonImportError(null);
  };

  // Handle JSON file import
  const handleJsonImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJsonImportError(null);
    setSyncState({ phase: 'extracting', progress: 20, currentStep: 'Reading JSON file...' });

    try {
      const text = await file.text();
      const json = JSON.parse(text) as JsonImportData;

      // Validate structure - support both formats
      const hasHeadOffice = json.head_office || json.headoffice;
      const hasDistrictOffices = json.districtOffices || json.district_offices;
      if (!hasHeadOffice && !json.branches && !hasDistrictOffices) {
        throw new Error('Invalid JSON format. Expected "headoffice", "head_office", "branches", or "districtOffices" arrays.');
      }

      // Convert to ExtractedData format
      const data = convertJsonToExtractedData(json);

      // Generate content hash
      const hash = await generateContentHash(text);

      setExtractedData(data);
      setContentHash(hash);
      setTokensUsed(0);
      setCostUsd(0);
      onExtractedData?.(data);

      // Count total contacts including district office contacts
      const districtOfficeContacts = (data.districtOffices || []).reduce(
        (sum, office) => sum + (office.contacts?.length || 0), 0
      );
      const totalContacts = data.headOffice.length + data.branches.length + districtOfficeContacts;
      const districtOfficeCount = data.districtOffices?.length || 0;

      setSyncState({
        phase: 'preview',
        progress: 50,
        currentStep: `Loaded ${totalContacts} contacts${districtOfficeCount > 0 ? ` and ${districtOfficeCount} district offices` : ''} from JSON`,
        extractedData: data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse JSON file';
      setJsonImportError(message);
      setSyncState({ phase: 'idle', progress: 0, currentStep: '' });
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Export sample JSON format with all supported features
  const handleExportSample = () => {
    const sample = {
      source: 'https://example.gov.lk/contacts',
      headoffice: [
        {
          name: 'Mr. Example Name',
          position: 'Director General',
          division: null,
          phones: ['+94 11 234 5678'],
          fax: '+94 11 234 5679',
          email: 'dg@example.gov.lk',
        },
        {
          name: 'Mrs. Example Deputy',
          position: 'Deputy Director',
          division: 'Administration',
          phones: ['+94 11 234 5680'],
          fax: null,
          email: 'admin@example.gov.lk',
        },
      ],
      districtOffices: [
        {
          district: 'Colombo',
          location: 'Fort',
          address: '123 Main Street, Colombo 01',
          phones: ['+94 11 234 5600', '+94 11 234 5601'],
          fax: '+94 11 234 5602',
          email: 'colombo@example.gov.lk',
          contacts: [
            {
              name: 'Mr. District Officer',
              position: 'District Head',
              phones: ['+94 11 234 5603'],
              email: 'colombo.head@example.gov.lk',
            },
          ],
        },
        {
          district: 'Kandy',
          address: 'District Secretariat, Kandy',
          phones: ['+94 81 234 5678'],
          contacts: [],
        },
      ],
    };

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = syncState.phase === 'fetching' || syncState.phase === 'extracting' || syncState.phase === 'importing';
  const showPreview = syncState.phase === 'preview' && extractedData;
  const showComplete = syncState.phase === 'complete';
  const showError = syncState.phase === 'error';

  // Phase icons
  const getPhaseIcon = (phase: SyncPhase) => {
    switch (phase) {
      case 'fetching': return <Globe className="w-4 h-4" />;
      case 'extracting': return <Zap className="w-4 h-4" />;
      case 'importing': return <RefreshCw className="w-4 h-4" />;
      case 'complete': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Budget Monitor */}
      <BudgetMonitor compact onBudgetExhausted={() => setBudgetBlocked(true)} />

      {/* Source URL Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600" />
          Source Website
        </h3>

        <div className="flex gap-2">
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://example.gov.lk/contact"
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
          {sourceUrl !== savedUrl && sourceUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveUrl}
              disabled={isLoading}
            >
              Save
            </Button>
          )}
        </div>

        {savedUrl && lastSynced && (
          <p className="mt-2 text-xs text-gray-500">
            Last synced: {new Date(lastSynced).toLocaleString()}
          </p>
        )}
      </div>

      {/* Sync Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-green-600" />
            Sync Contacts
          </h3>
          {!isLoading && syncState.phase === 'idle' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartSync}
              disabled={!sourceUrl || budgetBlocked}
            >
              <Play className="w-4 h-4 mr-1" />
              Start Sync
            </Button>
          )}
        </div>

        {/* Progress UI */}
        {isLoading && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{syncState.currentStep}</p>
                <div className="mt-1 w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${syncState.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Phase indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {getPhaseIcon(syncState.phase)}
              <span className="capitalize">{syncState.phase}</span>
              <span>- {syncState.progress}%</span>
            </div>
          </div>
        )}

        {/* Preview State */}
        {showPreview && extractedData && (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Extraction Complete</span>
              </div>
              <div className={`mt-2 grid gap-2 text-sm ${extractedData.districtOffices?.length ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <div className="text-center">
                  <p className="font-bold text-green-900">{extractedData.headOffice.length}</p>
                  <p className="text-green-600 text-xs">Head Office</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-green-900">{extractedData.branches.length}</p>
                  <p className="text-green-600 text-xs">Branches</p>
                </div>
                {extractedData.districtOffices && extractedData.districtOffices.length > 0 && (
                  <div className="text-center">
                    <p className="font-bold text-green-900">{extractedData.districtOffices.length}</p>
                    <p className="text-green-600 text-xs">District Offices</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="font-bold text-green-900">{extractedData.divisions.length}</p>
                  <p className="text-green-600 text-xs">Divisions</p>
                </div>
              </div>
              {(tokensUsed > 0 || costUsd > 0) && (
                <p className="mt-2 text-xs text-green-600">
                  Tokens: {tokensUsed.toLocaleString()} | Cost: ${costUsd.toFixed(3)}
                </p>
              )}
            </div>

            {/* Import Options */}
            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Import Options</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importOptions.createDivisionsAutomatically}
                  onChange={(e) => setImportOptions({ ...importOptions, createDivisionsAutomatically: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Create divisions automatically</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importOptions.updateExistingContacts}
                  onChange={(e) => setImportOptions({ ...importOptions, updateExistingContacts: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Update existing contacts (by email)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importOptions.replaceAllContacts}
                  onChange={(e) => setImportOptions({ ...importOptions, replaceAllContacts: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-red-600"
                />
                <span className="text-sm text-red-600">Replace all existing contacts</span>
              </label>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleImport}>
                Import {extractedData.headOffice.length + extractedData.branches.length + (extractedData.districtOffices?.reduce((sum, o) => sum + (o.contacts?.length || 0), 0) || 0)} Contacts
                {extractedData.districtOffices && extractedData.districtOffices.length > 0 && ` + ${extractedData.districtOffices.length} Offices`}
              </Button>
            </div>
          </div>
        )}

        {/* Complete State */}
        {showComplete && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Sync Complete!</span>
              </div>
              <p className="mt-1 text-sm text-green-600">{syncState.currentStep}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleReset}>
              Done
            </Button>
          </div>
        )}

        {/* Error State */}
        {showError && (
          <div className="space-y-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Sync Failed</span>
              </div>
              <p className="mt-1 text-sm text-red-600">{syncState.error}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleStartSync}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Idle State Info */}
        {syncState.phase === 'idle' && !sourceUrl && (
          <p className="text-sm text-gray-500">
            Enter the website URL containing contact information to sync.
          </p>
        )}

        {budgetBlocked && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Budget Exhausted</span>
            </div>
            <p className="mt-1 text-xs text-red-600">
              Increase your monthly budget to continue syncing.
            </p>
          </div>
        )}
      </div>

      {/* Auto-Sync Settings */}
      {settingsLoaded && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            Automatic Sync
          </h3>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => {
                  setAutoSync(e.target.checked);
                  setTimeout(handleSaveAutoSync, 100);
                }}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Enable automatic sync</span>
            </label>

            {autoSync && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                <select
                  value={syncFrequency}
                  onChange={(e) => {
                    setSyncFrequency(e.target.value);
                    setTimeout(handleSaveAutoSync, 100);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* JSON Import */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileJson className="w-4 h-4 text-orange-600" />
          Import from JSON
        </h3>

        <p className="text-sm text-gray-500 mb-3">
          Import contacts from a JSON file. Useful when API sync is not available.
        </p>

        {jsonImportError && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{jsonImportError}</p>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleJsonImport}
              disabled={isLoading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isLoading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Select JSON File
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSample}
            title="Download sample JSON template"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        <p className="mt-2 text-xs text-gray-400">
          Format: {"{"}"headoffice": [...], "districtOffices": [...]{"}"}
        </p>
      </div>
    </div>
  );
}
