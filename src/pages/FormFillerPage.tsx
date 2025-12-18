/**
 * FormFillerPage - PDF Fill Mode
 *
 * IMPORTANT: DO NOT CHANGE THIS METHOD WITHOUT USER CONFIRMATION
 *
 * This is the standard form filling experience for all forms (current and future).
 *
 * Behavior:
 * 1. ON LOAD (empty fields): Show dashed border so user knows where to click
 * 2. AFTER TEXT ENTERED: Border becomes invisible, text blends with PDF
 * 3. ON PRINT: All borders/shadows/backgrounds hidden (clean PDF output)
 *
 * This method was approved and should be applied to:
 * - All existing forms
 * - All future new forms
 *
 * @approved 2024 - Do not modify without explicit user confirmation
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Printer,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  CheckCircle,
  Save,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { useForm, useFormFields, useInstitutions } from '../hooks';
import { getFileAsDataUrl, getInstitutionLocalizedName } from '../services';
import type { Language, FieldPosition, FirebaseInstitution } from '../types/firebase';

// Field data for PDF fill mode
interface PdfFieldData {
  id: string;
  type: string;
  label: string;
  page: number;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  position?: Omit<FieldPosition, 'page'>;
}

export function FormFillerPage() {
  const { formId } = useParams<{ formId: string }>();

  // Try loading from Firebase/local database first
  const { data: dbForm, loading: dbLoading } = useForm(formId);
  const { data: dbFields } = useFormFields(formId);
  const { data: institutions } = useInstitutions();

  // Create institution map for lookup
  const institutionMap = useMemo(() => {
    if (!institutions) return new Map<string, FirebaseInstitution>();
    return new Map(institutions.map(inst => [inst.id, inst]));
  }, [institutions]);

  // Get institution for this form
  const institution = dbForm?.institutionId ? institutionMap.get(dbForm.institutionId) : null;

  // State
  const [values, setValues] = useState<Record<string, string | string[] | boolean>>({});
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  // PDF state
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedLanguage] = useState<Language>('en');
  const [showSuccess, setShowSuccess] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Load PDF pages
  useEffect(() => {
    async function loadPdfPages() {
      if (!dbForm) return;

      setPdfLoading(true);
      try {
        // Try to load thumbnails first
        const thumbnails = dbForm.thumbnails?.[selectedLanguage] || dbForm.thumbnails?.en || [];
        if (thumbnails.length > 0) {
          const loadedPages: string[] = [];
          for (const thumbPath of thumbnails) {
            const dataUrl = await getFileAsDataUrl(thumbPath);
            if (dataUrl) {
              loadedPages.push(dataUrl);
            }
          }
          if (loadedPages.length > 0) {
            setPdfPages(loadedPages);
            setPdfLoading(false);
            return;
          }
        }

        // If no thumbnails, try to load PDF directly
        const pdfVariant = dbForm.pdfVariants?.[selectedLanguage] || dbForm.pdfVariants?.en;
        if (pdfVariant?.storagePath) {
          const pdfData = await getFileAsDataUrl(pdfVariant.storagePath);
          if (pdfData) {
            setPdfPages([pdfData]);
          }
        }
      } catch (err) {
        console.error('Error loading PDF pages:', err);
      } finally {
        setPdfLoading(false);
      }
    }

    loadPdfPages();
  }, [dbForm, selectedLanguage]);

  // Convert database fields to PDF field format
  const pdfFields: PdfFieldData[] = useMemo(() => {
    if (!dbFields) return [];
    return dbFields.map(f => ({
      id: f.id,
      type: f.type,
      label: f.label,
      page: f.position?.page || 1,
      required: f.required,
      placeholder: f.placeholder,
      options: f.options,
      position: f.position ? {
        x: f.position.x,
        y: f.position.y,
        width: f.position.width,
        height: f.position.height,
        fontSize: f.position.fontSize,
        align: f.position.align,
      } : undefined,
    }));
  }, [dbFields]);

  // If loading, show loading state
  if (dbLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-[#1A202C] mb-4">Loading Form...</h1>
        </div>
      </Layout>
    );
  }

  // Calculate progress
  const filledCount = useMemo(() => {
    return pdfFields.filter((field) => {
      const value = values[field.id];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'boolean') return value;
      return value && String(value).trim() !== '';
    }).length;
  }, [pdfFields, values]);

  const totalFields = pdfFields.length;
  const progress = totalFields > 0 ? Math.round((filledCount / totalFields) * 100) : 0;

  const handleChange = (fieldId: string, value: string | string[] | boolean) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validateForm = (): boolean => {
    const missingRequired = pdfFields.filter((field) => {
      if (!field.required) return false;
      const value = values[field.id];
      if (!value || (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'string' && value.trim() === '')) {
        return true;
      }
      return false;
    });
    return missingRequired.length === 0;
  };

  const handleSave = () => {
    const savedData = {
      formId: dbForm?.id,
      formTitle: dbForm?.title,
      values: values,
      savedAt: new Date().toISOString(),
    };

    const savedForms = JSON.parse(localStorage.getItem('forms-lk-saved-responses') || '[]');
    savedForms.push(savedData);
    localStorage.setItem('forms-lk-saved-responses', JSON.stringify(savedForms));

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!validateForm()) {
      alert('Please fill all required fields before downloading.');
      return;
    }
    alert('PDF download would be triggered here.');
  };

  if (!dbForm) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1A202C] mb-4">Form Not Found</h1>
          <p className="text-[#718096] mb-8">The form you're looking for doesn't exist.</p>
          <Link to="/forms">
            <Button variant="primary">Browse Forms</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  // Get fields for current PDF page
  const currentPageFields = pdfFields.filter(f => f.page === currentPage + 1);

  // Get display value for a field
  const getDisplayValue = (fieldId: string): string => {
    const value = values[fieldId];
    if (value === undefined || value === '' || value === false) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  /**
   * Render inline overlay input for a field
   *
   * APPROVED BEHAVIOR - DO NOT CHANGE WITHOUT USER CONFIRMATION:
   * - Empty fields: show dashed border (user knows where to click)
   * - Filled fields: hide border (blends with PDF)
   * - On print: all borders hidden (via CSS @media print in index.css)
   */
  const renderOverlayInput = (field: PdfFieldData) => {
    const value = values[field.id];
    const isActive = activeFieldId === field.id;
    const displayValue = getDisplayValue(field.id);
    const fontSize = field.position?.fontSize || 12;
    const hasValue = displayValue !== '';

    // Base styles:
    // - Empty: show dashed border to indicate field
    // - Filled: transparent (blends with PDF)
    // - Active: solid blue border
    const baseStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      background: isActive ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
      border: isActive
        ? '1px solid #3182CE'
        : hasValue
          ? 'none'
          : '1px dashed rgba(49, 130, 206, 0.5)',
      borderRadius: '2px',
      outline: 'none',
      fontSize: `${fontSize * (zoom / 100)}px`,
      textAlign: (field.position?.align as 'left' | 'center' | 'right') || 'left',
      color: '#000',
      padding: '2px 4px',
      cursor: 'text',
      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
    };

    switch (field.type) {
      case 'text':
      case 'textarea':
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onFocus={() => setActiveFieldId(field.id)}
            onBlur={() => setActiveFieldId(null)}
            placeholder={isActive ? field.placeholder || field.label : ''}
            style={baseStyle}
            title={field.label}
          />
        );

      case 'date':
        return (
          <input
            type={isActive ? 'date' : 'text'}
            value={(value as string) || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onFocus={() => setActiveFieldId(field.id)}
            onBlur={() => setActiveFieldId(null)}
            style={baseStyle}
            title={field.label}
          />
        );

      case 'checkbox':
        if (field.options && field.options.length > 0) {
          const selectedOptions = (value as string[]) || [];
          return (
            <div
              style={{
                ...baseStyle,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                alignItems: 'center',
                background: isActive ? 'rgba(255, 255, 255, 0.98)' : 'transparent',
                padding: isActive ? '4px' : '0',
              }}
              onClick={() => setActiveFieldId(field.id)}
              onMouseLeave={() => !isActive && setActiveFieldId(null)}
            >
              {isActive ? (
                field.options.map((option, i) => (
                  <label key={i} className="flex items-center gap-1 cursor-pointer whitespace-nowrap" style={{ fontSize: `${fontSize * (zoom / 100) * 0.9}px` }}>
                    <input
                      type="checkbox"
                      checked={selectedOptions.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleChange(field.id, [...selectedOptions, option.value]);
                        } else {
                          handleChange(field.id, selectedOptions.filter(o => o !== option.value));
                        }
                      }}
                      className="w-3 h-3"
                    />
                    <span>{option.label}</span>
                  </label>
                ))
              ) : (
                <span>{displayValue || '\u00A0'}</span>
              )}
            </div>
          );
        }
        return (
          <label
            className="flex items-center gap-1 cursor-pointer"
            style={baseStyle}
            onClick={() => setActiveFieldId(field.id)}
          >
            <input
              type="checkbox"
              checked={(value as boolean) || false}
              onChange={(e) => handleChange(field.id, e.target.checked)}
              className="w-4 h-4"
            />
            {isActive && <span style={{ fontSize: `${fontSize * (zoom / 100) * 0.9}px` }}>Yes</span>}
          </label>
        );

      case 'radio':
        return (
          <div
            style={{
              ...baseStyle,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              alignItems: 'center',
              background: isActive ? 'rgba(255, 255, 255, 0.98)' : 'transparent',
              padding: isActive ? '4px' : '0',
            }}
            onClick={() => setActiveFieldId(field.id)}
            onMouseLeave={() => !isActive && setActiveFieldId(null)}
          >
            {isActive ? (
              (field.options || []).map((option, i) => (
                <label key={i} className="flex items-center gap-1 cursor-pointer whitespace-nowrap" style={{ fontSize: `${fontSize * (zoom / 100) * 0.9}px` }}>
                  <input
                    type="radio"
                    name={field.id}
                    checked={value === option.value}
                    onChange={() => handleChange(field.id, option.value)}
                    className="w-3 h-3"
                  />
                  <span>{option.label}</span>
                </label>
              ))
            ) : (
              <span>{displayValue || '\u00A0'}</span>
            )}
          </div>
        );

      case 'dropdown':
      case 'select':
        return isActive ? (
          <select
            value={(value as string) || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onFocus={() => setActiveFieldId(field.id)}
            onBlur={() => setActiveFieldId(null)}
            style={{
              ...baseStyle,
              cursor: 'pointer',
            }}
            autoFocus
          >
            <option value="">Select...</option>
            {(field.options || []).map((option, i) => (
              <option key={i} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <div
            style={baseStyle}
            onClick={() => setActiveFieldId(field.id)}
            tabIndex={0}
            onFocus={() => setActiveFieldId(field.id)}
          >
            {displayValue || '\u00A0'}
          </div>
        );

      case 'signature':
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onFocus={() => setActiveFieldId(field.id)}
            onBlur={() => setActiveFieldId(null)}
            placeholder={isActive ? 'Type signature' : ''}
            style={{
              ...baseStyle,
              fontStyle: 'italic',
              fontFamily: 'cursive, serif',
            }}
            title={field.label}
          />
        );

      default:
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            onFocus={() => setActiveFieldId(field.id)}
            onBlur={() => setActiveFieldId(null)}
            style={baseStyle}
            title={field.label}
          />
        );
    }
  };

  return (
    <Layout>
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle className="w-5 h-5" />
          Form saved successfully!
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          to={`/form/${dbForm.id}`}
          className="inline-flex items-center gap-2 text-[#718096] hover:text-[#1A202C] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Form Details
        </Link>

        {/* Form Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1A202C] mb-1">{dbForm.title}</h1>
              {/* Form metadata: Institution, Section, Form Nr, Published Date */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#718096] mt-1">
                {institution && (
                  <span>{getInstitutionLocalizedName(institution, 'en')}</span>
                )}
                {dbForm.section && (
                  <>
                    {institution && <span className="text-gray-300">|</span>}
                    <span>Section: {dbForm.section}</span>
                  </>
                )}
                {dbForm.formNumber && (
                  <>
                    {(institution || dbForm.section) && <span className="text-gray-300">|</span>}
                    <span>Form Nr: {dbForm.formNumber}</span>
                  </>
                )}
                {dbForm.publishDate && (
                  <>
                    {(institution || dbForm.section || dbForm.formNumber) && <span className="text-gray-300">|</span>}
                    <span>Published: {new Date(dbForm.publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </>
                )}
              </div>
              <p className="text-[#718096] text-sm mt-2">Click on fields in the PDF to fill them</p>
            </div>
          </div>

          {/* Progress Bar */}
          {totalFields > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#718096]">Completion Progress</span>
                <span className="font-medium text-[#1A202C]">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3182CE] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-[#718096] mt-2">
                {filledCount} of {totalFields} fields completed
              </p>
            </div>
          )}
        </div>

        {/* PDF Fill Area */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          {/* PDF Controls */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm text-gray-700">
                Page {currentPage + 1} of {pdfPages.length || 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage(Math.min((pdfPages.length || 1) - 1, currentPage + 1))}
                disabled={currentPage === (pdfPages.length || 1) - 1}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-40"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-300 mx-2" />
              <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-2 rounded hover:bg-gray-200">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom(Math.min(150, zoom + 10))} className="p-2 rounded hover:bg-gray-200">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PDF with Inline Editable Fields */}
          <div
            className="p-4 bg-gray-200 overflow-auto"
            style={{ maxHeight: '70vh' }}
            onClick={(e) => {
              // Click outside fields to deactivate
              if (e.target === e.currentTarget) {
                setActiveFieldId(null);
              }
            }}
          >
            {pdfLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : pdfPages.length > 0 ? (
              <div
                ref={pdfContainerRef}
                className="relative mx-auto shadow-lg bg-white"
                style={{ width: `${zoom}%`, maxWidth: 'none' }}
              >
                <img
                  src={pdfPages[currentPage]}
                  alt={`Page ${currentPage + 1}`}
                  className="w-full"
                  draggable={false}
                />

                {/* Editable Field Overlays */}
                {currentPageFields.map((field) => {
                  if (!field.position) return null;

                  return (
                    <div
                      key={field.id}
                      className="absolute pdf-field-overlay"
                      style={{
                        left: `${field.position.x}%`,
                        top: `${field.position.y}%`,
                        width: `${field.position.width}%`,
                        minHeight: `${field.position.height}%`,
                      }}
                    >
                      {renderOverlayInput(field)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-20 text-gray-500">
                <FileText className="w-8 h-8 mr-2" />
                No PDF preview available
              </div>
            )}
          </div>

          {/* Page Thumbnails */}
          {pdfPages.length > 1 && (
            <div className="p-2 bg-gray-50 border-t border-gray-200 flex gap-2 overflow-x-auto">
              {pdfPages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`flex-shrink-0 w-16 h-20 rounded border-2 overflow-hidden ${
                    currentPage === i ? 'border-[#3182CE] ring-2 ring-blue-200' : 'border-gray-300'
                  }`}
                >
                  <img src={img} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 sticky bottom-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={<Save className="w-5 h-5" />}
              onClick={handleSave}
              className="flex-1"
            >
              Save Progress
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon={<Download className="w-5 h-5" />}
              onClick={handleDownload}
              className="flex-1"
            >
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon={<Printer className="w-5 h-5" />}
              onClick={handlePrint}
              className="flex-1"
            >
              Print
            </Button>
          </div>
          <p className="text-xs text-[#718096] text-center mt-3">
            Your progress is automatically saved in your browser.
          </p>
        </div>
      </div>
    </Layout>
  );
}
