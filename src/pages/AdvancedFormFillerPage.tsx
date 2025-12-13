import { useState, useRef, useCallback } from 'react';
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
  MousePointer,
  Settings2,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import {
  getFormById as getCustomFormById,
  updateForm,
  type FormFieldData,
  type FieldPosition,
} from '../utils/formsStorage';

type Mode = 'fill' | 'map';

export function AdvancedFormFillerPage() {
  const { formId } = useParams<{ formId: string }>();
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [mode, setMode] = useState<Mode>('fill');
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean | string[]>>({});
  const [otherValues, setOtherValues] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Load form from localStorage
  const [form, setForm] = useState(() => {
    if (!formId) return null;
    return getCustomFormById(formId);
  });

  // Reload form data
  const reloadForm = useCallback(() => {
    if (formId) {
      setForm(getCustomFormById(formId));
    }
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
  const updateFieldValue = (fieldId: string, value: string | boolean | string[]) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  // Update "other" text value
  const updateOtherValue = (fieldId: string, value: string) => {
    setOtherValues(prev => ({ ...prev, [fieldId]: value }));
  };

  // Check if field is filled
  const isFieldFilled = (field: FormFieldData) => {
    const value = fieldValues[field.id];
    if (value === undefined || value === '' || value === false) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  };

  // Get display value for a field
  const getFieldDisplayValue = (field: FormFieldData): string => {
    const value = fieldValues[field.id];
    const otherText = otherValues[field.id];

    if (value === undefined || value === '' || value === false) return '';

    if (Array.isArray(value)) {
      const displayValues = value.map(v => {
        const lowerV = v.toLowerCase();
        if ((lowerV === 'other' || lowerV.includes('specify')) && otherText) {
          return otherText;
        }
        return v;
      });
      return displayValues.join(', ');
    }

    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if ((lowerValue === 'other' || lowerValue.includes('specify')) && otherText) {
        return otherText;
      }
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

    const savedForms = JSON.parse(localStorage.getItem('forms-lk-saved-responses') || '[]');
    savedForms.push(savedData);
    localStorage.setItem('forms-lk-saved-responses', JSON.stringify(savedForms));

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Handle PDF click for mapping mode
  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'map' || !selectedFieldId || !pdfContainerRef.current) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Update field position
    const updatedFields = fields.map(f => {
      if (f.id === selectedFieldId) {
        return {
          ...f,
          position: {
            x,
            y,
            width: f.position?.width || 20,
            height: f.position?.height || 3,
            fontSize: f.position?.fontSize || 12,
            align: f.position?.align || 'left' as const,
          },
        };
      }
      return f;
    });

    // Save to storage
    updateForm(form.id, { fields: updatedFields });
    reloadForm();
  };

  // Handle drag for repositioning
  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    if (mode !== 'map') return;
    e.stopPropagation();
    setSelectedFieldId(fieldId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedFieldId || !pdfContainerRef.current || !dragStart) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    const field = fields.find(f => f.id === selectedFieldId);
    if (!field?.position) return;

    const newX = Math.max(0, Math.min(100, field.position.x + deltaX));
    const newY = Math.max(0, Math.min(100, field.position.y + deltaY));

    const updatedFields = fields.map(f => {
      if (f.id === selectedFieldId && f.position) {
        return { ...f, position: { ...f.position, x: newX, y: newY } };
      }
      return f;
    });

    updateForm(form.id, { fields: updatedFields });
    reloadForm();
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Update field position property
  const updateFieldPosition = (fieldId: string, key: keyof FieldPosition, value: number | string) => {
    const updatedFields = fields.map(f => {
      if (f.id === fieldId && f.position) {
        return { ...f, position: { ...f.position, [key]: value } };
      }
      return f;
    });
    updateForm(form.id, { fields: updatedFields });
    reloadForm();
  };

  // Remove field position
  const removeFieldPosition = (fieldId: string) => {
    const updatedFields = fields.map(f => {
      if (f.id === fieldId) {
        const { position, ...rest } = f;
        return rest as FormFieldData;
      }
      return f;
    });
    updateForm(form.id, { fields: updatedFields });
    reloadForm();
    setSelectedFieldId(null);
  };

  // Check if option looks like "Other"
  const isOtherOption = (option: string) => {
    const lower = option.toLowerCase().trim();
    return lower === 'other' || lower === 'others' || lower.includes('specify');
  };

  // Check if field has "Other" selected
  const hasOtherSelected = (field: FormFieldData) => {
    const value = fieldValues[field.id];
    if (field.type === 'radio' || field.type === 'dropdown') {
      return typeof value === 'string' && field.options?.some(opt => isOtherOption(opt) && opt === value);
    }
    if (field.type === 'checkbox' && Array.isArray(value)) {
      return field.options?.some(opt => isOtherOption(opt) && value.includes(opt));
    }
    return false;
  };

  // Render field input
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
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            className={baseInputClass}
          />
        );

      case 'paragraph':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            rows={2}
            className={baseInputClass}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            className={baseInputClass}
          />
        );

      case 'checkbox':
        if (field.options && field.options.length > 0) {
          const selectedOptions = (value as string[]) || [];
          return (
            <div className="space-y-1">
              {field.options.map((option, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateFieldValue(field.id, [...selectedOptions, option]);
                      } else {
                        updateFieldValue(field.id, selectedOptions.filter(o => o !== option));
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#3182CE]"
                  />
                  <span>{option}</span>
                </label>
              ))}
              {hasOtherSelected(field) && (
                <input
                  type="text"
                  value={otherText}
                  onChange={(e) => updateOtherValue(field.id, e.target.value)}
                  placeholder="Please specify..."
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm ml-6"
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
              onChange={(e) => updateFieldValue(field.id, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#3182CE]"
            />
            <span className="text-sm">Yes</span>
          </label>
        );

      case 'radio': {
        return (
          <div className="space-y-1">
            {(field.options || []).map((option, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name={field.id}
                  checked={value === option}
                  onChange={() => updateFieldValue(field.id, option)}
                  className="w-4 h-4 border-gray-300 text-[#3182CE]"
                />
                <span>{option}</span>
              </label>
            ))}
            {hasOtherSelected(field) && (
              <input
                type="text"
                value={otherText}
                onChange={(e) => updateOtherValue(field.id, e.target.value)}
                placeholder="Please specify..."
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm ml-6"
              />
            )}
          </div>
        );
      }

      case 'dropdown': {
        return (
          <div className="space-y-2">
            <select
              value={(value as string) || ''}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              className={baseInputClass}
            >
              <option value="">Select...</option>
              {(field.options || []).map((option, i) => (
                <option key={i} value={option}>{option}</option>
              ))}
            </select>
            {hasOtherSelected(field) && (
              <input
                type="text"
                value={otherText}
                onChange={(e) => updateOtherValue(field.id, e.target.value)}
                placeholder="Please specify..."
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            )}
          </div>
        );
      }

      case 'signature':
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder="Type signature"
            className={`${baseInputClass} italic text-center`}
          />
        );

      default:
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            className={baseInputClass}
          />
        );
    }
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);

  return (
    <Layout>
      {/* Main UI - Hidden when printing */}
      <div className="min-h-screen bg-gray-100 print:hidden">
        {/* Header */}
        <div className="bg-[#1A365D] text-white sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to={`/form/${formId}`} className="p-2 hover:bg-white/10 rounded-lg">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-lg font-semibold truncate max-w-md">{form.title}</h1>
                  <p className="text-blue-200 text-sm">Fill on PDF</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Mode Toggle */}
                <div className="hidden md:flex items-center bg-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setMode('fill')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      mode === 'fill' ? 'bg-white text-[#1A365D]' : 'hover:bg-white/10'
                    }`}
                  >
                    Fill Mode
                  </button>
                  <button
                    onClick={() => setMode('map')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      mode === 'map' ? 'bg-white text-[#1A365D]' : 'hover:bg-white/10'
                    }`}
                  >
                    Map Fields
                  </button>
                </div>

                {/* Progress (Fill mode) */}
                {mode === 'fill' && (
                  <div className="hidden md:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                    <div className="w-20 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm">{progress}%</span>
                  </div>
                )}

                {/* Zoom */}
                <div className="hidden md:flex items-center gap-1 bg-white/10 rounded-lg">
                  <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-2 hover:bg-white/10">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm px-2">{zoom}%</span>
                  <button onClick={() => setZoom(Math.min(150, zoom + 10))} className="p-2 hover:bg-white/10">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                {/* Overlay Toggle */}
                <button
                  onClick={() => setShowOverlay(!showOverlay)}
                  className="p-2 hover:bg-white/10 rounded-lg"
                  title={showOverlay ? 'Hide overlay' : 'Show overlay'}
                >
                  {showOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

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

        {/* Map Mode Instructions */}
        {mode === 'map' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
            <div className="max-w-7xl mx-auto flex items-center gap-3 text-sm text-amber-800">
              <MousePointer className="w-4 h-4" />
              <span>
                <strong>Map Mode:</strong> Select a field from the right panel, then click on the PDF to place it.
                Drag positioned fields to reposition.
              </span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PDF Preview with Overlay */}
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
                      className="p-2 rounded hover:bg-gray-200 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(pdfPages.length - 1, currentPage + 1))}
                      disabled={currentPage === pdfPages.length - 1}
                      className="p-2 rounded hover:bg-gray-200 disabled:opacity-40"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* PDF with Field Overlays */}
                <div
                  className="p-4 bg-gray-200 overflow-auto"
                  style={{ maxHeight: '70vh' }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div
                    ref={pdfContainerRef}
                    className="relative mx-auto shadow-lg"
                    style={{ width: `${zoom}%`, maxWidth: 'none' }}
                    onClick={handlePdfClick}
                  >
                    {pdfPages[currentPage] && (
                      <img
                        src={pdfPages[currentPage]}
                        alt={`Page ${currentPage + 1}`}
                        className="w-full"
                        draggable={false}
                      />
                    )}

                    {/* Field Overlays */}
                    {showOverlay && currentPageFields.map((field) => {
                      if (!field.position) return null;
                      const displayValue = getFieldDisplayValue(field);
                      const isSelected = selectedFieldId === field.id;

                      return (
                        <div
                          key={field.id}
                          className={`absolute cursor-${mode === 'map' ? 'move' : 'default'} ${
                            mode === 'map'
                              ? isSelected
                                ? 'border-2 border-blue-500 bg-blue-100/50'
                                : 'border border-dashed border-gray-400 bg-gray-100/30 hover:border-blue-400'
                              : ''
                          }`}
                          style={{
                            left: `${field.position.x}%`,
                            top: `${field.position.y}%`,
                            width: `${field.position.width}%`,
                            minHeight: `${field.position.height}%`,
                            fontSize: `${(field.position.fontSize || 12) * (zoom / 100)}px`,
                            textAlign: field.position.align || 'left',
                            fontStyle: field.position.fontStyle || 'normal',
                          }}
                          onMouseDown={(e) => handleMouseDown(e, field.id)}
                          onClick={(e) => {
                            if (mode === 'map') {
                              e.stopPropagation();
                              setSelectedFieldId(field.id);
                            }
                          }}
                        >
                          {mode === 'map' ? (
                            <span className="text-xs text-gray-600 truncate block px-1">
                              {field.label}
                            </span>
                          ) : (
                            <span className="text-black">{displayValue}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Page Thumbnails */}
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
              </div>
            </div>

            {/* Right Panel - Fields */}
            <div className="lg:col-span-1 space-y-4">
              {/* Field Position Editor (Map Mode) */}
              {mode === 'map' && selectedField?.position && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      Position Settings
                    </h3>
                    <button
                      onClick={() => removeFieldPosition(selectedField.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove position"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Width %</label>
                        <input
                          type="number"
                          value={selectedField.position.width}
                          onChange={(e) => updateFieldPosition(selectedField.id, 'width', Number(e.target.value))}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Height %</label>
                        <input
                          type="number"
                          value={selectedField.position.height}
                          onChange={(e) => updateFieldPosition(selectedField.id, 'height', Number(e.target.value))}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Font Size</label>
                        <input
                          type="number"
                          value={selectedField.position.fontSize || 12}
                          onChange={(e) => updateFieldPosition(selectedField.id, 'fontSize', Number(e.target.value))}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Align</label>
                        <select
                          value={selectedField.position.align || 'left'}
                          onChange={(e) => updateFieldPosition(selectedField.id, 'align', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="bg-white rounded-xl border border-gray-200 sticky top-24">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-[#1A202C]">
                    {mode === 'map' ? 'Fields to Map' : 'Form Fields'}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      (Page {currentPage + 1})
                    </span>
                  </h2>
                  {mode === 'fill' && (
                    <p className="text-sm text-gray-500 mt-1">
                      {filledRequired} of {requiredFields.length} required
                    </p>
                  )}
                </div>

                <div className="p-4 max-h-[50vh] overflow-y-auto">
                  {currentPageFields.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No fields on this page</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentPageFields.map((field) => (
                        <div
                          key={field.id}
                          className={`space-y-1 ${
                            mode === 'map' && selectedFieldId === field.id
                              ? 'ring-2 ring-blue-500 rounded-lg p-2 -m-2'
                              : ''
                          }`}
                          onClick={() => mode === 'map' && setSelectedFieldId(field.id)}
                        >
                          <label className="flex items-center gap-1 text-sm font-medium text-gray-700">
                            {mode === 'map' && (
                              <span className={`w-2 h-2 rounded-full ${field.position ? 'bg-green-500' : 'bg-gray-300'}`} />
                            )}
                            {field.label}
                            {field.required && <span className="text-red-500">*</span>}
                            {mode === 'fill' && isFieldFilled(field) && (
                              <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                            )}
                          </label>
                          {mode === 'fill' && renderFieldInput(field)}
                          {mode === 'map' && !field.position && (
                            <p className="text-xs text-gray-400">Click on PDF to place</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* All Fields Summary */}
                {fields.length > 0 && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">All Fields</h3>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {fields.map((field) => (
                        <div
                          key={field.id}
                          className={`flex items-center justify-between text-xs px-2 py-1 rounded cursor-pointer hover:bg-gray-100 ${
                            field.page === currentPage + 1 ? 'bg-blue-50' : ''
                          } ${selectedFieldId === field.id ? 'ring-1 ring-blue-500' : ''}`}
                          onClick={() => {
                            setCurrentPage(field.page - 1);
                            if (mode === 'map') setSelectedFieldId(field.id);
                          }}
                        >
                          <span className="truncate flex-1">{field.label}</span>
                          <span className="flex items-center gap-1 ml-2">
                            <span className="text-gray-400">P{field.page}</span>
                            {mode === 'map' ? (
                              field.position ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-amber-500" />
                              )
                            ) : (
                              isFieldFilled(field) ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : field.required ? (
                                <AlertCircle className="w-3 h-3 text-amber-500" />
                              ) : (
                                <div className="w-3 h-3 rounded-full border border-gray-300" />
                              )
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
        {pdfPages.map((pageImg, pageIndex) => {
          const pageFields = fields.filter(f => f.page === pageIndex + 1 && f.position);
          return (
            <div
              key={pageIndex}
              className={pageIndex > 0 ? 'break-before-page' : ''}
              style={{ position: 'relative', width: '100%' }}
            >
              <img src={pageImg} alt={`Page ${pageIndex + 1}`} className="w-full" />
              {pageFields.map((field) => {
                const displayValue = getFieldDisplayValue(field);
                if (!field.position || !displayValue) return null;
                return (
                  <div
                    key={field.id}
                    style={{
                      position: 'absolute',
                      left: `${field.position.x}%`,
                      top: `${field.position.y}%`,
                      width: `${field.position.width}%`,
                      fontSize: `${field.position.fontSize || 12}px`,
                      textAlign: field.position.align || 'left',
                      fontStyle: field.position.fontStyle || 'normal',
                      color: 'black',
                    }}
                  >
                    {displayValue}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
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
