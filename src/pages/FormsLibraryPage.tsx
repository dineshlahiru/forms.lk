import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  List,
  Grid3X3,
  Phone,
  Globe,
  MapPin,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Mail,
  Settings,
  Loader2,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useAllForms, useCategories, useInstitutions } from '../hooks';
import {
  searchForms,
  detectSearchLanguage,
  getFormLocalizedTitle,
  getCategoryLocalizedName,
  getInstitutionLocalizedName,
  updateForm as updateFormService,
} from '../services';
import { useAuth } from '../context/AuthContext';
import type { FirebaseForm, FirebaseCategory, FirebaseInstitution, Language } from '../types/firebase';

// Title editing state type
interface TitleEditState {
  formId: string;
  language: Language;
  value: string;
}

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

// Verification level display
const VERIFICATION_LEVELS = [
  { label: 'Unverified', color: 'gray' },
  { label: 'Official', color: 'blue' },
  { label: 'Verified', color: 'green' },
  { label: 'Certified', color: 'gold' },
];

export function FormsLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'name'>('name');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Admin mode state
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [editingTitle, setEditingTitle] = useState<TitleEditState | null>(null);

  // Firebase hooks
  const { data: forms, loading: formsLoading, error: formsError, refetch: refetchForms } = useAllForms();
  const { data: categories, loading: categoriesLoading } = useCategories();
  const { data: institutions } = useInstitutions();
  const { isAdmin } = useAuth();

  // Create lookup maps for categories and institutions
  const categoryMap = useMemo(() => {
    if (!categories) return new Map<string, FirebaseCategory>();
    return new Map(categories.map(cat => [cat.id, cat]));
  }, [categories]);

  const institutionMap = useMemo(() => {
    if (!institutions) return new Map<string, FirebaseInstitution>();
    return new Map(institutions.map(inst => [inst.id, inst]));
  }, [institutions]);

  // Handle saving title for a specific language
  const handleSaveTitle = useCallback(async (formId: string, language: Language, newTitle: string) => {
    if (!newTitle.trim()) return;

    try {
      const updates: Record<string, string> = {};
      if (language === 'en') {
        updates.title = newTitle.trim();
      } else if (language === 'si') {
        updates.titleSi = newTitle.trim();
      } else if (language === 'ta') {
        updates.titleTa = newTitle.trim();
      }
      await updateFormService(formId, updates);
      await refetchForms();
    } catch (error) {
      console.error('Failed to save title:', error);
    }
    setEditingTitle(null);
  }, [refetchForms]);

  // Start editing a title
  const handleStartEdit = useCallback((form: FirebaseForm, language: Language) => {
    let currentTitle = '';
    if (language === 'en') {
      currentTitle = form.title;
    } else if (language === 'si') {
      currentTitle = form.titleSi || '';
    } else if (language === 'ta') {
      currentTitle = form.titleTa || '';
    }
    setEditingTitle({
      formId: form.id,
      language,
      value: currentTitle,
    });
  }, []);

  // Initialize from URL params
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    const categoryFromUrl = searchParams.get('category');
    const viewFromUrl = searchParams.get('view');
    if (searchFromUrl) setSearchQuery(searchFromUrl);
    if (categoryFromUrl) setSelectedCategory(categoryFromUrl);
    if (viewFromUrl === 'grid') setViewMode('grid');
  }, [searchParams]);

  // Update URL when filters change
  const updateUrl = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'All' && value !== 'list') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  // Detect language of search query for display
  const searchLanguage = useMemo((): Language => {
    return searchQuery ? detectSearchLanguage(searchQuery) : 'en';
  }, [searchQuery]);

  const filteredForms = useMemo(() => {
    if (!forms) return [];

    // Apply search filter
    let filtered = searchQuery ? searchForms(forms, searchQuery, searchLanguage) : forms;

    // Apply category filter
    if (selectedCategory !== 'All') {
      // Find category by name to get ID
      const category = categories?.find(c =>
        c.name === selectedCategory ||
        c.nameSi === selectedCategory ||
        c.nameTa === selectedCategory ||
        c.id === selectedCategory
      );
      if (category) {
        filtered = filtered.filter(form => form.categoryId === category.id);
      }
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      if (sortBy === 'popular') return b.downloadCount - a.downloadCount;
      if (sortBy === 'name') {
        const titleA = getFormLocalizedTitle(a, searchLanguage);
        const titleB = getFormLocalizedTitle(b, searchLanguage);
        return titleA.localeCompare(titleB);
      }
      // newest
      return b.updatedAt.toMillis() - a.updatedAt.toMillis();
    });
  }, [forms, searchQuery, selectedCategory, sortBy, searchLanguage, categories]);

  // Pagination
  const totalPages = Math.ceil(filteredForms.length / itemsPerPage);
  const paginatedForms = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredForms.slice(start, start + itemsPerPage);
  }, [filteredForms, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy, itemsPerPage]);

  const handleViewModeChange = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    updateUrl('view', mode);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-12 bg-white rounded-lg border border-red-200">
            <h3 className="text-lg font-medium text-red-600 mb-1">Failed to load forms</h3>
            <p className="text-sm text-gray-600">{formsError.message}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A202C] mb-1">Forms Library</h1>
          <p className="text-sm text-[#718096]">
            Browse {(forms?.length || 0).toLocaleString()} government forms from various institutions
          </p>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search forms by name, department..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  updateUrl('search', e.target.value);
                }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3182CE] focus:border-transparent"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Category Filter */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    updateUrl('category', e.target.value);
                  }}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#3182CE] min-w-[160px]"
                >
                  <option value="All">All Categories</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {getCategoryLocalizedName(cat, searchLanguage)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#3182CE] min-w-[130px]"
                >
                  <option value="name">Name A-Z</option>
                  <option value="popular">Most Popular</option>
                  <option value="newest">Newest</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* View Toggle */}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-[#3182CE] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-[#3182CE] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  title="Grid View"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>

              {/* Admin Mode Toggle - only show for admins */}
              {isAdmin && (
                <button
                  onClick={() => setIsAdminMode(!isAdminMode)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
                    isAdminMode
                      ? 'bg-amber-100 border-amber-300 text-amber-800'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Toggle Admin Mode"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results Info & Pagination Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 text-sm">
          <div className="text-[#718096]">
            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredForms.length)} of {filteredForms.length.toLocaleString()} forms
            {selectedCategory !== 'All' && (
              <span className="text-[#3182CE]">
                {' '}in {categoryMap.get(selectedCategory)?.name || selectedCategory}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#718096]">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-200 rounded bg-white"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Forms Display */}
        {filteredForms.length > 0 ? (
          <>
            {viewMode === 'list' ? (
              <ListView
                forms={paginatedForms}
                displayLanguage={searchLanguage}
                isAdminMode={isAdminMode}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={setSelectedLanguage}
                editingTitle={editingTitle}
                onStartEdit={handleStartEdit}
                onSaveTitle={handleSaveTitle}
                onEditingChange={setEditingTitle}
                categoryMap={categoryMap}
                institutionMap={institutionMap}
              />
            ) : (
              <GridView
                forms={paginatedForms}
                displayLanguage={searchLanguage}
                isAdminMode={isAdminMode}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={setSelectedLanguage}
                editingTitle={editingTitle}
                onStartEdit={handleStartEdit}
                onSaveTitle={handleSaveTitle}
                onEditingChange={setEditingTitle}
                categoryMap={categoryMap}
                institutionMap={institutionMap}
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm ${
                          currentPage === pageNum
                            ? 'bg-[#3182CE] text-white'
                            : 'border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-[#1A202C] mb-1">No forms found</h3>
            <p className="text-sm text-[#718096]">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

// List view props interface
interface ListViewProps {
  forms: FirebaseForm[];
  displayLanguage: Language;
  isAdminMode: boolean;
  selectedLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
  editingTitle: TitleEditState | null;
  onStartEdit: (form: FirebaseForm, language: Language) => void;
  onSaveTitle: (formId: string, language: Language, newTitle: string) => void;
  onEditingChange: (state: TitleEditState | null) => void;
  categoryMap: Map<string, FirebaseCategory>;
  institutionMap: Map<string, FirebaseInstitution>;
}

// Compact List View - optimized for scanning many entries
function ListView({
  forms,
  displayLanguage,
  isAdminMode,
  selectedLanguage,
  onSelectLanguage,
  editingTitle,
  onStartEdit,
  onSaveTitle,
  onEditingChange,
  categoryMap,
  institutionMap,
}: ListViewProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-[#718096] uppercase tracking-wide">
        <div className="col-span-4">Form Name</div>
        <div className="col-span-3 pl-6">Contact</div>
        <div className="col-span-3 pl-6">Address</div>
        <div className="col-span-2 pl-6">Actions</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-100">
        {forms.map((form) => (
          <ListViewRow
            key={form.id}
            form={form}
            displayLanguage={displayLanguage}
            isAdminMode={isAdminMode}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={onSelectLanguage}
            editingTitle={editingTitle}
            onStartEdit={onStartEdit}
            onSaveTitle={onSaveTitle}
            onEditingChange={onEditingChange}
            categoryMap={categoryMap}
            institutionMap={institutionMap}
          />
        ))}
      </div>
    </div>
  );
}

interface ListViewRowProps {
  form: FirebaseForm;
  displayLanguage: Language;
  isAdminMode: boolean;
  selectedLanguage: Language;
  onSelectLanguage: (lang: Language) => void;
  editingTitle: TitleEditState | null;
  onStartEdit: (form: FirebaseForm, language: Language) => void;
  onSaveTitle: (formId: string, language: Language, newTitle: string) => void;
  onEditingChange: (state: TitleEditState | null) => void;
  categoryMap: Map<string, FirebaseCategory>;
  institutionMap: Map<string, FirebaseInstitution>;
}

function ListViewRow({
  form,
  displayLanguage,
  isAdminMode,
  selectedLanguage,
  onSelectLanguage,
  editingTitle,
  onStartEdit,
  onSaveTitle,
  onEditingChange,
  categoryMap,
  institutionMap,
}: ListViewRowProps) {
  const verification = VERIFICATION_LEVELS[form.verificationLevel];
  const phones = form.contactInfo?.telephoneNumbers?.slice(0, 2) || [];
  const address = form.contactInfo?.address;
  const website = form.contactInfo?.website;
  const email = form.contactInfo?.email;

  const isEditing = editingTitle?.formId === form.id;
  const canEdit = isAdminMode;

  const category = categoryMap.get(form.categoryId);
  const institution = institutionMap.get(form.institutionId);

  // Get title for the selected language in admin mode
  const getTitleForLanguage = (lang: Language) => {
    if (lang === 'en') return form.title;
    if (lang === 'si') return form.titleSi || '';
    if (lang === 'ta') return form.titleTa || '';
    return form.title;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && editingTitle) {
      onSaveTitle(editingTitle.formId, editingTitle.language, editingTitle.value);
    } else if (e.key === 'Escape') {
      onEditingChange(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
      {/* Form Name & Department */}
      <div className="col-span-1 md:col-span-4">
        <div className="flex items-center gap-2">
          {/* Title - editable in admin mode */}
          {isEditing ? (
            <input
              type="text"
              value={editingTitle.value}
              onChange={(e) => onEditingChange({ ...editingTitle, value: e.target.value })}
              onBlur={() => onSaveTitle(editingTitle.formId, editingTitle.language, editingTitle.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          ) : (
            <Link
              to={canEdit ? '#' : `/form/${form.id}`}
              onClick={(e) => {
                if (canEdit) {
                  e.preventDefault();
                }
              }}
              onDoubleClick={() => {
                if (canEdit) {
                  onStartEdit(form, selectedLanguage);
                }
              }}
              className={`font-medium text-[#1A202C] hover:text-[#3182CE] transition-colors ${
                canEdit ? 'cursor-text' : ''
              }`}
              title={canEdit ? 'Double-click to edit' : undefined}
            >
              {isAdminMode ? getTitleForLanguage(selectedLanguage) : getFormLocalizedTitle(form, displayLanguage)}
            </Link>
          )}
          {/* Language Badges - clickable in admin mode */}
          {form.languages && form.languages.length > 0 && (
            <div className="flex gap-0.5 ml-auto">
              {form.languages.includes('en') && (
                <button
                  onClick={() => isAdminMode && onSelectLanguage('en')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                    isAdminMode && selectedLanguage === 'en'
                      ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                      : 'bg-blue-100 text-blue-700'
                  } ${isAdminMode ? 'cursor-pointer hover:bg-blue-200' : ''}`}
                >
                  EN
                </button>
              )}
              {form.languages.includes('si') && (
                <button
                  onClick={() => isAdminMode && onSelectLanguage('si')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                    isAdminMode && selectedLanguage === 'si'
                      ? 'bg-green-500 text-white ring-2 ring-green-300'
                      : 'bg-green-100 text-green-700'
                  } ${isAdminMode ? 'cursor-pointer hover:bg-green-200' : ''}`}
                >
                  SI
                </button>
              )}
              {form.languages.includes('ta') && (
                <button
                  onClick={() => isAdminMode && onSelectLanguage('ta')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                    isAdminMode && selectedLanguage === 'ta'
                      ? 'bg-orange-500 text-white ring-2 ring-orange-300'
                      : 'bg-orange-100 text-orange-700'
                  } ${isAdminMode ? 'cursor-pointer hover:bg-orange-200' : ''}`}
                >
                  TA
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="text-[11px] text-[#718096]">
            {institution ? getInstitutionLocalizedName(institution, displayLanguage) : form.institutionId}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-[#3182CE]">
            {category ? getCategoryLocalizedName(category, displayLanguage) : form.categoryId}
          </span>
          {form.verificationLevel > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                verification.color === 'gold'
                  ? 'bg-amber-100 text-amber-700'
                  : verification.color === 'green'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {verification.label}
            </span>
          )}
        </div>
      </div>

      {/* Contact - Phone, Website, Email */}
      <div className="col-span-1 md:col-span-3 md:pl-6 space-y-0.5">
        {phones.length > 0 ? (
          phones.map((phone, idx) => (
            <a
              key={idx}
              href={`tel:${phone}`}
              className="flex items-center gap-1.5 text-[11px] text-[#4A5568] hover:text-[#3182CE]"
            >
              <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span>{phone}</span>
            </a>
          ))
        ) : (
          <span className="text-[11px] text-gray-400">-</span>
        )}
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-[#3182CE] hover:underline"
          >
            <Globe className="w-3 h-3 flex-shrink-0" />
            <span>{website.replace(/^https?:\/\//, '')}</span>
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-1.5 text-[11px] text-[#4A5568] hover:text-[#3182CE]"
          >
            <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span>{email}</span>
          </a>
        )}
      </div>

      {/* Address - Full */}
      <div className="col-span-1 md:col-span-3 md:pl-6">
        {address ? (
          <div className="flex items-start gap-1.5 text-[#4A5568]">
            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="text-[11px] whitespace-pre-line">{address}</span>
          </div>
        ) : (
          <span className="text-[11px] text-gray-400">-</span>
        )}
      </div>

      {/* Actions */}
      <div className="col-span-1 md:col-span-2 md:pl-6 flex items-center gap-2">
        <Link
          to={`/form/${form.id}`}
          className="px-3 py-1.5 text-xs font-medium text-[#3182CE] border border-[#3182CE] rounded hover:bg-[#3182CE] hover:text-white transition-colors"
        >
          View
        </Link>
        <Link
          to={`/fill/${form.id}`}
          className="px-3 py-1.5 text-xs font-medium bg-[#3182CE] text-white rounded hover:bg-[#2C5282] transition-colors"
        >
          Fill
        </Link>
      </div>
    </div>
  );
}

// Grid View - visual cards
function GridView({
  forms,
  displayLanguage,
  isAdminMode,
  selectedLanguage,
  onSelectLanguage,
  editingTitle,
  onStartEdit,
  onSaveTitle,
  onEditingChange,
  categoryMap,
  institutionMap,
}: ListViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {forms.map((form) => (
        <GridViewCard
          key={form.id}
          form={form}
          displayLanguage={displayLanguage}
          isAdminMode={isAdminMode}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={onSelectLanguage}
          editingTitle={editingTitle}
          onStartEdit={onStartEdit}
          onSaveTitle={onSaveTitle}
          onEditingChange={onEditingChange}
          categoryMap={categoryMap}
          institutionMap={institutionMap}
        />
      ))}
    </div>
  );
}

function GridViewCard({
  form,
  displayLanguage,
  isAdminMode,
  selectedLanguage,
  onSelectLanguage,
  editingTitle,
  onStartEdit,
  onSaveTitle,
  onEditingChange,
  categoryMap,
  institutionMap,
}: ListViewRowProps) {
  const verification = VERIFICATION_LEVELS[form.verificationLevel];
  const phones = form.contactInfo?.telephoneNumbers?.slice(0, 2) || [];
  const website = form.contactInfo?.website;
  const email = form.contactInfo?.email;
  const address = form.contactInfo?.address;

  const isEditing = editingTitle?.formId === form.id;
  const canEdit = isAdminMode;

  const category = categoryMap.get(form.categoryId);
  const institution = institutionMap.get(form.institutionId);

  // Get title for the selected language in admin mode
  const getTitleForLanguage = (lang: Language) => {
    if (lang === 'en') return form.title;
    if (lang === 'si') return form.titleSi || '';
    if (lang === 'ta') return form.titleTa || '';
    return form.title;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && editingTitle) {
      onSaveTitle(editingTitle.formId, editingTitle.language, editingTitle.value);
    } else if (e.key === 'Escape') {
      onEditingChange(null);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#EBF4FF] flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-[#3182CE]" />
        </div>
        {form.verificationLevel > 0 && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              verification.color === 'gold'
                ? 'bg-amber-100 text-amber-700'
                : verification.color === 'green'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {verification.label}
          </span>
        )}
      </div>

      {/* Form Name - Full */}
      {isEditing ? (
        <input
          type="text"
          value={editingTitle.value}
          onChange={(e) => onEditingChange({ ...editingTitle, value: e.target.value })}
          onBlur={() => onSaveTitle(editingTitle.formId, editingTitle.language, editingTitle.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 mb-1"
        />
      ) : (
        <Link
          to={canEdit ? '#' : `/form/${form.id}`}
          onClick={(e) => {
            if (canEdit) {
              e.preventDefault();
            }
          }}
          onDoubleClick={() => {
            if (canEdit) {
              onStartEdit(form, selectedLanguage);
            }
          }}
          className={`block font-medium text-[#1A202C] hover:text-[#3182CE] mb-1 ${
            canEdit ? 'cursor-text' : ''
          }`}
          title={canEdit ? 'Double-click to edit' : undefined}
        >
          {isAdminMode ? getTitleForLanguage(selectedLanguage) : getFormLocalizedTitle(form, displayLanguage)}
        </Link>
      )}

      {/* Language Badges - clickable in admin mode */}
      {form.languages && form.languages.length > 0 && (
        <div className="flex gap-0.5 mb-2">
          {form.languages.includes('en') && (
            <button
              onClick={() => isAdminMode && onSelectLanguage('en')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                isAdminMode && selectedLanguage === 'en'
                  ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                  : 'bg-blue-100 text-blue-700'
              } ${isAdminMode ? 'cursor-pointer hover:bg-blue-200' : ''}`}
            >
              EN
            </button>
          )}
          {form.languages.includes('si') && (
            <button
              onClick={() => isAdminMode && onSelectLanguage('si')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                isAdminMode && selectedLanguage === 'si'
                  ? 'bg-green-500 text-white ring-2 ring-green-300'
                  : 'bg-green-100 text-green-700'
              } ${isAdminMode ? 'cursor-pointer hover:bg-green-200' : ''}`}
            >
              SI
            </button>
          )}
          {form.languages.includes('ta') && (
            <button
              onClick={() => isAdminMode && onSelectLanguage('ta')}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                isAdminMode && selectedLanguage === 'ta'
                  ? 'bg-orange-500 text-white ring-2 ring-orange-300'
                  : 'bg-orange-100 text-orange-700'
              } ${isAdminMode ? 'cursor-pointer hover:bg-orange-200' : ''}`}
            >
              TA
            </button>
          )}
        </div>
      )}

      {/* Department & Category */}
      <div className="text-[11px] text-[#718096] mb-3">
        <div className="flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          <span>{institution ? getInstitutionLocalizedName(institution, displayLanguage) : form.institutionId}</span>
        </div>
        <span className="text-[#3182CE]">
          {category ? getCategoryLocalizedName(category, displayLanguage) : form.categoryId}
        </span>
      </div>

      {/* Contact Info */}
      <div className="space-y-0.5 mb-3 text-[11px]">
        {phones.map((phone, idx) => (
          <a key={idx} href={`tel:${phone}`} className="flex items-center gap-1.5 text-[#4A5568] hover:text-[#3182CE]">
            <Phone className="w-3 h-3 text-gray-400" />
            <span>{phone}</span>
          </a>
        ))}
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#3182CE] hover:underline"
          >
            <Globe className="w-3 h-3" />
            <span>{website.replace(/^https?:\/\//, '')}</span>
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-[#4A5568] hover:text-[#3182CE]">
            <Mail className="w-3 h-3 text-gray-400" />
            <span>{email}</span>
          </a>
        )}
      </div>

      {/* Address - Full */}
      {address && (
        <div className="flex items-start gap-1.5 text-[11px] text-[#4A5568] mb-3">
          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
          <span className="whitespace-pre-line">{address}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <Link
          to={`/form/${form.id}`}
          className="flex-1 py-2 text-center text-xs font-medium text-[#3182CE] border border-[#3182CE] rounded hover:bg-[#3182CE] hover:text-white transition-colors"
        >
          View Details
        </Link>
        <Link
          to={`/fill/${form.id}`}
          className="flex-1 py-2 text-center text-xs font-medium bg-[#3182CE] text-white rounded hover:bg-[#2C5282] transition-colors"
        >
          Fill Form
        </Link>
      </div>
    </div>
  );
}
