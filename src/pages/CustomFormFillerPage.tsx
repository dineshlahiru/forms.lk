import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Printer,
  Save,
  FileText,
  CheckCircle,
  AlertCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { getFormById as getCustomFormById, type FormFieldData } from '../utils/formsStorage';

export function CustomFormFillerPage() {
  const { formId } = useParams<{ formId: string }>();
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean | string[]>>({});
  const [otherValues, setOtherValues] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Load form from localStorage
  const form = useMemo(() => {
    if (!formId) return null;
    return getCustomFormById(formId);
  }, [formId]);

  if (!form) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1A202C] mb-4">Form Not Found</h1>
          <p className="text-[#718096] mb-8">The form you're looking for doesn't exist or has been removed.</p>
          <Link to="/forms">
            <Button variant="primary">Browse Forms</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const pdfPages = form.pdfPages || [];
  const fields = form.fields || [];

  // Get fields for current page
  const currentPageFields = fields.filter(f => f.page === currentPage + 1);

  // Update field value
  const updateField = (fieldId: string, value: string | boolean | string[]) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  // Update "other" text value
  const updateOtherValue = (fieldId: string, value: string) => {
    setOtherValues(prev => ({ ...prev, [fieldId]: value }));
  };

  // Check if option looks like "Other" (case insensitive)
  const isOtherOption = (option: string) => {
    const lowerOption = option.toLowerCase().trim();
    return lowerOption === 'other' ||
           lowerOption === 'others' ||
           lowerOption.startsWith('other ') ||
           lowerOption.includes('specify') ||
           lowerOption.includes('please specify');
  };

  // Check if field has "Other" selected
  const hasOtherSelected = (field: FormFieldData, value: string | boolean | string[] | undefined) => {
    if (field.type === 'radio' || field.type === 'dropdown') {
      return typeof value === 'string' && field.options?.some(opt => isOtherOption(opt) && opt === value);
    }
    if (field.type === 'checkbox' && Array.isArray(value)) {
      return field.options?.some(opt => isOtherOption(opt) && value.includes(opt));
    }
    return false;
  };

  // Check if field is filled
  const isFieldFilled = (field: FormFieldData) => {
    const value = fieldValues[field.id];
    if (value === undefined || value === '' || value === false) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  };

  // Get display value for a field (for print)
  const getFieldDisplayValue = (field: FormFieldData): string => {
    const value = fieldValues[field.id];
    const otherText = otherValues[field.id];

    if (value === undefined || value === '' || value === false) return '';

    if (Array.isArray(value)) {
      const displayValues = value.map(v => {
        if (isOtherOption(v) && otherText) {
          return `${v}: ${otherText}`;
        }
        return v;
      });
      return displayValues.join(', ');
    }

    if (typeof value === 'string' && isOtherOption(value) && otherText) {
      return `${value}: ${otherText}`;
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return String(value);
  };

  // Calculate progress
  const requiredFields = fields.filter(f => f.required);
  const filledRequired = requiredFields.filter(isFieldFilled).length;
  const progress = requiredFields.length > 0
    ? Math.round((filledRequired / requiredFields.length) * 100)
    : 100;

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle save
  const handleSave = () => {
    const savedData = {
      formId: form.id,
      formTitle: form.title,
      values: fieldValues,
      otherValues: otherValues,
      savedAt: new Date().toISOString(),
    };

    // Save to localStorage
    const savedForms = JSON.parse(localStorage.getItem('forms-lk-saved-responses') || '[]');
    savedForms.push(savedData);
    localStorage.setItem('forms-lk-saved-responses', JSON.stringify(savedForms));

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Render field input based on type
  const renderFieldInput = (field: FormFieldData) => {
    const value = fieldValues[field.id];
    const otherText = otherValues[field.id] || '';
    const baseInputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3182CE] focus:border-transparent text-sm";

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => updateField(field.id, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className={baseInputClass}
          />
        );

      case 'paragraph':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => updateField(field.id, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            rows={3}
            className={baseInputClass}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => updateField(field.id, e.target.value)}
            className={baseInputClass}
          />
        );

      case 'checkbox':
        if (field.options && field.options.length > 0) {
          const selectedOptions = (value as string[]) || [];
          const showOtherInput = hasOtherSelected(field, value);
          return (
            <div className="space-y-2">
              {field.options.map((option, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateField(field.id, [...selectedOptions, option]);
                      } else {
                        updateField(field.id, selectedOptions.filter(o => o !== option));
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#3182CE] focus:ring-[#3182CE]"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
              {showOtherInput && (
                <input
                  type="text"
                  value={otherText}
                  onChange={(e) => updateOtherValue(field.id, e.target.value)}
                  placeholder="Please specify..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-2 ml-6 focus:ring-2 focus:ring-[#3182CE]"
                />
              )}
            </div>
          );
        }
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(value as boolean) || false}
              onChange={(e) => updateField(field.id, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#3182CE] focus:ring-[#3182CE]"
            />
            <span className="text-sm text-gray-700">Yes</span>
          </label>
        );

      case 'radio': {
        const showOtherInput = hasOtherSelected(field, value);
        return (
          <div className="space-y-2">
            {(field.options || []).map((option, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={() => updateField(field.id, option)}
                  className="w-4 h-4 border-gray-300 text-[#3182CE] focus:ring-[#3182CE]"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
            {showOtherInput && (
              <input
                type="text"
                value={otherText}
                onChange={(e) => updateOtherValue(field.id, e.target.value)}
                placeholder="Please specify..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-2 ml-6 focus:ring-2 focus:ring-[#3182CE]"
              />
            )}
          </div>
        );
      }

      case 'dropdown': {
        const showOtherInput = hasOtherSelected(field, value);
        return (
          <div className="space-y-2">
            <select
              value={(value as string) || ''}
              onChange={(e) => updateField(field.id, e.target.value)}
              className={baseInputClass}
            >
              <option value="">Select {field.label.toLowerCase()}</option>
              {(field.options || []).map((option, i) => (
                <option key={i} value={option}>{option}</option>
              ))}
            </select>
            {showOtherInput && (
              <input
                type="text"
                value={otherText}
                onChange={(e) => updateOtherValue(field.id, e.target.value)}
                placeholder="Please specify..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3182CE]"
              />
            )}
          </div>
        );
      }

      case 'signature':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 mb-2">Signature field</p>
            <input
              type="text"
              value={(value as string) || ''}
              onChange={(e) => updateField(field.id, e.target.value)}
              placeholder="Type your name as signature"
              className="w-full px-3 py-2 border border-gray-300 rounded text-center italic"
            />
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => updateField(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );
    }
  };

  return (
    <Layout>
      {/* Main UI - Hidden when printing */}
      <div className="min-h-screen bg-gray-100 print:hidden">
        {/* Header */}
        <div className="bg-[#1A365D] text-white sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to={`/form/${formId}`} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-lg font-semibold truncate max-w-md">{form.title}</h1>
                  <p className="text-blue-200 text-sm">{form.institution}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Progress */}
                <div className="hidden md:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                  <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm">{progress}%</span>
                </div>

                {/* Zoom Controls */}
                <div className="hidden md:flex items-center gap-1 bg-white/10 rounded-lg">
                  <button
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                    className="p-2 hover:bg-white/10 rounded-l-lg"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm px-2">{zoom}%</span>
                  <button
                    onClick={() => setZoom(Math.min(150, zoom + 10))}
                    className="p-2 hover:bg-white/10 rounded-r-lg"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                {/* Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={handleSave}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={handlePrint}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
            <CheckCircle className="w-5 h-5" />
            Form saved successfully!
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PDF Preview - Left Side */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Page Navigation */}
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm text-gray-700">
                      Page {currentPage + 1} of {pdfPages.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="p-2 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(pdfPages.length - 1, currentPage + 1))}
                      disabled={currentPage === pdfPages.length - 1}
                      className="p-2 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* PDF Image */}
                <div className="p-4 bg-gray-200 overflow-auto" style={{ maxHeight: '70vh' }}>
                  {pdfPages[currentPage] && (
                    <img
                      src={pdfPages[currentPage]}
                      alt={`Page ${currentPage + 1}`}
                      className="mx-auto shadow-lg rounded"
                      style={{
                        width: `${zoom}%`,
                        maxWidth: 'none',
                      }}
                    />
                  )}
                </div>

                {/* Page Thumbnails */}
                <div className="p-2 bg-gray-50 border-t border-gray-200 flex gap-2 overflow-x-auto">
                  {pdfPages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`flex-shrink-0 w-16 h-20 rounded border-2 overflow-hidden transition-all ${
                        currentPage === i
                          ? 'border-[#3182CE] ring-2 ring-blue-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <img src={img} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Form Fields - Right Side */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 sticky top-24">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-[#1A202C]">
                    Form Fields
                    {currentPageFields.length > 0 && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        (Page {currentPage + 1})
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {filledRequired} of {requiredFields.length} required fields completed
                  </p>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                  {currentPageFields.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No fields on this page</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Navigate to other pages to fill fields
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentPageFields.map((field) => (
                        <div key={field.id} className="space-y-1">
                          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
                            {field.label}
                            {field.required && (
                              <span className="text-red-500">*</span>
                            )}
                            {isFieldFilled(field) && (
                              <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                            )}
                          </label>
                          {field.helpText && (
                            <p className="text-xs text-gray-500">{field.helpText}</p>
                          )}
                          {renderFieldInput(field)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* All Fields Summary */}
                {fields.length > 0 && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">All Fields Summary</h3>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {fields.map((field) => (
                        <div
                          key={field.id}
                          className={`flex items-center justify-between text-xs px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${
                            field.page === currentPage + 1 ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => setCurrentPage(field.page - 1)}
                        >
                          <span className="truncate flex-1">{field.label}</span>
                          <span className="flex items-center gap-1 ml-2">
                            <span className="text-gray-400">P{field.page}</span>
                            {isFieldFilled(field) ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : field.required ? (
                              <AlertCircle className="w-3 h-3 text-amber-500" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-gray-300" />
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only content */}
      <div className="hidden print:block">
        <div className="bg-white p-8" style={{ fontFamily: 'serif' }}>
          {/* Header */}
          <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
            <h1 className="text-2xl font-bold mb-2">{form.title}</h1>
            <p className="text-gray-600">{form.institution}</p>
            <p className="text-sm text-gray-500 mt-2">
              Generated from forms.lk on {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Form Response Summary */}
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4 border-b border-gray-200 pb-2">Form Responses</h2>
            <div className="space-y-4">
              {fields.map((field, index) => {
                const displayValue = getFieldDisplayValue(field);
                return (
                  <div key={field.id} className="flex items-start gap-4">
                    <span className="text-sm font-medium text-gray-600 w-8">{index + 1}.</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </div>
                      <div className="mt-1 border-b border-gray-300 pb-1 min-h-[24px]">
                        {displayValue || <span className="text-gray-400 italic">Not filled</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Signature section */}
          <div className="mt-12 pt-8 border-t-2 border-gray-300">
            <div className="flex justify-between">
              <div>
                <div className="border-b border-black w-48 h-8 mb-2"></div>
                <p className="text-sm">Signature</p>
              </div>
              <div>
                <div className="border-b border-black w-32 h-8 mb-2"></div>
                <p className="text-sm">Date</p>
              </div>
            </div>
          </div>

          {/* Page break before PDF pages */}
          {pdfPages.length > 0 && (
            <div className="break-before-page pt-8">
              <h2 className="text-lg font-bold mb-4 text-center">Original Form Reference</h2>
              {pdfPages.map((pageImg, index) => (
                <div key={index} className={index > 0 ? 'break-before-page pt-4' : ''}>
                  <p className="text-sm text-gray-500 mb-2 text-center">Page {index + 1} of {pdfPages.length}</p>
                  <img
                    src={pageImg}
                    alt={`Form Page ${index + 1}`}
                    className="w-full max-w-full border border-gray-300"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:block {
            display: block !important;
          }

          .break-before-page {
            break-before: page;
          }
        }
      `}</style>
    </Layout>
  );
}
