import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Plus,
  Save,
  Eye,
  Settings,
  Wand2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Edit3,
  GripVertical,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import * as pdfjsLib from 'pdfjs-dist';
import Anthropic from '@anthropic-ai/sdk';
import { saveForm, generateFormId, fileToBase64, type StoredForm } from '../utils/formsStorage';
// @ts-ignore - Vite handles this import
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set up PDF.js worker using Vite's URL import
pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

interface FormField {
  id: string;
  type: 'text' | 'date' | 'checkbox' | 'radio' | 'dropdown' | 'paragraph' | 'signature';
  label: string;
  page: number;
  required: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
}

interface FormMetadata {
  title: string;
  institution: string;
  category: string;
  description: string;
  postAddress: string;
  officeHours: string;
  telephoneNumbers: string[];
  faxNumber: string;
  email: string;
  website: string;
  officialLocation: string;
}

type Step = 'upload' | 'processing' | 'edit' | 'publish';

const CATEGORIES = [
  'Divisional Secretariat',
  'Police',
  'Motor Traffic',
  'Banks',
  'Immigration',
  'Registrar General',
  'Inland Revenue',
  'Education',
  'Grama Niladhari',
  'Electricity Board',
  'Water Board',
  'Other',
];

const STORAGE_KEY = 'forms-lk-claude-api-key';

export function FormDigitizerPage() {
  // State
  const [step, setStep] = useState<Step>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [isImagePdf, setIsImagePdf] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [fields, setFields] = useState<FormField[]>([]);
  const [metadata, setMetadata] = useState<FormMetadata>({
    title: '',
    institution: '',
    category: '',
    description: '',
    postAddress: '',
    officeHours: '',
    telephoneNumbers: [''],
    faxNumber: '',
    email: '',
    website: '',
    officialLocation: '',
  });
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Save API key
  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem(STORAGE_KEY, key);
    setShowApiKeyModal(false);
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setError('');
    setPdfFile(file);
    setProcessingStatus('Reading PDF...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const pageImages: string[] = [];
      let hasText = false;

      setProcessingStatus(`Rendering ${numPages} pages...`);

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        // @ts-ignore - pdf.js types may vary between versions
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        pageImages.push(canvas.toDataURL('image/png'));

        // Check if page has text content
        const textContent = await page.getTextContent();
        if (textContent.items.length > 10) {
          hasText = true;
        }
      }

      setPdfPages(pageImages);
      setIsImagePdf(!hasText);
      setMetadata(prev => ({ ...prev, title: file.name.replace('.pdf', '') }));

      // Auto-process if API key exists
      if (apiKey) {
        processWithClaude(pageImages);
      } else {
        setShowApiKeyModal(true);
      }
    } catch (err) {
      console.error('Error reading PDF:', err);
      setError('Failed to read PDF file');
    }
  }, [apiKey]);

  // Process PDF with Claude
  const processWithClaude = async (images: string[] = pdfPages) => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setStep('processing');
    setIsProcessing(true);
    setError('');

    try {
      setProcessingStatus('Analyzing PDF with Claude...');

      const client = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });

      // Create content array with images
      const imageContent = images.slice(0, 5).map((img) => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/png' as const,
          data: img.split(',')[1],
        },
      }));

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              ...imageContent,
              {
                type: 'text',
                text: `Analyze this government form PDF and extract the following information in JSON format:

1. Form metadata:
   - title: The official title of the form
   - institution: The government department or institution
   - category: One of [Divisional Secretariat, Police, Motor Traffic, Banks, Immigration, Registrar General, Inland Revenue, Education, Grama Niladhari, Electricity Board, Water Board, Other]
   - description: Brief description of the form's purpose
   - postAddress: If visible, the postal address for submission
   - telephoneNumbers: Array of contact numbers if visible
   - website: Official website if visible

2. Form fields (array of objects):
   - id: unique identifier (e.g., "field-1")
   - type: one of [text, date, checkbox, radio, dropdown, paragraph, signature]
   - label: the field label/question
   - page: page number (1-indexed)
   - required: boolean indicating if field appears mandatory
   - placeholder: suggested placeholder text
   - options: for checkbox/radio/dropdown, array of options
   - helpText: any instructions for the field

Return ONLY valid JSON in this exact format:
{
  "metadata": { ... },
  "fields": [ ... ]
}`,
              },
            ],
          },
        ],
      });

      setProcessingStatus('Parsing response...');

      // Extract JSON from response
      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      // Try to parse JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Update state with extracted data
      if (parsed.metadata) {
        setMetadata(prev => ({
          ...prev,
          title: parsed.metadata.title || prev.title,
          institution: parsed.metadata.institution || '',
          category: parsed.metadata.category || '',
          description: parsed.metadata.description || '',
          postAddress: parsed.metadata.postAddress || '',
          officeHours: parsed.metadata.officeHours || '',
          telephoneNumbers: parsed.metadata.telephoneNumbers || [''],
          faxNumber: parsed.metadata.faxNumber || '',
          email: parsed.metadata.email || '',
          website: parsed.metadata.website || '',
          officialLocation: parsed.metadata.officialLocation || '',
        }));
      }

      if (parsed.fields && Array.isArray(parsed.fields)) {
        setFields(parsed.fields);
      }

      setStep('edit');
      setIsProcessing(false);
    } catch (err) {
      console.error('Claude API error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process with Claude');
      setIsProcessing(false);
      setStep('upload');
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  // Field management
  const addField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: 'text',
      label: 'New Field',
      page: currentPage + 1,
      required: false,
    };
    setFields([...fields, newField]);
    setEditingField(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    setEditingField(null);
  };

  // Save and publish
  const handlePublish = async () => {
    setIsProcessing(true);
    setProcessingStatus('Saving form...');

    try {
      // Convert PDF file to base64 for storage
      let pdfData: string | undefined;
      if (pdfFile) {
        pdfData = await fileToBase64(pdfFile);
      }

      // Create pages array from pdfPages
      const formPages = pdfPages.map((_, index) => ({
        id: `page-${index + 1}`,
        elements: [] as import('../types').FormElement[],
      }));

      const formData: StoredForm = {
        id: generateFormId(),
        title: metadata.title,
        institution: metadata.institution,
        category: metadata.category,
        description: metadata.description,
        pages: formPages,
        createdBy: 'admin',
        // Contact info - using new format with all fields
        contactInfo: {
          address: metadata.postAddress || undefined,
          officeHours: metadata.officeHours || undefined,
          telephoneNumbers: metadata.telephoneNumbers.filter(p => p.trim()),
          faxNumber: metadata.faxNumber || undefined,
          email: metadata.email || undefined,
          website: metadata.website || undefined,
          officialLocation: metadata.officialLocation || undefined,
        },
        // Form metadata
        fields: fields,
        pdfData: pdfData,
        pdfPages: pdfPages, // Store page images for preview
        isImagePdf: isImagePdf,
        // Default values
        downloads: 0,
        rating: 0,
        ratingCount: 0,
        verificationLevel: 0, // Unverified by default
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveForm(formData);
      console.log('Form published:', formData.id);

      setStep('publish');
    } catch (err) {
      console.error('Failed to publish form:', err);
      setError('Failed to publish form. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render steps
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-[#1A365D] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Wand2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Form Digitizer</h1>
                  <p className="text-blue-200 text-sm">Upload PDF → AI Analysis → Edit → Publish</p>
                </div>
              </div>
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={() => setShowApiKeyModal(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  API Settings
                </Button>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="mt-6 flex items-center gap-2">
              {[
                { key: 'upload', label: 'Upload PDF' },
                { key: 'processing', label: 'AI Analysis' },
                { key: 'edit', label: 'Edit Fields' },
                { key: 'publish', label: 'Publish' },
              ].map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                      step === s.key
                        ? 'bg-white text-[#1A365D] font-medium'
                        : ['upload'].indexOf(step) < ['upload', 'processing', 'edit', 'publish'].indexOf(s.key)
                        ? 'bg-white/20 text-white/60'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                      {i + 1}
                    </span>
                    {s.label}
                  </div>
                  {i < 3 && <div className="w-8 h-0.5 bg-white/20 mx-1" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
              <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="max-w-2xl mx-auto">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-[#3182CE] transition-colors p-12 text-center cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-[#3182CE]" />
                </div>
                <h2 className="text-xl font-semibold text-[#1A202C] mb-2">Upload PDF Form</h2>
                <p className="text-[#718096] mb-4">
                  Drag and drop your PDF file here, or click to browse
                </p>
                <p className="text-sm text-[#718096]">
                  Supported: PDF files up to 20MB
                </p>
              </div>

              {processingStatus && (
                <div className="mt-4 text-center text-[#718096]">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                  {processingStatus}
                </div>
              )}
            </div>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-white rounded-xl border border-gray-200 p-12">
                <Loader2 className="w-16 h-16 text-[#3182CE] animate-spin mx-auto mb-6" />
                <h2 className="text-xl font-semibold text-[#1A202C] mb-2">
                  Analyzing PDF with Claude AI
                </h2>
                <p className="text-[#718096] mb-4">{processingStatus}</p>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-[#3182CE] h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          )}

          {/* Step: Edit */}
          {step === 'edit' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PDF Preview */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm">{pdfFile?.name}</span>
                    {isImagePdf && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        Image PDF
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">
                      {currentPage + 1} / {pdfPages.length}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(pdfPages.length - 1, currentPage + 1))}
                      disabled={currentPage === pdfPages.length - 1}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-gray-100 max-h-[600px] overflow-auto">
                  {pdfPages[currentPage] && (
                    <img
                      src={pdfPages[currentPage]}
                      alt={`Page ${currentPage + 1}`}
                      className="w-full rounded shadow-lg"
                    />
                  )}
                </div>
                {/* Page Thumbnails */}
                <div className="p-2 bg-gray-50 border-t border-gray-200 flex gap-2 overflow-x-auto">
                  {pdfPages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`flex-shrink-0 w-12 h-16 rounded border-2 overflow-hidden ${
                        currentPage === i ? 'border-[#3182CE]' : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img src={img} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Editor */}
              <div className="space-y-4">
                {/* Metadata */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="font-semibold text-[#1A202C] mb-4 flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    Form Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                      <input
                        type="text"
                        value={metadata.title}
                        onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Institution *</label>
                        <input
                          type="text"
                          value={metadata.institution}
                          onChange={(e) => setMetadata({ ...metadata, institution: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                        <select
                          value={metadata.category}
                          onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                        >
                          <option value="">Select category</option>
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={metadata.description}
                        onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Post Address</label>
                      <input
                        type="text"
                        value={metadata.postAddress}
                        onChange={(e) => setMetadata({ ...metadata, postAddress: e.target.value })}
                        placeholder="Postal address for form submission"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Official file location</label>
                      <input
                        type="text"
                        value={metadata.officialLocation}
                        onChange={(e) => setMetadata({ ...metadata, officialLocation: e.target.value })}
                        placeholder="Where to obtain/submit the form"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Office Hours</label>
                      <input
                        type="text"
                        value={metadata.officeHours}
                        onChange={(e) => setMetadata({ ...metadata, officeHours: e.target.value })}
                        placeholder="e.g., Mon-Fri 8:30 AM - 4:30 PM"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telephone Numbers</label>
                      {metadata.telephoneNumbers.map((phone, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                              const updated = [...metadata.telephoneNumbers];
                              updated[i] = e.target.value;
                              setMetadata({ ...metadata, telephoneNumbers: updated });
                            }}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                          />
                          {i > 0 && (
                            <button
                              onClick={() => {
                                const updated = metadata.telephoneNumbers.filter((_, idx) => idx !== i);
                                setMetadata({ ...metadata, telephoneNumbers: updated });
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setMetadata({ ...metadata, telephoneNumbers: [...metadata.telephoneNumbers, ''] })}
                        className="text-sm text-[#3182CE] hover:underline"
                      >
                        + Add phone number
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fax Number</label>
                        <input
                          type="tel"
                          value={metadata.faxNumber}
                          onChange={(e) => setMetadata({ ...metadata, faxNumber: e.target.value })}
                          placeholder="Fax number"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={metadata.email}
                          onChange={(e) => setMetadata({ ...metadata, email: e.target.value })}
                          placeholder="contact@example.gov.lk"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        type="url"
                        value={metadata.website}
                        onChange={(e) => setMetadata({ ...metadata, website: e.target.value })}
                        placeholder="https://"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                      />
                    </div>
                  </div>
                </div>

                {/* Fields */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[#1A202C] flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Form Fields ({fields.length})
                    </h3>
                    <Button variant="outline" size="sm" onClick={addField}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Field
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {fields.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>No fields detected</p>
                        <button onClick={addField} className="text-[#3182CE] hover:underline text-sm mt-1">
                          Add manually
                        </button>
                      </div>
                    ) : (
                      fields.map((field) => (
                        <div
                          key={field.id}
                          className={`border rounded-lg p-3 ${
                            editingField === field.id ? 'border-[#3182CE] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {editingField === field.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateField(field.id, { label: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                                placeholder="Field label"
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <select
                                  value={field.type}
                                  onChange={(e) => updateField(field.id, { type: e.target.value as FormField['type'] })}
                                  className="px-2 py-1 border border-gray-200 rounded text-sm"
                                >
                                  <option value="text">Text</option>
                                  <option value="paragraph">Paragraph</option>
                                  <option value="date">Date</option>
                                  <option value="checkbox">Checkbox</option>
                                  <option value="radio">Radio</option>
                                  <option value="dropdown">Dropdown</option>
                                  <option value="signature">Signature</option>
                                </select>
                                <select
                                  value={field.page}
                                  onChange={(e) => updateField(field.id, { page: parseInt(e.target.value) })}
                                  className="px-2 py-1 border border-gray-200 rounded text-sm"
                                >
                                  {pdfPages.map((_, i) => (
                                    <option key={i} value={i + 1}>Page {i + 1}</option>
                                  ))}
                                </select>
                                <label className="flex items-center gap-1 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                  />
                                  Required
                                </label>
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => deleteField(field.id)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => setEditingField(null)}
                                  className="text-[#3182CE] hover:underline text-sm"
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => setEditingField(field.id)}
                            >
                              <GripVertical className="w-4 h-4 text-gray-300" />
                              <div className="flex-1">
                                <span className="font-medium text-sm">{field.label}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {field.type} • Page {field.page}
                                  {field.required && ' • Required'}
                                </span>
                              </div>
                              <Edit3 className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('upload')}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Start Over
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handlePublish}
                    disabled={!metadata.title || !metadata.institution || !metadata.category}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Publish Form
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step: Publish Success */}
          {step === 'publish' && (
            <div className="max-w-md mx-auto text-center">
              <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-[#1A202C] mb-2">Form Published!</h2>
                <p className="text-[#718096] mb-6">
                  "{metadata.title}" has been successfully digitized and published.
                </p>
                <div className="space-y-3">
                  <Link to="/forms">
                    <Button variant="primary" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View in Forms Library
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setStep('upload');
                      setPdfFile(null);
                      setPdfPages([]);
                      setFields([]);
                      setMetadata({
                        title: '',
                        institution: '',
                        category: '',
                        description: '',
                        postAddress: '',
                        officeHours: '',
                        telephoneNumbers: [''],
                        faxNumber: '',
                        email: '',
                        website: '',
                        officialLocation: '',
                      });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Digitize Another Form
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-[#1A202C] mb-2">Claude API Key</h3>
            <p className="text-sm text-[#718096] mb-4">
              Enter your Anthropic API key to enable AI-powered form analysis.
              Your key is stored locally in your browser.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowApiKeyModal(false);
                  if (!apiKey) setStep('upload');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  saveApiKey(apiKey);
                  if (pdfPages.length > 0) processWithClaude();
                }}
                disabled={!apiKey}
              >
                Save & Continue
              </Button>
            </div>
            <p className="text-xs text-[#718096] mt-4 text-center">
              Get your API key from{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener" className="text-[#3182CE]">
                console.anthropic.com
              </a>
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
}
