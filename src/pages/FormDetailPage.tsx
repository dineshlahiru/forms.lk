import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Download,
  Check,
  Shield,
  Award,
  Clock,
  User,
  Flag,
  Edit3,
  ThumbsUp,
  Eye,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  FileCheck,
  ListChecks,
  ExternalLink,
  Save,
  X,
  Pencil,
  Layers,
  Languages,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { useForm, useCategories, useInstitutions } from '../hooks';
import {
  updateForm as updateFormService,
  getFormLocalizedTitle,
  getFormLocalizedDescription,
  getCategoryLocalizedName,
  getInstitutionLocalizedName,
  incrementViewCount,
  getFileAsDataUrl,
} from '../services';
import { useAuth } from '../context/AuthContext';
import type { FirebaseForm, FirebaseCategory, FirebaseInstitution, Language, FormContactInfo } from '../types/firebase';

const LANGUAGES: Record<Language, { label: string; nativeLabel: string }> = {
  en: { label: 'English', nativeLabel: 'English' },
  si: { label: 'Sinhala', nativeLabel: 'සිංහල' },
  ta: { label: 'Tamil', nativeLabel: 'தமிழ்' },
};

const verificationInfo = {
  0: { icon: null, label: 'Unverified', color: 'gray', description: 'This form has not been verified yet.' },
  1: { icon: Check, label: 'Community Verified', color: 'blue', description: 'Verified by 3+ community members.' },
  2: { icon: Shield, label: 'Trusted Verified', color: 'green', description: 'Verified by the forms.lk team.' },
  3: { icon: Award, label: 'Official', color: 'gold', description: 'Endorsed by the official institution.' },
};

export function FormDetailPage() {
  const { formId } = useParams<{ formId: string }>();

  // Firebase hooks
  const { data: form, loading, error, refetch } = useForm(formId);
  const { data: categories } = useCategories();
  const { data: institutions } = useInstitutions();
  const { isAdmin } = useAuth();

  // Language state
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [showPreview, setShowPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedForm, setEditedForm] = useState<Partial<FirebaseForm>>({});
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isContactEditing, setIsContactEditing] = useState(false);
  const [editedContact, setEditedContact] = useState<FormContactInfo>({
    address: '',
    telephoneNumbers: [],
    faxNumber: '',
    email: '',
    website: '',
    officeHours: '',
  });

  // Thumbnail preview state
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [currentPreviewPage, setCurrentPreviewPage] = useState(0);

  // Load thumbnails when form or language changes
  useEffect(() => {
    async function loadThumbnails() {
      if (!form) return;

      setThumbnailLoading(true);
      setThumbnailUrls([]);
      setCurrentPreviewPage(0);

      try {
        // Get thumbnail paths for selected language (fallback to en)
        const thumbPaths = form.thumbnails?.[selectedLanguage] || form.thumbnails?.en || [];

        if (thumbPaths.length > 0) {
          const loadedUrls: string[] = [];
          for (const path of thumbPaths) {
            const dataUrl = await getFileAsDataUrl(path);
            if (dataUrl) {
              loadedUrls.push(dataUrl);
            }
          }
          setThumbnailUrls(loadedUrls);
        }
      } catch (err) {
        console.error('Error loading thumbnails:', err);
      } finally {
        setThumbnailLoading(false);
      }
    }

    if (showPreview) {
      loadThumbnails();
    }
  }, [form, selectedLanguage, showPreview]);

  // Create lookup maps
  const categoryMap = useMemo(() => {
    if (!categories) return new Map<string, FirebaseCategory>();
    return new Map(categories.map(cat => [cat.id, cat]));
  }, [categories]);

  const institutionMap = useMemo(() => {
    if (!institutions) return new Map<string, FirebaseInstitution>();
    return new Map(institutions.map(inst => [inst.id, inst]));
  }, [institutions]);

  // Track view on mount
  useMemo(() => {
    if (formId) {
      incrementViewCount(formId).catch(console.error);
    }
  }, [formId]);

  // Available languages from form
  const availableLanguages = useMemo(() => {
    if (!form) return ['en'] as Language[];
    return form.languages || ['en'] as Language[];
  }, [form]);

  // Get category and institution
  const category = form ? categoryMap.get(form.categoryId) : undefined;
  const institution = form ? institutionMap.get(form.institutionId) : undefined;

  // Title inline editing handlers
  const handleTitleDoubleClick = useCallback(() => {
    if (isAdmin && form) {
      setEditedTitle(getFormLocalizedTitle(form, selectedLanguage));
      setIsTitleEditing(true);
    }
  }, [isAdmin, form, selectedLanguage]);

  const handleTitleSave = useCallback(async () => {
    if (!form || !editedTitle.trim()) {
      setIsTitleEditing(false);
      return;
    }

    try {
      const updates: Record<string, string> = {};
      if (selectedLanguage === 'en') {
        updates.title = editedTitle.trim();
      } else if (selectedLanguage === 'si') {
        updates.titleSi = editedTitle.trim();
      } else if (selectedLanguage === 'ta') {
        updates.titleTa = editedTitle.trim();
      }
      await updateFormService(form.id, updates);
      await refetch();
    } catch (error) {
      console.error('Failed to save title:', error);
    }
    setIsTitleEditing(false);
  }, [form, editedTitle, selectedLanguage, refetch]);

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsTitleEditing(false);
      setEditedTitle('');
    }
  };

  // Start editing form
  const startEditing = useCallback(() => {
    if (!form) return;
    setEditedForm({
      title: form.title,
      titleSi: form.titleSi,
      titleTa: form.titleTa,
      description: form.description,
      descriptionSi: form.descriptionSi,
      descriptionTa: form.descriptionTa,
    });
    setIsEditing(true);
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!form) return;

    try {
      await updateFormService(form.id, editedForm);
      await refetch();
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes');
    }
    setIsEditing(false);
  }, [form, editedForm, refetch]);

  const handleCancel = () => {
    setIsEditing(false);
    setEditedForm({});
  };

  // Contact editing handlers
  const startContactEditing = useCallback(() => {
    if (!form) return;
    const phones = form.contactInfo?.telephoneNumbers || [];
    setEditedContact({
      address: form.contactInfo?.address || '',
      telephoneNumbers: [...phones, '', '', '', '', ''].slice(0, 5),
      faxNumber: form.contactInfo?.faxNumber || '',
      email: form.contactInfo?.email || '',
      website: form.contactInfo?.website || '',
      officeHours: form.contactInfo?.officeHours || '',
      officialLocation: form.contactInfo?.officialLocation || '',
    });
    setIsContactEditing(true);
  }, [form]);

  const handleContactSave = useCallback(async () => {
    if (!form) return;

    try {
      const filteredPhones = editedContact.telephoneNumbers?.filter(p => p.trim()) || [];
      await updateFormService(form.id, {
        contactInfo: {
          ...editedContact,
          telephoneNumbers: filteredPhones,
        },
      });
      await refetch();
      alert('Contact information saved!');
    } catch (error) {
      console.error('Failed to save contact:', error);
      alert('Failed to save contact information');
    }
    setIsContactEditing(false);
  }, [form, editedContact, refetch]);

  const handleContactCancel = () => {
    setIsContactEditing(false);
  };

  const updateContactField = (field: keyof FormContactInfo, value: string | string[]) => {
    setEditedContact(prev => ({ ...prev, [field]: value }));
  };

  const updatePhoneNumber = (index: number, value: string) => {
    const newPhones = [...(editedContact.telephoneNumbers || [])];
    newPhones[index] = value;
    setEditedContact(prev => ({ ...prev, telephoneNumbers: newPhones }));
  };

  const updateField = (field: keyof FirebaseForm, value: unknown) => {
    setEditedForm(prev => ({ ...prev, [field]: value }));
  };

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  // Error or not found state
  if (error || !form) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-[#1A202C] mb-4">Form Not Found</h1>
          <p className="text-[#718096] mb-8">
            {error ? error.message : "The form you're looking for doesn't exist."}
          </p>
          <Link to="/forms">
            <Button variant="primary">Browse Forms</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const verification = verificationInfo[form.verificationLevel];
  const VerificationIcon = verification.icon;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          to="/forms"
          className="inline-flex items-center gap-2 text-[#718096] hover:text-[#1A202C] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Forms
        </Link>

        {/* Header with Title and Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left: Title and Info */}
            <div className="flex-1">
              {isTitleEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyDown}
                  autoFocus
                  className="text-2xl font-bold text-[#1A202C] mb-2 w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
                  placeholder="Form Title"
                />
              ) : isEditing ? (
                <input
                  type="text"
                  value={(editedForm.title as string) || ''}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="text-2xl font-bold text-[#1A202C] mb-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Form Title"
                />
              ) : (
                <h1
                  className={`text-2xl font-bold text-[#1A202C] mb-2 ${isAdmin ? 'cursor-pointer hover:bg-blue-50 hover:px-2 hover:-mx-2 rounded transition-colors' : ''}`}
                  onDoubleClick={handleTitleDoubleClick}
                  title={isAdmin ? 'Double-click to edit' : undefined}
                >
                  {getFormLocalizedTitle(form, selectedLanguage)}
                </h1>
              )}
              <div className="flex items-center justify-between">
                <p className="text-[#718096]">
                  {institution ? getInstitutionLocalizedName(institution, selectedLanguage) : form.institutionId}
                </p>
                {/* Language Selector */}
                {availableLanguages.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-gray-400" />
                    <div className="flex gap-1">
                      {availableLanguages.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setSelectedLanguage(lang)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                            selectedLanguage === lang
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {LANGUAGES[lang]?.nativeLabel || lang}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-sm text-[#718096]">
                  <Download className="w-4 h-4" />
                  <span>{form.downloadCount.toLocaleString()} downloads</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-[#718096]">
                  <Eye className="w-4 h-4" />
                  <span>{form.viewCount.toLocaleString()} views</span>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
              <Link to={`/fill/${form.id}`}>
                <Button variant="primary" size="lg" icon={<Edit3 className="w-5 h-5" />}>
                  Fill This Form
                </Button>
              </Link>
              {form.hasOnlineFill && (
                <Link to={`/fill/advanced/${form.id}`}>
                  <Button variant="outline" size="lg" icon={<Layers className="w-5 h-5" />}>
                    Fill on PDF
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="lg" icon={<Download className="w-5 h-5" />}>
                Download PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Show Preview Toggle */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-[#3182CE]" />
                  <span className="font-medium text-[#1A202C]">Show Preview</span>
                </div>
                {showPreview ? (
                  <ChevronUp className="w-5 h-5 text-[#718096]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#718096]" />
                )}
              </button>

              {/* Collapsible Preview */}
              {showPreview && (
                <div className="border-t border-gray-200">
                  {thumbnailLoading ? (
                    <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                        <p className="text-gray-500">Loading preview...</p>
                      </div>
                    </div>
                  ) : thumbnailUrls.length > 0 ? (
                    <div className="relative">
                      <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={thumbnailUrls[currentPreviewPage]}
                          alt={`Page ${currentPreviewPage + 1}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      {/* Page navigation */}
                      {thumbnailUrls.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 rounded-full px-3 py-1.5 shadow">
                          <button
                            onClick={() => setCurrentPreviewPage(p => Math.max(0, p - 1))}
                            disabled={currentPreviewPage === 0}
                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-sm text-gray-600">
                            {currentPreviewPage + 1} / {thumbnailUrls.length}
                          </span>
                          <button
                            onClick={() => setCurrentPreviewPage(p => Math.min(thumbnailUrls.length - 1, p + 1))}
                            disabled={currentPreviewPage === thumbnailUrls.length - 1}
                            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#1A365D]/5 to-[#3182CE]/5" />
                      <div className="text-center">
                        <FileText className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No preview available</p>
                        <p className="text-sm text-gray-400">
                          {form.pdfVariants?.[selectedLanguage]?.pageCount || 1} page(s)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* About this Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#1A202C]">About this Form</h2>
                {isAdmin && !isEditing && (
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
                {isEditing && (
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                {isEditing ? (
                  <textarea
                    value={(editedForm.description as string) || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-[#4A5568]">
                    {getFormLocalizedDescription(form, selectedLanguage) || 'No description available.'}
                  </p>
                )}
              </div>

              {/* Form Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                {/* Form Number */}
                {form.formNumber && (
                  <div className="flex items-start gap-3">
                    <FileCheck className="w-5 h-5 text-[#718096] mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-[#4A5568]">Form Number</span>
                      <p className="text-sm text-[#718096]">{form.formNumber}</p>
                    </div>
                  </div>
                )}

                {/* Category */}
                <div className="flex items-start gap-3">
                  <FileCheck className="w-5 h-5 text-[#718096] mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-[#4A5568]">Category</span>
                    <p className="text-sm text-[#718096]">
                      {category ? getCategoryLocalizedName(category, selectedLanguage) : form.categoryId}
                    </p>
                  </div>
                </div>

                {/* Pages */}
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[#718096] mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-[#4A5568]">Pages</span>
                    <p className="text-sm text-[#718096]">
                      {form.pdfVariants?.[selectedLanguage]?.pageCount || 1}
                    </p>
                  </div>
                </div>

                {/* Updated */}
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#718096] mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-[#4A5568]">Last Updated</span>
                    <p className="text-sm text-[#718096]">
                      {form.updatedAt.toDate().toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Downloads */}
                <div className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-[#718096] mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-[#4A5568]">Downloads</span>
                    <p className="text-sm text-[#718096]">{form.downloadCount.toLocaleString()}</p>
                  </div>
                </div>

                {/* Published Date */}
                {form.publishedAt && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-[#718096] mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-[#4A5568]">Published</span>
                      <p className="text-sm text-[#718096]">
                        {form.publishedAt.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {form.tags && form.tags.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <ListChecks className="w-4 h-4 text-[#718096]" />
                    <span className="text-sm font-medium text-[#4A5568]">Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Information */}
            {(form.contactInfo?.address || form.contactInfo?.telephoneNumbers?.length || form.contactInfo?.email || form.contactInfo?.website || isAdmin) && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[#1A202C]">Contact Information</h2>
                  {isAdmin && !isContactEditing && (
                    <Button variant="outline" size="sm" onClick={startContactEditing}>
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {isContactEditing && (
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={handleContactSave}>
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleContactCancel}>
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Address */}
                  {(form.contactInfo?.address || isContactEditing) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#718096] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-[#4A5568]">Address</span>
                        {isContactEditing ? (
                          <textarea
                            value={editedContact.address || ''}
                            onChange={(e) => updateContactField('address', e.target.value)}
                            rows={3}
                            placeholder="Enter full address"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mt-1"
                          />
                        ) : (
                          <p className="text-sm text-[#718096] whitespace-pre-line">
                            {form.contactInfo?.address || 'Not specified'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Office Hours */}
                  {(form.contactInfo?.officeHours || isContactEditing) && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-[#718096] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-[#4A5568]">Office Hours</span>
                        {isContactEditing ? (
                          <input
                            type="text"
                            value={editedContact.officeHours || ''}
                            onChange={(e) => updateContactField('officeHours', e.target.value)}
                            placeholder="e.g., Mon-Fri 8:30 AM - 4:30 PM"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mt-1"
                          />
                        ) : (
                          <p className="text-sm text-[#718096]">
                            {form.contactInfo?.officeHours || 'Not specified'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Telephone Numbers */}
                  {((form.contactInfo?.telephoneNumbers && form.contactInfo.telephoneNumbers.length > 0) || isContactEditing) && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-[#718096] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-[#4A5568]">Telephone</span>
                        {isContactEditing ? (
                          <div className="space-y-2 mt-1">
                            {(editedContact.telephoneNumbers || []).map((phone, index) => (
                              <input
                                key={index}
                                type="tel"
                                value={phone}
                                onChange={(e) => updatePhoneNumber(index, e.target.value)}
                                placeholder={`Phone ${index + 1}`}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                            ))}
                          </div>
                        ) : form.contactInfo?.telephoneNumbers && form.contactInfo.telephoneNumbers.length > 0 ? (
                          <div className="flex flex-col gap-1 mt-1">
                            {form.contactInfo.telephoneNumbers.map((phone, index) => (
                              <a
                                key={index}
                                href={`tel:${phone.replace(/\s/g, '')}`}
                                className="text-sm text-blue-600 hover:text-blue-700"
                              >
                                {phone}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Not specified</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  {(form.contactInfo?.email || isContactEditing) && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-[#718096] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-[#4A5568]">Email</span>
                        {isContactEditing ? (
                          <input
                            type="email"
                            value={editedContact.email || ''}
                            onChange={(e) => updateContactField('email', e.target.value)}
                            placeholder="Enter email address"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mt-1"
                          />
                        ) : form.contactInfo?.email ? (
                          <a href={`mailto:${form.contactInfo.email}`} className="text-sm text-blue-600 hover:text-blue-700">
                            {form.contactInfo.email}
                          </a>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Not specified</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Website */}
                  {(form.contactInfo?.website || isContactEditing) && (
                    <div className="flex items-start gap-3">
                      <Globe className="w-5 h-5 text-[#718096] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-[#4A5568]">Website</span>
                        {isContactEditing ? (
                          <input
                            type="url"
                            value={editedContact.website || ''}
                            onChange={(e) => updateContactField('website', e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mt-1"
                          />
                        ) : form.contactInfo?.website ? (
                          <a
                            href={form.contactInfo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                          >
                            {form.contactInfo.website}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Not specified</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Verification Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-[#1A202C] mb-4">Verification Status</h2>

              <div
                className="p-4 rounded-lg mb-4"
                style={{
                  backgroundColor: verification.color === 'gray' ? '#F7FAFC' :
                    verification.color === 'blue' ? '#EBF8FF' :
                    verification.color === 'green' ? '#F0FFF4' : '#FFFBEB',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: verification.color === 'gray' ? '#E2E8F0' :
                    verification.color === 'blue' ? '#BEE3F8' :
                    verification.color === 'green' ? '#C6F6D5' : '#FDE68A'
                }}
              >
                <div className="flex items-center gap-3">
                  {VerificationIcon && (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: verification.color === 'gray' ? '#A0AEC0' :
                          verification.color === 'blue' ? '#3182CE' :
                          verification.color === 'green' ? '#38A169' : '#D69E2E'
                      }}
                    >
                      <VerificationIcon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-[#1A202C]">{verification.label}</div>
                    <div className="text-sm text-[#718096]">{verification.description}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="sm" icon={<ThumbsUp className="w-4 h-4" />}>
                  I Can Verify This
                </Button>
                <Button variant="ghost" size="sm" icon={<Flag className="w-4 h-4" />}>
                  Report Issue
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
              {/* Contributor */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#EBF4FF] rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-[#3182CE]" />
                </div>
                <div>
                  <div className="text-sm text-[#718096]">Created by</div>
                  <div className="text-sm font-medium text-[#1A202C]">
                    {form.createdBy || 'Community Contributor'}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#718096]">Downloads</span>
                  <span className="text-sm font-medium text-[#1A202C]">{form.downloadCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#718096]">Views</span>
                  <span className="text-sm font-medium text-[#1A202C]">{form.viewCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#718096]">Last Updated</span>
                  <span className="text-sm font-medium text-[#1A202C]">
                    {form.updatedAt.toDate().toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#718096]">Category</span>
                  <span className="text-sm font-medium text-[#1A202C]">
                    {category ? getCategoryLocalizedName(category, selectedLanguage) : form.categoryId}
                  </span>
                </div>
                {form.languages && form.languages.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#718096]">Languages</span>
                    <div className="flex gap-1">
                      {form.languages.map((lang) => (
                        <span
                          key={lang}
                          className="px-2 py-0.5 bg-[#3182CE]/10 text-[#3182CE] rounded text-xs font-medium uppercase"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Quick Actions */}
              {isAdmin && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-[#1A202C] mb-3">Admin Actions</h3>
                  <div className="space-y-2">
                    <Link to="/admin">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit in Admin Panel
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
