import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Download,
  Star,
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
  DollarSign,
  FileCheck,
  ListChecks,
  ExternalLink,
  Save,
  X,
  Pencil,
  Layers,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { getFormById } from '../data/sampleForms';
import { getFormById as getCustomFormById, updateForm as updateStoredForm, getPhoneNumbers, createContactInfo, type StoredForm } from '../utils/formsStorage';

// Storage key for sample form title overrides
const TITLE_OVERRIDES_KEY = 'forms-lk-title-overrides';

// Get title override for a sample form
function getTitleOverride(formId: string): string | null {
  try {
    const overrides = JSON.parse(localStorage.getItem(TITLE_OVERRIDES_KEY) || '{}');
    return overrides[formId] || null;
  } catch {
    return null;
  }
}

// Save title override for a sample form
function saveTitleOverride(formId: string, title: string): void {
  try {
    const overrides = JSON.parse(localStorage.getItem(TITLE_OVERRIDES_KEY) || '{}');
    overrides[formId] = title;
    localStorage.setItem(TITLE_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    console.error('Failed to save title override');
  }
}

// Check if form exists in localStorage (custom form)
function isStoredForm(formId: string): boolean {
  const customForm = getCustomFormById(formId);
  return customForm !== null;
}

import type { Form } from '../types';

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
    // Contact information
    postAddress: stored.contactInfo?.address,
    officeHours: stored.contactInfo?.officeHours,
    telephoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : undefined,
    faxNumber: stored.contactInfo?.faxNumber,
    email: stored.contactInfo?.email,
    website: stored.contactInfo?.website,
    officialLocation: stored.contactInfo?.officialLocation,
    // Store original PDF data for download
    originalFile: stored.pdfData,
    thumbnail: stored.pdfPages?.[0],
  };
}

const verificationInfo = {
  0: { icon: null, label: 'Unverified', color: 'gray', description: 'This form has not been verified yet.' },
  1: { icon: Check, label: 'Community Verified', color: 'blue', description: 'Verified by 3+ community members.' },
  2: { icon: Shield, label: 'Trusted Verified', color: 'green', description: 'Verified by the forms.lk team.' },
  3: { icon: Award, label: 'Official', color: 'gold', description: 'Endorsed by the official institution.' },
};

// Simulated admin state - in production, this would come from auth context
const useAdminMode = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  return { isAdmin, setIsAdmin };
};

export function FormDetailPage() {
  const { formId } = useParams<{ formId: string }>();

  // Try to find form in sample forms first, then check custom forms
  const form = useMemo(() => {
    // Check sample forms first
    const sampleForm = getFormById(formId || '');
    if (sampleForm) {
      console.log('Found sample form:', formId);
      // Apply title override if exists
      const titleOverride = getTitleOverride(formId || '');
      if (titleOverride) {
        return { ...sampleForm, title: titleOverride };
      }
      return sampleForm;
    }

    // Check custom forms from localStorage
    const customForm = getCustomFormById(formId || '');
    if (customForm) {
      console.log('Found custom form:', formId, customForm);
      return convertStoredToForm(customForm);
    }

    console.log('Form not found:', formId);
    return null;
  }, [formId]);

  const [showPreview, setShowPreview] = useState(false);
  const { isAdmin, setIsAdmin } = useAdminMode();
  const [isEditing, setIsEditing] = useState(false);
  const [editedForm, setEditedForm] = useState<Partial<Form>>({});
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isContactEditing, setIsContactEditing] = useState(false);
  const [editedContact, setEditedContact] = useState({
    postAddress: '',
    telephoneNumbers: ['', '', '', '', ''] as string[],
    faxNumber: '',
    email: '',
    website: '',
    officeHours: '',
  });

  if (!form) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-[#1A202C] mb-4">Form Not Found</h1>
          <p className="text-[#718096] mb-8">The form you're looking for doesn't exist.</p>
          <Link to="/forms">
            <Button variant="primary">Browse Forms</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const verification = verificationInfo[form.verificationLevel];
  const VerificationIcon = verification.icon;

  const startEditing = () => {
    setEditedForm({
      title: form.title,
      description: form.description,
      validationInfo: form.validationInfo || '',
      applicationProcedure: form.applicationProcedure || '',
      postAddress: form.postAddress || '',
      telephoneNumbers: form.telephoneNumbers || [],
      faxNumber: form.faxNumber || '',
      email: form.email || '',
      website: form.website || '',
      officeHours: form.officeHours || '',
      fees: form.fees || '',
      processingTime: form.processingTime || '',
      requiredDocuments: form.requiredDocuments || [],
      releaseDate: form.releaseDate || '',
      officialLocation: form.officialLocation || '',
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    // Save to localStorage for stored forms
    if (isStoredForm(form.id)) {
      const updates: Partial<StoredForm> = {
        title: editedForm.title as string,
        description: editedForm.description as string,
        contactInfo: {
          address: editedForm.postAddress as string,
          phone: (editedForm.telephoneNumbers as string[])?.join(', '),
          email: editedForm.email as string,
          website: editedForm.website as string,
          officialLocation: editedForm.officialLocation as string,
        },
      };
      updateStoredForm(form.id, updates);
      alert('Changes saved successfully!');
      // Reload page to reflect changes
      window.location.reload();
    } else {
      alert('Sample forms cannot be edited. Changes are not saved.');
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedForm({});
  };

  // Title inline editing handlers - works for ALL forms in Admin mode
  const handleTitleDoubleClick = () => {
    if (isAdmin) {
      setEditedTitle(form.title);
      setIsTitleEditing(true);
    }
  };

  const handleTitleBlur = () => {
    if (isTitleEditing && editedTitle.trim() && editedTitle !== form.title) {
      // Check if form exists in localStorage (includes forms without 'custom-' prefix)
      if (isStoredForm(form.id)) {
        // Save title to localStorage for stored forms
        const updates: Partial<StoredForm> = {
          title: editedTitle.trim(),
        };
        updateStoredForm(form.id, updates);
      } else {
        // Save title override for sample forms (not in localStorage)
        saveTitleOverride(form.id, editedTitle.trim());
      }
      window.location.reload();
    }
    setIsTitleEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setIsTitleEditing(false);
      setEditedTitle('');
    }
  };

  // Contact editing handlers
  const startContactEditing = () => {
    // Populate with up to 5 phone numbers
    const phones = form.telephoneNumbers || [];
    const paddedPhones = [...phones, '', '', '', '', ''].slice(0, 5);

    setEditedContact({
      postAddress: form.postAddress || '',
      telephoneNumbers: paddedPhones,
      faxNumber: form.faxNumber || '',
      email: form.email || '',
      website: form.website || '',
      officeHours: form.officeHours || '',
    });
    setIsContactEditing(true);
  };

  const handleContactSave = () => {
    if (isStoredForm(form.id)) {
      const updates: Partial<StoredForm> = {
        contactInfo: createContactInfo({
          address: editedContact.postAddress,
          officeHours: editedContact.officeHours,
          telephoneNumbers: editedContact.telephoneNumbers,
          faxNumber: editedContact.faxNumber,
          email: editedContact.email,
          website: editedContact.website,
          officialLocation: form.officialLocation,
        }),
      };
      updateStoredForm(form.id, updates);
      alert('Contact information saved!');
      window.location.reload();
    } else {
      alert('Sample forms cannot be edited.');
    }
    setIsContactEditing(false);
  };

  const handleContactCancel = () => {
    setIsContactEditing(false);
  };

  const updateContactField = (field: keyof typeof editedContact, value: string | string[]) => {
    setEditedContact(prev => ({ ...prev, [field]: value }));
  };

  const updatePhoneNumber = (index: number, value: string) => {
    const newPhones = [...editedContact.telephoneNumbers];
    newPhones[index] = value;
    setEditedContact(prev => ({ ...prev, telephoneNumbers: newPhones }));
  };

  const updateField = (field: keyof Form, value: unknown) => {
    setEditedForm(prev => ({ ...prev, [field]: value }));
  };

  const displayValue = (field: keyof Form) => {
    if (isEditing && field in editedForm) {
      return editedForm[field as keyof typeof editedForm];
    }
    return form[field];
  };

  // Editable text field component
  const EditableField = ({
    field,
    label,
    icon: Icon,
    multiline = false,
    type = 'text'
  }: {
    field: keyof Form;
    label: string;
    icon?: React.ElementType;
    multiline?: boolean;
    type?: string;
  }) => {
    const value = displayValue(field);
    if (!value && !isEditing) return null;

    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon className="w-4 h-4 text-[#718096]" />}
          <span className="text-sm font-medium text-[#4A5568]">{label}</span>
        </div>
        {isEditing ? (
          multiline ? (
            <textarea
              value={(editedForm[field as keyof typeof editedForm] as string) || ''}
              onChange={(e) => updateField(field, e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          ) : (
            <input
              type={type}
              value={(editedForm[field as keyof typeof editedForm] as string) || ''}
              onChange={(e) => updateField(field, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          )
        ) : (
          <p className="text-sm text-[#4A5568] whitespace-pre-line">{value as string}</p>
        )}
      </div>
    );
  };

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

        {/* Admin Toggle (Demo) */}
        <div className="mb-4 flex items-center justify-end">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            Admin Mode (Demo)
          </label>
        </div>

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
                  onBlur={handleTitleBlur}
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
                  {form.title}
                </h1>
              )}
              <p className="text-[#718096] mb-4">{form.institution}</p>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(form.rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[#1A202C] font-medium">{form.rating.toFixed(1)}</span>
                <span className="text-[#718096] text-sm">({form.ratingCount} reviews)</span>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
              {form.id.startsWith('custom-') ? (
                <>
                  <Link to={`/fill/custom/${form.id}`}>
                    <Button variant="primary" size="lg" icon={<Edit3 className="w-5 h-5" />}>
                      Fill This Form
                    </Button>
                  </Link>
                  <Link to={`/fill/advanced/${form.id}`}>
                    <Button variant="outline" size="lg" icon={<Layers className="w-5 h-5" />}>
                      Fill on PDF
                    </Button>
                  </Link>
                  {form.originalFile?.startsWith('data:') && (
                    <a href={form.originalFile} download={`${form.title}.pdf`}>
                      <Button variant="ghost" size="lg" icon={<Download className="w-5 h-5" />}>
                        Download PDF
                      </Button>
                    </a>
                  )}
                </>
              ) : (
                <>
                  <Link
                    to={
                      form.id === 'form-disaster-relief-25000' ? '/fill/disaster-relief' :
                      form.id === 'form-passport-application' ? '/fill/passport-application' :
                      form.id === 'form-police-clearance-embassy' ? '/fill/police-clearance-embassy' :
                      form.id === 'form-dual-citizenship' ? '/fill/dual-citizenship' :
                      `/fill/${form.id}`
                    }
                  >
                    <Button variant="primary" size="lg" icon={<Edit3 className="w-5 h-5" />}>
                      Fill This Form
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" icon={<Download className="w-5 h-5" />}>
                    Download Empty PDF
                  </Button>
                </>
              )}
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
                  <span className="text-sm text-[#718096]">({form.pages.length} page{form.pages.length !== 1 ? 's' : ''})</span>
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
                  <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1A365D]/5 to-[#3182CE]/5" />
                    <div className="text-center">
                      <FileText className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Form Preview</p>
                      <p className="text-sm text-gray-400">{form.pages.length} page(s)</p>
                      {form.originalFile && (
                        <a
                          href={form.originalFile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Original PDF
                        </a>
                      )}
                    </div>
                  </div>
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
                  <p className="text-[#4A5568]">{form.description}</p>
                )}
              </div>

              {/* Form Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                {/* Original File Location */}
                {form.originalFile && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-[#718096] mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-[#4A5568]">Original Form</span>
                      {form.originalFile.startsWith('data:') ? (
                        <a
                          href={form.originalFile}
                          download={`${form.title}.pdf`}
                          className="text-sm text-[#3182CE] hover:underline flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Download Original PDF
                        </a>
                      ) : (
                        <p className="text-sm text-[#718096]">{form.originalFile}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Official File Location */}
                {(form.officialLocation || isEditing || isAdmin) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#718096] mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-[#4A5568]">Official File Location</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={(editedForm.officialLocation as string) || ''}
                          onChange={(e) => updateField('officialLocation', e.target.value)}
                          placeholder="e.g., https://www.immigration.gov.lk/forms"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm mt-1"
                        />
                      ) : (
                        form.officialLocation ? (
                          form.officialLocation.startsWith('http') ? (
                            <a
                              href={form.officialLocation}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[#3182CE] hover:underline flex items-center gap-1"
                            >
                              {form.officialLocation}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <p className="text-sm text-[#718096]">{form.officialLocation}</p>
                          )
                        ) : (
                          <p className="text-sm text-gray-400 italic">Not specified</p>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Release Date */}
                {(form.releaseDate || isEditing) && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-[#718096] mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-[#4A5568]">Release Date</span>
                      {isEditing ? (
                        <input
                          type="date"
                          value={(editedForm.releaseDate as string) || ''}
                          onChange={(e) => updateField('releaseDate', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm mt-1"
                        />
                      ) : (
                        <p className="text-sm text-[#718096]">
                          {form.releaseDate ? new Date(form.releaseDate).toLocaleDateString() : 'Not specified'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Category */}
                <div className="flex items-start gap-3">
                  <FileCheck className="w-5 h-5 text-[#718096] mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-[#4A5568]">Category</span>
                    <p className="text-sm text-[#718096]">{form.category}</p>
                  </div>
                </div>

                {/* Pages */}
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[#718096] mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-[#4A5568]">Pages</span>
                    <p className="text-sm text-[#718096]">{form.pages.length}</p>
                  </div>
                </div>

                {/* Updated */}
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#718096] mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-[#4A5568]">Last Updated</span>
                    <p className="text-sm text-[#718096]">{new Date(form.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Downloads */}
                <div className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-[#718096] mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-[#4A5568]">Downloads</span>
                    <p className="text-sm text-[#718096]">{form.downloads.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Validation Info */}
              {(form.validationInfo || isEditing) && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <EditableField field="validationInfo" label="Validation Requirements" icon={Shield} multiline />
                </div>
              )}

              {/* Application Procedure */}
              {(form.applicationProcedure || isEditing) && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <EditableField field="applicationProcedure" label="Application Procedure" icon={ListChecks} multiline />
                </div>
              )}

              {/* Fees */}
              {(form.fees || isEditing) && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <EditableField field="fees" label="Application Fees" icon={DollarSign} />
                </div>
              )}

              {/* Processing Time */}
              {(form.processingTime || isEditing) && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <EditableField field="processingTime" label="Processing Time" icon={Clock} />
                </div>
              )}

              {/* Required Documents */}
              {(form.requiredDocuments && form.requiredDocuments.length > 0) || isEditing ? (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="w-4 h-4 text-[#718096]" />
                    <span className="text-sm font-medium text-[#4A5568]">Required Documents</span>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={(editedForm.requiredDocuments as string[])?.join('\n') || ''}
                      onChange={(e) => updateField('requiredDocuments', e.target.value.split('\n').filter(d => d.trim()))}
                      rows={5}
                      placeholder="Enter each document on a new line"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      {form.requiredDocuments?.map((doc, index) => (
                        <li key={index} className="text-sm text-[#4A5568]">{doc}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            {/* Contact Information */}
            {(form.postAddress || form.telephoneNumbers?.length || form.email || form.website || isAdmin || isContactEditing) && (
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
                  {(form.postAddress || isContactEditing || isAdmin) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#718096] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-[#4A5568]">Address</span>
                        {isContactEditing ? (
                          <textarea
                            value={editedContact.postAddress}
                            onChange={(e) => updateContactField('postAddress', e.target.value)}
                            rows={3}
                            placeholder="Enter full address"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mt-1"
                          />
                        ) : form.postAddress ? (
                          <p className="text-sm text-[#718096] whitespace-pre-line">{form.postAddress}</p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Not specified</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Opening Time / Office Hours */}
                  {(form.officeHours || isContactEditing || isAdmin) && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-[#718096] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-[#4A5568]">Opening Time</span>
                        {isContactEditing ? (
                          <input
                            type="text"
                            value={editedContact.officeHours}
                            onChange={(e) => updateContactField('officeHours', e.target.value)}
                            placeholder="e.g., Mon-Fri 8:30 AM - 4:30 PM"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mt-1"
                          />
                        ) : form.officeHours ? (
                          <p className="text-sm text-[#718096]">{form.officeHours}</p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Not specified</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Telephone Numbers - Up to 5 */}
                  {((form.telephoneNumbers && form.telephoneNumbers.length > 0) || isContactEditing || isAdmin) && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-[#718096] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-[#4A5568]">Telephone (up to 5 numbers)</span>
                        {isContactEditing ? (
                          <div className="space-y-2 mt-1">
                            {editedContact.telephoneNumbers.map((phone, index) => (
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
                        ) : form.telephoneNumbers && form.telephoneNumbers.length > 0 ? (
                          <div className="flex flex-col gap-1 mt-1">
                            {form.telephoneNumbers.map((phone, index) => (
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

                  {/* Fax Number */}
                  {(form.faxNumber || isContactEditing || isAdmin) && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-[#718096] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-[#4A5568]">Fax</span>
                        {isContactEditing ? (
                          <input
                            type="text"
                            value={editedContact.faxNumber}
                            onChange={(e) => updateContactField('faxNumber', e.target.value)}
                            placeholder="Enter fax number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mt-1"
                          />
                        ) : form.faxNumber ? (
                          <p className="text-sm text-[#718096]">{form.faxNumber}</p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Not specified</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  {(form.email || isContactEditing || isAdmin) && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-[#718096] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-[#4A5568]">Email</span>
                        {isContactEditing ? (
                          <input
                            type="email"
                            value={editedContact.email}
                            onChange={(e) => updateContactField('email', e.target.value)}
                            placeholder="Enter email address"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mt-1"
                          />
                        ) : form.email ? (
                          <a href={`mailto:${form.email}`} className="text-sm text-blue-600 hover:text-blue-700">
                            {form.email}
                          </a>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Not specified</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Website */}
                  {(form.website || isContactEditing || isAdmin) && (
                    <div className="flex items-start gap-3">
                      <Globe className="w-5 h-5 text-[#718096] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-[#4A5568]">Website</span>
                        {isContactEditing ? (
                          <input
                            type="url"
                            value={editedContact.website}
                            onChange={(e) => updateContactField('website', e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm mt-1"
                          />
                        ) : form.website ? (
                          <a
                            href={form.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                          >
                            {form.website}
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

              <div className={`p-4 rounded-lg bg-${verification.color}-50 border border-${verification.color}-200 mb-4`}
                style={{
                  backgroundColor: verification.color === 'gray' ? '#F7FAFC' :
                    verification.color === 'blue' ? '#EBF8FF' :
                    verification.color === 'green' ? '#F0FFF4' : '#FFFBEB',
                  borderColor: verification.color === 'gray' ? '#E2E8F0' :
                    verification.color === 'blue' ? '#BEE3F8' :
                    verification.color === 'green' ? '#C6F6D5' : '#FDE68A'
                }}
              >
                <div className="flex items-center gap-3">
                  {VerificationIcon && (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center`}
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
                  <div className="text-sm font-medium text-[#1A202C]">Community Contributor</div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#718096]">Downloads</span>
                  <span className="text-sm font-medium text-[#1A202C]">{form.downloads.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#718096]">Last Updated</span>
                  <span className="text-sm font-medium text-[#1A202C]">
                    {new Date(form.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#718096]">Category</span>
                  <span className="text-sm font-medium text-[#1A202C]">{form.category}</span>
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
