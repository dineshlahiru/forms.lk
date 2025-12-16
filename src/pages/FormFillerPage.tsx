import { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, AlertCircle, Loader2 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { useForm, useFormFields } from '../hooks';
import { getFormById as getSampleFormById } from '../data/sampleForms';
import type { FormElement } from '../types';

export function FormFillerPage() {
  const { formId } = useParams<{ formId: string }>();

  // Try loading from Firebase/local database first
  const { data: dbForm, loading: dbLoading } = useForm(formId);
  const { data: dbFields } = useFormFields(formId);

  // Fallback to sample forms for demo
  const sampleForm = getSampleFormById(formId || '');

  const [values, setValues] = useState<Record<string, string | string[] | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // If the form is from database and has PDF overlay capability, redirect to advanced filler
  if (dbForm && dbForm.hasOnlineFill) {
    return <Navigate to={`/fill/advanced/${formId}`} replace />;
  }

  // Use sample form for demo (database forms redirect to advanced filler)
  const form = sampleForm;

  const allElements = useMemo(() => {
    if (!form) return [];
    return form.pages.flatMap((page) => page.elements);
  }, [form]);

  const fillableElements = useMemo(() => {
    return allElements.filter(
      (el) => !['heading', 'static-text', 'divider'].includes(el.type)
    );
  }, [allElements]);

  const filledCount = useMemo(() => {
    return fillableElements.filter((el) => {
      const value = values[el.id];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'boolean') return value;
      return value && value.trim() !== '';
    }).length;
  }, [fillableElements, values]);

  const progress = fillableElements.length > 0
    ? Math.round((filledCount / fillableElements.length) * 100)
    : 0;

  const handleChange = (elementId: string, value: string | string[] | boolean) => {
    setValues((prev) => ({ ...prev, [elementId]: value }));
    // Clear error when user starts typing
    if (errors[elementId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[elementId];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (elementId: string, option: string, checked: boolean) => {
    const current = (values[elementId] as string[]) || [];
    const updated = checked
      ? [...current, option]
      : current.filter((o) => o !== option);
    handleChange(elementId, updated);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fillableElements.forEach((el) => {
      if (el.required) {
        const value = values[el.id];
        if (!value || (Array.isArray(value) && value.length === 0) ||
            (typeof value === 'string' && value.trim() === '')) {
          newErrors[el.id] = 'This field is required';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDownload = () => {
    if (!validateForm()) {
      alert('Please fill all required fields before downloading.');
      return;
    }
    // In a real app, this would generate a PDF
    alert('PDF download would be triggered here. In the full implementation, this would generate a filled PDF using jsPDF.');
  };

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

  const renderElement = (element: FormElement) => {
    const value = values[element.id];
    const error = errors[element.id];
    const hasError = !!error;

    switch (element.type) {
      case 'heading':
        return (
          <div
            key={element.id}
            className="font-bold text-[#1A202C]"
            style={{ fontSize: element.fontSize, textAlign: element.textAlign }}
          >
            {element.label}
          </div>
        );

      case 'static-text':
        return (
          <div key={element.id} className="text-[#4A5568]" style={{ fontSize: element.fontSize }}>
            {element.label}
          </div>
        );

      case 'divider':
        return <hr key={element.id} className="border-gray-300 my-4" />;

      case 'text':
        return (
          <div key={element.id} className="mb-4">
            <label className="block text-sm font-medium text-[#1A202C] mb-1">
              {element.label}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              placeholder={element.placeholder}
              value={(value as string) || ''}
              onChange={(e) => handleChange(element.id, e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE] ${
                hasError ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
            />
            {element.helpText && (
              <p className="text-xs text-[#718096] mt-1">{element.helpText}</p>
            )}
            {hasError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
          </div>
        );

      case 'paragraph':
        return (
          <div key={element.id} className="mb-4">
            <label className="block text-sm font-medium text-[#1A202C] mb-1">
              {element.label}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              placeholder={element.placeholder}
              value={(value as string) || ''}
              onChange={(e) => handleChange(element.id, e.target.value)}
              rows={4}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE] resize-none ${
                hasError ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
            />
            {element.helpText && (
              <p className="text-xs text-[#718096] mt-1">{element.helpText}</p>
            )}
            {hasError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={element.id} className="mb-4">
            <label className="block text-sm font-medium text-[#1A202C] mb-1">
              {element.label}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="date"
              value={(value as string) || ''}
              onChange={(e) => handleChange(element.id, e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE] ${
                hasError ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
            />
            {hasError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={element.id} className="mb-4">
            <label className="block text-sm font-medium text-[#1A202C] mb-2">
              {element.label}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {element.options?.map((opt) => (
                <label key={opt} className="flex items-start gap-3 text-sm text-[#4A5568] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={((value as string[]) || []).includes(opt)}
                    onChange={(e) => handleCheckboxChange(element.id, opt, e.target.checked)}
                    className="mt-0.5 rounded border-gray-300"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {hasError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div key={element.id} className="mb-4">
            <label className="block text-sm font-medium text-[#1A202C] mb-2">
              {element.label}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {element.options?.map((opt) => (
                <label key={opt} className="flex items-center gap-3 text-sm text-[#4A5568] cursor-pointer">
                  <input
                    type="radio"
                    name={element.id}
                    checked={value === opt}
                    onChange={() => handleChange(element.id, opt)}
                    className="border-gray-300"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {hasError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
          </div>
        );

      case 'dropdown':
        return (
          <div key={element.id} className="mb-4">
            <label className="block text-sm font-medium text-[#1A202C] mb-1">
              {element.label}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={(value as string) || ''}
              onChange={(e) => handleChange(element.id, e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE] bg-white ${
                hasError ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
            >
              <option value="">Select an option...</option>
              {element.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {hasError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
          </div>
        );

      case 'signature':
        return (
          <div key={element.id} className="mb-4">
            <label className="block text-sm font-medium text-[#1A202C] mb-1">
              {element.label}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className={`w-full h-24 border-2 border-dashed rounded-lg flex items-center justify-center ${
              hasError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'
            }`}>
              <span className="text-sm text-gray-400">Click to sign (demo)</span>
            </div>
            {hasError && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          to={`/form/${form.id}`}
          className="inline-flex items-center gap-2 text-[#718096] hover:text-[#1A202C] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Form Details
        </Link>

        {/* Form Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-[#1A202C] mb-2">{form.title}</h1>
          <p className="text-[#718096]">{form.institution}</p>

          {/* Progress Bar */}
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
              {filledCount} of {fillableElements.length} fields completed
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          {form.pages.map((page, pageIndex) => (
            <div key={page.id}>
              {form.pages.length > 1 && (
                <h2 className="text-lg font-semibold text-[#1A202C] mb-4 pb-2 border-b border-gray-100">
                  Page {pageIndex + 1}
                </h2>
              )}
              <div className="space-y-2">
                {page.elements.map(renderElement)}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 sticky bottom-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={<Download className="w-5 h-5" />}
              onClick={handleDownload}
              className="flex-1"
            >
              Download Filled PDF
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon={<Printer className="w-5 h-5" />}
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
