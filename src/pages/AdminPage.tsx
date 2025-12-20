import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useUploadQueue } from '../context/UploadQueueContext';
import {
  LayoutDashboard,
  FileText,
  Users,
  Download,
  Check,
  Shield,
  Award,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Settings,
  BarChart3,
  Building2,
  FolderOpen,
  Upload,
  Loader2,
  HardDrive,
  Database,
  Save,
  UploadCloud,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { useAllForms, useCategories, useInstitutions } from '../hooks';
import {
  updateForm,
  updateFormStatus,
  deleteForm as deleteFormService,
  getFormLocalizedTitle,
  getCategoryLocalizedName,
  getInstitutionLocalizedName,
  updateInstitution as updateInstitutionService,
  deleteInstitution as deleteInstitutionService,
  isLocalStorage,
  downloadBackup,
  restoreFullBackup,
  getBackupStats,
  syncToFirebase,
  type SyncProgress,
} from '../services';
import type { FirebaseForm, FirebaseCategory, FirebaseInstitution } from '../types/firebase';

type SortField = 'title' | 'downloads' | 'rating' | 'updatedAt' | 'createdAt' | 'verificationLevel';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'table' | 'grid';
type StatusFilter = 'all' | 'published' | 'draft' | 'pending';

const verificationLabels = {
  0: { label: 'Unverified', color: 'gray' as const, icon: Clock },
  1: { label: 'Community', color: 'blue' as const, icon: Check },
  2: { label: 'Trusted', color: 'green' as const, icon: Shield },
  3: { label: 'Official', color: 'amber' as const, icon: Award },
};

type AdminTab = 'forms' | 'uploads';
type MainView = 'forms' | 'institutions';

// Helper to safely convert timestamps (Firebase Timestamp or ISO string)
function toDate(timestamp: unknown): Date {
  if (!timestamp) return new Date();
  if (typeof timestamp === 'string') return new Date(timestamp);
  if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof (timestamp as { toDate: () => Date }).toDate === 'function') {
    return (timestamp as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const tab = searchParams.get('tab');
    return tab === 'uploads' ? 'uploads' : 'forms';
  });

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab === 'uploads') {
      setSearchParams({ tab: 'uploads' });
    } else {
      setSearchParams({});
    }
  }, [activeTab, setSearchParams]);

  // Upload queue
  const { pendingUploads, currentUpload, retryUpload, cancelUpload, refreshQueue } = useUploadQueue();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [selectedVerification, setSelectedVerification] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('downloads');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedForms, setSelectedForms] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  // Main view state (forms or institutions)
  const [mainView, setMainView] = useState<MainView>('forms');
  const [institutionSearch, setInstitutionSearch] = useState('');

  // Institutions state
  const [showInstitutionsPanel, setShowInstitutionsPanel] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<FirebaseInstitution | null>(null);
  const [institutionFormData, setInstitutionFormData] = useState({
    name: '',
    address: '',
    openingHours: '',
    telephoneNumbers: [''],
    email: '',
    website: '',
  });
  const [showDeleteInstitutionModal, setShowDeleteInstitutionModal] = useState<string | null>(null);

  // Backup state (only for local mode)
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [backupStats, setBackupStats] = useState<{ databaseSizeKB: number; fileCount: number; totalFileSizeKB: number } | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync to Firebase state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  // Firebase hooks
  const { data: forms, loading: formsLoading, error: formsError, refetch: refetchForms } = useAllForms();
  const { data: categories, loading: categoriesLoading } = useCategories();
  const { data: institutions, loading: institutionsLoading, refetch: refetchInstitutions } = useInstitutions();

  // Load backup stats when panel opens
  useEffect(() => {
    if (showBackupPanel && isLocalStorage()) {
      getBackupStats().then(setBackupStats).catch(console.error);
    }
  }, [showBackupPanel]);

  // Handle download backup
  const handleDownloadBackup = useCallback(async () => {
    setBackupLoading(true);
    setBackupMessage(null);
    try {
      await downloadBackup();
      setBackupMessage({ type: 'success', text: 'Backup downloaded successfully!' });
      // Refresh stats after backup
      const stats = await getBackupStats();
      setBackupStats(stats);
    } catch (error) {
      console.error('Backup failed:', error);
      setBackupMessage({ type: 'error', text: 'Failed to create backup' });
    } finally {
      setBackupLoading(false);
    }
  }, []);

  // Handle restore backup
  const handleRestoreBackup = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreLoading(true);
    setBackupMessage(null);
    try {
      const result = await restoreFullBackup(file);
      if (result.success) {
        setBackupMessage({ type: 'success', text: result.message });
        // Refresh data after restore
        await refetchForms();
        await refetchInstitutions();
        const stats = await getBackupStats();
        setBackupStats(stats);
      } else {
        setBackupMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Restore failed:', error);
      setBackupMessage({ type: 'error', text: 'Failed to restore backup' });
    } finally {
      setRestoreLoading(false);
      // Reset file input
      e.target.value = '';
    }
  }, [refetchForms, refetchInstitutions]);

  // Handle sync to Firebase
  const handleSyncToFirebase = useCallback(async () => {
    setSyncLoading(true);
    setSyncProgress(null);
    setBackupMessage(null);
    try {
      const result = await syncToFirebase((progress) => {
        setSyncProgress({ ...progress });
      });
      if (result.success) {
        setBackupMessage({ type: 'success', text: result.message });
      } else {
        setBackupMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setBackupMessage({ type: 'error', text: 'Failed to sync to Firebase' });
    } finally {
      setSyncLoading(false);
      setSyncProgress(null);
    }
  }, []);

  // Create lookup maps
  const categoryMap = useMemo(() => {
    if (!categories) return new Map<string, FirebaseCategory>();
    return new Map(categories.map(cat => [cat.id, cat]));
  }, [categories]);

  const institutionMap = useMemo(() => {
    if (!institutions) return new Map<string, FirebaseInstitution>();
    return new Map(institutions.map(inst => [inst.id, inst]));
  }, [institutions]);

  // Handle edit institution
  const handleEditInstitution = useCallback((institution: FirebaseInstitution) => {
    setEditingInstitution(institution);
    setInstitutionFormData({
      name: institution.name,
      address: institution.address || '',
      openingHours: institution.officeHours || '',
      telephoneNumbers: institution.telephoneNumbers?.length ? [...institution.telephoneNumbers] : [''],
      email: institution.email || '',
      website: institution.website || '',
    });
  }, []);

  // Handle save institution
  const handleSaveInstitution = useCallback(async () => {
    if (!editingInstitution || !institutionFormData.name.trim()) return;

    try {
      await updateInstitutionService(editingInstitution.id, {
        name: institutionFormData.name.trim(),
        address: institutionFormData.address || undefined,
        officeHours: institutionFormData.openingHours || undefined,
        telephoneNumbers: institutionFormData.telephoneNumbers.filter(p => p.trim()),
        email: institutionFormData.email || undefined,
        website: institutionFormData.website || undefined,
      });
      await refetchInstitutions();
      setEditingInstitution(null);
      setInstitutionFormData({
        name: '',
        address: '',
        openingHours: '',
        telephoneNumbers: [''],
        email: '',
        website: '',
      });
    } catch (error) {
      console.error('Failed to save institution:', error);
      alert('Failed to save institution');
    }
  }, [editingInstitution, institutionFormData, refetchInstitutions]);

  // Handle delete institution
  const confirmDeleteInstitution = useCallback(async () => {
    if (!showDeleteInstitutionModal) return;

    try {
      await deleteInstitutionService(showDeleteInstitutionModal);
      await refetchInstitutions();
      setShowDeleteInstitutionModal(null);
    } catch (error) {
      console.error('Failed to delete institution:', error);
      alert('Failed to delete institution');
    }
  }, [showDeleteInstitutionModal, refetchInstitutions]);

  // Handle approve form
  const handleApproveForm = useCallback(async (formId: string) => {
    try {
      await updateFormStatus(formId, 'published');
      await refetchForms();
    } catch (error) {
      console.error('Failed to approve form:', error);
    }
    setActiveDropdown(null);
  }, [refetchForms]);

  // Handle change verification
  const handleChangeVerification = useCallback(async (formId: string, level: 0 | 1 | 2 | 3) => {
    try {
      await updateForm(formId, { verificationLevel: level });
      await refetchForms();
    } catch (error) {
      console.error('Failed to change verification:', error);
    }
    setShowVerificationModal(null);
    setActiveDropdown(null);
  }, [refetchForms]);

  // Handle toggle visibility
  const handleToggleVisibility = useCallback(async (form: FirebaseForm) => {
    try {
      const newStatus = form.status === 'published' ? 'draft' : 'published';
      await updateFormStatus(form.id, newStatus);
      await refetchForms();
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  }, [refetchForms]);

  // Handle delete form
  const handleDeleteForm = useCallback((formId: string) => {
    setShowDeleteModal(formId);
    setActiveDropdown(null);
  }, []);

  // Confirm delete
  const confirmDelete = useCallback(async () => {
    if (!showDeleteModal) return;

    try {
      await deleteFormService(showDeleteModal);
      await refetchForms();
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Failed to delete form:', error);
      alert('Failed to delete form');
    }
  }, [showDeleteModal, refetchForms]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!forms) return {
      totalForms: 0,
      totalDownloads: 0,
      avgRating: 0,
      publishedForms: 0,
      pendingReview: 0,
      officialForms: 0,
      byCategory: {} as Record<string, number>,
      byInstitution: {} as Record<string, number>,
    };

    const totalForms = forms.length;
    const totalDownloads = forms.reduce((sum, f) => sum + f.downloadCount, 0);
    const publishedForms = forms.filter(f => f.status === 'published').length;
    const pendingReview = forms.filter(f => f.verificationLevel === 0).length;
    const officialForms = forms.filter(f => f.verificationLevel === 3).length;

    // Category breakdown
    const byCategory = forms.reduce((acc, f) => {
      acc[f.categoryId] = (acc[f.categoryId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Institution breakdown
    const byInstitution = forms.reduce((acc, f) => {
      acc[f.institutionId] = (acc[f.institutionId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalForms,
      totalDownloads,
      avgRating: 0,
      publishedForms,
      pendingReview,
      officialForms,
      byCategory,
      byInstitution,
    };
  }, [forms]);

  // Filter and sort forms
  const filteredForms = useMemo(() => {
    if (!forms) return [];

    let result = [...forms];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        f =>
          f.title.toLowerCase().includes(query) ||
          f.institutionId.toLowerCase().includes(query) ||
          (f.description && f.description.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter(f => f.categoryId === selectedCategory);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      result = result.filter(f => f.status === selectedStatus);
    }

    // Verification filter
    if (selectedVerification !== 'all') {
      result = result.filter(f => f.verificationLevel === parseInt(selectedVerification));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'downloads':
          comparison = a.downloadCount - b.downloadCount;
          break;
        case 'updatedAt':
          comparison = a.updatedAt.toMillis() - b.updatedAt.toMillis();
          break;
        case 'createdAt':
          comparison = a.createdAt.toMillis() - b.createdAt.toMillis();
          break;
        case 'verificationLevel':
          comparison = a.verificationLevel - b.verificationLevel;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [forms, searchQuery, selectedCategory, selectedStatus, selectedVerification, sortField, sortOrder]);

  // Filter institutions
  const filteredInstitutions = useMemo(() => {
    if (!institutions) return [];

    if (!institutionSearch) return institutions;

    const query = institutionSearch.toLowerCase();
    return institutions.filter(inst =>
      inst.name.toLowerCase().includes(query) ||
      inst.address?.toLowerCase().includes(query) ||
      inst.email?.toLowerCase().includes(query)
    );
  }, [institutions, institutionSearch]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleSelectForm = (formId: string) => {
    const newSelected = new Set(selectedForms);
    if (newSelected.has(formId)) {
      newSelected.delete(formId);
    } else {
      newSelected.add(formId);
    }
    setSelectedForms(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedForms.size === filteredForms.length) {
      setSelectedForms(new Set());
    } else {
      setSelectedForms(new Set(filteredForms.map(f => f.id)));
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const getVerificationBadge = (level: 0 | 1 | 2 | 3) => {
    const info = verificationLabels[level];
    const Icon = info.icon;
    const colorClasses = {
      gray: 'bg-gray-100 text-gray-700',
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
      amber: 'bg-amber-100 text-amber-700',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClasses[info.color]}`}>
        <Icon className="w-3 h-3" />
        {info.label}
      </span>
    );
  };

  const FormActions = ({ form }: { form: FirebaseForm }) => {
    return (
      <div className="relative">
        <button
          onClick={() => setActiveDropdown(activeDropdown === form.id ? null : form.id)}
          className="p-1 rounded hover:bg-gray-100"
        >
          <MoreVertical className="w-4 h-4 text-gray-500" />
        </button>
        {activeDropdown === form.id && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
            <Link
              to={`/form/${form.id}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setActiveDropdown(null)}
            >
              <Eye className="w-4 h-4" />
              View Details
            </Link>
            <Link
              to={`/admin/digitizer?edit=${form.id}`}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setActiveDropdown(null)}
            >
              <Edit3 className="w-4 h-4" />
              Edit Form
            </Link>
            <button
              onClick={() => handleApproveForm(form.id)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => setShowVerificationModal(form.id)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50"
            >
              <Shield className="w-4 h-4" />
              Change Verification
            </button>
            <hr className="my-1" />
            <button
              onClick={() => handleDeleteForm(form.id)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (formsLoading || categoriesLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  // Error state
  if (formsError) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h1>
          <p className="text-gray-600">{formsError.message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Admin Header */}
        <div className="bg-[#1A365D] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                  <p className="text-blue-200 text-sm">Manage forms, reviews, and settings</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => {
                    refetchForms();
                    refetchInstitutions();
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Link to="/setup">
                  <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
                    <Settings className="w-4 h-4 mr-2" />
                    Setup
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A202C]">{stats.totalForms}</p>
                  <p className="text-xs text-[#718096]">Total Forms</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A202C]">{(stats.totalDownloads / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-[#718096]">Downloads</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A202C]">{stats.publishedForms}</p>
                  <p className="text-xs text-[#718096]">Published</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A202C]">{stats.pendingReview}</p>
                  <p className="text-xs text-[#718096]">Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A202C]">{stats.officialForms}</p>
                  <p className="text-xs text-[#718096]">Official</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A202C]">{institutions?.length || 0}</p>
                  <p className="text-xs text-[#718096]">Institutions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 mb-6 bg-white rounded-lg border border-gray-200 p-1 w-fit">
            <button
              onClick={() => setActiveTab('forms')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'forms'
                  ? 'bg-[#1A365D] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              Forms Management
            </button>
            <button
              onClick={() => setActiveTab('uploads')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'uploads'
                  ? 'bg-[#1A365D] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Upload className="w-4 h-4" />
              Pending Uploads
              {pendingUploads.length > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'uploads' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'
                }`}>
                  {pendingUploads.length}
                </span>
              )}
            </button>
          </div>

          {/* Pending Uploads Tab */}
          {activeTab === 'uploads' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[#1A202C]">Pending Uploads</h2>
                <Button variant="outline" size="sm" onClick={refreshQueue}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {/* Current Upload Progress */}
              {currentUpload && currentUpload.state !== 'completed' && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="font-medium text-blue-800">
                      {currentUpload.currentStep}
                    </span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${currentUpload.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-blue-600 mt-2">
                    {Math.round(currentUpload.progress)}% complete
                  </p>
                </div>
              )}

              {/* Pending Uploads List */}
              {pendingUploads.length === 0 ? (
                <div className="text-center py-12">
                  <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No pending uploads</p>
                  <Link to="/admin/digitizer" className="mt-4 inline-block">
                    <Button variant="primary" size="sm">
                      Digitize New Form
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingUploads.map((form) => form && (
                    <div
                      key={form.id}
                      className={`p-4 rounded-lg border ${
                        form.uploadStatus === 'error'
                          ? 'bg-red-50 border-red-200'
                          : form.uploadStatus === 'uploading'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{form.title || 'Untitled Form'}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Created: {form.createdAt ? new Date(form.createdAt).toLocaleString() : 'Unknown'}
                          </p>
                          {form.uploadStatus === 'error' && form.uploadError && (
                            <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              {form.uploadError}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {form.uploadStatus === 'error' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => retryUpload(form.id)}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Retry
                            </Button>
                          )}
                          {form.uploadStatus === 'uploading' && (
                            <span className="flex items-center gap-2 text-sm text-blue-600">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Uploading...
                            </span>
                          )}
                          {form.uploadStatus === 'pending' && (
                            <span className="text-sm text-gray-500">Queued</span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelUpload(form.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Forms Management Tab */}
          {activeTab === 'forms' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-[#1A202C] mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Link to="/admin/digitizer">
                    <Button variant="primary" size="sm" className="w-full justify-start">
                      <Upload className="w-4 h-4 mr-2" />
                      Digitize PDF Form
                    </Button>
                  </Link>
                  <Link to="/builder">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Create New Form
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-full justify-start ${mainView === 'institutions' ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
                    onClick={() => {
                      setMainView(mainView === 'institutions' ? 'forms' : 'institutions');
                      setShowInstitutionsPanel(false);
                    }}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Institutions
                    <span className="ml-auto bg-gray-100 px-1.5 py-0.5 rounded text-xs">{institutions?.length || 0}</span>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                  {isLocalStorage() && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={`w-full justify-start ${showBackupPanel ? 'bg-green-50 border-green-200 text-green-700' : ''}`}
                      onClick={() => setShowBackupPanel(!showBackupPanel)}
                    >
                      <HardDrive className="w-4 h-4 mr-2" />
                      Data & Backup
                    </Button>
                  )}
                </div>
              </div>

              {/* Data & Backup Panel (Local Mode Only) */}
              {isLocalStorage() && showBackupPanel && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="font-semibold text-[#1A202C] mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Data & Backup
                  </h3>

                  {/* Storage Stats */}
                  {backupStats && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-2">Storage Usage</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Database:</span>
                          <span className="ml-1 font-medium">{backupStats.databaseSizeKB} KB</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Files:</span>
                          <span className="ml-1 font-medium">{backupStats.fileCount}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Total Files Size:</span>
                          <span className="ml-1 font-medium">{backupStats.totalFileSizeKB} KB</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  {backupMessage && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${
                      backupMessage.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {backupMessage.text}
                    </div>
                  )}

                  {/* Backup Actions */}
                  <div className="space-y-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full justify-center bg-green-600 hover:bg-green-700"
                      onClick={handleDownloadBackup}
                      disabled={backupLoading}
                    >
                      {backupLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Download Backup
                    </Button>

                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestoreBackup}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={restoreLoading}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center"
                        disabled={restoreLoading}
                      >
                        {restoreLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <UploadCloud className="w-4 h-4 mr-2" />
                        )}
                        Restore Backup
                      </Button>
                    </div>
                  </div>

                  {/* Sync to Firebase */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Sync to Firebase</h4>

                    {syncProgress && (
                      <div className="mb-3 p-2 bg-blue-50 rounded-lg text-xs">
                        <div className="flex justify-between text-blue-700 mb-1">
                          <span className="capitalize">{syncProgress.phase}</span>
                          <span>{syncProgress.current}/{syncProgress.total}</span>
                        </div>
                        <div className="w-full bg-blue-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{ width: syncProgress.total > 0 ? `${(syncProgress.current / syncProgress.total) * 100}%` : '0%' }}
                          />
                        </div>
                        <p className="text-blue-600 mt-1 truncate">{syncProgress.currentItem}</p>
                      </div>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full justify-center bg-orange-500 hover:bg-orange-600"
                      onClick={handleSyncToFirebase}
                      disabled={syncLoading}
                    >
                      {syncLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <UploadCloud className="w-4 h-4 mr-2" />
                      )}
                      Push to Firebase
                    </Button>
                    <p className="mt-2 text-xs text-gray-500">
                      Upload all local data to Firebase cloud.
                    </p>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Backup includes database and all PDF files. Restore will replace all current data.
                  </p>
                </div>
              )}

              {/* Institutions Panel */}
              {showInstitutionsPanel && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="font-semibold text-[#1A202C] mb-4 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Manage Institutions
                  </h3>
                  {institutionsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  ) : !institutions || institutions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No institutions found. Visit Setup to seed data.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {institutions.map((inst) => (
                        <div
                          key={inst.id}
                          className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between">
                            <Link
                              to={`/admin/institution/${inst.id}`}
                              className="flex-1 min-w-0 hover:text-blue-600"
                            >
                              <h4 className="font-medium text-sm text-gray-900 truncate hover:text-blue-600">
                                {getInstitutionLocalizedName(inst, 'en')}
                              </h4>
                              {inst.address && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{inst.address}</p>
                              )}
                            </Link>
                            <div className="flex gap-1 ml-2">
                              <Link
                                to={`/admin/institution/${inst.id}`}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                                title="Institution Intelligence"
                              >
                                <Users className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                onClick={() => handleEditInstitution(inst)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setShowDeleteInstitutionModal(inst.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Category Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-[#1A202C] mb-4 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  By Category
                </h3>
                <div className="space-y-2">
                  {categories?.filter(cat => cat.isActive).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="truncate">{getCategoryLocalizedName(cat, 'en')}</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">
                        {stats.byCategory[cat.id] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Table Area */}
            <div className="lg:col-span-3">
              {/* View Toggle Header */}
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setMainView('forms')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mainView === 'forms'
                      ? 'bg-[#1A365D] text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Forms
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    mainView === 'forms' ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    {forms?.length || 0}
                  </span>
                </button>
                <button
                  onClick={() => setMainView('institutions')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mainView === 'institutions'
                      ? 'bg-[#1A365D] text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Institutions
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    mainView === 'institutions' ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    {institutions?.length || 0}
                  </span>
                </button>
              </div>

              {/* Institutions View */}
              {mainView === 'institutions' && (
                <div>
                  {/* Institution Search */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search institutions by name, address, email..."
                          value={institutionSearch}
                          onChange={(e) => setInstitutionSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3182CE] focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Results Count */}
                  <div className="mb-4 text-sm text-[#718096]">
                    Showing {filteredInstitutions.length} of {institutions?.length || 0} institutions
                  </div>

                  {/* Institutions Grid */}
                  {institutionsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : filteredInstitutions.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Institutions Found</h3>
                      <p className="text-gray-500">
                        {institutions?.length === 0
                          ? 'Visit Setup to seed institution data.'
                          : 'Try adjusting your search.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredInstitutions.map((inst) => (
                        <div
                          key={inst.id}
                          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link
                                to={`/admin/institution/${inst.id}`}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                                title="Institution Intelligence"
                              >
                                <Users className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleEditInstitution(inst)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setShowDeleteInstitutionModal(inst.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <Link to={`/admin/institution/${inst.id}`}>
                            <h3 className="font-semibold text-[#1A202C] hover:text-[#3182CE] mb-1 line-clamp-2">
                              {getInstitutionLocalizedName(inst, 'en')}
                            </h3>
                          </Link>
                          {inst.address && (
                            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{inst.address}</p>
                          )}

                          <div className="pt-3 border-t border-gray-100 space-y-2">
                            {inst.telephoneNumbers && inst.telephoneNumbers.length > 0 && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="text-green-500">📞</span>
                                <span className="truncate">{inst.telephoneNumbers[0]}</span>
                                {inst.telephoneNumbers.length > 1 && (
                                  <span className="text-xs text-gray-400">+{inst.telephoneNumbers.length - 1}</span>
                                )}
                              </div>
                            )}
                            {inst.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="text-blue-500">📧</span>
                                <span className="truncate">{inst.email}</span>
                              </div>
                            )}
                            {inst.website && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="text-purple-500">🌐</span>
                                <a
                                  href={inst.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="truncate hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {inst.website.replace(/^https?:\/\//, '')}
                                </a>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {stats.byInstitution[inst.id] || 0} forms
                            </span>
                            <Link
                              to={`/admin/institution/${inst.id}`}
                              className="text-xs text-[#3182CE] hover:underline"
                            >
                              View Intelligence →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Forms View */}
              {mainView === 'forms' && (
                <>
              {/* Filters & Search */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search forms by title, institution..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3182CE] focus:border-transparent text-sm"
                    />
                  </div>

                  {/* Toggle Filters */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {/* View Mode Toggle */}
                  <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      Table
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      Grid
                    </button>
                  </div>
                </div>

                {/* Filter Options */}
                {showFilters && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Category */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                      >
                        <option value="All">All Categories</option>
                        {categories?.map((cat) => (
                          <option key={cat.id} value={cat.id}>{getCategoryLocalizedName(cat, 'en')}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as StatusFilter)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                      >
                        <option value="all">All Status</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                        <option value="pending">Pending Review</option>
                      </select>
                    </div>

                    {/* Verification */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Verification</label>
                      <select
                        value={selectedVerification}
                        onChange={(e) => setSelectedVerification(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                      >
                        <option value="all">All Levels</option>
                        <option value="0">Unverified</option>
                        <option value="1">Community</option>
                        <option value="2">Trusted</option>
                        <option value="3">Official</option>
                      </select>
                    </div>

                    {/* Sort */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Sort By</label>
                      <select
                        value={`${sortField}-${sortOrder}`}
                        onChange={(e) => {
                          const [field, order] = e.target.value.split('-');
                          setSortField(field as SortField);
                          setSortOrder(order as SortOrder);
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                      >
                        <option value="downloads-desc">Most Downloaded</option>
                        <option value="downloads-asc">Least Downloaded</option>
                        <option value="updatedAt-desc">Recently Updated</option>
                        <option value="updatedAt-asc">Oldest Updated</option>
                        <option value="createdAt-desc">Newest Created</option>
                        <option value="createdAt-asc">Oldest Created</option>
                        <option value="title-asc">Title A-Z</option>
                        <option value="title-desc">Title Z-A</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Results Count */}
              <div className="mb-4 text-sm text-[#718096]">
                Showing {filteredForms.length} of {forms?.length || 0} forms
              </div>

              {/* Table View */}
              {viewMode === 'table' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedForms.size === filteredForms.length && filteredForms.length > 0}
                              onChange={handleSelectAll}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                          </th>
                          <th
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('title')}
                          >
                            <div className="flex items-center gap-1">
                              Form Title
                              <SortIcon field="title" />
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Category
                          </th>
                          <th
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('verificationLevel')}
                          >
                            <div className="flex items-center gap-1">
                              Verification
                              <SortIcon field="verificationLevel" />
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('downloads')}
                          >
                            <div className="flex items-center gap-1">
                              Downloads
                              <SortIcon field="downloads" />
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('updatedAt')}
                          >
                            <div className="flex items-center gap-1">
                              Updated
                              <SortIcon field="updatedAt" />
                            </div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredForms.map((form) => {
                          const category = categoryMap.get(form.categoryId);
                          const institution = institutionMap.get(form.institutionId);
                          return (
                            <tr key={form.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedForms.has(form.id)}
                                  onChange={() => handleSelectForm(form.id)}
                                  className="w-4 h-4 rounded border-gray-300"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <Link
                                    to={`/form/${form.id}`}
                                    className="font-medium text-[#1A202C] hover:text-[#3182CE]"
                                  >
                                    {getFormLocalizedTitle(form, 'en')}
                                  </Link>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {institution ? getInstitutionLocalizedName(institution, 'en') : form.institutionId}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-600">
                                  {category ? getCategoryLocalizedName(category, 'en') : form.categoryId}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {getVerificationBadge(form.verificationLevel)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium text-gray-900">
                                  {form.downloadCount.toLocaleString()}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-500">
                                  {toDate(form.updatedAt).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleToggleVisibility(form)}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                    form.status === 'published'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {form.status === 'published' ? (
                                    <Eye className="w-3 h-3" />
                                  ) : (
                                    <EyeOff className="w-3 h-3" />
                                  )}
                                  {form.status}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <FormActions form={form} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {filteredForms.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No forms found</h3>
                      <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                    </div>
                  )}
                </div>
              )}

              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredForms.map((form) => {
                    const category = categoryMap.get(form.categoryId);
                    const institution = institutionMap.get(form.institutionId);
                    return (
                      <div
                        key={form.id}
                        className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedForms.has(form.id)}
                              onChange={() => handleSelectForm(form.id)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                            {getVerificationBadge(form.verificationLevel)}
                          </div>
                          <FormActions form={form} />
                        </div>

                        <Link to={`/form/${form.id}`}>
                          <h3 className="font-semibold text-[#1A202C] hover:text-[#3182CE] mb-1">
                            {getFormLocalizedTitle(form, 'en')}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-500 mb-3">
                          {institution ? getInstitutionLocalizedName(institution, 'en') : form.institutionId}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Download className="w-4 h-4" />
                            {form.downloadCount.toLocaleString()}
                          </div>
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {category ? getCategoryLocalizedName(category, 'en') : form.categoryId}
                          </span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            Updated {toDate(form.updatedAt).toLocaleDateString()}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            form.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {form.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredForms.length === 0 && (
                    <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-gray-200">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No forms found</h3>
                      <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                    </div>
                  )}
                </div>
              )}
              </>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Verification Level Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-[#1A202C] mb-4">Change Verification Level</h3>
            <div className="space-y-2">
              {([0, 1, 2, 3] as const).map((level) => {
                const info = verificationLabels[level];
                const Icon = info.icon;
                return (
                  <button
                    key={level}
                    onClick={() => handleChangeVerification(showVerificationModal, level)}
                    className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">{info.label}</div>
                      <div className="text-xs text-gray-500">
                        {level === 0 && 'Not yet verified'}
                        {level === 1 && 'Verified by community'}
                        {level === 2 && 'Verified by trusted source'}
                        {level === 3 && 'Official government form'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowVerificationModal(null)}
              className="w-full mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A202C]">Confirm Delete</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this form? All data associated with this form will be permanently removed.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={confirmDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Form
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Institution Modal */}
      {editingInstitution && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#1A202C]">Edit Institution</h3>
              <button
                onClick={() => setEditingInstitution(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Institution Name *
                </label>
                <input
                  type="text"
                  value={institutionFormData.name}
                  onChange={(e) => setInstitutionFormData({ ...institutionFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={institutionFormData.address}
                  onChange={(e) => setInstitutionFormData({ ...institutionFormData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Hours</label>
                <input
                  type="text"
                  value={institutionFormData.openingHours}
                  onChange={(e) => setInstitutionFormData({ ...institutionFormData, openingHours: e.target.value })}
                  placeholder="e.g., Mon-Fri 8:30 AM - 4:30 PM"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone Numbers</label>
                {institutionFormData.telephoneNumbers.map((phone, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        const updated = [...institutionFormData.telephoneNumbers];
                        updated[i] = e.target.value;
                        setInstitutionFormData({ ...institutionFormData, telephoneNumbers: updated });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                    />
                    {i > 0 && (
                      <button
                        onClick={() => {
                          const updated = institutionFormData.telephoneNumbers.filter((_, idx) => idx !== i);
                          setInstitutionFormData({ ...institutionFormData, telephoneNumbers: updated });
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {institutionFormData.telephoneNumbers.length < 5 && (
                  <button
                    onClick={() => setInstitutionFormData({
                      ...institutionFormData,
                      telephoneNumbers: [...institutionFormData.telephoneNumbers, '']
                    })}
                    className="text-sm text-[#3182CE] hover:underline"
                  >
                    + Add phone number
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={institutionFormData.email}
                    onChange={(e) => setInstitutionFormData({ ...institutionFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={institutionFormData.website}
                    onChange={(e) => setInstitutionFormData({ ...institutionFormData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingInstitution(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSaveInstitution}
                disabled={!institutionFormData.name.trim()}
              >
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Institution Confirmation Modal */}
      {showDeleteInstitutionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A202C]">Delete Institution</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this institution? Forms using this institution will not be affected.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteInstitutionModal(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={confirmDeleteInstitution}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
