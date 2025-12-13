import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  Download,
  Star,
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
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { sampleForms } from '../data/sampleForms';
import { CATEGORIES } from '../types';
import type { Form } from '../types';
import { getCustomForms, deleteForm as deleteStoredForm, updateVerificationLevel, approveForm, getPhoneNumbers, type StoredForm } from '../utils/formsStorage';

// Storage key for sample form title overrides
const TITLE_OVERRIDES_KEY = 'forms-lk-title-overrides';

// Storage key for form visibility
const VISIBILITY_KEY = 'forms-lk-form-visibility';

// Get all title overrides
function getTitleOverrides(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TITLE_OVERRIDES_KEY) || '{}');
  } catch {
    return {};
  }
}

// Get form visibility states
function getFormVisibility(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(VISIBILITY_KEY) || '{}');
  } catch {
    return {};
  }
}

// Set form visibility
function setFormVisibility(formId: string, visible: boolean): void {
  try {
    const visibility = getFormVisibility();
    visibility[formId] = visible;
    localStorage.setItem(VISIBILITY_KEY, JSON.stringify(visibility));
  } catch {
    console.error('Failed to save form visibility');
  }
}

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

// Convert StoredForm to Form type
function convertStoredToForm(stored: StoredForm): Form {
  // Convert pdfPages (base64 strings) to FormPage objects
  const pages = (stored.pdfPages || []).map((_, index) => ({
    id: `page-${index + 1}`,
    elements: [] as import('../types').FormElement[],
  }));

  // Use helper to get phone numbers (handles both new array and legacy comma-separated format)
  const phoneNumbers = getPhoneNumbers(stored.contactInfo);

  return {
    id: stored.id,
    title: stored.title,
    institution: stored.institution,
    category: stored.category,
    description: stored.description || '',
    pages: pages,
    downloads: stored.downloads || 0,
    rating: stored.rating || 0,
    ratingCount: stored.ratingCount || 0,
    verificationLevel: (stored.verificationLevel || 0) as 0 | 1 | 2 | 3,
    status: stored.status || 'published',
    createdAt: stored.createdAt || new Date().toISOString(),
    updatedAt: stored.updatedAt || new Date().toISOString(),
    createdBy: 'admin',
    postAddress: stored.contactInfo?.address,
    officeHours: stored.contactInfo?.officeHours,
    telephoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : undefined,
    faxNumber: stored.contactInfo?.faxNumber,
    email: stored.contactInfo?.email,
    website: stored.contactInfo?.website,
    officialLocation: stored.contactInfo?.officialLocation,
    thumbnail: stored.pdfPages?.[0],
  };
}

export function AdminPage() {
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
  const [customForms, setCustomForms] = useState<Form[]>([]);
  const [showVerificationModal, setShowVerificationModal] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formVisibilityState, setFormVisibilityState] = useState<Record<string, boolean>>({});

  // Reset filters on component mount
  useEffect(() => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedStatus('all');
    setSelectedVerification('all');
    setSortField('downloads');
    setSortOrder('desc');
    // Load visibility state
    setFormVisibilityState(getFormVisibility());
  }, []);

  // Load custom forms from localStorage
  useEffect(() => {
    const stored = getCustomForms();
    setCustomForms(stored.map(convertStoredToForm));
  }, [refreshKey]);

  // Combine all forms, applying any title overrides for sample forms
  const allForms = useMemo(() => {
    const titleOverrides = getTitleOverrides();
    const sampleFormsWithOverrides = sampleForms.map(form => {
      const override = titleOverrides[form.id];
      return override ? { ...form, title: override } : form;
    });
    return [...customForms, ...sampleFormsWithOverrides];
  }, [customForms]);

  // Check if form is custom (editable)
  const isCustomForm = (formId: string) => {
    return formId.startsWith('custom-');
  };

  // Handle approve form
  const handleApproveForm = (formId: string) => {
    if (isCustomForm(formId)) {
      approveForm(formId);
      setRefreshKey(k => k + 1);
    }
    setActiveDropdown(null);
  };

  // Handle change verification
  const handleChangeVerification = (formId: string, level: 0 | 1 | 2 | 3) => {
    if (isCustomForm(formId)) {
      updateVerificationLevel(formId, level);
      setRefreshKey(k => k + 1);
    }
    setShowVerificationModal(null);
    setActiveDropdown(null);
  };

  // Handle toggle visibility
  const handleToggleVisibility = (formId: string) => {
    const currentVisibility = formVisibilityState[formId] !== false;
    setFormVisibility(formId, !currentVisibility);
    setFormVisibilityState(prev => ({ ...prev, [formId]: !currentVisibility }));
  };

  // Handle delete form - show confirmation modal
  const handleDeleteForm = (formId: string) => {
    setShowDeleteModal(formId);
    setActiveDropdown(null);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (showDeleteModal) {
      deleteStoredForm(showDeleteModal);
      setRefreshKey(k => k + 1);
      setShowDeleteModal(null);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalForms = allForms.length;
    const totalDownloads = allForms.reduce((sum, f) => sum + f.downloads, 0);
    const avgRating = totalForms > 0 ? allForms.reduce((sum, f) => sum + f.rating, 0) / totalForms : 0;
    const publishedForms = allForms.filter(f => f.status === 'published').length;
    const pendingReview = allForms.filter(f => f.verificationLevel === 0).length;
    const officialForms = allForms.filter(f => f.verificationLevel === 3).length;

    // Category breakdown
    const byCategory = CATEGORIES.reduce((acc, cat) => {
      acc[cat] = allForms.filter(f => f.category === cat).length;
      return acc;
    }, {} as Record<string, number>);

    // Institution breakdown
    const byInstitution = allForms.reduce((acc, f) => {
      acc[f.institution] = (acc[f.institution] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalForms,
      totalDownloads,
      avgRating,
      publishedForms,
      pendingReview,
      officialForms,
      byCategory,
      byInstitution,
      customForms: customForms.length,
    };
  }, [allForms, customForms]);

  // Filter and sort forms
  const filteredForms = useMemo(() => {
    let result = [...allForms];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        f =>
          f.title.toLowerCase().includes(query) ||
          f.institution.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      result = result.filter(f => f.category === selectedCategory);
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
          comparison = a.downloads - b.downloads;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'verificationLevel':
          comparison = a.verificationLevel - b.verificationLevel;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [searchQuery, selectedCategory, selectedStatus, selectedVerification, sortField, sortOrder]);

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

  const handleBulkAction = (action: string) => {
    alert(`${action} action on ${selectedForms.size} forms`);
    setSelectedForms(new Set());
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

  const FormActions = ({ form }: { form: Form }) => {
    const editable = isCustomForm(form.id);
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
            {editable && (
              <>
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
              </>
            )}
            {!editable && (
              <div className="px-4 py-2 text-xs text-gray-400 italic">
                Sample forms are read-only
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Data
                </Button>
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
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
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1A202C]">{stats.avgRating.toFixed(1)}</p>
                  <p className="text-xs text-[#718096]">Avg Rating</p>
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
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Category & Institution Stats */}
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
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-[#1A202C] mb-4 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  By Category
                </h3>
                <div className="space-y-2">
                  {Object.entries(stats.byCategory)
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedCategory === category
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span className="truncate">{category}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">
                          {count}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Institution Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-[#1A202C] mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  By Institution
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(stats.byInstitution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([institution, count]) => (
                      <div
                        key={institution}
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
                      >
                        <span className="truncate text-gray-700">{institution}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Main Table Area */}
            <div className="lg:col-span-3">
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
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
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
                        <option value="rating-desc">Highest Rated</option>
                        <option value="rating-asc">Lowest Rated</option>
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

              {/* Bulk Actions */}
              {selectedForms.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center justify-between">
                  <span className="text-blue-700 font-medium">
                    {selectedForms.size} form{selectedForms.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('approve')}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('reject')}>
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('delete')} className="text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                    <button
                      onClick={() => setSelectedForms(new Set())}
                      className="text-sm text-gray-500 hover:text-gray-700 ml-2"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Results Count */}
              <div className="mb-4 text-sm text-[#718096]">
                Showing {filteredForms.length} of {sampleForms.length} forms
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
                            onClick={() => handleSort('rating')}
                          >
                            <div className="flex items-center gap-1">
                              Rating
                              <SortIcon field="rating" />
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
                            Visible
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredForms.map((form) => (
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
                                  {form.title}
                                </Link>
                                <p className="text-xs text-gray-500 mt-0.5">{form.institution}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600">{form.category}</span>
                            </td>
                            <td className="px-4 py-3">
                              {getVerificationBadge(form.verificationLevel)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-gray-900">
                                {form.downloads.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                <span className="text-sm font-medium">{form.rating.toFixed(1)}</span>
                                <span className="text-xs text-gray-400">({form.ratingCount})</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-500">
                                {new Date(form.updatedAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleToggleVisibility(form.id)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  formVisibilityState[form.id] !== false
                                    ? 'text-green-600 hover:bg-green-50'
                                    : 'text-gray-400 hover:bg-gray-100'
                                }`}
                                title={formVisibilityState[form.id] !== false ? 'Visible - Click to hide' : 'Hidden - Click to show'}
                              >
                                {formVisibilityState[form.id] !== false ? (
                                  <Eye className="w-5 h-5" />
                                ) : (
                                  <EyeOff className="w-5 h-5" />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <FormActions form={form} />
                                {isCustomForm(form.id) && (
                                  <button
                                    onClick={() => handleDeleteForm(form.id)}
                                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                    title="Delete form"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
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
                  {filteredForms.map((form) => (
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
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleVisibility(form.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              formVisibilityState[form.id] !== false
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={formVisibilityState[form.id] !== false ? 'Visible' : 'Hidden'}
                          >
                            {formVisibilityState[form.id] !== false ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </button>
                          {isCustomForm(form.id) && (
                            <button
                              onClick={() => handleDeleteForm(form.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete form"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <FormActions form={form} />
                        </div>
                      </div>

                      <Link to={`/form/${form.id}`}>
                        <h3 className="font-semibold text-[#1A202C] hover:text-[#3182CE] mb-1">
                          {form.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-500 mb-3">{form.institution}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          {form.downloads.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          {form.rating.toFixed(1)}
                        </div>
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {form.category}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          Updated {new Date(form.updatedAt).toLocaleDateString()}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          form.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {form.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {filteredForms.length === 0 && (
                    <div className="col-span-2 text-center py-12 bg-white rounded-xl border border-gray-200">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No forms found</h3>
                      <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
    </Layout>
  );
}
