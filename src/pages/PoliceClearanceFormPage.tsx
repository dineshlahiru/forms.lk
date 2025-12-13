import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Trash2, CheckCircle, Eye, ChevronDown, ChevronUp, FileText, Plus, X } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import type { PoliceClearanceFormData } from '../data/sampleForms';
import { policeClearanceFormLabels } from '../data/sampleForms';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const STORAGE_KEY = 'forms-lk-police-clearance-embassy';

const initialFormData: PoliceClearanceFormData = {
  nameInFull: '',
  nameWithInitials: '',
  nicNo: '',
  embassyReferenceNo: '',
  passportNo: '',
  nationality: 'SRI LANKAN',
  dateOfBirth: '',
  sex: '',
  occupation: '',
  purpose: '',
  civilStatus: '',
  previousApplications: '',
  previousApplicationDetails: '',
  addressSriLanka: '',
  policeDivisionSL: '',
  gnDivisionSL: '',
  dsDivisionSL: '',
  periodOfResidenceSL: '',
  addressOverseas: '',
  countryOverseas: '',
  periodOfResidenceOverseas: '',
  additionalAddresses: [],
  authorizedPerson: '',
  embassyAddress: '',
  mailingAddress: '',
  contactPhone: '',
  email: '',
  spouseNicNo: '',
  spouseName: '',
  spouseAddress: '',
  spousePoliceDivision: '',
  spouseGnDivision: '',
  spouseDsDivision: '',
  declarationDate: '',
  declarationPlace: '',
};

export function PoliceClearanceFormPage() {
  const [formData, setFormData] = useState<PoliceClearanceFormData>(initialFormData);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showOriginalForm, setShowOriginalForm] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const labels = policeClearanceFormLabels.en;

  // Load saved data on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed.formData || initialFormData);
        setLastSaved(parsed.savedAt);
      } catch {
        // Invalid data, use defaults
      }
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const dataToSave = {
        formData,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setLastSaved(dataToSave.savedAt);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData]);

  const handleInputChange = (field: keyof PoliceClearanceFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddAddress = () => {
    setFormData((prev) => ({
      ...prev,
      additionalAddresses: [
        ...prev.additionalAddresses,
        { address: '', policeDivision: '', gnDivision: '', dsDivision: '', periodOfResidence: '' },
      ],
    }));
  };

  const handleRemoveAddress = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      additionalAddresses: prev.additionalAddresses.filter((_, i) => i !== index),
    }));
  };

  const handleAddressChange = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      additionalAddresses: prev.additionalAddresses.map((addr, i) =>
        i === index ? { ...addr, [field]: value } : addr
      ),
    }));
  };

  const handleClearForm = () => {
    if (confirm('Are you sure you want to clear all form data?')) {
      setFormData(initialFormData);
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save('police-clearance-application.pdf');
  };

  const calculateProgress = () => {
    const requiredFields = [
      formData.nameInFull,
      formData.nameWithInitials,
      formData.nicNo,
      formData.passportNo,
      formData.dateOfBirth,
      formData.sex,
      formData.occupation,
      formData.purpose,
      formData.civilStatus,
      formData.addressSriLanka,
      formData.policeDivisionSL,
      formData.addressOverseas,
      formData.countryOverseas,
      formData.contactPhone,
      formData.email,
    ];
    const filled = requiredFields.filter((v) => v && v.trim() !== '').length;
    return Math.round((filled / requiredFields.length) * 100);
  };

  const progress = calculateProgress();

  return (
    <Layout>
      {/* Screen UI - hidden when printing */}
      <div className="print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#1A202C] mb-2">
                  Police Clearance Certificate Application
                </h1>
                <p className="text-[#718096]">{labels.subtitle} - Embassy Application</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  EN
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#718096]">Form Progress</span>
                <span className="text-sm font-medium text-[#1A202C]">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#3182CE] to-[#2B6CB0] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Auto-save indicator */}
            {lastSaved && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                Auto-saved {new Date(lastSaved).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Form Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-sm">{labels.formNote}</p>
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
                <span className="text-sm text-[#718096]">(Embassy Application)</span>
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
                      Police Clearance Certificate Application - Embassy
                    </p>
                    <p className="text-xs text-gray-400">
                      3 pages - English version
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            {/* Section 1: Personal Information */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#1A202C] mb-4 pb-2 border-b">
                Personal Information
              </h2>

              <div className="space-y-6">
                {/* Name in Full */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    1. {labels.nameInFull} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nameInFull}
                    onChange={(e) => handleInputChange('nameInFull', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="KARUNARATNE MUDIYANSELAGE AMAL PERERA"
                  />
                </div>

                {/* Name with Initials */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    2. {labels.nameWithInitials} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nameWithInitials}
                    onChange={(e) => handleInputChange('nameWithInitials', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="K.M.A. PERERA"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* NIC */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      3. {labels.nicNo} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nicNo}
                      onChange={(e) => handleInputChange('nicNo', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      placeholder="200012345678 or 123456789V"
                    />
                  </div>

                  {/* Embassy Reference */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      4. {labels.embassyReferenceNo}
                    </label>
                    <input
                      type="text"
                      value={formData.embassyReferenceNo}
                      onChange={(e) => handleInputChange('embassyReferenceNo', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Passport No */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      5. {labels.passportNo} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.passportNo}
                      onChange={(e) => handleInputChange('passportNo', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      placeholder="N1234567"
                    />
                  </div>

                  {/* Nationality */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      6. {labels.nationality}
                    </label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => handleInputChange('nationality', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      7. {labels.dateOfBirth} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Sex */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      8. {labels.sex} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sex"
                          value="male"
                          checked={formData.sex === 'male'}
                          onChange={(e) => handleInputChange('sex', e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">{labels.male}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="sex"
                          value="female"
                          checked={formData.sex === 'female'}
                          onChange={(e) => handleInputChange('sex', e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">{labels.female}</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Occupation */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    9. {labels.occupation} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => handleInputChange('occupation', e.target.value.toUpperCase())}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="SOFTWARE ENGINEER"
                  />
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    10. {labels.purpose} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => handleInputChange('purpose', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="VISA APPLICATION / IMMIGRATION / EMPLOYMENT"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Civil Status */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#1A202C] mb-4 pb-2 border-b">
                Civil Status
              </h2>

              <div className="space-y-6">
                {/* Civil Status */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    11. {labels.civilStatus} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { value: 'unmarried', label: labels.unmarried },
                      { value: 'married', label: labels.married },
                      { value: 'divorced', label: labels.divorced },
                      { value: 'widowed', label: labels.widowed },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="civilStatus"
                          value={option.value}
                          checked={formData.civilStatus === option.value}
                          onChange={(e) => handleInputChange('civilStatus', e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Previous Applications */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    12. {labels.previousApplications}
                  </label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="previousApplications"
                        value="yes"
                        checked={formData.previousApplications === 'yes'}
                        onChange={(e) => handleInputChange('previousApplications', e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">{labels.yes}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="previousApplications"
                        value="no"
                        checked={formData.previousApplications === 'no'}
                        onChange={(e) => handleInputChange('previousApplications', e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">{labels.no}</span>
                    </label>
                  </div>
                  {formData.previousApplications === 'yes' && (
                    <div className="ml-6">
                      <label className="block text-sm text-gray-600 mb-1">
                        {labels.previousApplicationDetails}
                      </label>
                      <input
                        type="text"
                        value={formData.previousApplicationDetails}
                        onChange={(e) => handleInputChange('previousApplicationDetails', e.target.value)}
                        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Address in Sri Lanka */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#1A202C] mb-4 pb-2 border-b">
                {labels.addressInSriLanka}
              </h2>

              <div className="space-y-6">
                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    13. {labels.addressSriLankaLabel} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.addressSriLanka}
                    onChange={(e) => handleInputChange('addressSriLanka', e.target.value.toUpperCase())}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="123, MAIN STREET, COLOMBO 07"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Police Division */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      {labels.policeDivision} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.policeDivisionSL}
                      onChange={(e) => handleInputChange('policeDivisionSL', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    />
                  </div>

                  {/* GN Division */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      {labels.gnDivision}
                    </label>
                    <input
                      type="text"
                      value={formData.gnDivisionSL}
                      onChange={(e) => handleInputChange('gnDivisionSL', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    />
                  </div>

                  {/* DS Division */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      {labels.dsDivision}
                    </label>
                    <input
                      type="text"
                      value={formData.dsDivisionSL}
                      onChange={(e) => handleInputChange('dsDivisionSL', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    />
                  </div>
                </div>

                {/* Period of Residence */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    {labels.periodOfResidence}
                  </label>
                  <input
                    type="text"
                    value={formData.periodOfResidenceSL}
                    onChange={(e) => handleInputChange('periodOfResidenceSL', e.target.value)}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 2015 - 2020 (5 years)"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Address Overseas */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#1A202C] mb-4 pb-2 border-b">
                {labels.addressOverseas}
              </h2>

              <div className="space-y-6">
                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    14. {labels.address} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.addressOverseas}
                    onChange={(e) => handleInputChange('addressOverseas', e.target.value.toUpperCase())}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="CURRENT ADDRESS OVERSEAS"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      {labels.country} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.countryOverseas}
                      onChange={(e) => handleInputChange('countryOverseas', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      placeholder="AUSTRIA"
                    />
                  </div>

                  {/* Period of Residence */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      {labels.periodOfResidence}
                    </label>
                    <input
                      type="text"
                      value={formData.periodOfResidenceOverseas}
                      onChange={(e) => handleInputChange('periodOfResidenceOverseas', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 2020 - Present"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Residence History */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#1A202C] mb-2 pb-2 border-b">
                {labels.residenceHistory}
              </h2>
              <p className="text-sm text-gray-600 mb-4">{labels.residenceHistoryNote}</p>

              {formData.additionalAddresses.map((addr, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-700">Additional Address {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => handleRemoveAddress(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#4A5568] mb-2">
                        {labels.address}
                      </label>
                      <textarea
                        value={addr.address}
                        onChange={(e) => handleAddressChange(index, 'address', e.target.value.toUpperCase())}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#4A5568] mb-2">
                          {labels.policeDivision}
                        </label>
                        <input
                          type="text"
                          value={addr.policeDivision}
                          onChange={(e) => handleAddressChange(index, 'policeDivision', e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#4A5568] mb-2">
                          {labels.gnDivision}
                        </label>
                        <input
                          type="text"
                          value={addr.gnDivision}
                          onChange={(e) => handleAddressChange(index, 'gnDivision', e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#4A5568] mb-2">
                          {labels.periodOfResidence}
                        </label>
                        <input
                          type="text"
                          value={addr.periodOfResidence}
                          onChange={(e) => handleAddressChange(index, 'periodOfResidence', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddAddress}
                className="inline-flex items-center gap-2 text-[#3182CE] hover:text-[#2B6CB0] font-medium"
              >
                <Plus className="w-4 h-4" />
                {labels.addAddress}
              </button>
            </div>

            {/* Section 6: Contact & Authorization */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#1A202C] mb-4 pb-2 border-b">
                {labels.authorization}
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Phone */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      15. {labels.contactPhone} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+43 1234567890"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      16. {labels.email} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value.toLowerCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="example@email.com"
                    />
                  </div>
                </div>

                {/* Authorized Person */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    17. {labels.authorizedPerson}
                  </label>
                  <input
                    type="text"
                    value={formData.authorizedPerson}
                    onChange={(e) => handleInputChange('authorizedPerson', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                  />
                </div>

                {/* Mailing Address */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    18. {labels.mailingAddress}
                  </label>
                  <textarea
                    value={formData.mailingAddress}
                    onChange={(e) => handleInputChange('mailingAddress', e.target.value.toUpperCase())}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="ADDRESS WHERE CERTIFICATE SHOULD BE POSTED"
                  />
                </div>
              </div>
            </div>

            {/* Section 7: Spouse Details (if married) */}
            {formData.civilStatus === 'married' && (
              <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h2 className="text-lg font-semibold text-blue-800 mb-4">
                  {labels.spouseDetails}
                </h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Spouse NIC */}
                    <div>
                      <label className="block text-sm font-medium text-[#4A5568] mb-2">
                        {labels.spouseNicNo}
                      </label>
                      <input
                        type="text"
                        value={formData.spouseNicNo}
                        onChange={(e) => handleInputChange('spouseNicNo', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      />
                    </div>

                    {/* Spouse Name */}
                    <div>
                      <label className="block text-sm font-medium text-[#4A5568] mb-2">
                        {labels.spouseName}
                      </label>
                      <input
                        type="text"
                        value={formData.spouseName}
                        onChange={(e) => handleInputChange('spouseName', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      />
                    </div>
                  </div>

                  {/* Spouse Address */}
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      {labels.spouseAddress}
                    </label>
                    <textarea
                      value={formData.spouseAddress}
                      onChange={(e) => handleInputChange('spouseAddress', e.target.value.toUpperCase())}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#4A5568] mb-2">
                        {labels.policeDivision}
                      </label>
                      <input
                        type="text"
                        value={formData.spousePoliceDivision}
                        onChange={(e) => handleInputChange('spousePoliceDivision', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#4A5568] mb-2">
                        {labels.gnDivision}
                      </label>
                      <input
                        type="text"
                        value={formData.spouseGnDivision}
                        onChange={(e) => handleInputChange('spouseGnDivision', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#4A5568] mb-2">
                        {labels.dsDivision}
                      </label>
                      <input
                        type="text"
                        value={formData.spouseDsDivision}
                        onChange={(e) => handleInputChange('spouseDsDivision', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section 8: Declaration */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#1A202C] mb-4 pb-2 border-b">
                {labels.declaration}
              </h2>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-700">{labels.declarationText}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    {labels.date}
                  </label>
                  <input
                    type="date"
                    value={formData.declarationDate}
                    onChange={(e) => handleInputChange('declarationDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    {labels.place}
                  </label>
                  <input
                    type="text"
                    value={formData.declarationPlace}
                    onChange={(e) => handleInputChange('declarationPlace', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="VIENNA, AUSTRIA"
                  />
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-[#4A5568] mb-2">
                  {labels.signatureOfApplicant}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg h-20 flex items-center justify-center text-gray-400 text-sm">
                  Sign when printing
                </div>
              </div>
            </div>

            {/* Official Use Section (Read Only) */}
            <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                {labels.officialUseOnly}
              </h3>
              <p className="text-xs text-gray-500">
                This section is for official use only and will be completed by the Embassy or Police Department.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
              Print Form
            </Button>
            <Button variant="outline" icon={<Download className="w-4 h-4" />} onClick={handleDownloadPDF}>
              Download PDF
            </Button>
            <Button variant="ghost" icon={<Trash2 className="w-4 h-4" />} onClick={handleClearForm}>
              Clear Form
            </Button>
          </div>
        </div>
      </div>

      {/* Print-only section */}
      <div className="hidden print:block" ref={printRef}>
        <style>
          {`
            @media print {
              @page {
                size: A4;
                margin: 10mm;
              }
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          `}
        </style>

        <div className="p-4 font-sans text-[11px] leading-tight">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-lg font-bold">EMBASSY OF SRI LANKA</h1>
            <h2 className="text-base font-semibold mt-2">APPLICATION FOR POLICE CLEARANCE CERTIFICATE</h2>
            <p className="text-[10px] text-gray-600 mt-2">{labels.formNote}</p>
          </div>

          {/* Form Fields */}
          <table className="w-full border-collapse text-[10px]">
            <tbody>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-2 w-8">1.</td>
                <td className="border border-gray-400 p-2 w-1/3">{labels.nameInFull}</td>
                <td className="border border-gray-400 p-2 font-mono uppercase">{formData.nameInFull}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-2">2.</td>
                <td className="border border-gray-400 p-2">{labels.nameWithInitials}</td>
                <td className="border border-gray-400 p-2 font-mono uppercase">{formData.nameWithInitials}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-2">3.</td>
                <td className="border border-gray-400 p-2">{labels.nicNo}</td>
                <td className="border border-gray-400 p-2 font-mono uppercase">{formData.nicNo}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-2">4.</td>
                <td className="border border-gray-400 p-2">{labels.embassyReferenceNo}</td>
                <td className="border border-gray-400 p-2 font-mono uppercase">{formData.embassyReferenceNo}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-2">5.</td>
                <td className="border border-gray-400 p-2">{labels.passportNo}</td>
                <td className="border border-gray-400 p-2 font-mono uppercase">{formData.passportNo}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-2">6.</td>
                <td className="border border-gray-400 p-2">{labels.nationality}</td>
                <td className="border border-gray-400 p-2 font-mono uppercase">{formData.nationality}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-2">7.</td>
                <td className="border border-gray-400 p-2">{labels.dateOfBirth}</td>
                <td className="border border-gray-400 p-2">{formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : ''}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-2">8.</td>
                <td className="border border-gray-400 p-2">{labels.sex}</td>
                <td className="border border-gray-400 p-2">
                  <span className="inline-flex items-center gap-2 mr-4">
                    Male <span className={`w-4 h-4 border border-gray-400 inline-block ${formData.sex === 'male' ? 'bg-gray-800' : ''}`}></span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    Female <span className={`w-4 h-4 border border-gray-400 inline-block ${formData.sex === 'female' ? 'bg-gray-800' : ''}`}></span>
                  </span>
                </td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-2">9.</td>
                <td className="border border-gray-400 p-2">{labels.occupation}</td>
                <td className="border border-gray-400 p-2 font-mono uppercase">{formData.occupation}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-2">10.</td>
                <td className="border border-gray-400 p-2">{labels.purpose}</td>
                <td className="border border-gray-400 p-2 font-mono uppercase">{formData.purpose}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-2">11.</td>
                <td className="border border-gray-400 p-2">{labels.civilStatus}</td>
                <td className="border border-gray-400 p-2">
                  {['unmarried', 'married', 'divorced', 'widowed'].map((status) => (
                    <span key={status} className="inline-flex items-center gap-1 mr-3">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                      <span className={`w-3 h-3 border border-gray-400 inline-block ${formData.civilStatus === status ? 'bg-gray-800' : ''}`}></span>
                    </span>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Address Section */}
          <div className="mt-4">
            <h3 className="font-semibold mb-2">{labels.addressInSriLanka}</h3>
            <table className="w-full border-collapse text-[10px]">
              <tbody>
                <tr className="border border-gray-400">
                  <td className="border border-gray-400 p-2">13.</td>
                  <td className="border border-gray-400 p-2">{labels.address}</td>
                  <td className="border border-gray-400 p-2 font-mono uppercase">{formData.addressSriLanka}</td>
                </tr>
                <tr className="border border-gray-400">
                  <td className="border border-gray-400 p-2" colSpan={2}>{labels.policeDivision}</td>
                  <td className="border border-gray-400 p-2 font-mono uppercase">{formData.policeDivisionSL}</td>
                </tr>
                <tr className="border border-gray-400">
                  <td className="border border-gray-400 p-2" colSpan={2}>{labels.gnDivision}</td>
                  <td className="border border-gray-400 p-2 font-mono uppercase">{formData.gnDivisionSL}</td>
                </tr>
                <tr className="border border-gray-400">
                  <td className="border border-gray-400 p-2" colSpan={2}>{labels.periodOfResidence}</td>
                  <td className="border border-gray-400 p-2">{formData.periodOfResidenceSL}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Overseas Address */}
          <div className="mt-4">
            <h3 className="font-semibold mb-2">{labels.addressOverseas}</h3>
            <table className="w-full border-collapse text-[10px]">
              <tbody>
                <tr className="border border-gray-400">
                  <td className="border border-gray-400 p-2">14.</td>
                  <td className="border border-gray-400 p-2">{labels.address}</td>
                  <td className="border border-gray-400 p-2 font-mono uppercase">{formData.addressOverseas}</td>
                </tr>
                <tr className="border border-gray-400">
                  <td className="border border-gray-400 p-2" colSpan={2}>{labels.country}</td>
                  <td className="border border-gray-400 p-2 font-mono uppercase">{formData.countryOverseas}</td>
                </tr>
                <tr className="border border-gray-400">
                  <td className="border border-gray-400 p-2" colSpan={2}>{labels.periodOfResidence}</td>
                  <td className="border border-gray-400 p-2">{formData.periodOfResidenceOverseas}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Contact Information */}
          <div className="mt-4">
            <h3 className="font-semibold mb-2">{labels.authorization}</h3>
            <table className="w-full border-collapse text-[10px]">
              <tbody>
                <tr className="border border-gray-400">
                  <td className="border border-gray-400 p-2">15.</td>
                  <td className="border border-gray-400 p-2">{labels.contactPhone}</td>
                  <td className="border border-gray-400 p-2">{formData.contactPhone}</td>
                </tr>
                <tr className="border border-gray-400">
                  <td className="border border-gray-400 p-2">16.</td>
                  <td className="border border-gray-400 p-2">{labels.email}</td>
                  <td className="border border-gray-400 p-2">{formData.email}</td>
                </tr>
                <tr className="border border-gray-400">
                  <td className="border border-gray-400 p-2">17.</td>
                  <td className="border border-gray-400 p-2">{labels.authorizedPerson}</td>
                  <td className="border border-gray-400 p-2 font-mono uppercase">{formData.authorizedPerson}</td>
                </tr>
                <tr className="border border-gray-400">
                  <td className="border border-gray-400 p-2">18.</td>
                  <td className="border border-gray-400 p-2">{labels.mailingAddress}</td>
                  <td className="border border-gray-400 p-2 font-mono uppercase">{formData.mailingAddress}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Spouse Details (if married) */}
          {formData.civilStatus === 'married' && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">{labels.spouseDetails}</h3>
              <table className="w-full border-collapse text-[10px]">
                <tbody>
                  <tr className="border border-gray-400">
                    <td className="border border-gray-400 p-2">{labels.spouseNicNo}</td>
                    <td className="border border-gray-400 p-2 font-mono uppercase">{formData.spouseNicNo}</td>
                  </tr>
                  <tr className="border border-gray-400">
                    <td className="border border-gray-400 p-2">{labels.spouseName}</td>
                    <td className="border border-gray-400 p-2 font-mono uppercase">{formData.spouseName}</td>
                  </tr>
                  <tr className="border border-gray-400">
                    <td className="border border-gray-400 p-2">{labels.spouseAddress}</td>
                    <td className="border border-gray-400 p-2 font-mono uppercase">{formData.spouseAddress}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Declaration */}
          <div className="mt-6 border border-gray-400 p-3">
            <h3 className="font-semibold mb-2">{labels.declaration}</h3>
            <p className="text-[9px] text-gray-700 mb-4">{labels.declarationText}</p>
            <div className="flex justify-between items-end mt-4">
              <div>
                <p className="text-[9px]">{labels.date}: {formData.declarationDate ? new Date(formData.declarationDate).toLocaleDateString() : '...................'}</p>
                <p className="text-[9px] mt-1">{labels.place}: {formData.declarationPlace || '...................'}</p>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-600 w-48 pt-1">
                  <p className="text-[9px]">{labels.signatureOfApplicant}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Official Use Section */}
          <div className="mt-4 border border-gray-400 p-3">
            <p className="text-[9px] text-gray-600">{labels.officialUseOnly}</p>
            <div className="grid grid-cols-2 gap-4 mt-2 text-[9px]">
              <div className="flex gap-2">
                <span>Verified by:</span>
                <span className="border-b border-gray-400 flex-1"></span>
              </div>
              <div className="flex gap-2">
                <span>Date:</span>
                <span className="border-b border-gray-400 flex-1"></span>
              </div>
              <div className="flex gap-2">
                <span>Reference No:</span>
                <span className="border-b border-gray-400 flex-1"></span>
              </div>
              <div className="flex gap-2">
                <span>Signature:</span>
                <span className="border-b border-gray-400 flex-1"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
