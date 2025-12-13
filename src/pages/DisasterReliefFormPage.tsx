import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Printer,
  Globe,
  FileText,
  Eye,
  EyeOff,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { disasterFormLabels, type DisasterFormData } from '../data/sampleForms';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Language = 'en' | 'si' | 'ta';

const STORAGE_KEY = 'forms-lk-disaster-relief-form';

const languageNames: Record<Language, string> = {
  en: 'English',
  si: 'සිංහල',
  ta: 'தமிழ்',
};

const initialFormData: DisasterFormData = {
  division: '',
  gramaNiladhariDivision: '',
  headOfHouseholdName: '',
  addressLine1: '',
  addressLine2: '',
  identityCardNumber: '',
  phoneNumber: '',
  disasterType: '',
  floodSubmerged: { house: false, kitchen: false },
  disasterAffectedDays: '',
  bankName: '',
  bankBranch: '',
  accountNumber: '',
  houseOwnership: '',
  signatureDate: '',
};

export function DisasterReliefFormPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [formData, setFormData] = useState<DisasterFormData>(initialFormData);
  const [showPreview, setShowPreview] = useState(false);
  const [showOriginalForm, setShowOriginalForm] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const labels = disasterFormLabels[language];

  // Load saved data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed.formData || initialFormData);
        setLanguage(parsed.language || 'en');
        setLastSaved(parsed.savedAt || null);
      } catch (e) {
        console.error('Failed to load saved form data:', e);
      }
    }
  }, []);

  // Auto-save to localStorage when form data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const dataToSave = {
        formData,
        language,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setLastSaved(dataToSave.savedAt);
    }, 500); // Debounce save by 500ms

    return () => clearTimeout(timeoutId);
  }, [formData, language]);

  const handleInputChange = (field: keyof DisasterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field: 'house' | 'kitchen', checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      floodSubmerged: { ...prev.floodSubmerged, [field]: checked },
    }));
  };

  const handleClearForm = () => {
    if (window.confirm('Are you sure you want to clear all form data? This cannot be undone.')) {
      setFormData(initialFormData);
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
    }
  };

  const generatePDF = async () => {
    if (!printRef.current) return;

    // Temporarily show the preview for capturing
    const wasHidden = !showPreview;
    if (wasHidden) {
      setShowPreview(true);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 5;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(`disaster-relief-form-${language}.pdf`);

    if (wasHidden) {
      setShowPreview(false);
    }
  };

  const handlePrint = () => {
    // Show preview before printing
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Calculate progress
  const filledFields = [
    formData.division,
    formData.gramaNiladhariDivision,
    formData.headOfHouseholdName,
    formData.addressLine1,
    formData.identityCardNumber,
    formData.phoneNumber,
    formData.disasterType,
    formData.disasterAffectedDays,
    formData.houseOwnership,
    formData.signatureDate,
  ].filter(Boolean).length;
  const totalRequiredFields = 10;
  const progress = Math.round((filledFields / totalRequiredFields) * 100);

  const formatLastSaved = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:hidden">
        {/* Back Link */}
        <Link
          to="/forms"
          className="inline-flex items-center gap-2 text-[#718096] hover:text-[#1A202C] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Forms
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1A202C] mb-2">
                National Disaster Relief Application
              </h1>
              <p className="text-[#718096]">Rs. 25,000 Grant - 2025 Ditwah Cyclone & Floods</p>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#718096]" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
              >
                <option value="en">English</option>
                <option value="si">සිංහල (Sinhala)</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>
            </div>
          </div>

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
          </div>

          {/* Auto-save indicator */}
          {lastSaved && (
            <div className="mt-4 flex items-center gap-2 text-xs text-green-600">
              <Save className="w-3 h-3" />
              <span>Auto-saved: {formatLastSaved(lastSaved)}</span>
            </div>
          )}
        </div>

        {/* Show Original Form Preview */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <button
            onClick={() => setShowOriginalForm(!showOriginalForm)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-[#3182CE]" />
              <span className="font-medium text-[#1A202C]">Show Original Form</span>
              <span className="text-sm text-[#718096]">({languageNames[language]})</span>
            </div>
            {showOriginalForm ? (
              <ChevronUp className="w-5 h-5 text-[#718096]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#718096]" />
            )}
          </button>

          {showOriginalForm && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="aspect-[4/3] bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-2">Original Form Preview</p>
                  <p className="text-sm text-gray-500 mb-4">
                    National Disaster Relief Application - Rs. 25,000
                  </p>
                  <p className="text-xs text-gray-400">
                    2 pages • {languageNames[language]} version
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Toggle Preview & Clear */}
        <div className="mb-4 flex justify-between">
          <button
            onClick={handleClearForm}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Clear Form
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 text-sm text-[#3182CE] hover:text-[#2B6CB0]"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>

        {/* Form / Preview Container */}
        <div className={showPreview ? 'hidden' : 'block'}>
          {/* Fillable Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#1A202C] mb-6 pb-4 border-b border-gray-100">
              {labels.title}
            </h2>

            {/* Division Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#1A202C] mb-1">
                  {labels.division} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.division}
                  onChange={(e) => handleInputChange('division', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A202C] mb-1">
                  {labels.gramaNiladhariDivision} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.gramaNiladhariDivision}
                  onChange={(e) => handleInputChange('gramaNiladhariDivision', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                />
              </div>
            </div>

            {/* 1. Name of head of household */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1A202C] mb-1">
                1. {labels.headOfHouseholdName} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.headOfHouseholdName}
                onChange={(e) => handleInputChange('headOfHouseholdName', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
              />
            </div>

            {/* 2. Address */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1A202C] mb-1">
                2. {labels.address} <span className="text-xs text-[#718096]">{labels.addressNote}</span> <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                placeholder="Address Line 1"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE] mb-2"
              />
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                placeholder="Address Line 2"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
              />
            </div>

            {/* 3. Identity Card Number */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1A202C] mb-1">
                3. {labels.identityCardNumber} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.identityCardNumber}
                onChange={(e) => handleInputChange('identityCardNumber', e.target.value)}
                maxLength={12}
                placeholder="Enter NIC number"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE] font-mono tracking-wider"
              />
            </div>

            {/* 4. Phone Number */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1A202C] mb-1">
                4. {labels.phoneNumber} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                maxLength={10}
                placeholder="Enter phone number"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE] font-mono tracking-wider"
              />
            </div>

            {/* 5. Disaster Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1A202C] mb-2">
                5. {labels.disaster} <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-4">
                {(['flood', 'landslide', 'cyclone', 'other'] as const).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="disasterType"
                      checked={formData.disasterType === type}
                      onChange={() => handleInputChange('disasterType', type)}
                      className="w-4 h-4 text-[#3182CE]"
                    />
                    <span className="text-sm text-[#4A5568]">{labels[type]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 6. Flood Submerged */}
            {formData.disasterType === 'flood' && (
              <div className="mb-4 pl-4 border-l-2 border-blue-200 bg-blue-50/50 p-4 rounded-r-lg">
                <label className="block text-sm font-medium text-[#1A202C] mb-2">
                  6. {labels.floodSubmerged}
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.floodSubmerged.house}
                      onChange={(e) => handleCheckboxChange('house', e.target.checked)}
                      className="w-4 h-4 text-[#3182CE] rounded"
                    />
                    <span className="text-sm text-[#4A5568]">{labels.house}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.floodSubmerged.kitchen}
                      onChange={(e) => handleCheckboxChange('kitchen', e.target.checked)}
                      className="w-4 h-4 text-[#3182CE] rounded"
                    />
                    <span className="text-sm text-[#4A5568]">{labels.kitchen}</span>
                  </label>
                </div>
              </div>
            )}

            {/* 7. Disaster Affected Days */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1A202C] mb-1">
                7. {labels.disasterAffectedDays} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.disasterAffectedDays}
                onChange={(e) => handleInputChange('disasterAffectedDays', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
              />
            </div>

            {/* 8. Bank Details */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#1A202C] mb-2">
                8. {labels.bankInfo}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#718096] mb-1">{labels.bankName}</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#718096] mb-1">{labels.branch}</label>
                  <input
                    type="text"
                    value={formData.bankBranch}
                    onChange={(e) => handleInputChange('bankBranch', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-xs text-[#718096] mb-1">{labels.accountNumber}</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE] font-mono"
                />
              </div>
            </div>

            {/* 9. House Ownership */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#1A202C] mb-2">
                9. {labels.houseOwnership} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(['owner', 'rent', 'estates', 'unauthorized', 'other'] as const).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="houseOwnership"
                      checked={formData.houseOwnership === type}
                      onChange={() => handleInputChange('houseOwnership', type)}
                      className="w-4 h-4 text-[#3182CE]"
                    />
                    <span className="text-sm text-[#4A5568]">{labels[type]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Certification */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-[#4A5568] italic">{labels.certification}</p>
            </div>

            {/* Signature and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-[#1A202C] mb-1">
                  {labels.signature}
                </label>
                <div className="w-full h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <span className="text-sm text-gray-400">Signature area (print and sign)</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A202C] mb-1">
                  {labels.date} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.signatureDate}
                  onChange={(e) => handleInputChange('signatureDate', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                />
              </div>
            </div>

            {/* Page 2 Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">{labels.officeUseOnly}</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Page 2 contains sections for committee approval and Divisional Secretary approval.
                    These sections will be included in the PDF but are read-only as they are meant for official use.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Print Preview (visible in UI when toggled) */}
        <div className={showPreview ? 'block' : 'hidden'}>
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 overflow-x-auto">
            <div ref={printRef} id="print-content" className="bg-white p-8 min-w-[210mm]" style={{ fontFamily: 'serif' }}>
              {/* Page 1 */}
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold mb-2">{labels.title}</h1>
                <p className="text-sm">
                  {labels.subtitle} ............................
                </p>
                <p className="text-sm">{labels.subtitle2}</p>
              </div>

              {/* Division row */}
              <div className="flex gap-8 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{labels.division}</span>
                  <div className="border-b border-black px-4 min-w-[150px]">{formData.division}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{labels.gramaNiladhariDivision}</span>
                  <div className="border-b border-black px-4 min-w-[150px]">{formData.gramaNiladhariDivision}</div>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span>1. {labels.headOfHouseholdName} -</span>
                  <div className="flex-1 border-b border-black px-2">{formData.headOfHouseholdName}</div>
                </div>

                <div>
                  <div className="flex items-start gap-2">
                    <span>2. {labels.address}</span>
                    <span className="text-xs text-gray-500">{labels.addressNote}</span>
                    <span>-</span>
                  </div>
                  <div className="ml-4 border-b border-black px-2 mt-1">{formData.addressLine1}</div>
                  <div className="ml-4 border-b border-black px-2 mt-1">{formData.addressLine2}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span>3. {labels.identityCardNumber} -</span>
                  <div className="flex gap-0.5">
                    {formData.identityCardNumber.padEnd(12, ' ').split('').slice(0, 12).map((char, i) => (
                      <div key={i} className="w-6 h-6 border border-black flex items-center justify-center text-xs">
                        {char !== ' ' ? char : ''}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span>4. {labels.phoneNumber} -</span>
                  <div className="flex gap-0.5">
                    {formData.phoneNumber.padEnd(10, ' ').split('').slice(0, 10).map((char, i) => (
                      <div key={i} className="w-6 h-6 border border-black flex items-center justify-center text-xs">
                        {char !== ' ' ? char : ''}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span>5. {labels.disaster} -</span>
                  {(['flood', 'landslide', 'cyclone', 'other'] as const).map((type) => (
                    <div key={type} className="flex items-center gap-1">
                      <div className="w-5 h-5 border border-black flex items-center justify-center">
                        {formData.disasterType === type ? '✓' : ''}
                      </div>
                      <span>{labels[type]}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <span>6. {labels.floodSubmerged} -</span>
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 border border-black flex items-center justify-center">
                      {formData.floodSubmerged.house ? '✓' : ''}
                    </div>
                    <span>{labels.house}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 border border-black flex items-center justify-center">
                      {formData.floodSubmerged.kitchen ? '✓' : ''}
                    </div>
                    <span>{labels.kitchen}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span>7. {labels.disasterAffectedDays}</span>
                  <div className="border-b border-black px-4 min-w-[200px]">{formData.disasterAffectedDays}</div>
                </div>

                <div>
                  <p>8. {labels.bankInfo}</p>
                  <div className="flex gap-8 mt-2 ml-4">
                    <div className="flex items-center gap-2">
                      <span>{labels.bankName} -</span>
                      <div className="border-b border-black px-4 min-w-[150px]">{formData.bankName}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{labels.branch} -</span>
                      <div className="border-b border-black px-4 min-w-[150px]">{formData.bankBranch}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 ml-4">
                    <span>{labels.accountNumber} -</span>
                    <div className="border-b border-black px-4 min-w-[200px]">{formData.accountNumber}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span>9. {labels.houseOwnership} -</span>
                  {(['owner', 'rent', 'estates', 'unauthorized', 'other'] as const).map((type) => (
                    <div key={type} className="flex items-center gap-1">
                      <div className="w-5 h-5 border border-black flex items-center justify-center">
                        {formData.houseOwnership === type ? '✓' : ''}
                      </div>
                      <span>{labels[type]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certification */}
              <div className="mt-8">
                <p className="text-sm italic">{labels.certification}</p>
                <div className="flex justify-between mt-6">
                  <div className="flex items-end gap-2">
                    <span className="text-sm">{labels.signature} -</span>
                    <div className="border-b border-black w-48 h-8"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{labels.date} -</span>
                    <div className="border-b border-black px-4 min-w-[120px]">{formData.signatureDate}</div>
                  </div>
                </div>
              </div>

              {/* Page 2 - Office Use Only */}
              <div className="mt-12 pt-8 border-t-2 border-gray-400">
                <p className="text-center text-sm font-medium text-gray-500 mb-4">{labels.officeUseOnly}</p>
                <div className="text-sm text-gray-400 space-y-4">
                  <p className="font-medium">10. {labels.committeeApproval}</p>
                  <p className="text-xs italic">
                    I hereby certify that the above information is true and that Mr./Ms. ...........................
                    mentioned above resides at the above address. Due to the disaster situation, his/her house has been
                    affected, and I recommend/do not recommend that the grant of Rs. 25,000.00 provided for the restoration
                    of the house be given to him/her.
                  </p>
                  <div className="border border-gray-300 rounded p-4 bg-gray-50">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left p-2">Committee member's name</th>
                          <th className="text-left p-2">Position</th>
                          <th className="text-left p-2">Signature and official seal</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="p-2">................................</td>
                          <td className="p-2">Grama Niladhari</td>
                          <td className="p-2">................................</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="p-2">................................</td>
                          <td className="p-2">Disaster Relief Services Officer</td>
                          <td className="p-2">................................</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="p-2">................................</td>
                          <td className="p-2">Economic Development Officer</td>
                          <td className="p-2">................................</td>
                        </tr>
                        <tr>
                          <td className="p-2">................................</td>
                          <td className="p-2">Samurdhi Officer</td>
                          <td className="p-2">................................</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4">
                    <p className="font-medium">11. For approval by the Divisional Secretary</p>
                    <p className="text-xs italic mt-2">
                      I approve/disapprove the payment of Rs. 25,000.00 allowance based on the recommendation of the
                      committee members for the houses damaged/affected by the disaster that occurred on .....................
                    </p>
                    <div className="flex justify-between mt-4">
                      <div>
                        <div className="border-b border-gray-300 w-48 h-8"></div>
                        <p className="text-xs mt-1">Signature and official seal of the Divisional Secretary</p>
                      </div>
                      <div>
                        <div className="border-b border-gray-300 w-32 h-8"></div>
                        <p className="text-xs mt-1">Date</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 sticky bottom-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={<Download className="w-5 h-5" />}
              onClick={generatePDF}
              className="flex-1"
            >
              Download PDF ({languageNames[language]})
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

      {/* Print-only content */}
      <div className="hidden print:block">
        <div className="bg-white p-8" style={{ fontFamily: 'serif' }}>
          {/* Page 1 */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold mb-2">{labels.title}</h1>
            <p className="text-sm">
              {labels.subtitle} ............................
            </p>
            <p className="text-sm">{labels.subtitle2}</p>
          </div>

          {/* Division row */}
          <div className="flex gap-8 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">{labels.division}</span>
              <div className="border-b border-black px-4 min-w-[150px]">{formData.division}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">{labels.gramaNiladhariDivision}</span>
              <div className="border-b border-black px-4 min-w-[150px]">{formData.gramaNiladhariDivision}</div>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span>1. {labels.headOfHouseholdName} -</span>
              <div className="flex-1 border-b border-black px-2">{formData.headOfHouseholdName}</div>
            </div>

            <div>
              <div className="flex items-start gap-2">
                <span>2. {labels.address}</span>
                <span className="text-xs text-gray-500">{labels.addressNote}</span>
                <span>-</span>
              </div>
              <div className="ml-4 border-b border-black px-2 mt-1">{formData.addressLine1}</div>
              <div className="ml-4 border-b border-black px-2 mt-1">{formData.addressLine2}</div>
            </div>

            <div className="flex items-center gap-2">
              <span>3. {labels.identityCardNumber} -</span>
              <div className="flex gap-0.5">
                {formData.identityCardNumber.padEnd(12, ' ').split('').slice(0, 12).map((char, i) => (
                  <div key={i} className="w-6 h-6 border border-black flex items-center justify-center text-xs">
                    {char !== ' ' ? char : ''}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span>4. {labels.phoneNumber} -</span>
              <div className="flex gap-0.5">
                {formData.phoneNumber.padEnd(10, ' ').split('').slice(0, 10).map((char, i) => (
                  <div key={i} className="w-6 h-6 border border-black flex items-center justify-center text-xs">
                    {char !== ' ' ? char : ''}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span>5. {labels.disaster} -</span>
              {(['flood', 'landslide', 'cyclone', 'other'] as const).map((type) => (
                <div key={type} className="flex items-center gap-1">
                  <div className="w-5 h-5 border border-black flex items-center justify-center">
                    {formData.disasterType === type ? '✓' : ''}
                  </div>
                  <span>{labels[type]}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <span>6. {labels.floodSubmerged} -</span>
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 border border-black flex items-center justify-center">
                  {formData.floodSubmerged.house ? '✓' : ''}
                </div>
                <span>{labels.house}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 border border-black flex items-center justify-center">
                  {formData.floodSubmerged.kitchen ? '✓' : ''}
                </div>
                <span>{labels.kitchen}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span>7. {labels.disasterAffectedDays}</span>
              <div className="border-b border-black px-4 min-w-[200px]">{formData.disasterAffectedDays}</div>
            </div>

            <div>
              <p>8. {labels.bankInfo}</p>
              <div className="flex gap-8 mt-2 ml-4">
                <div className="flex items-center gap-2">
                  <span>{labels.bankName} -</span>
                  <div className="border-b border-black px-4 min-w-[150px]">{formData.bankName}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span>{labels.branch} -</span>
                  <div className="border-b border-black px-4 min-w-[150px]">{formData.bankBranch}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 ml-4">
                <span>{labels.accountNumber} -</span>
                <div className="border-b border-black px-4 min-w-[200px]">{formData.accountNumber}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span>9. {labels.houseOwnership} -</span>
              {(['owner', 'rent', 'estates', 'unauthorized', 'other'] as const).map((type) => (
                <div key={type} className="flex items-center gap-1">
                  <div className="w-5 h-5 border border-black flex items-center justify-center">
                    {formData.houseOwnership === type ? '✓' : ''}
                  </div>
                  <span>{labels[type]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Certification */}
          <div className="mt-8">
            <p className="text-sm italic">{labels.certification}</p>
            <div className="flex justify-between mt-6">
              <div className="flex items-end gap-2">
                <span className="text-sm">{labels.signature} -</span>
                <div className="border-b border-black w-48 h-8"></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{labels.date} -</span>
                <div className="border-b border-black px-4 min-w-[120px]">{formData.signatureDate}</div>
              </div>
            </div>
          </div>

          {/* Page break for page 2 */}
          <div className="break-before-page pt-8">
            <p className="text-center text-sm font-medium mb-4">{labels.officeUseOnly}</p>
            <div className="text-sm space-y-4">
              <p className="font-medium">10. {labels.committeeApproval}</p>
              <p className="text-xs italic">
                I hereby certify that the above information is true and that Mr./Ms. ...........................
                mentioned above resides at the above address. Due to the disaster situation, his/her house has been
                affected, and I recommend/do not recommend that the grant of Rs. 25,000.00 provided for the restoration
                of the house be given to him/her.
              </p>
              <table className="w-full text-xs border border-gray-400">
                <thead>
                  <tr className="border-b border-gray-400">
                    <th className="text-left p-2 border-r border-gray-400">Committee member's name</th>
                    <th className="text-left p-2 border-r border-gray-400">Position</th>
                    <th className="text-left p-2">Signature and official seal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 border-r border-gray-400">................................</td>
                    <td className="p-2 border-r border-gray-400">Grama Niladhari</td>
                    <td className="p-2">................................</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 border-r border-gray-400">................................</td>
                    <td className="p-2 border-r border-gray-400">Disaster Relief Services Officer</td>
                    <td className="p-2">................................</td>
                  </tr>
                  <tr className="border-b border-gray-400">
                    <td className="p-2 border-r border-gray-400">................................</td>
                    <td className="p-2 border-r border-gray-400">Economic Development Officer</td>
                    <td className="p-2">................................</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-gray-400">................................</td>
                    <td className="p-2 border-r border-gray-400">Samurdhi Officer</td>
                    <td className="p-2">................................</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6">
                <p className="font-medium">11. For approval by the Divisional Secretary</p>
                <p className="text-xs italic mt-2">
                  I approve/disapprove the payment of Rs. 25,000.00 allowance based on the recommendation of the
                  committee members for the houses damaged/affected by the disaster that occurred on .....................
                </p>
                <div className="flex justify-between mt-6">
                  <div>
                    <div className="border-b border-black w-48 h-8"></div>
                    <p className="text-xs mt-1">Signature and official seal of the Divisional Secretary</p>
                  </div>
                  <div>
                    <div className="border-b border-black w-32 h-8"></div>
                    <p className="text-xs mt-1">Date</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
