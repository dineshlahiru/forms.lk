import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Trash2, CheckCircle, Eye, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import type { PassportFormData } from '../data/sampleForms';
import { passportFormLabels } from '../data/sampleForms';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const STORAGE_KEY = 'forms-lk-passport-application';

const initialFormData: PassportFormData = {
  serviceType: '',
  documentType: '',
  presentTravelDocNo: '',
  nmrpNo: '',
  nicNo: '',
  surname: '',
  otherNames: '',
  permanentAddress: '',
  district: '',
  dateOfBirth: { date: '', month: '', year: '' },
  birthCertNo: '',
  birthCertDistrict: '',
  placeOfBirth: '',
  sex: '',
  profession: '',
  hasDualCitizenship: '',
  dualCitizenshipNo: '',
  foreignNationality: '',
  foreignPassportNo: '',
  mobileNo: '',
  email: '',
  fatherGuardianNicOrPassport: '',
  motherGuardianNicOrPassport: '',
  declarationDate: '',
};

export function PassportApplicationPage() {
  const [formData, setFormData] = useState<PassportFormData>(initialFormData);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showOriginalForm, setShowOriginalForm] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const labels = passportFormLabels.en;

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

  const handleInputChange = (field: keyof PassportFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDOBChange = (field: 'date' | 'month' | 'year', value: string) => {
    setFormData((prev) => ({
      ...prev,
      dateOfBirth: { ...prev.dateOfBirth, [field]: value },
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
    pdf.save('passport-application-form-35a.pdf');
  };

  const calculateProgress = () => {
    const requiredFields = [
      formData.serviceType,
      formData.documentType,
      formData.nicNo,
      formData.surname,
      formData.otherNames,
      formData.permanentAddress,
      formData.district,
      formData.dateOfBirth.date,
      formData.dateOfBirth.month,
      formData.dateOfBirth.year,
      formData.birthCertNo,
      formData.birthCertDistrict,
      formData.placeOfBirth,
      formData.sex,
      formData.profession,
      formData.hasDualCitizenship,
      formData.mobileNo,
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
                  Sri Lankan Passport Application
                </h1>
                <p className="text-[#718096]">Form K 35A - {labels.subtitle}</p>
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
                <span className="text-sm text-[#718096]">(Form K 35A)</span>
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
                      Sri Lankan Passport Application - Form K 35A
                    </p>
                    <p className="text-xs text-gray-400">
                      2 pages • English version
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            {/* Section 1-2: Service & Document Type */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#1A202C] mb-4 pb-2 border-b">
                Service & Document Type
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Type of Service */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    1. {labels.typeOfService} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="serviceType"
                        value="normal"
                        checked={formData.serviceType === 'normal'}
                        onChange={(e) => handleInputChange('serviceType', e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">{labels.normal}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="serviceType"
                        value="oneDay"
                        checked={formData.serviceType === 'oneDay'}
                        onChange={(e) => handleInputChange('serviceType', e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">{labels.oneDay}</span>
                    </label>
                  </div>
                </div>

                {/* Type of Travel Document */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    2. {labels.typeOfTravelDocument} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'allCountries', label: labels.allCountries },
                      { value: 'middleEast', label: labels.middleEastCountries },
                      { value: 'emergencyCertificate', label: labels.emergencyCertificate },
                      { value: 'identityCertificate', label: labels.identityCertificate },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="documentType"
                          value={option.value}
                          checked={formData.documentType === option.value}
                          onChange={(e) => handleInputChange('documentType', e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Present Travel Doc & NMRP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    3. {labels.presentTravelDocNo}
                  </label>
                  <input
                    type="text"
                    value={formData.presentTravelDocNo}
                    onChange={(e) => handleInputChange('presentTravelDocNo', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="N1234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    4. {labels.nmrpNo}
                  </label>
                  <input
                    type="text"
                    value={formData.nmrpNo}
                    onChange={(e) => handleInputChange('nmrpNo', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Section 5-13: Personal Information */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#1A202C] mb-4 pb-2 border-b">
                Personal Information
              </h2>

              <div className="space-y-6">
                {/* NIC */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    5. {labels.nicNo} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nicNo}
                    onChange={(e) => handleInputChange('nicNo', e.target.value.toUpperCase())}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="200012345678 or 123456789V"
                  />
                </div>

                {/* Surname */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    6. {labels.surname} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.surname}
                    onChange={(e) => handleInputChange('surname', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="PERERA"
                  />
                </div>

                {/* Other Names */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    7. {labels.otherNames} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.otherNames}
                    onChange={(e) => handleInputChange('otherNames', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="AMAL BANDARA"
                  />
                </div>

                {/* Permanent Address */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    8. {labels.permanentAddress} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.permanentAddress}
                    onChange={(e) => handleInputChange('permanentAddress', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="123, MAIN STREET, COLOMBO 07"
                  />
                </div>

                {/* District */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    8.1 {labels.district} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => handleInputChange('district', e.target.value.toUpperCase())}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="COLOMBO"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    9. {labels.dateOfBirth} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{labels.date}</label>
                      <input
                        type="text"
                        value={formData.dateOfBirth.date}
                        onChange={(e) => handleDOBChange('date', e.target.value.replace(/\D/g, '').slice(0, 2))}
                        className="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                        placeholder="DD"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{labels.month}</label>
                      <input
                        type="text"
                        value={formData.dateOfBirth.month}
                        onChange={(e) => handleDOBChange('month', e.target.value.replace(/\D/g, '').slice(0, 2))}
                        className="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                        placeholder="MM"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{labels.year}</label>
                      <input
                        type="text"
                        value={formData.dateOfBirth.year}
                        onChange={(e) => handleDOBChange('year', e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                        placeholder="YYYY"
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>

                {/* Birth Certificate */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    10. {labels.birthCertificate} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">{labels.no}</label>
                      <input
                        type="text"
                        value={formData.birthCertNo}
                        onChange={(e) => handleInputChange('birthCertNo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="12345"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">{labels.district}</label>
                      <input
                        type="text"
                        value={formData.birthCertDistrict}
                        onChange={(e) => handleInputChange('birthCertDistrict', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                        placeholder="COLOMBO"
                      />
                    </div>
                  </div>
                </div>

                {/* Place of Birth */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    11. {labels.placeOfBirth} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.placeOfBirth}
                    onChange={(e) => handleInputChange('placeOfBirth', e.target.value.toUpperCase())}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="COLOMBO"
                  />
                </div>

                {/* Sex */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    12. {labels.sex} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
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
                  </div>
                </div>

                {/* Profession */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    13. {labels.profession} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.profession}
                    onChange={(e) => handleInputChange('profession', e.target.value.toUpperCase())}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="SOFTWARE ENGINEER"
                  />
                </div>
              </div>
            </div>

            {/* Section 14-16: Dual Citizenship & Contact */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#1A202C] mb-4 pb-2 border-b">
                Dual Citizenship & Contact Information
              </h2>

              <div className="space-y-6">
                {/* Dual Citizenship */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    14. {labels.dualCitizenship} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dualCitizenship"
                        value="yes"
                        checked={formData.hasDualCitizenship === 'yes'}
                        onChange={(e) => handleInputChange('hasDualCitizenship', e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">{labels.yes}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dualCitizenship"
                        value="no"
                        checked={formData.hasDualCitizenship === 'no'}
                        onChange={(e) => handleInputChange('hasDualCitizenship', e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                  {formData.hasDualCitizenship === 'yes' && (
                    <div className="ml-6">
                      <label className="block text-sm text-gray-600 mb-1">
                        {labels.dualCitizenshipNo}
                      </label>
                      <input
                        type="text"
                        value={formData.dualCitizenshipNo}
                        onChange={(e) => handleInputChange('dualCitizenshipNo', e.target.value.toUpperCase())}
                        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      />
                      <p className="text-xs text-amber-600 mt-2">
                        {labels.fillFields17And18}
                      </p>
                    </div>
                  )}
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-1">
                    15. {labels.mobileNo} <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-2">({labels.smsNotification})</p>
                  <input
                    type="tel"
                    value={formData.mobileNo}
                    onChange={(e) => handleInputChange('mobileNo', e.target.value.replace(/\D/g, ''))}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0771234567"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    16. {labels.emailAddress}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value.toLowerCase())}
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="example@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Section 17-18: Dual Citizenship Holders Only */}
            {formData.hasDualCitizenship === 'yes' && (
              <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h2 className="text-lg font-semibold text-blue-800 mb-4">
                  {labels.compulsoryForDualCitizenship}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      17. {labels.foreignNationality}
                    </label>
                    <input
                      type="text"
                      value={formData.foreignNationality}
                      onChange={(e) => handleInputChange('foreignNationality', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      placeholder="AUSTRALIAN"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4A5568] mb-2">
                      18. {labels.foreignPassportNo}
                    </label>
                    <input
                      type="text"
                      value={formData.foreignPassportNo}
                      onChange={(e) => handleInputChange('foreignPassportNo', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      placeholder="PA1234567"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 19: Child Applicant */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#1A202C] mb-2 pb-2 border-b">
                Child Applicant (Below 16 Years)
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                19. {labels.childBelow16}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    {labels.fatherGuardian}
                  </label>
                  <p className="text-xs text-gray-500 mb-1">{labels.nicOrTravelDocNo}</p>
                  <input
                    type="text"
                    value={formData.fatherGuardianNicOrPassport}
                    onChange={(e) => handleInputChange('fatherGuardianNicOrPassport', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-2">
                    {labels.motherGuardian}
                  </label>
                  <p className="text-xs text-gray-500 mb-1">{labels.nicOrTravelDocNo}</p>
                  <input
                    type="text"
                    value={formData.motherGuardianNicOrPassport}
                    onChange={(e) => handleInputChange('motherGuardianNicOrPassport', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Section 20-21: Declaration */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-[#1A202C] mb-4 pb-2 border-b">
                Declaration
              </h2>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-700 mb-2 font-medium">
                  20. {labels.signatureInstruction}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <p className="text-sm font-medium text-gray-800 mb-2">21. {labels.declaration}</p>
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
                    {labels.signatureOfApplicant}
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg h-20 flex items-center justify-center text-gray-400 text-sm">
                    Sign when printing
                  </div>
                </div>
              </div>
            </div>

            {/* Official Use Section (Read Only) */}
            <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                {labels.officialUseOnly}
              </h3>
              <p className="text-xs text-gray-500">
                This section is for official use only and will be completed by the Department of Immigration and Emigration.
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
          <div className="text-center mb-4">
            <p className="text-[10px] text-gray-600">
              මෙම අයදුම්පත නොමිලේ නිකුත් කරනු ලැබේ / இவ்விண்ணப்பம் பத்திரம் விற்போனாக்கப்படும் / THIS APPLICATION IS ISSUED FREE OF CHARGE
            </p>
            <div className="flex justify-between items-start mt-2">
              <div className="text-left text-[9px] text-gray-500">
                <p>ආගමන විගමන දෙපාර්තමේන්තුව</p>
                <p>குடிவரவு, குடியகல்வுத் திணைக்களம்</p>
              </div>
              <div className="text-center flex-1">
                <h1 className="text-sm font-bold">DEPARTMENT OF IMMIGRATION AND EMIGRATION</h1>
                <p className="text-[10px]">විදේශගත ශ්‍රී ලාංකික අනන්‍යතාව</p>
                <p className="text-[10px]">வெளிநாட்டுவாழ் இலங்கையரின் அடையாளம்</p>
                <p className="text-[10px] font-semibold">SRI LANKAN IDENTITY OVERSEAS</p>
              </div>
              <div className="text-right">
                <div className="border border-gray-400 px-2 py-1 text-[9px]">
                  <p>ආකෘති පත්‍රය</p>
                  <p>படிவம்</p>
                  <p>Form</p>
                </div>
                <p className="font-bold mt-1">K 35 A</p>
              </div>
            </div>
          </div>

          {/* Form Title */}
          <div className="text-center mb-3">
            <p className="text-[10px]">ශ්‍රී ලංකා ගමන් බලපත්‍රයක්, හදිසි/හැඳුනුම් සහතිකයක් සඳහා අයදුම්පත</p>
            <p className="text-[10px]">இலங்கை கடவுச்சீட்டு, அவசர/அடையாளச் சான்றிதழ் விண்ணப்பம்</p>
            <p className="font-semibold text-[11px]">APPLICATION FOR A SRI LANKAN PASSPORT, EMERGENCY/ IDENTITY CERTIFICATE</p>
          </div>

          {/* Note */}
          <p className="text-[9px] text-gray-600 mb-3 italic">{labels.formNote}</p>

          {/* Official Use Section */}
          <div className="border border-gray-400 p-2 mb-3">
            <p className="text-[9px] text-gray-600 mb-1">{labels.officialUseOnly}</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <span className="text-[9px]">APPLICATION NO.</span>
                <div className="border-b border-gray-400 w-24 h-4"></div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[9px]">ALLOCATED PASSPORT NO.</span>
                <div className="border-b border-gray-400 w-24 h-4"></div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[9px]">AC CODE</span>
                <div className="border-b border-gray-400 w-16 h-4"></div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <table className="w-full border-collapse text-[10px]">
            <tbody>
              {/* Row 1-2 */}
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1 w-8">1.</td>
                <td className="border border-gray-400 p-1">{labels.typeOfService}</td>
                <td className="border border-gray-400 p-1" colSpan={2}>
                  <span className="inline-flex items-center gap-2 mr-4">
                    Normal <span className={`w-4 h-4 border border-gray-400 inline-block ${formData.serviceType === 'normal' ? 'bg-gray-800' : ''}`}></span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    One Day <span className={`w-4 h-4 border border-gray-400 inline-block ${formData.serviceType === 'oneDay' ? 'bg-gray-800' : ''}`}></span>
                  </span>
                </td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">2.</td>
                <td className="border border-gray-400 p-1">{labels.typeOfTravelDocument}</td>
                <td className="border border-gray-400 p-1" colSpan={2}>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      All Countries <span className={`w-3 h-3 border border-gray-400 inline-block ${formData.documentType === 'allCountries' ? 'bg-gray-800' : ''}`}></span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      Middle East Countries <span className={`w-3 h-3 border border-gray-400 inline-block ${formData.documentType === 'middleEast' ? 'bg-gray-800' : ''}`}></span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      Emergency Certificate <span className={`w-3 h-3 border border-gray-400 inline-block ${formData.documentType === 'emergencyCertificate' ? 'bg-gray-800' : ''}`}></span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      Identity Certificate <span className={`w-3 h-3 border border-gray-400 inline-block ${formData.documentType === 'identityCertificate' ? 'bg-gray-800' : ''}`}></span>
                    </span>
                  </div>
                </td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">3.</td>
                <td className="border border-gray-400 p-1">{labels.presentTravelDocNo}</td>
                <td className="border border-gray-400 p-1">{formData.presentTravelDocNo || ''}</td>
                <td className="border border-gray-400 p-1">
                  <span className="mr-2">4. {labels.nmrpNo}</span>
                  {formData.nmrpNo || ''}
                </td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">5.</td>
                <td className="border border-gray-400 p-1">{labels.nicNo}</td>
                <td className="border border-gray-400 p-1 font-mono" colSpan={2}>{formData.nicNo}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">6.</td>
                <td className="border border-gray-400 p-1">{labels.surname}</td>
                <td className="border border-gray-400 p-1 font-mono uppercase" colSpan={2}>{formData.surname}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">7.</td>
                <td className="border border-gray-400 p-1">{labels.otherNames}</td>
                <td className="border border-gray-400 p-1 font-mono uppercase" colSpan={2}>{formData.otherNames}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">8.</td>
                <td className="border border-gray-400 p-1">{labels.permanentAddress}</td>
                <td className="border border-gray-400 p-1 font-mono uppercase" colSpan={2}>{formData.permanentAddress}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1"></td>
                <td className="border border-gray-400 p-1">8.1 {labels.district}</td>
                <td className="border border-gray-400 p-1 font-mono uppercase" colSpan={2}>{formData.district}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">9.</td>
                <td className="border border-gray-400 p-1">{labels.dateOfBirth}</td>
                <td className="border border-gray-400 p-1" colSpan={2}>
                  Date: {formData.dateOfBirth.date} &nbsp; Month: {formData.dateOfBirth.month} &nbsp; Year: {formData.dateOfBirth.year}
                </td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">10.</td>
                <td className="border border-gray-400 p-1">{labels.birthCertificate}</td>
                <td className="border border-gray-400 p-1" colSpan={2}>
                  No. {formData.birthCertNo} &nbsp;&nbsp; District: {formData.birthCertDistrict}
                </td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">11.</td>
                <td className="border border-gray-400 p-1">{labels.placeOfBirth}</td>
                <td className="border border-gray-400 p-1 font-mono uppercase" colSpan={2}>{formData.placeOfBirth}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">12.</td>
                <td className="border border-gray-400 p-1">{labels.sex}</td>
                <td className="border border-gray-400 p-1" colSpan={2}>
                  <span className="inline-flex items-center gap-2 mr-4">
                    Female <span className={`w-4 h-4 border border-gray-400 inline-block ${formData.sex === 'female' ? 'bg-gray-800' : ''}`}></span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    Male <span className={`w-4 h-4 border border-gray-400 inline-block ${formData.sex === 'male' ? 'bg-gray-800' : ''}`}></span>
                  </span>
                </td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">13.</td>
                <td className="border border-gray-400 p-1">{labels.profession}</td>
                <td className="border border-gray-400 p-1 font-mono uppercase" colSpan={2}>{formData.profession}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">14.</td>
                <td className="border border-gray-400 p-1">{labels.dualCitizenship}</td>
                <td className="border border-gray-400 p-1" colSpan={2}>
                  <span className="inline-flex items-center gap-2 mr-4">
                    Yes <span className={`w-4 h-4 border border-gray-400 inline-block ${formData.hasDualCitizenship === 'yes' ? 'bg-gray-800' : ''}`}></span>
                  </span>
                  <span className="inline-flex items-center gap-2 mr-4">
                    No <span className={`w-4 h-4 border border-gray-400 inline-block ${formData.hasDualCitizenship === 'no' ? 'bg-gray-800' : ''}`}></span>
                  </span>
                  {formData.hasDualCitizenship === 'yes' && (
                    <span>Dual Citizenship No.: {formData.dualCitizenshipNo}</span>
                  )}
                </td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">15.</td>
                <td className="border border-gray-400 p-1">{labels.mobileNo}</td>
                <td className="border border-gray-400 p-1 font-mono" colSpan={2}>{formData.mobileNo}</td>
              </tr>
              <tr className="border border-gray-400">
                <td className="border border-gray-400 p-1">16.</td>
                <td className="border border-gray-400 p-1">{labels.emailAddress}</td>
                <td className="border border-gray-400 p-1" colSpan={2}>{formData.email}</td>
              </tr>
            </tbody>
          </table>

          {/* Page 2 Content */}
          <div className="mt-4 page-break-before">
            {/* Dual Citizenship Section */}
            {formData.hasDualCitizenship === 'yes' && (
              <div className="border border-gray-400 p-2 mb-3">
                <p className="font-semibold text-[10px] mb-2">{labels.compulsoryForDualCitizenship}</p>
                <table className="w-full text-[10px]">
                  <tbody>
                    <tr>
                      <td className="p-1">17. {labels.foreignNationality}:</td>
                      <td className="p-1 font-mono">{formData.foreignNationality}</td>
                    </tr>
                    <tr>
                      <td className="p-1">18. {labels.foreignPassportNo}:</td>
                      <td className="p-1 font-mono">{formData.foreignPassportNo}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Child Section */}
            <div className="border border-gray-400 p-2 mb-3">
              <p className="text-[9px] mb-2">19. {labels.childBelow16}</p>
              <div className="grid grid-cols-2 gap-4 text-[10px]">
                <div>
                  <p className="font-semibold">{labels.fatherGuardian}</p>
                  <p className="text-[9px]">{labels.nicOrTravelDocNo}</p>
                  <p className="font-mono border-b border-gray-400 min-h-[16px]">{formData.fatherGuardianNicOrPassport}</p>
                </div>
                <div>
                  <p className="font-semibold">{labels.motherGuardian}</p>
                  <p className="text-[9px]">{labels.nicOrTravelDocNo}</p>
                  <p className="font-mono border-b border-gray-400 min-h-[16px]">{formData.motherGuardianNicOrPassport}</p>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="border border-gray-400 p-2 mb-3">
              <p className="text-[9px] mb-2">20. {labels.signatureInstruction}</p>
              <div className="flex justify-center gap-8">
                <div className="w-40 h-24 border-2 border-gray-600"></div>
                <div className="w-40 h-24 border-2 border-gray-600"></div>
              </div>
            </div>

            {/* Declaration */}
            <div className="border border-gray-400 p-2 mb-3">
              <p className="font-semibold text-[10px] mb-1">21. {labels.declaration}</p>
              <p className="text-[9px] text-gray-700 mb-3">{labels.declarationText}</p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px]">{labels.date}: {formData.declarationDate ? new Date(formData.declarationDate).toLocaleDateString() : '...................'}</p>
                </div>
                <div className="text-center">
                  <div className="border-t border-gray-600 w-48 pt-1">
                    <p className="text-[9px]">{labels.signatureOfApplicant}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Use Section */}
            <div className="border border-gray-400 p-2">
              <p className="text-[9px] text-gray-600 mb-2">{labels.officialUseOnly}</p>
              <div className="grid grid-cols-2 gap-4 text-[9px]">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <span>Controller's Order:</span>
                    <span className="border-b border-gray-400 flex-1"></span>
                  </div>
                  <div className="flex gap-2">
                    <span>Minute Sheet Attached (If any):</span>
                    <span className="border-b border-gray-400 flex-1"></span>
                  </div>
                  <div className="flex gap-2">
                    <span>DC / AC Signature:</span>
                    <span className="border-b border-gray-400 flex-1"></span>
                  </div>
                  <div className="flex gap-2">
                    <span>Pending at Computer Division:</span>
                    <span className="border-b border-gray-400 flex-1"></span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <span>PPT No:</span>
                    <span className="border-b border-gray-400 flex-1"></span>
                  </div>
                  <div className="flex gap-2">
                    <span>PPT Lost: Yes / No</span>
                  </div>
                  <div className="flex gap-2">
                    <span>Police Report / TTD / NMRP:</span>
                    <span className="border-b border-gray-400 flex-1"></span>
                  </div>
                  <div className="flex gap-2">
                    <span>Dual Citizen: Yes / No</span>
                  </div>
                  <div className="flex gap-2">
                    <span>BC No. & District:</span>
                    <span className="border-b border-gray-400 flex-1"></span>
                  </div>
                  <div className="flex gap-2">
                    <span>NIC / DL / Postal ID:</span>
                    <span className="border-b border-gray-400 flex-1"></span>
                  </div>
                  <div className="flex gap-2">
                    <span>MC No. & District:</span>
                    <span className="border-b border-gray-400 flex-1"></span>
                  </div>
                  <div className="flex gap-2">
                    <span>F's PPT / NIC Copy & Concent Letter:</span>
                    <span className="border-b border-gray-400 flex-1"></span>
                  </div>
                  <div className="flex gap-2">
                    <span>M's PPT / NIC Copy & Concent Letter:</span>
                    <span className="border-b border-gray-400 flex-1"></span>
                  </div>
                  <div className="flex gap-2">
                    <span>DC / AC's Order:</span>
                    <span className="border-b border-gray-400 flex-1"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
