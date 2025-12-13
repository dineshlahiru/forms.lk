import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { sampleForms } from '../data/sampleForms';
import { CATEGORIES, VERIFICATION_LEVELS } from '../types';
import type { Form } from '../types';
import { getCustomForms, getPhoneNumbers, formMatchesSearch, getFormTitle, detectSearchLanguage, type StoredForm } from '../utils/formsStorage';
import type { Language } from '../types';

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

// Storage key for sample form title overrides
const TITLE_OVERRIDES_KEY = 'forms-lk-title-overrides';

// Get all title overrides
function getTitleOverrides(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TITLE_OVERRIDES_KEY) || '{}');
  } catch {
    return {};
  }
}

// Convert StoredForm to Form type
function convertStoredToForm(stored: StoredForm): Form {
  // Convert pdfPages (base64 strings) to FormPage objects
  const pages = (stored.pdfPages || []).map((_, index) => ({
    id: `page-${index + 1}`,
    elements: [] as import('../types').FormElement[],
  }));

  // Get phone numbers using helper (handles legacy format)
  const phoneNumbers = getPhoneNumbers(stored.contactInfo);

  return {
    id: stored.id,
    title: stored.title,
    titleSi: stored.titleSi,
    titleTa: stored.titleTa,
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

export function FormsLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'name'>('name');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [customForms, setCustomForms] = useState<Form[]>([]);

  // Load custom forms from localStorage
  useEffect(() => {
    const stored = getCustomForms();
    setCustomForms(stored.map(convertStoredToForm));
  }, []);

  // Combine sample forms with custom forms, applying any title overrides
  const allForms = useMemo(() => {
    const titleOverrides = getTitleOverrides();
    const sampleFormsWithOverrides = sampleForms.map(form => {
      const override = titleOverrides[form.id];
      return override ? { ...form, title: override } : form;
    });
    return [...customForms, ...sampleFormsWithOverrides];
  }, [customForms]);

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
    return allForms
      .filter((form) => {
        // Use multi-language search that checks title, titleSi, titleTa
        const matchesSearch = !searchQuery || formMatchesSearch(form, searchQuery);
        const matchesCategory = selectedCategory === 'All' || form.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') return b.downloads - a.downloads;
        if (sortBy === 'name') {
          // Sort by title in the search language
          const titleA = getFormTitle(a, searchLanguage);
          const titleB = getFormTitle(b, searchLanguage);
          return titleA.localeCompare(titleB);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [allForms, searchQuery, selectedCategory, sortBy, searchLanguage]);

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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A202C] mb-1">Forms Library</h1>
          <p className="text-sm text-[#718096]">
            Browse {allForms.length.toLocaleString()} government forms from various institutions
            {customForms.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                +{customForms.length} custom
              </span>
            )}
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
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
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
            </div>
          </div>
        </div>

        {/* Results Info & Pagination Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 text-sm">
          <div className="text-[#718096]">
            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredForms.length)} of {filteredForms.length.toLocaleString()} forms
            {selectedCategory !== 'All' && <span className="text-[#3182CE]"> in {selectedCategory}</span>}
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
              <ListView forms={paginatedForms} displayLanguage={searchLanguage} />
            ) : (
              <GridView forms={paginatedForms} displayLanguage={searchLanguage} />
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

// Compact List View - optimized for scanning many entries
function ListView({ forms, displayLanguage }: { forms: Form[]; displayLanguage: Language }) {
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
          <ListViewRow key={form.id} form={form} displayLanguage={displayLanguage} />
        ))}
      </div>
    </div>
  );
}

function ListViewRow({ form, displayLanguage }: { form: Form; displayLanguage: Language }) {
  const verification = VERIFICATION_LEVELS[form.verificationLevel];
  const phones = form.telephoneNumbers?.slice(0, 2) || [];
  const address = form.postAddress;
  const website = form.website;
  const email = form.email;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
      {/* Form Name & Department */}
      <div className="col-span-1 md:col-span-4">
        <Link
          to={`/form/${form.id}`}
          className="font-medium text-[#1A202C] hover:text-[#3182CE] transition-colors"
        >
          {getFormTitle(form, displayLanguage)}
        </Link>
        <div className="flex items-center gap-1 mt-1">
          <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="text-[11px] text-[#718096]">{form.institution}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-[#3182CE]">{form.category}</span>
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
function GridView({ forms, displayLanguage }: { forms: Form[]; displayLanguage: Language }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {forms.map((form) => (
        <GridViewCard key={form.id} form={form} displayLanguage={displayLanguage} />
      ))}
    </div>
  );
}

function GridViewCard({ form, displayLanguage }: { form: Form; displayLanguage: Language }) {
  const verification = VERIFICATION_LEVELS[form.verificationLevel];
  const phones = form.telephoneNumbers?.slice(0, 2) || [];
  const website = form.website;
  const email = form.email;
  const address = form.postAddress;

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
      <Link
        to={`/form/${form.id}`}
        className="block font-medium text-[#1A202C] hover:text-[#3182CE] mb-1"
      >
        {getFormTitle(form, displayLanguage)}
      </Link>

      {/* Department & Category */}
      <div className="text-[11px] text-[#718096] mb-3">
        <div className="flex items-center gap-1">
          <Building2 className="w-3 h-3" />
          <span>{form.institution}</span>
        </div>
        <span className="text-[#3182CE]">{form.category}</span>
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
