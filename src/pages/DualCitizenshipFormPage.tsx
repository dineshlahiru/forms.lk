import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Printer,
  Eye,
  EyeOff,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const STORAGE_KEY = 'forms-lk-dual-citizenship-form';

interface FormData {
  // Application Type
  applicationType: 'resumption' | 'retention' | '';
  applicationDate: string;
  eligibilityCategory: string;

  // Section 2: Applicant Particulars
  fullName: string;
  nameWithInitials: string;
  addressSriLanka: string;
  addressForeign: string;
  email: string;
  contactForeign: string;
  contactLocal: string;
  dateOfBirth: string;
  placeOfBirth: string;
  birthCertNo: string;
  birthCertDistrict: string;
  nationality: string;
  nicNo: string;
  sex: 'male' | 'female' | '';
  spouseName: string;
  spouseNationality: string;
  children: Array<{ name: string; dob: string; nationality: string }>;
  profession: string;

  // Section 3: Foreign Citizenship
  citizenshipAtBirth: string;
  countryOfPresentCitizenship: string;
  dateAcquiringCitizenship: string;
  citizenshipCertNo: string;
  foreignPassportNo: string;
  foreignPassportDateOfIssue: string;

  // Section 4: Sri Lankan Citizenship
  fatherName: string;
  fatherDatePlaceOfBirth: string;
  motherName: string;
  motherDatePlaceOfBirth: string;
  fatherCertNo: string;
  fatherCertDateOfIssue: string;
  motherCertNo: string;
  motherCertDateOfIssue: string;
  slPassportNo: string;
  slPassportDateOfIssue: string;
  slPassportPlaceOfIssue: string;
  prCountry: string;
  prDateGranted: string;
  reasonsForApplication: string;

  // Section 6: Eligibility
  academicQualifications: Array<{ degree: string; institution: string; period: string }>;
  professionalQualifications: Array<{ qualification: string; institution: string; period: string }>;
  assets: Array<{ details: string; deedNo: string; value: string }>;
  fixedDeposits: Array<{ bank: string; accountNo: string; amount: string; maturity: string }>;
  treasuryBonds: Array<{ value: string; maturity: string }>;

  // Affidavit
  affidavitDay: string;
  affidavitMonth: string;
  affidavitYear: string;
  affidavitPlace: string;

  // Data Sheet (Page 7)
  dsFullName: string;
  dsAddress: string;
  dsProfession: string;
  dsDobDay: string;
  dsDobMonth: string;
  dsDobYear: string;
  dsPlaceOfBirth: string;
  dsFatherName: string;
  dsMotherName: string;
  dsClaimToCitizenship: 'descent' | 'registration' | '';
  dsOtherNationality: string;
  dsEmail: string;
  dsPhoneLocal: string;
  dsPhoneForeign: string;
  dsContactName: string;
  dsContactNumber: string;

  // Personal Particulars Form (Page 8-9)
  ppfFullName: string;
  ppfDob: string;
  ppfPlaceOfBirth: string;
  ppfCountryOfBirth: string;
  ppfGender: 'male' | 'female' | '';
  ppfCountryOfCitizenship: string;
  ppfDateAcquiringCitizenship: string;
  ppfPreviousCitizenship: string;
  ppfProfession: string;
  ppfEmail: string;
  ppfNicNo: string;
  ppfNicDateOfIssue: string;
  ppfSlPassportNo: string;
  ppfSlPassportDateOfIssue: string;
  ppfForeignPassportNo: string;
  ppfForeignPassportDetails: string;
  ppfAddressForeign: string;
  ppfPeriodFrom: string;
  ppfPeriodTo: string;
  ppfCountry: string;
  ppfPhoneForeignRes: string;
  ppfPhoneForeignMob: string;
  ppfAddressSL: string;
  ppfPeriodFromSL: string;
  ppfPeriodToSL: string;
  ppfPoliceArea: string;
  ppfPhoneSLRes: string;
  ppfPhoneSLMob: string;
  ppfSpouseName: string;
  ppfSpouseCitizenship: string;
  ppfSpousePrevCitizenship: string;
  ppfSpousePassportCitizenship: string;
  ppfSpousePassportNic: string;
  ppfSpouseAddressSL: string;
  ppfChildren: Array<{ name: string; sex: string; dob: string }>;
  ppfFatherName: string;
  ppfFatherAddress: string;
  ppfFatherPoliceArea: string;
  ppfMotherName: string;
  ppfMotherAddress: string;
  ppfMotherPoliceArea: string;
  ppfSpouseFatherName: string;
  ppfSpouseFatherAddress: string;
  ppfSpouseFatherPoliceArea: string;
  ppfSpouseMotherName: string;
  ppfSpouseMotherAddress: string;
  ppfSpouseMotherPoliceArea: string;
  ppfOrganization: string;
  ppfConviction: string;
  ppfDeclarationDate: string;
}

const initialFormData: FormData = {
  applicationType: '',
  applicationDate: '',
  eligibilityCategory: '',
  fullName: '',
  nameWithInitials: '',
  addressSriLanka: '',
  addressForeign: '',
  email: '',
  contactForeign: '',
  contactLocal: '',
  dateOfBirth: '',
  placeOfBirth: '',
  birthCertNo: '',
  birthCertDistrict: '',
  nationality: '',
  nicNo: '',
  sex: '',
  spouseName: '',
  spouseNationality: '',
  children: [],
  profession: '',
  citizenshipAtBirth: '',
  countryOfPresentCitizenship: '',
  dateAcquiringCitizenship: '',
  citizenshipCertNo: '',
  foreignPassportNo: '',
  foreignPassportDateOfIssue: '',
  fatherName: '',
  fatherDatePlaceOfBirth: '',
  motherName: '',
  motherDatePlaceOfBirth: '',
  fatherCertNo: '',
  fatherCertDateOfIssue: '',
  motherCertNo: '',
  motherCertDateOfIssue: '',
  slPassportNo: '',
  slPassportDateOfIssue: '',
  slPassportPlaceOfIssue: '',
  prCountry: '',
  prDateGranted: '',
  reasonsForApplication: '',
  academicQualifications: [],
  professionalQualifications: [],
  assets: [],
  fixedDeposits: [],
  treasuryBonds: [],
  affidavitDay: '',
  affidavitMonth: '',
  affidavitYear: '',
  affidavitPlace: '',
  dsFullName: '',
  dsAddress: '',
  dsProfession: '',
  dsDobDay: '',
  dsDobMonth: '',
  dsDobYear: '',
  dsPlaceOfBirth: '',
  dsFatherName: '',
  dsMotherName: '',
  dsClaimToCitizenship: '',
  dsOtherNationality: '',
  dsEmail: '',
  dsPhoneLocal: '',
  dsPhoneForeign: '',
  dsContactName: '',
  dsContactNumber: '',
  ppfFullName: '',
  ppfDob: '',
  ppfPlaceOfBirth: '',
  ppfCountryOfBirth: '',
  ppfGender: '',
  ppfCountryOfCitizenship: '',
  ppfDateAcquiringCitizenship: '',
  ppfPreviousCitizenship: '',
  ppfProfession: '',
  ppfEmail: '',
  ppfNicNo: '',
  ppfNicDateOfIssue: '',
  ppfSlPassportNo: '',
  ppfSlPassportDateOfIssue: '',
  ppfForeignPassportNo: '',
  ppfForeignPassportDetails: '',
  ppfAddressForeign: '',
  ppfPeriodFrom: '',
  ppfPeriodTo: '',
  ppfCountry: '',
  ppfPhoneForeignRes: '',
  ppfPhoneForeignMob: '',
  ppfAddressSL: '',
  ppfPeriodFromSL: '',
  ppfPeriodToSL: '',
  ppfPoliceArea: '',
  ppfPhoneSLRes: '',
  ppfPhoneSLMob: '',
  ppfSpouseName: '',
  ppfSpouseCitizenship: '',
  ppfSpousePrevCitizenship: '',
  ppfSpousePassportCitizenship: '',
  ppfSpousePassportNic: '',
  ppfSpouseAddressSL: '',
  ppfChildren: [],
  ppfFatherName: '',
  ppfFatherAddress: '',
  ppfFatherPoliceArea: '',
  ppfMotherName: '',
  ppfMotherAddress: '',
  ppfMotherPoliceArea: '',
  ppfSpouseFatherName: '',
  ppfSpouseFatherAddress: '',
  ppfSpouseFatherPoliceArea: '',
  ppfSpouseMotherName: '',
  ppfSpouseMotherAddress: '',
  ppfSpouseMotherPoliceArea: '',
  ppfOrganization: '',
  ppfConviction: '',
  ppfDeclarationDate: '',
};

export function DualCitizenshipFormPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showPreview, setShowPreview] = useState(false);
  const [showOriginalForm, setShowOriginalForm] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed.formData || initialFormData);
        setLastSaved(parsed.savedAt || null);
      } catch (e) {
        console.error('Failed to load:', e);
      }
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const dataToSave = { formData, savedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setLastSaved(dataToSave.savedAt);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData]);

  const handleChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClearForm = () => {
    if (window.confirm('Clear all form data?')) {
      setFormData(initialFormData);
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
    }
  };

  const generatePDF = async () => {
    if (!printRef.current) return;
    const wasHidden = !showPreview;
    if (wasHidden) {
      setShowPreview(true);
      await new Promise((r) => setTimeout(r, 300));
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Get all page divs
    const pages = printRef.current.querySelectorAll(':scope > div');

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, (pdfHeight - 10) / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 5;

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    }

    pdf.save('dual-citizenship-form-s.pdf');

    if (wasHidden) setShowPreview(false);
  };

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => window.print(), 100);
  };

  const formatLastSaved = (iso: string) => new Date(iso).toLocaleString();

  const requiredFields = [formData.applicationType, formData.eligibilityCategory, formData.fullName, formData.dateOfBirth, formData.nicNo, formData.sex, formData.affidavitDay];
  const progress = Math.round((requiredFields.filter(Boolean).length / requiredFields.length) * 100);

  const sections = ['Application Type', 'Personal Details', 'Foreign Citizenship', 'Sri Lankan Citizenship', 'Eligibility', 'Affidavit', 'Data Sheet', 'Personal Particulars'];

  const addChild = () => setFormData((prev) => ({ ...prev, children: [...prev.children, { name: '', dob: '', nationality: '' }] }));
  const removeChild = (i: number) => setFormData((prev) => ({ ...prev, children: prev.children.filter((_, idx) => idx !== i) }));

  const addAcademic = () => setFormData((prev) => ({ ...prev, academicQualifications: [...prev.academicQualifications, { degree: '', institution: '', period: '' }] }));
  const removeAcademic = (i: number) => setFormData((prev) => ({ ...prev, academicQualifications: prev.academicQualifications.filter((_, idx) => idx !== i) }));

  const addAsset = () => setFormData((prev) => ({ ...prev, assets: [...prev.assets, { details: '', deedNo: '', value: '' }] }));
  const removeAsset = (i: number) => setFormData((prev) => ({ ...prev, assets: prev.assets.filter((_, idx) => idx !== i) }));

  const addDeposit = () => setFormData((prev) => ({ ...prev, fixedDeposits: [...prev.fixedDeposits, { bank: '', accountNo: '', amount: '', maturity: '' }] }));
  const removeDeposit = (i: number) => setFormData((prev) => ({ ...prev, fixedDeposits: prev.fixedDeposits.filter((_, idx) => idx !== i) }));

  const addPpfChild = () => setFormData((prev) => ({ ...prev, ppfChildren: [...prev.ppfChildren, { name: '', sex: '', dob: '' }] }));
  const removePpfChild = (i: number) => setFormData((prev) => ({ ...prev, ppfChildren: prev.ppfChildren.filter((_, idx) => idx !== i) }));

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:hidden">
        <Link to="/form/form-dual-citizenship" className="inline-flex items-center gap-2 text-[#718096] hover:text-[#1A202C] mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Form Details
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-[#1A202C] mb-2">Dual Citizenship Application (Form "S")</h1>
          <p className="text-[#718096]">Citizenship Act No 18 of 1948 (Chapter 349)</p>

          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#718096]">Completion Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#3182CE] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {lastSaved && (
            <div className="mt-4 flex items-center gap-2 text-xs text-green-600">
              <Save className="w-3 h-3" />
              <span>Auto-saved: {formatLastSaved(lastSaved)}</span>
            </div>
          )}
        </div>

        {/* Original Form Toggle */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <button onClick={() => setShowOriginalForm(!showOriginalForm)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-[#3182CE]" />
              <span className="font-medium">View Original Form PDF</span>
            </div>
            {showOriginalForm ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {showOriginalForm && (
            <div className="border-t p-4 bg-gray-50">
              <iframe src="/forms/dual-citizenship-application.pdf" className="w-full h-[600px] border rounded-lg" title="Original Form" />
            </div>
          )}
        </div>

        {/* Section Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {sections.map((s, i) => (
              <button
                key={s}
                onClick={() => setCurrentSection(i)}
                className={`px-3 py-1.5 rounded-lg text-sm ${currentSection === i ? 'bg-[#3182CE] text-white' : 'bg-gray-100 text-[#4A5568] hover:bg-gray-200'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex justify-between">
          <button onClick={handleClearForm} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700">
            <Trash2 className="w-4 h-4" /> Clear Form
          </button>
          <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2 text-sm text-[#3182CE]">
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>

        {/* Form Sections */}
        <div className={showPreview ? 'hidden' : 'block'}>
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            {currentSection === 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-6 pb-4 border-b">Application Type & Eligibility</h2>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Application is submitted for <span className="text-red-500">*</span></label>
                  <div className="flex gap-6">
                    {['resumption', 'retention'].map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="applicationType" checked={formData.applicationType === type} onChange={() => handleChange('applicationType', type)} className="w-4 h-4" />
                        <span className="text-sm capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" value={formData.applicationDate} onChange={(e) => handleChange('applicationDate', e.target.value)} className="px-4 py-2 border rounded-lg text-sm w-48" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3">Eligibility Category <span className="text-red-500">*</span></label>
                  <div className="space-y-2">
                    {[
                      { v: 'A', l: 'A. Exceeds the age of 55 years' },
                      { v: 'B', l: 'B. Academic/professional qualifications (min 1 year diploma or higher)' },
                      { v: 'C', l: 'C. Owns assets/immovable properties worth Rs.2.5 million or above' },
                      { v: 'D', l: 'D. Fixed deposit of Rs.2.5 million (min 3 years) in Central Bank approved banks' },
                      { v: 'E', l: 'E. Fixed deposit USD 25,000 (min 3 years) under NRFC/RFC/SFIDA' },
                      { v: 'F', l: 'F. Invested USD 25,000 (min 3 years) under TB or SIA' },
                      { v: 'G', l: 'G. Spouse or unmarried child under 22 of dual citizenship holder' },
                    ].map((c) => (
                      <label key={c.v} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${formData.eligibilityCategory === c.v ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <input type="radio" name="eligibility" checked={formData.eligibilityCategory === c.v} onChange={() => handleChange('eligibilityCategory', c.v)} className="w-4 h-4 mt-0.5" />
                        <span className="text-sm">{c.l}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentSection === 1 && (
              <div>
                <h2 className="text-lg font-semibold mb-6 pb-4 border-b">2. Particulars relating to the applicant</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value.toUpperCase())} className="w-full px-4 py-2 border rounded-lg uppercase" placeholder="IN BLOCK CAPITALS" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name with Initials</label>
                    <input type="text" value={formData.nameWithInitials} onChange={(e) => handleChange('nameWithInitials', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Address (Sri Lankan)</label>
                      <textarea value={formData.addressSriLanka} onChange={(e) => handleChange('addressSriLanka', e.target.value)} rows={2} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Address (Foreign)</label>
                      <textarea value={formData.addressForeign} onChange={(e) => handleChange('addressForeign', e.target.value)} rows={2} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email Address (BLOCK CAPITALS)</label>
                    <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value.toUpperCase())} className="w-full px-4 py-2 border rounded-lg uppercase" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Contact (Foreign)</label>
                      <input type="tel" value={formData.contactForeign} onChange={(e) => handleChange('contactForeign', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Contact (Local)</label>
                      <input type="tel" value={formData.contactLocal} onChange={(e) => handleChange('contactLocal', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Date of Birth <span className="text-red-500">*</span></label>
                      <input type="date" value={formData.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Place of Birth</label>
                      <input type="text" value={formData.placeOfBirth} onChange={(e) => handleChange('placeOfBirth', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Birth Certificate No.</label>
                      <input type="text" value={formData.birthCertNo} onChange={(e) => handleChange('birthCertNo', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">District</label>
                      <input type="text" value={formData.birthCertDistrict} onChange={(e) => handleChange('birthCertDistrict', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nationality</label>
                    <input type="text" value={formData.nationality} onChange={(e) => handleChange('nationality', e.target.value)} className="w-48 px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">NIC Number <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.nicNo} onChange={(e) => handleChange('nicNo', e.target.value)} className="w-48 px-4 py-2 border rounded-lg font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Sex <span className="text-red-500">*</span></label>
                    <div className="flex gap-6">
                      {['male', 'female'].map((s) => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="sex" checked={formData.sex === s} onChange={() => handleChange('sex', s)} className="w-4 h-4" />
                          <span className="text-sm capitalize">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium mb-1">If married - Spouse's Name</label>
                    <input type="text" value={formData.spouseName} onChange={(e) => handleChange('spouseName', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nationality of Spouse</label>
                    <input type="text" value={formData.spouseNationality} onChange={(e) => handleChange('spouseNationality', e.target.value)} className="w-48 px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Children applying for Dual Citizenship</label>
                    {formData.children.map((c, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input type="text" placeholder="Name" value={c.name} onChange={(e) => { const arr = [...formData.children]; arr[i].name = e.target.value; handleChange('children', arr); }} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                        <input type="date" value={c.dob} onChange={(e) => { const arr = [...formData.children]; arr[i].dob = e.target.value; handleChange('children', arr); }} className="w-36 px-3 py-2 border rounded-lg text-sm" />
                        <input type="text" placeholder="Nationality" value={c.nationality} onChange={(e) => { const arr = [...formData.children]; arr[i].nationality = e.target.value; handleChange('children', arr); }} className="w-28 px-3 py-2 border rounded-lg text-sm" />
                        <button onClick={() => removeChild(i)} className="p-2 text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={addChild} className="flex items-center gap-2 text-sm text-[#3182CE]"><Plus className="w-4 h-4" /> Add Child</button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Profession or Occupation</label>
                    <input type="text" value={formData.profession} onChange={(e) => handleChange('profession', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                </div>
              </div>
            )}

            {currentSection === 2 && (
              <div>
                <h2 className="text-lg font-semibold mb-6 pb-4 border-b">3. Particulars relating to applicant's Foreign Citizenship</h2>
                <p className="text-xs text-[#718096] mb-4 bg-blue-50 p-3 rounded-lg">(Applicable only for applicants under section 19(2) - Resumption)</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">1. Citizenship at Birth</label>
                    <input type="text" value={formData.citizenshipAtBirth} onChange={(e) => handleChange('citizenshipAtBirth', e.target.value)} className="w-full max-w-md px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">2. Country of Present Citizenship</label>
                    <input type="text" value={formData.countryOfPresentCitizenship} onChange={(e) => handleChange('countryOfPresentCitizenship', e.target.value)} className="w-full max-w-md px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">3. Date of acquiring present Citizenship</label>
                    <input type="date" value={formData.dateAcquiringCitizenship} onChange={(e) => handleChange('dateAcquiringCitizenship', e.target.value)} className="w-48 px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">4. Citizenship certificate number</label>
                    <input type="text" value={formData.citizenshipCertNo} onChange={(e) => handleChange('citizenshipCertNo', e.target.value)} className="w-full max-w-md px-4 py-2 border rounded-lg" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">5. Foreign passport number</label>
                      <input type="text" value={formData.foreignPassportNo} onChange={(e) => handleChange('foreignPassportNo', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date of issue</label>
                      <input type="date" value={formData.foreignPassportDateOfIssue} onChange={(e) => handleChange('foreignPassportDateOfIssue', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentSection === 3 && (
              <div>
                <h2 className="text-lg font-semibold mb-6 pb-4 border-b">4. Particulars relating to applicant's Sri Lankan Citizenship</h2>
                <div className="space-y-4">
                  <h3 className="font-medium">1. Details of applicant's parents</h3>
                  <div className="grid md:grid-cols-2 gap-4 pl-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">I. Father's Name</label>
                      <input type="text" value={formData.fatherName} onChange={(e) => handleChange('fatherName', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">II. Date & Place of Birth</label>
                      <input type="text" value={formData.fatherDatePlaceOfBirth} onChange={(e) => handleChange('fatherDatePlaceOfBirth', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">III. Mother's Name</label>
                      <input type="text" value={formData.motherName} onChange={(e) => handleChange('motherName', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">IV. Date & Place of Birth</label>
                      <input type="text" value={formData.motherDatePlaceOfBirth} onChange={(e) => handleChange('motherDatePlaceOfBirth', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <h3 className="font-medium mt-6">2. If parents are Citizens by Registration</h3>
                  <div className="grid md:grid-cols-2 gap-4 pl-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Father - Certificate No</label>
                      <input type="text" value={formData.fatherCertNo} onChange={(e) => handleChange('fatherCertNo', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date of Issue</label>
                      <input type="date" value={formData.fatherCertDateOfIssue} onChange={(e) => handleChange('fatherCertDateOfIssue', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Mother - Certificate No</label>
                      <input type="text" value={formData.motherCertNo} onChange={(e) => handleChange('motherCertNo', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date of Issue</label>
                      <input type="date" value={formData.motherCertDateOfIssue} onChange={(e) => handleChange('motherCertDateOfIssue', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <h3 className="font-medium mt-6">3. Sri Lankan Passport Details</h3>
                  <div className="grid md:grid-cols-3 gap-4 pl-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Number</label>
                      <input type="text" value={formData.slPassportNo} onChange={(e) => handleChange('slPassportNo', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date of Issue</label>
                      <input type="date" value={formData.slPassportDateOfIssue} onChange={(e) => handleChange('slPassportDateOfIssue', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Place of Issue</label>
                      <input type="text" value={formData.slPassportPlaceOfIssue} onChange={(e) => handleChange('slPassportPlaceOfIssue', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg mt-6">
                    <h3 className="font-medium mb-3">4. Permanent Residence Status (for Retention 19(3))</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Country</label>
                        <input type="text" value={formData.prCountry} onChange={(e) => handleChange('prCountry', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Date Granted</label>
                        <input type="date" value={formData.prDateGranted} onChange={(e) => handleChange('prDateGranted', e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <h3 className="font-medium mb-3">5. Reasons for application</h3>
                    <textarea value={formData.reasonsForApplication} onChange={(e) => handleChange('reasonsForApplication', e.target.value)} rows={4} placeholder="State reasons for resuming/retaining Sri Lankan citizenship" className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                </div>
              </div>
            )}

            {currentSection === 4 && (
              <div>
                <h2 className="text-lg font-semibold mb-6 pb-4 border-b">6. Details relating to the eligibility</h2>
                {!formData.eligibilityCategory && <p className="text-amber-700 bg-amber-50 p-3 rounded-lg text-sm">Please select an eligibility category first.</p>}
                {formData.eligibilityCategory === 'B' && (
                  <div className="mb-8">
                    <h3 className="font-medium bg-gray-50 p-3 rounded-lg mb-4">I. Academic / Professional Qualification (Category B)</h3>
                    {formData.academicQualifications.map((q, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input type="text" placeholder="Degree/Diploma" value={q.degree} onChange={(e) => { const arr = [...formData.academicQualifications]; arr[i].degree = e.target.value; handleChange('academicQualifications', arr); }} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                        <input type="text" placeholder="Institution" value={q.institution} onChange={(e) => { const arr = [...formData.academicQualifications]; arr[i].institution = e.target.value; handleChange('academicQualifications', arr); }} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                        <input type="text" placeholder="Period" value={q.period} onChange={(e) => { const arr = [...formData.academicQualifications]; arr[i].period = e.target.value; handleChange('academicQualifications', arr); }} className="w-28 px-3 py-2 border rounded-lg text-sm" />
                        <button onClick={() => removeAcademic(i)} className="p-2 text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={addAcademic} className="flex items-center gap-2 text-sm text-[#3182CE]"><Plus className="w-4 h-4" /> Add Qualification</button>
                  </div>
                )}
                {formData.eligibilityCategory === 'C' && (
                  <div className="mb-8">
                    <h3 className="font-medium bg-gray-50 p-3 rounded-lg mb-4">II. Assets / Immovable Properties (Category C)</h3>
                    {formData.assets.map((a, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input type="text" placeholder="Details" value={a.details} onChange={(e) => { const arr = [...formData.assets]; arr[i].details = e.target.value; handleChange('assets', arr); }} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                        <input type="text" placeholder="Deed No" value={a.deedNo} onChange={(e) => { const arr = [...formData.assets]; arr[i].deedNo = e.target.value; handleChange('assets', arr); }} className="w-32 px-3 py-2 border rounded-lg text-sm" />
                        <input type="text" placeholder="Value (LKR)" value={a.value} onChange={(e) => { const arr = [...formData.assets]; arr[i].value = e.target.value; handleChange('assets', arr); }} className="w-36 px-3 py-2 border rounded-lg text-sm" />
                        <button onClick={() => removeAsset(i)} className="p-2 text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={addAsset} className="flex items-center gap-2 text-sm text-[#3182CE]"><Plus className="w-4 h-4" /> Add Asset</button>
                  </div>
                )}
                {['D', 'E'].includes(formData.eligibilityCategory) && (
                  <div className="mb-8">
                    <h3 className="font-medium bg-gray-50 p-3 rounded-lg mb-4">III. Fixed Deposit (Category D & E)</h3>
                    {formData.fixedDeposits.map((d, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input type="text" placeholder="Bank" value={d.bank} onChange={(e) => { const arr = [...formData.fixedDeposits]; arr[i].bank = e.target.value; handleChange('fixedDeposits', arr); }} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                        <input type="text" placeholder="Account No" value={d.accountNo} onChange={(e) => { const arr = [...formData.fixedDeposits]; arr[i].accountNo = e.target.value; handleChange('fixedDeposits', arr); }} className="w-32 px-3 py-2 border rounded-lg text-sm" />
                        <input type="text" placeholder="Amount" value={d.amount} onChange={(e) => { const arr = [...formData.fixedDeposits]; arr[i].amount = e.target.value; handleChange('fixedDeposits', arr); }} className="w-32 px-3 py-2 border rounded-lg text-sm" />
                        <input type="date" value={d.maturity} onChange={(e) => { const arr = [...formData.fixedDeposits]; arr[i].maturity = e.target.value; handleChange('fixedDeposits', arr); }} className="w-36 px-3 py-2 border rounded-lg text-sm" />
                        <button onClick={() => removeDeposit(i)} className="p-2 text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={addDeposit} className="flex items-center gap-2 text-sm text-[#3182CE]"><Plus className="w-4 h-4" /> Add Deposit</button>
                  </div>
                )}
              </div>
            )}

            {currentSection === 5 && (
              <div>
                <h2 className="text-lg font-semibold mb-6 pb-4 border-b">Affidavit</h2>
                <div className="bg-gray-50 p-4 rounded-lg mb-6 text-sm">
                  <p>I, <strong>{formData.fullName || '_____'}</strong>, do solemnly, sincerely and truly declare and affirm/swear that the information I have provided in this form is true and correct. I make this statement conscientiously believing the same to be true. I have not been convicted of a crime or offence either by courts or by any law enforcement authority, in Sri Lanka or in any other country. I am aware that the submission of false or incorrect information and forged documents is a punishable offence and I can be convicted under prevailing laws of Sri Lanka and that my Dual Citizenship may liable for cancellation. I am also aware that I have no right to make a request for refund of any payments made in this connection.</p>
                </div>
                <div className="flex gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Day <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.affidavitDay} onChange={(e) => handleChange('affidavitDay', e.target.value)} maxLength={2} className="w-16 px-3 py-2 border rounded-lg text-center" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Month</label>
                    <input type="text" value={formData.affidavitMonth} onChange={(e) => handleChange('affidavitMonth', e.target.value)} className="w-28 px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Year</label>
                    <input type="text" value={formData.affidavitYear} onChange={(e) => handleChange('affidavitYear', e.target.value)} maxLength={4} className="w-20 px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Place</label>
                    <input type="text" value={formData.affidavitPlace} onChange={(e) => handleChange('affidavitPlace', e.target.value)} className="w-40 px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800"><strong>Note:</strong> This affidavit must be signed before a Justice of the Peace or Commissioner of Oaths.</p>
                </div>
              </div>
            )}

            {currentSection === 6 && (
              <div>
                <h2 className="text-lg font-semibold mb-6 pb-4 border-b">COMPUTERISED DATA SHEET</h2>
                <p className="text-xs text-[#718096] mb-4">*Please fill in Block Letters</p>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">1. Full Name</label><input type="text" value={formData.dsFullName} onChange={(e) => handleChange('dsFullName', e.target.value.toUpperCase())} className="w-full px-4 py-2 border rounded-lg uppercase" /></div>
                  <div><label className="block text-sm font-medium mb-1">2. Address</label><textarea value={formData.dsAddress} onChange={(e) => handleChange('dsAddress', e.target.value.toUpperCase())} rows={2} className="w-full px-4 py-2 border rounded-lg uppercase" /></div>
                  <div><label className="block text-sm font-medium mb-1">3. Profession</label><input type="text" value={formData.dsProfession} onChange={(e) => handleChange('dsProfession', e.target.value.toUpperCase())} className="w-full px-4 py-2 border rounded-lg uppercase" /></div>
                  <div className="flex gap-4">
                    <div><label className="block text-sm font-medium mb-1">4. DOB - Day</label><input type="text" value={formData.dsDobDay} onChange={(e) => handleChange('dsDobDay', e.target.value)} maxLength={2} className="w-16 px-3 py-2 border rounded-lg text-center" /></div>
                    <div><label className="block text-sm font-medium mb-1">Month</label><input type="text" value={formData.dsDobMonth} onChange={(e) => handleChange('dsDobMonth', e.target.value)} maxLength={2} className="w-16 px-3 py-2 border rounded-lg text-center" /></div>
                    <div><label className="block text-sm font-medium mb-1">Year</label><input type="text" value={formData.dsDobYear} onChange={(e) => handleChange('dsDobYear', e.target.value)} maxLength={4} className="w-20 px-3 py-2 border rounded-lg text-center" /></div>
                  </div>
                  <div><label className="block text-sm font-medium mb-1">5. Place of Birth</label><input type="text" value={formData.dsPlaceOfBirth} onChange={(e) => handleChange('dsPlaceOfBirth', e.target.value.toUpperCase())} className="w-full px-4 py-2 border rounded-lg uppercase" /></div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">6. Father with Initials</label><input type="text" value={formData.dsFatherName} onChange={(e) => handleChange('dsFatherName', e.target.value.toUpperCase())} className="w-full px-4 py-2 border rounded-lg uppercase" /></div>
                    <div><label className="block text-sm font-medium mb-1">7. Mother with Initials</label><input type="text" value={formData.dsMotherName} onChange={(e) => handleChange('dsMotherName', e.target.value.toUpperCase())} className="w-full px-4 py-2 border rounded-lg uppercase" /></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">8. Claim to Citizenship</label>
                    <div className="flex gap-6">
                      {['descent', 'registration'].map((t) => (
                        <label key={t} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="dsClaimToCitizenship" checked={formData.dsClaimToCitizenship === t} onChange={() => handleChange('dsClaimToCitizenship', t)} className="w-4 h-4" />
                          <span className="text-sm capitalize">By {t}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div><label className="block text-sm font-medium mb-1">9. Other Nationality</label><input type="text" value={formData.dsOtherNationality} onChange={(e) => handleChange('dsOtherNationality', e.target.value.toUpperCase())} className="w-full px-4 py-2 border rounded-lg uppercase" /></div>
                  <div><label className="block text-sm font-medium mb-1">10. E-Mail</label><input type="email" value={formData.dsEmail} onChange={(e) => handleChange('dsEmail', e.target.value.toUpperCase())} className="w-full px-4 py-2 border rounded-lg uppercase" /></div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">11. Phone - Local</label><input type="tel" value={formData.dsPhoneLocal} onChange={(e) => handleChange('dsPhoneLocal', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Foreign</label><input type="tel" value={formData.dsPhoneForeign} onChange={(e) => handleChange('dsPhoneForeign', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">12. Local Contact Name</label><input type="text" value={formData.dsContactName} onChange={(e) => handleChange('dsContactName', e.target.value.toUpperCase())} className="w-full px-4 py-2 border rounded-lg uppercase" /></div>
                    <div><label className="block text-sm font-medium mb-1">Contact Number</label><input type="tel" value={formData.dsContactNumber} onChange={(e) => handleChange('dsContactNumber', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                  </div>
                </div>
              </div>
            )}

            {currentSection === 7 && (
              <div>
                <h2 className="text-lg font-semibold mb-6 pb-4 border-b">PERSONAL PARTICULARS FORM</h2>
                <p className="text-xs text-[#718096] mb-4">Fill in BLOCK Letters only. All details should be provided.</p>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">01. Name in Full</label><input type="text" value={formData.ppfFullName} onChange={(e) => handleChange('ppfFullName', e.target.value.toUpperCase())} className="w-full px-4 py-2 border rounded-lg uppercase" /></div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium mb-1">02. Date of Birth</label><input type="date" value={formData.ppfDob} onChange={(e) => handleChange('ppfDob', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Place of Birth</label><input type="text" value={formData.ppfPlaceOfBirth} onChange={(e) => handleChange('ppfPlaceOfBirth', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">Country of Birth</label><input type="text" value={formData.ppfCountryOfBirth} onChange={(e) => handleChange('ppfCountryOfBirth', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">03. Gender</label>
                    <div className="flex gap-6">{['male', 'female'].map((g) => (<label key={g} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="ppfGender" checked={formData.ppfGender === g} onChange={() => handleChange('ppfGender', g)} className="w-4 h-4" /><span className="text-sm capitalize">{g}</span></label>))}</div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">04. Country of present Citizenship</label><input type="text" value={formData.ppfCountryOfCitizenship} onChange={(e) => handleChange('ppfCountryOfCitizenship', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">05. Date of acquiring citizenship</label><input type="date" value={formData.ppfDateAcquiringCitizenship} onChange={(e) => handleChange('ppfDateAcquiringCitizenship', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">06. Previous Citizenship</label><input type="text" value={formData.ppfPreviousCitizenship} onChange={(e) => handleChange('ppfPreviousCitizenship', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium mb-1">07. Profession / Occupation</label><input type="text" value={formData.ppfProfession} onChange={(e) => handleChange('ppfProfession', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                  </div>
                  <div><label className="block text-sm font-medium mb-1">08. E-mail Address</label><input type="email" value={formData.ppfEmail} onChange={(e) => handleChange('ppfEmail', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">09. Sri Lankan N.I.C. No</label><input type="text" value={formData.ppfNicNo} onChange={(e) => handleChange('ppfNicNo', e.target.value)} className="w-full px-4 py-2 border rounded-lg font-mono" /></div>
                    <div><label className="block text-sm font-medium mb-1">Date of Issue</label><input type="date" value={formData.ppfNicDateOfIssue} onChange={(e) => handleChange('ppfNicDateOfIssue', e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <label className="block text-sm font-medium mb-2">17. Particulars of Children</label>
                    {formData.ppfChildren.map((c, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input type="text" placeholder="Name" value={c.name} onChange={(e) => { const arr = [...formData.ppfChildren]; arr[i].name = e.target.value; handleChange('ppfChildren', arr); }} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                        <select value={c.sex} onChange={(e) => { const arr = [...formData.ppfChildren]; arr[i].sex = e.target.value; handleChange('ppfChildren', arr); }} className="w-24 px-3 py-2 border rounded-lg text-sm"><option value="">Sex</option><option value="M">M</option><option value="F">F</option></select>
                        <input type="date" value={c.dob} onChange={(e) => { const arr = [...formData.ppfChildren]; arr[i].dob = e.target.value; handleChange('ppfChildren', arr); }} className="w-36 px-3 py-2 border rounded-lg text-sm" />
                        <button onClick={() => removePpfChild(i)} className="p-2 text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={addPpfChild} className="flex items-center gap-2 text-sm text-[#3182CE]"><Plus className="w-4 h-4" /> Add Child</button>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <label className="block text-sm font-medium mb-1">22. Organization membership</label>
                    <textarea value={formData.ppfOrganization} onChange={(e) => handleChange('ppfOrganization', e.target.value)} rows={2} placeholder="Were you a member of cultural, social, religious or political organization in Sri Lanka?" className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">23. Conviction details</label>
                    <textarea value={formData.ppfConviction} onChange={(e) => handleChange('ppfConviction', e.target.value)} rows={2} placeholder="Have you been convicted or punished in a court of law, in any country?" className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div><label className="block text-sm font-medium mb-1">Declaration Date</label><input type="date" value={formData.ppfDeclarationDate} onChange={(e) => handleChange('ppfDeclarationDate', e.target.value)} className="w-48 px-4 py-2 border rounded-lg" /></div>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button variant="outline" onClick={() => setCurrentSection(Math.max(0, currentSection - 1))} disabled={currentSection === 0}>Previous</Button>
              <Button variant="primary" onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))} disabled={currentSection === sections.length - 1}>Next</Button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className={showPreview ? 'block' : 'hidden'}>
          <div className="bg-white rounded-xl border p-4 mb-6 overflow-x-auto">
            <div ref={printRef} className="bg-white min-w-[210mm]" style={{ fontFamily: 'Times New Roman, serif', fontSize: '11pt' }}>

              {/* PAGE 1 */}
              <div className="p-8 border-b-2 border-dashed border-gray-300" style={{ minHeight: '297mm' }}>
                <div className="text-center mb-4">
                  <h1 className="font-bold text-base">APPLICATION FOR DUAL CITIZENSHIP</h1>
                  <div className="text-right text-sm">Form "S"</div>
                </div>
                <div className="flex justify-between mb-4 text-xs">
                  <div>
                    <p className="text-[10px]">(For Office use only)</p>
                    <p>File No. : _______________</p>
                    <p>Certificate No. : _______________</p>
                  </div>
                  <div className="w-28 h-36 border border-black flex items-center justify-center text-center text-xs">
                    <div><p>Photo</p><p>3.5cm x 4.5cm</p></div>
                  </div>
                </div>
                <div className="text-[10px] mb-4">
                  <p>1) To be completed in "BLOCK CAPITALS"</p>
                  <p>2) Please follow instructions on page 7, 8 & 9 before perfecting this application.</p>
                  <p>3) Each member of the family has to submit a separate application. * Delete whatever inapplicable.</p>
                </div>
                <div className="text-center mb-4">
                  <p className="font-bold text-sm">Citizenship Act No 18 of 1948 (Chapter 349)</p>
                  <p className="text-[10px] mt-2">Application for a certificate of Resumption / Retention* Citizenship of Sri Lanka whilst being a citizen of a country other than Sri Lanka under section 19(2) or 19(3).*</p>
                </div>
                <p className="text-[10px] mb-4">I, the undersigned who is / desirous of being* a citizen of a country other than Sri Lanka and to whom the following particulars relate, hereby apply to the Ministry of Public Order and Christian Affairs for a certificate relating to a declaration that I have resumed / retained* the status of a citizen of Sri Lanka under section 19(2) / 19(3)* of the Citizenship Act No. 18 of 1948 as amended by Act No. 45 of 1987.</p>
                <div className="flex justify-between mb-6 text-sm">
                  <div><div className="border-b border-black w-32 pb-1 min-h-[18px]">{formData.applicationDate}</div><p className="text-[10px]">Date</p></div>
                  <div className="text-right"><div className="border-b border-black w-48 pb-1">_______________</div><p className="text-[10px]">Signature of Applicant</p></div>
                </div>
                <div className="mb-4 text-sm">
                  <p className="font-medium">The application is submitted for:</p>
                  <div className="flex gap-8 mt-2">
                    <div className="flex items-center gap-2"><div className="w-5 h-5 border border-black flex items-center justify-center text-xs">{formData.applicationType === 'resumption' ? '✓' : ''}</div><span>Resumption</span></div>
                    <div className="flex items-center gap-2"><div className="w-5 h-5 border border-black flex items-center justify-center text-xs">{formData.applicationType === 'retention' ? '✓' : ''}</div><span>Retention</span></div>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="font-bold underline text-sm">1. Eligible categories for Dual Citizenship</p>
                  <p className="text-[10px] mt-1">Any applicant who belongs to one of the following categories can apply for dual citizenship. Mark (√) in the relevant cage.</p>
                </div>
                <div className="space-y-2 text-[10px]">
                  {[
                    { v: 'A', l: 'A. As an applicant who exceeds the age of 55 years.' },
                    { v: 'B', l: 'B. As an applicant who fulfills the Academic / professional qualifications. (minimum one year diploma or higher or any professional qualification.)' },
                  ].map((c) => (
                    <div key={c.v} className="flex items-start gap-2">
                      <div className="w-4 h-4 border border-black flex-shrink-0 flex items-center justify-center text-[8px]">{formData.eligibilityCategory === c.v ? '✓' : ''}</div>
                      <span>{c.l}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-[10px] mt-6">1</p>
              </div>

              {/* PAGE 2 */}
              <div className="p-8 border-b-2 border-dashed border-gray-300" style={{ minHeight: '297mm' }}>
                <div className="space-y-2 text-[10px] mb-6">
                  {[
                    { v: 'C', l: 'C. As an applicant who owns assets / immovable properties worth Rs.2.5 million or above in Sri Lanka as his / her own and in his / her name.' },
                    { v: 'D', l: 'D. As an applicant who has deposited a sum of not less than Rs. 2.5 million for a period of not less than 03 (three) years in any commercial bank in Sri Lanka, approved by the Central Bank of Sri Lanka.' },
                    { v: 'E', l: 'E. As an applicant who has a fixed deposit of US$ 25,000 or its equivalent in other convertible foreign currency in a Non Resident Foreign Currency (NRFC), Resident Foreign Currency (RFC) account under Special Foreign Investment Deposit Account (SFIDA) in a commercial bank approved by the Central Bank of Sri Lanka for a minimum period of three years at the time of submission of the application.' },
                    { v: 'F', l: 'F. As an applicant who has invested a sum of not less than US$ 25,000 or its equivalent in other convertible foreign currency for a period of 03 (three) years to mature from the date of investment, in Treasury Bonds (TB) or in any Securities Investment Account (SIA) in any commercial bank in Sri Lanka approved by the Central Bank of Sri Lanka.' },
                    { v: 'G', l: 'G. As a spouse or unmarried child under the age of 22 years of a person who holds the Sri Lankan dual citizenship and if the application is submitted together with the applicant.' },
                  ].map((c) => (
                    <div key={c.v} className="flex items-start gap-2">
                      <div className="w-4 h-4 border border-black flex-shrink-0 flex items-center justify-center text-[8px]">{formData.eligibilityCategory === c.v ? '✓' : ''}</div>
                      <span>{c.l}</span>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <p className="font-bold underline text-sm">2. Particulars relating to the applicant:</p>
                </div>

                <table className="w-full text-[10px] border-collapse mb-4">
                  <tbody>
                    <tr className="border border-black">
                      <td className="border border-black p-2 w-8">1.</td>
                      <td className="border border-black p-2">Name in full (in Block Capitals)</td>
                      <td className="border border-black p-2 uppercase font-medium">{formData.fullName}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">2.</td>
                      <td className="border border-black p-2">Name with Initials</td>
                      <td className="border border-black p-2">{formData.nameWithInitials}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2" rowSpan={2}>3.</td>
                      <td className="border border-black p-2">(i) Present address in Sri Lanka</td>
                      <td className="border border-black p-2">{formData.addressSriLanka}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">(ii) Present address in foreign country</td>
                      <td className="border border-black p-2">{formData.addressForeign}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">4.</td>
                      <td className="border border-black p-2">E-mail address (in Block Capitals)</td>
                      <td className="border border-black p-2 uppercase">{formData.email}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2" rowSpan={2}>5.</td>
                      <td className="border border-black p-2">(i) Telephone No (Foreign)</td>
                      <td className="border border-black p-2">{formData.contactForeign}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">(ii) Telephone No (Local)</td>
                      <td className="border border-black p-2">{formData.contactLocal}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">6.</td>
                      <td className="border border-black p-2">Date of Birth</td>
                      <td className="border border-black p-2">{formData.dateOfBirth}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">7.</td>
                      <td className="border border-black p-2">Place of Birth</td>
                      <td className="border border-black p-2">{formData.placeOfBirth}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2" rowSpan={2}>8.</td>
                      <td className="border border-black p-2">(i) Birth Certificate No.</td>
                      <td className="border border-black p-2">{formData.birthCertNo}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">(ii) District</td>
                      <td className="border border-black p-2">{formData.birthCertDistrict}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">9.</td>
                      <td className="border border-black p-2">Nationality</td>
                      <td className="border border-black p-2">{formData.nationality}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-center text-[10px] mt-6">2</p>
              </div>

              {/* PAGE 3 */}
              <div className="p-8 border-b-2 border-dashed border-gray-300" style={{ minHeight: '297mm' }}>
                <table className="w-full text-[10px] border-collapse mb-4">
                  <tbody>
                    <tr className="border border-black">
                      <td className="border border-black p-2 w-8">10.</td>
                      <td className="border border-black p-2">National Identity Card No.</td>
                      <td className="border border-black p-2 font-mono">{formData.nicNo}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">11.</td>
                      <td className="border border-black p-2">Sex</td>
                      <td className="border border-black p-2">
                        <span className="mr-4">Male <span className="inline-block w-4 h-4 border border-black text-center align-middle">{formData.sex === 'male' ? '✓' : ''}</span></span>
                        <span>Female <span className="inline-block w-4 h-4 border border-black text-center align-middle">{formData.sex === 'female' ? '✓' : ''}</span></span>
                      </td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2" rowSpan={2}>12.</td>
                      <td className="border border-black p-2">(i) If married - name of spouse</td>
                      <td className="border border-black p-2">{formData.spouseName}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">(ii) Nationality of spouse</td>
                      <td className="border border-black p-2">{formData.spouseNationality}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mb-4">
                  <p className="text-[10px] mb-2">13. Particulars of children, if applying for Dual Citizenship simultaneously:</p>
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="border border-black bg-gray-50">
                        <th className="border border-black p-2">No.</th>
                        <th className="border border-black p-2">Name</th>
                        <th className="border border-black p-2">Date of Birth</th>
                        <th className="border border-black p-2">Nationality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <tr key={i} className="border border-black">
                          <td className="border border-black p-2 text-center">{i + 1}</td>
                          <td className="border border-black p-2">{formData.children[i]?.name || ''}</td>
                          <td className="border border-black p-2">{formData.children[i]?.dob || ''}</td>
                          <td className="border border-black p-2">{formData.children[i]?.nationality || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <table className="w-full text-[10px] border-collapse mb-6">
                  <tbody>
                    <tr className="border border-black">
                      <td className="border border-black p-2 w-8">14.</td>
                      <td className="border border-black p-2">Profession or Occupation</td>
                      <td className="border border-black p-2">{formData.profession}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mb-4">
                  <p className="font-bold underline text-sm">3. Particulars relating to applicant's Foreign Citizenship</p>
                  <p className="text-[9px] italic">(Applicable only for applicants under section 19(2))</p>
                </div>

                <table className="w-full text-[10px] border-collapse mb-6">
                  <tbody>
                    <tr className="border border-black">
                      <td className="border border-black p-2 w-8">1.</td>
                      <td className="border border-black p-2">Citizenship at Birth</td>
                      <td className="border border-black p-2">{formData.citizenshipAtBirth}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">2.</td>
                      <td className="border border-black p-2">Country of Present Citizenship</td>
                      <td className="border border-black p-2">{formData.countryOfPresentCitizenship}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">3.</td>
                      <td className="border border-black p-2">Date of acquiring present Citizenship</td>
                      <td className="border border-black p-2">{formData.dateAcquiringCitizenship}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">4.</td>
                      <td className="border border-black p-2">Citizenship certificate number</td>
                      <td className="border border-black p-2">{formData.citizenshipCertNo}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">5.</td>
                      <td className="border border-black p-2">Foreign passport number & date of issue</td>
                      <td className="border border-black p-2">{formData.foreignPassportNo} {formData.foreignPassportDateOfIssue && `(${formData.foreignPassportDateOfIssue})`}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mb-4">
                  <p className="font-bold underline text-sm">4. Particulars relating to applicant's Sri Lankan Citizenship</p>
                </div>

                <table className="w-full text-[10px] border-collapse">
                  <tbody>
                    <tr className="border border-black">
                      <td className="border border-black p-2 w-8" rowSpan={4}>1.</td>
                      <td className="border border-black p-2" colSpan={2}>Details of applicant's parents</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">(i) Father's Name</td>
                      <td className="border border-black p-2">{formData.fatherName}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">(ii) Date & Place of Birth</td>
                      <td className="border border-black p-2">{formData.fatherDatePlaceOfBirth}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">(iii) Mother's Name</td>
                      <td className="border border-black p-2">{formData.motherName}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-center text-[10px] mt-6">3</p>
              </div>

              {/* PAGE 4 */}
              <div className="p-8 border-b-2 border-dashed border-gray-300" style={{ minHeight: '297mm' }}>
                <table className="w-full text-[10px] border-collapse mb-6">
                  <tbody>
                    <tr className="border border-black">
                      <td className="border border-black p-2 w-8"></td>
                      <td className="border border-black p-2">(iv) Date & Place of Birth</td>
                      <td className="border border-black p-2">{formData.motherDatePlaceOfBirth}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2" rowSpan={4}>2.</td>
                      <td className="border border-black p-2" colSpan={2}>If parents are Citizens by Registration</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">(i) Father - Certificate No</td>
                      <td className="border border-black p-2">{formData.fatherCertNo}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">(ii) Date of Issue</td>
                      <td className="border border-black p-2">{formData.fatherCertDateOfIssue}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">(iii) Mother - Certificate No & Date</td>
                      <td className="border border-black p-2">{formData.motherCertNo} {formData.motherCertDateOfIssue && `(${formData.motherCertDateOfIssue})`}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2" rowSpan={3}>3.</td>
                      <td className="border border-black p-2" colSpan={2}>Sri Lankan Passport Details</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">(i) Passport Number</td>
                      <td className="border border-black p-2">{formData.slPassportNo}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">(ii) Date & Place of Issue</td>
                      <td className="border border-black p-2">{formData.slPassportDateOfIssue} {formData.slPassportPlaceOfIssue && `- ${formData.slPassportPlaceOfIssue}`}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mb-4">
                  <p className="font-bold underline text-sm">5. Permanent Residence Status (Applicable under 19(3))</p>
                </div>

                <table className="w-full text-[10px] border-collapse mb-6">
                  <tbody>
                    <tr className="border border-black">
                      <td className="border border-black p-2 w-8">1.</td>
                      <td className="border border-black p-2">Country</td>
                      <td className="border border-black p-2">{formData.prCountry}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">2.</td>
                      <td className="border border-black p-2">Date Granted</td>
                      <td className="border border-black p-2">{formData.prDateGranted}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mb-4">
                  <p className="text-[10px] font-medium">Reasons for resuming/retaining Sri Lankan citizenship:</p>
                  <div className="border border-black p-2 min-h-[60px] text-[10px]">{formData.reasonsForApplication}</div>
                </div>

                <div className="mb-4">
                  <p className="font-bold underline text-sm">6. Details relating to the eligibility</p>
                </div>

                <div className="mb-4">
                  <p className="text-[10px] font-medium">I. Academic / Professional Qualification (Category B)</p>
                  <table className="w-full text-[10px] border-collapse mt-2">
                    <thead>
                      <tr className="border border-black bg-gray-50">
                        <th className="border border-black p-2">No.</th>
                        <th className="border border-black p-2">Degree / Diploma obtained</th>
                        <th className="border border-black p-2">Name of Institution</th>
                        <th className="border border-black p-2">Period of Study</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2].map((i) => (
                        <tr key={i} className="border border-black">
                          <td className="border border-black p-2 text-center">{i + 1}</td>
                          <td className="border border-black p-2">{formData.academicQualifications[i]?.degree || ''}</td>
                          <td className="border border-black p-2">{formData.academicQualifications[i]?.institution || ''}</td>
                          <td className="border border-black p-2">{formData.academicQualifications[i]?.period || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-center text-[10px] mt-6">4</p>
              </div>

              {/* PAGE 5 */}
              <div className="p-8 border-b-2 border-dashed border-gray-300" style={{ minHeight: '297mm' }}>
                <div className="mb-6">
                  <p className="text-[10px] font-medium">Professional Qualifications</p>
                  <table className="w-full text-[10px] border-collapse mt-2">
                    <thead>
                      <tr className="border border-black bg-gray-50">
                        <th className="border border-black p-2">No.</th>
                        <th className="border border-black p-2">Qualification</th>
                        <th className="border border-black p-2">Name of Institution</th>
                        <th className="border border-black p-2">Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2].map((i) => (
                        <tr key={i} className="border border-black">
                          <td className="border border-black p-2 text-center">{i + 1}</td>
                          <td className="border border-black p-2">{formData.professionalQualifications[i]?.qualification || ''}</td>
                          <td className="border border-black p-2">{formData.professionalQualifications[i]?.institution || ''}</td>
                          <td className="border border-black p-2">{formData.professionalQualifications[i]?.period || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mb-6">
                  <p className="text-[10px] font-medium">II. Assets / Immovable Properties (Category C)</p>
                  <table className="w-full text-[10px] border-collapse mt-2">
                    <thead>
                      <tr className="border border-black bg-gray-50">
                        <th className="border border-black p-2">No.</th>
                        <th className="border border-black p-2">Details of Assets</th>
                        <th className="border border-black p-2">Deed No</th>
                        <th className="border border-black p-2">Value (LKR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <tr key={i} className="border border-black">
                          <td className="border border-black p-2 text-center">{i + 1}</td>
                          <td className="border border-black p-2">{formData.assets[i]?.details || ''}</td>
                          <td className="border border-black p-2">{formData.assets[i]?.deedNo || ''}</td>
                          <td className="border border-black p-2">{formData.assets[i]?.value || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mb-6">
                  <p className="text-[10px] font-medium">III. Fixed Deposit (Category D & E)</p>
                  <table className="w-full text-[10px] border-collapse mt-2">
                    <thead>
                      <tr className="border border-black bg-gray-50">
                        <th className="border border-black p-2">No.</th>
                        <th className="border border-black p-2">Name of Bank</th>
                        <th className="border border-black p-2">Account No</th>
                        <th className="border border-black p-2">Amount</th>
                        <th className="border border-black p-2">Maturity Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2].map((i) => (
                        <tr key={i} className="border border-black">
                          <td className="border border-black p-2 text-center">{i + 1}</td>
                          <td className="border border-black p-2">{formData.fixedDeposits[i]?.bank || ''}</td>
                          <td className="border border-black p-2">{formData.fixedDeposits[i]?.accountNo || ''}</td>
                          <td className="border border-black p-2">{formData.fixedDeposits[i]?.amount || ''}</td>
                          <td className="border border-black p-2">{formData.fixedDeposits[i]?.maturity || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-center text-[10px] mt-6">5</p>
              </div>

              {/* PAGE 6 */}
              <div className="p-8 border-b-2 border-dashed border-gray-300" style={{ minHeight: '297mm' }}>
                <div className="mb-6">
                  <p className="text-[10px] font-medium">IV. Treasury Bonds / Securities Investment Account (Category F)</p>
                  <table className="w-full text-[10px] border-collapse mt-2">
                    <thead>
                      <tr className="border border-black bg-gray-50">
                        <th className="border border-black p-2">No.</th>
                        <th className="border border-black p-2">Value</th>
                        <th className="border border-black p-2">Maturity Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2].map((i) => (
                        <tr key={i} className="border border-black">
                          <td className="border border-black p-2 text-center">{i + 1}</td>
                          <td className="border border-black p-2">{formData.treasuryBonds[i]?.value || ''}</td>
                          <td className="border border-black p-2">{formData.treasuryBonds[i]?.maturity || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border border-black p-4 mb-6">
                  <p className="font-bold text-center text-sm mb-4">AFFIDAVIT</p>
                  <p className="text-[10px] mb-4">
                    I, <span className="font-medium underline">{formData.fullName || '_________________'}</span>, do solemnly, sincerely and truly declare and affirm/swear that the information I have provided in this form is true and correct. I make this statement conscientiously believing the same to be true. I have not been convicted of a crime or offence either by courts or by any law enforcement authority, in Sri Lanka or in any other country. I am aware that the submission of false or incorrect information and forged documents is a punishable offence and I can be convicted under prevailing laws of Sri Lanka and that my Dual Citizenship may liable for cancellation. I am also aware that I have no right to make a request for refund of any payments made in this connection.
                  </p>
                  <div className="flex justify-between mt-6 text-[10px]">
                    <div>
                      <p>Affirmed/Sworn to before me on this <span className="underline">{formData.affidavitDay || '____'}</span> day of</p>
                      <p><span className="underline">{formData.affidavitMonth || '_______________'}</span> 20<span className="underline">{formData.affidavitYear?.slice(-2) || '__'}</span></p>
                      <p>at <span className="underline">{formData.affidavitPlace || '_______________'}</span></p>
                    </div>
                    <div className="text-right">
                      <div className="border-t border-black w-48 pt-1 mt-8">Signature of Applicant</div>
                    </div>
                  </div>
                  <div className="mt-6 text-[10px]">
                    <div className="border-t border-black w-64 pt-1">Justice of the Peace / Commissioner of Oaths</div>
                  </div>
                </div>
                <p className="text-center text-[10px] mt-6">6</p>
              </div>

              {/* PAGE 7 - COMPUTERISED DATA SHEET */}
              <div className="p-8 border-b-2 border-dashed border-gray-300" style={{ minHeight: '297mm' }}>
                <div className="text-center mb-6">
                  <p className="font-bold text-sm">COMPUTERISED DATA SHEET</p>
                  <p className="text-[9px] italic">*Please fill in Block Letters</p>
                </div>

                <table className="w-full text-[10px] border-collapse">
                  <tbody>
                    <tr className="border border-black">
                      <td className="border border-black p-2 w-8">1.</td>
                      <td className="border border-black p-2 w-40">Full Name</td>
                      <td className="border border-black p-2 uppercase font-medium">{formData.dsFullName}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">2.</td>
                      <td className="border border-black p-2">Address</td>
                      <td className="border border-black p-2 uppercase">{formData.dsAddress}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">3.</td>
                      <td className="border border-black p-2">Profession</td>
                      <td className="border border-black p-2 uppercase">{formData.dsProfession}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">4.</td>
                      <td className="border border-black p-2">Date of Birth</td>
                      <td className="border border-black p-2">
                        Day: {formData.dsDobDay} Month: {formData.dsDobMonth} Year: {formData.dsDobYear}
                      </td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">5.</td>
                      <td className="border border-black p-2">Place of Birth</td>
                      <td className="border border-black p-2 uppercase">{formData.dsPlaceOfBirth}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">6.</td>
                      <td className="border border-black p-2">Father with Initials</td>
                      <td className="border border-black p-2 uppercase">{formData.dsFatherName}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">7.</td>
                      <td className="border border-black p-2">Mother with Initials</td>
                      <td className="border border-black p-2 uppercase">{formData.dsMotherName}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">8.</td>
                      <td className="border border-black p-2">Claim to Citizenship</td>
                      <td className="border border-black p-2">
                        <span className="mr-4">By Descent <span className="inline-block w-4 h-4 border border-black text-center align-middle">{formData.dsClaimToCitizenship === 'descent' ? '✓' : ''}</span></span>
                        <span>By Registration <span className="inline-block w-4 h-4 border border-black text-center align-middle">{formData.dsClaimToCitizenship === 'registration' ? '✓' : ''}</span></span>
                      </td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">9.</td>
                      <td className="border border-black p-2">Other Nationality</td>
                      <td className="border border-black p-2 uppercase">{formData.dsOtherNationality}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">10.</td>
                      <td className="border border-black p-2">E-Mail</td>
                      <td className="border border-black p-2 uppercase">{formData.dsEmail}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">11.</td>
                      <td className="border border-black p-2">Phone</td>
                      <td className="border border-black p-2">Local: {formData.dsPhoneLocal} | Foreign: {formData.dsPhoneForeign}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">12.</td>
                      <td className="border border-black p-2">Local Contact Person</td>
                      <td className="border border-black p-2 uppercase">{formData.dsContactName} - {formData.dsContactNumber}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-center text-[10px] mt-6">7</p>
              </div>

              {/* PAGE 8 - PERSONAL PARTICULARS FORM */}
              <div className="p-8 border-b-2 border-dashed border-gray-300" style={{ minHeight: '297mm' }}>
                <div className="text-center mb-6">
                  <p className="font-bold text-sm">PERSONAL PARTICULARS FORM</p>
                  <p className="text-[9px] italic">(Fill in BLOCK Letters only. All details should be provided)</p>
                </div>

                <table className="w-full text-[10px] border-collapse">
                  <tbody>
                    <tr className="border border-black">
                      <td className="border border-black p-2 w-8">01.</td>
                      <td className="border border-black p-2">Name in Full</td>
                      <td className="border border-black p-2 uppercase font-medium">{formData.ppfFullName}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">02.</td>
                      <td className="border border-black p-2">Date of Birth / Place / Country</td>
                      <td className="border border-black p-2">{formData.ppfDob} / {formData.ppfPlaceOfBirth} / {formData.ppfCountryOfBirth}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">03.</td>
                      <td className="border border-black p-2">Gender</td>
                      <td className="border border-black p-2">
                        <span className="mr-4">Male <span className="inline-block w-4 h-4 border border-black text-center align-middle">{formData.ppfGender === 'male' ? '✓' : ''}</span></span>
                        <span>Female <span className="inline-block w-4 h-4 border border-black text-center align-middle">{formData.ppfGender === 'female' ? '✓' : ''}</span></span>
                      </td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">04.</td>
                      <td className="border border-black p-2">Country of present Citizenship</td>
                      <td className="border border-black p-2">{formData.ppfCountryOfCitizenship}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">05.</td>
                      <td className="border border-black p-2">Date of acquiring citizenship</td>
                      <td className="border border-black p-2">{formData.ppfDateAcquiringCitizenship}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">06.</td>
                      <td className="border border-black p-2">Previous Citizenship</td>
                      <td className="border border-black p-2">{formData.ppfPreviousCitizenship}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">07.</td>
                      <td className="border border-black p-2">Profession / Occupation</td>
                      <td className="border border-black p-2">{formData.ppfProfession}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">08.</td>
                      <td className="border border-black p-2">E-mail Address</td>
                      <td className="border border-black p-2">{formData.ppfEmail}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">09.</td>
                      <td className="border border-black p-2">Sri Lankan N.I.C. No & Date of Issue</td>
                      <td className="border border-black p-2 font-mono">{formData.ppfNicNo} {formData.ppfNicDateOfIssue && `(${formData.ppfNicDateOfIssue})`}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">10.</td>
                      <td className="border border-black p-2">Sri Lankan Passport No & Date</td>
                      <td className="border border-black p-2">{formData.ppfSlPassportNo} {formData.ppfSlPassportDateOfIssue && `(${formData.ppfSlPassportDateOfIssue})`}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">11.</td>
                      <td className="border border-black p-2">Foreign Passport No</td>
                      <td className="border border-black p-2">{formData.ppfForeignPassportNo} - {formData.ppfForeignPassportDetails}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">12.</td>
                      <td className="border border-black p-2">Present Address (Foreign)</td>
                      <td className="border border-black p-2">{formData.ppfAddressForeign}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">13.</td>
                      <td className="border border-black p-2">Period of Residence (Foreign)</td>
                      <td className="border border-black p-2">From: {formData.ppfPeriodFrom} To: {formData.ppfPeriodTo} | Country: {formData.ppfCountry}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">14.</td>
                      <td className="border border-black p-2">Phone (Foreign)</td>
                      <td className="border border-black p-2">Res: {formData.ppfPhoneForeignRes} | Mob: {formData.ppfPhoneForeignMob}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">15.</td>
                      <td className="border border-black p-2">Address in Sri Lanka</td>
                      <td className="border border-black p-2">{formData.ppfAddressSL}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">16.</td>
                      <td className="border border-black p-2">Period of Residence (SL) / Police Area</td>
                      <td className="border border-black p-2">From: {formData.ppfPeriodFromSL} To: {formData.ppfPeriodToSL} | Police: {formData.ppfPoliceArea}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-center text-[10px] mt-6">8</p>
              </div>

              {/* PAGE 9 - PERSONAL PARTICULARS FORM continued */}
              <div className="p-8" style={{ minHeight: '297mm' }}>
                <div className="mb-4">
                  <p className="text-[10px] font-medium mb-2">17. Particulars of Children:</p>
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="border border-black bg-gray-50">
                        <th className="border border-black p-2">No.</th>
                        <th className="border border-black p-2">Name</th>
                        <th className="border border-black p-2">Sex</th>
                        <th className="border border-black p-2">Date of Birth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <tr key={i} className="border border-black">
                          <td className="border border-black p-2 text-center">{i + 1}</td>
                          <td className="border border-black p-2">{formData.ppfChildren[i]?.name || ''}</td>
                          <td className="border border-black p-2 text-center">{formData.ppfChildren[i]?.sex || ''}</td>
                          <td className="border border-black p-2">{formData.ppfChildren[i]?.dob || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <table className="w-full text-[10px] border-collapse mb-4">
                  <tbody>
                    <tr className="border border-black">
                      <td className="border border-black p-2 w-8">18.</td>
                      <td className="border border-black p-2">Spouse's Details</td>
                      <td className="border border-black p-2">
                        Name: {formData.ppfSpouseName}<br />
                        Citizenship: {formData.ppfSpouseCitizenship}<br />
                        Previous Citizenship: {formData.ppfSpousePrevCitizenship}<br />
                        Passport/NIC: {formData.ppfSpousePassportCitizenship} / {formData.ppfSpousePassportNic}
                      </td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">19.</td>
                      <td className="border border-black p-2">Father's Details</td>
                      <td className="border border-black p-2">
                        Name: {formData.ppfFatherName}<br />
                        Address: {formData.ppfFatherAddress}<br />
                        Police Area: {formData.ppfFatherPoliceArea}
                      </td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">20.</td>
                      <td className="border border-black p-2">Mother's Details</td>
                      <td className="border border-black p-2">
                        Name: {formData.ppfMotherName}<br />
                        Address: {formData.ppfMotherAddress}<br />
                        Police Area: {formData.ppfMotherPoliceArea}
                      </td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">21.</td>
                      <td className="border border-black p-2">Spouse's Parents</td>
                      <td className="border border-black p-2">
                        Father: {formData.ppfSpouseFatherName} - {formData.ppfSpouseFatherAddress} ({formData.ppfSpouseFatherPoliceArea})<br />
                        Mother: {formData.ppfSpouseMotherName} - {formData.ppfSpouseMotherAddress} ({formData.ppfSpouseMotherPoliceArea})
                      </td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">22.</td>
                      <td className="border border-black p-2">Organization membership in SL?</td>
                      <td className="border border-black p-2">{formData.ppfOrganization || 'N/A'}</td>
                    </tr>
                    <tr className="border border-black">
                      <td className="border border-black p-2">23.</td>
                      <td className="border border-black p-2">Conviction details</td>
                      <td className="border border-black p-2">{formData.ppfConviction || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="border border-black p-4 mt-6">
                  <p className="text-[10px] mb-4">
                    I declare that all information given above are true and correct to the best of my knowledge. I am aware that any false declaration or statement made above is punishable by law.
                  </p>
                  <div className="flex justify-between mt-6 text-[10px]">
                    <div>
                      <p>Date: <span className="underline">{formData.ppfDeclarationDate || '_______________'}</span></p>
                    </div>
                    <div className="text-right">
                      <div className="border-t border-black w-48 pt-1">Signature of Applicant</div>
                    </div>
                  </div>
                </div>
                <p className="text-center text-[10px] mt-6">9</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl border p-6 sticky bottom-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="primary" size="lg" icon={<Download className="w-5 h-5" />} onClick={generatePDF} className="flex-1">Download PDF</Button>
            <Button variant="outline" size="lg" icon={<Printer className="w-5 h-5" />} onClick={handlePrint} className="flex-1">Print</Button>
          </div>
          <p className="text-xs text-[#718096] text-center mt-3">Your progress is automatically saved in your browser.</p>
        </div>
      </div>

      {/* Print-only - uses same layout as preview */}
      <div className="hidden print:block" style={{ fontFamily: 'Times New Roman, serif', fontSize: '11pt' }}>
        {/* The preview content will be printed via JavaScript window.print() */}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </Layout>
  );
}
