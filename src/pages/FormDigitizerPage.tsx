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
  MousePointer2,
  Languages,
  Trash2,
  CheckSquare,
  Square,
  Check,
  Crown,
  Search,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import * as pdfjsLib from 'pdfjs-dist';
import Anthropic from '@anthropic-ai/sdk';
import {
  saveForm,
  generateFormId,
  fileToBase64,
  detectLanguageFromFilename,
  type StoredForm,
  type StoredLanguageVariant,
} from '../utils/formsStorage';
import { LANGUAGES, type Language } from '../types';
// @ts-ignore - Vite handles this import
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set up PDF.js worker using Vite's URL import
pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

// Field position for PDF overlay mapping
interface FieldPosition {
  x: number;      // X coordinate (percentage of page width)
  y: number;      // Y coordinate (percentage of page height)
  width: number;  // Width (percentage of page width)
  height: number; // Height (percentage of page height)
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
}

interface FormField {
  id: string;
  type: 'text' | 'date' | 'checkbox' | 'radio' | 'dropdown' | 'paragraph' | 'signature';
  label: string;
  page: number;
  required: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
  // Position on PDF for overlay
  position?: FieldPosition;
}

interface FormMetadata {
  title: string;
  titleSi: string;  // Sinhala title
  titleTa: string;  // Tamil title
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

type Step = 'upload' | 'select-pages' | 'processing' | 'edit' | 'publish';

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
const CUSTOM_CATEGORIES_KEY = 'forms-lk-custom-categories';

// Get custom categories from localStorage
function getCustomCategories(): string[] {
  try {
    const data = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Save custom category to localStorage
function saveCustomCategory(category: string): void {
  try {
    const existing = getCustomCategories();
    if (!existing.includes(category) && !CATEGORIES.includes(category as typeof CATEGORIES[number])) {
      existing.push(category);
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(existing));
    }
  } catch {
    console.error('Failed to save custom category');
  }
}

export function FormDigitizerPage() {
  // State
  const [step, setStep] = useState<Step>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isImagePdf, setIsImagePdf] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [fields, setFields] = useState<FormField[]>([]);

  // Language state
  const [detectedLanguage, setDetectedLanguage] = useState<Language>('en');
  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>(['en']);
  const [languageVariants, setLanguageVariants] = useState<Map<Language, { pdfData?: string; pdfPages: string[] }>>(new Map());

  // Multi-language batch upload state
  const [isMultiLangMode, setIsMultiLangMode] = useState(false);
  const [_pendingFiles, setPendingFiles] = useState<Map<Language, File>>(new Map());
  const [previewLanguage, setPreviewLanguage] = useState<Language>('en');

  // Master page and language selection
  const [masterPageIndex, setMasterPageIndex] = useState(0);
  const [masterLanguage, setMasterLanguage] = useState<Language>('en');
  const [_fileLanguageAssignments, setFileLanguageAssignments] = useState<Map<string, Language>>(new Map());

  // Edit step preview language
  const [editPreviewLanguage, setEditPreviewLanguage] = useState<Language>('en');

  // Category state
  const [allCategories, setAllCategories] = useState<string[]>([...CATEGORIES, ...getCustomCategories()]);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Field placement state
  const [placementMode, setPlacementMode] = useState(false);
  const [selectedFieldForPlacement, setSelectedFieldForPlacement] = useState<string | null>(null);
  const [showFieldPopup, setShowFieldPopup] = useState<{ fieldId: string; x: number; y: number } | null>(null);

  const [metadata, setMetadata] = useState<FormMetadata>({
    title: '',
    titleSi: '',
    titleTa: '',
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
  const pdfPreviewRef = useRef<HTMLDivElement>(null);

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.category-dropdown-container')) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
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

    // Detect language from filename
    const language = detectLanguageFromFilename(file.name);
    setDetectedLanguage(language);
    if (!selectedLanguages.includes(language)) {
      setSelectedLanguages([...selectedLanguages, language]);
    }

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

      // Select all pages by default
      setSelectedPages(new Set(pageImages.map((_, i) => i)));

      // Store language variant
      const pdfData = await fileToBase64(file);
      setLanguageVariants(prev => {
        const newMap = new Map(prev);
        newMap.set(language, { pdfData, pdfPages: pageImages });
        return newMap;
      });

      // Set title from filename (remove language suffix if present)
      const cleanTitle = file.name
        .replace('.pdf', '')
        .replace(/[-_](english|sinhala|tamil|en|si|ta)$/i, '')
        .replace(/[-_]/g, ' ')
        .trim();
      setMetadata(prev => ({ ...prev, title: cleanTitle || file.name.replace('.pdf', '') }));

      // Go to page selection step
      setStep('select-pages');
      setProcessingStatus('');
    } catch (err) {
      console.error('Error reading PDF:', err);
      setError('Failed to read PDF file');
    }
  }, [apiKey, selectedLanguages]);

  // Page selection helpers
  const togglePageSelection = (pageIndex: number) => {
    setSelectedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageIndex)) {
        newSet.delete(pageIndex);
      } else {
        newSet.add(pageIndex);
      }
      return newSet;
    });
  };

  const selectAllPages = () => {
    setSelectedPages(new Set(pdfPages.map((_, i) => i)));
  };

  const deselectAllPages = () => {
    setSelectedPages(new Set());
  };

  const deletePage = (pageIndex: number) => {
    // Remove the page from pdfPages
    const newPages = pdfPages.filter((_, i) => i !== pageIndex);
    setPdfPages(newPages);

    // Update selected pages (shift indices)
    setSelectedPages(prev => {
      const newSet = new Set<number>();
      prev.forEach(idx => {
        if (idx < pageIndex) {
          newSet.add(idx);
        } else if (idx > pageIndex) {
          newSet.add(idx - 1);
        }
        // idx === pageIndex is deleted, so don't add it
      });
      return newSet;
    });

    // Update language variants
    setLanguageVariants(prev => {
      const newMap = new Map(prev);
      newMap.forEach((variant, lang) => {
        const newVariantPages = variant.pdfPages.filter((_, i) => i !== pageIndex);
        newMap.set(lang, { ...variant, pdfPages: newVariantPages });
      });
      return newMap;
    });
  };

  const proceedWithSelectedPages = () => {
    if (selectedPages.size === 0) {
      setError('Please select at least one page');
      return;
    }

    // Get only selected pages in order
    const sortedIndices = Array.from(selectedPages).sort((a, b) => a - b);
    const selectedPdfPages = sortedIndices.map(i => pdfPages[i]);

    // Update pdfPages to only include selected
    setPdfPages(selectedPdfPages);

    // Update language variants to only include selected pages
    setLanguageVariants(prev => {
      const newMap = new Map(prev);
      newMap.forEach((variant, lang) => {
        const newVariantPages = sortedIndices.map(i => variant.pdfPages[i]).filter(Boolean);
        newMap.set(lang, { ...variant, pdfPages: newVariantPages });
      });
      return newMap;
    });

    // Reset selection to all (since we've trimmed the array)
    setSelectedPages(new Set(selectedPdfPages.map((_, i) => i)));

    // Set edit preview language to master language
    setEditPreviewLanguage(masterLanguage);

    // Get pages from master language for field extraction
    let pagesToProcess = selectedPdfPages;
    if (isMultiLangMode && languageVariants.has(masterLanguage)) {
      const masterVariant = languageVariants.get(masterLanguage);
      if (masterVariant?.pdfPages) {
        const sortedIndices = Array.from(selectedPages).sort((a, b) => a - b);
        pagesToProcess = sortedIndices.map(i => masterVariant.pdfPages[i]).filter(Boolean);
      }
    }

    // Process with Claude using master language pages
    if (apiKey) {
      processWithClaude(pagesToProcess);
    } else {
      setShowApiKeyModal(true);
    }
  };

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
      const client = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
      });

      // For multi-language mode, extract titles from each language variant
      const extractedTitles: { en?: string; si?: string; ta?: string } = {};

      if (isMultiLangMode && languageVariants.size > 1) {
        setProcessingStatus('Extracting titles from all language variants...');

        // Extract title from each language variant
        for (const [lang, variant] of languageVariants) {
          if (variant.pdfPages && variant.pdfPages.length > 0) {
            setProcessingStatus(`Extracting ${LANGUAGES[lang].label} title...`);

            const titleImage = variant.pdfPages[0]; // Use first page for title extraction
            const titleResponse = await client.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 500,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image',
                      source: {
                        type: 'base64',
                        media_type: 'image/png',
                        data: titleImage.split(',')[1],
                      },
                    },
                    {
                      type: 'text',
                      text: `Extract ONLY the main title/heading of this government form. The form is in ${LANGUAGES[lang].label} language. Return ONLY the title text, nothing else. If there are multiple titles, return the most prominent one.`,
                    },
                  ],
                },
              ],
            });

            const titleText = titleResponse.content.find(c => c.type === 'text');
            if (titleText && titleText.type === 'text') {
              extractedTitles[lang] = titleText.text.trim();
            }
          }
        }
      }

      setProcessingStatus('Analyzing PDF with Claude...');

      // Create content array with images (use primary language)
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
          title: extractedTitles.en || parsed.metadata.title || prev.title,
          titleSi: extractedTitles.si || '',
          titleTa: extractedTitles.ta || '',
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

  // Handle batch upload of multiple language files
  const handleBatchUpload = async (files: File[]) => {
    setError('');
    setProcessingStatus('Detecting languages...');
    setIsMultiLangMode(true);

    const filesByLanguage = new Map<Language, File>();

    // Detect language from each filename
    for (const file of files) {
      const lang = detectLanguageFromFilename(file.name);
      if (filesByLanguage.has(lang)) {
        const existing = filesByLanguage.get(lang)!;
        if (file.name.length > existing.name.length) {
          filesByLanguage.set(lang, file);
        }
      } else {
        filesByLanguage.set(lang, file);
      }
    }

    setPendingFiles(filesByLanguage);

    // Process all files
    setProcessingStatus('Processing PDF files...');
    const variants = new Map<Language, { pdfData?: string; pdfPages: string[] }>();
    let primaryPages: string[] = [];
    let primaryLanguage: Language = 'en';
    let hasText = true;

    for (const [lang, file] of filesByLanguage) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const pageImages: string[] = [];

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const scale = 1.5;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d')!;
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          pageImages.push(canvas.toDataURL('image/png'));

          const textContent = await page.getTextContent();
          if (textContent.items.length > 0) {
            hasText = true;
          }
        }

        const pdfData = await fileToBase64(file);
        variants.set(lang, { pdfData, pdfPages: pageImages });

        if (lang === 'en' || primaryPages.length === 0) {
          primaryPages = pageImages;
          primaryLanguage = lang;
          setPdfFile(file);
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
      }
    }

    setLanguageVariants(variants);
    setPdfPages(primaryPages);
    setSelectedPages(new Set(primaryPages.map((_, i) => i)));
    setIsImagePdf(!hasText);
    setDetectedLanguage(primaryLanguage);
    setPreviewLanguage(primaryLanguage);
    setSelectedLanguages(Array.from(variants.keys()));

    const firstFile = files[0];
    const cleanTitle = firstFile.name
      .replace('.pdf', '')
      .replace(/[-_]?(english|sinhala|tamil|en|si|ta)[-_]?/gi, ' ')
      .replace(/[-_]?pages?$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    setMetadata(prev => ({ ...prev, title: cleanTitle || 'Multi-Language Form' }));

    setProcessingStatus('');
    setStep('select-pages');
  };

  // Handle drag and drop - supports multiple files for batch upload
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');

    if (files.length === 0) {
      setError('Please upload PDF files');
      return;
    }

    if (files.length === 1) {
      handleFileUpload(files[0]);
    } else {
      handleBatchUpload(files);
    }
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
    setShowFieldPopup(null);
  };

  // Handle click on PDF to place field
  const handlePdfClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placementMode || !selectedFieldForPlacement) return;

    const container = pdfPreviewRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Update field position
    updateField(selectedFieldForPlacement, {
      page: currentPage + 1,
      position: {
        x,
        y,
        width: 20, // Default width
        height: 3, // Default height
        fontSize: 12,
        align: 'left',
      },
    });

    // Show popup for field properties
    setShowFieldPopup({
      fieldId: selectedFieldForPlacement,
      x: e.clientX,
      y: e.clientY,
    });

    setPlacementMode(false);
    setSelectedFieldForPlacement(null);
  };

  // Start field placement mode
  const startFieldPlacement = (fieldId: string) => {
    setPlacementMode(true);
    setSelectedFieldForPlacement(fieldId);
    setShowFieldPopup(null);
  };

  // Update field position property
  const updateFieldPosition = (fieldId: string, positionUpdates: Partial<FieldPosition>) => {
    setFields(fields.map(f => {
      if (f.id !== fieldId) return f;
      return {
        ...f,
        position: {
          ...f.position,
          x: f.position?.x ?? 0,
          y: f.position?.y ?? 0,
          width: f.position?.width ?? 20,
          height: f.position?.height ?? 3,
          ...positionUpdates,
        },
      };
    }));
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

      // Convert language variants to storage format
      const storedLanguageVariants: StoredLanguageVariant[] = [];
      languageVariants.forEach((variant, lang) => {
        storedLanguageVariants.push({
          language: lang,
          pdfData: variant.pdfData,
          pdfPages: variant.pdfPages,
        });
      });

      // Convert fields to storage format with positions
      const storedFields = fields.map(f => ({
        id: f.id,
        type: f.type,
        label: f.label,
        page: f.page,
        required: f.required,
        placeholder: f.placeholder,
        options: f.options,
        helpText: f.helpText,
        position: f.position,
      }));

      const formData: StoredForm = {
        id: generateFormId(),
        title: metadata.title,
        titleSi: metadata.titleSi || undefined,
        titleTa: metadata.titleTa || undefined,
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
        fields: storedFields,
        pdfData: pdfData,
        pdfPages: pdfPages, // Store page images for preview
        isImagePdf: isImagePdf,
        // Multi-language support
        languageVariants: storedLanguageVariants.length > 0 ? storedLanguageVariants : undefined,
        languages: selectedLanguages,
        defaultLanguage: detectedLanguage,
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
                { key: 'select-pages', label: 'Select Pages' },
                { key: 'processing', label: 'AI Analysis' },
                { key: 'edit', label: 'Edit Fields' },
                { key: 'publish', label: 'Publish' },
              ].map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                      step === s.key
                        ? 'bg-white text-[#1A365D] font-medium'
                        : ['upload', 'select-pages', 'processing', 'edit', 'publish'].indexOf(step) < ['upload', 'select-pages', 'processing', 'edit', 'publish'].indexOf(s.key)
                        ? 'bg-white/20 text-white/60'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                      {i + 1}
                    </span>
                    {s.label}
                  </div>
                  {i < 4 && <div className="w-8 h-0.5 bg-white/20 mx-1" />}
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
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf');
                    if (files.length === 1) {
                      handleFileUpload(files[0]);
                    } else if (files.length > 1) {
                      handleBatchUpload(files);
                    }
                  }}
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

              {/* Multi-language hint */}
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Languages className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900">Multi-Language Forms</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Upload multiple PDFs at once for multi-language forms. Name files with language
                      suffix (e.g., <code className="bg-blue-100 px-1 rounded">form-english.pdf</code>,{' '}
                      <code className="bg-blue-100 px-1 rounded">form-sinhala.pdf</code>,{' '}
                      <code className="bg-blue-100 px-1 rounded">form-tamil.pdf</code>).
                    </p>
                  </div>
                </div>
              </div>

              {processingStatus && (
                <div className="mt-4 text-center text-[#718096]">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                  {processingStatus}
                </div>
              )}
            </div>
          )}

          {/* Step: Select Pages */}
          {step === 'select-pages' && (
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                {/* Multi-language indicator */}
                {isMultiLangMode && languageVariants.size > 1 && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">
                        {languageVariants.size} Language Variants Detected
                      </span>
                      <div className="flex gap-2 ml-auto">
                        {Array.from(languageVariants.keys()).map(lang => (
                          <span
                            key={lang}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium"
                          >
                            {LANGUAGES[lang].nativeLabel}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-[#1A202C]">Select Pages to Include</h2>
                    <p className="text-[#718096] text-sm mt-1">
                      Click to select/deselect pages. Delete unwanted pages before processing.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {selectedPages.size} of {pdfPages.length} selected
                    </span>
                    <Button variant="outline" size="sm" onClick={selectAllPages}>
                      <CheckSquare className="w-4 h-4 mr-1" />
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllPages}>
                      <Square className="w-4 h-4 mr-1" />
                      Deselect All
                    </Button>
                  </div>
                </div>

                {/* Master Language Selection - only for multi-language */}
                {isMultiLangMode && languageVariants.size > 1 && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Crown className="w-5 h-5 text-amber-600" />
                      <span className="font-medium text-amber-900">Master Language for Field Extraction</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(languageVariants.keys()).map(lang => (
                        <button
                          key={lang}
                          onClick={() => setMasterLanguage(lang)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            masterLanguage === lang
                              ? 'bg-amber-500 text-white shadow-md'
                              : 'bg-white text-gray-700 hover:bg-amber-100 border border-gray-200'
                          }`}
                        >
                          {LANGUAGES[lang].nativeLabel}
                          {masterLanguage === lang && <Crown className="w-3 h-3 ml-2 inline" />}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-amber-700 mt-2">
                      Claude will extract form fields from the master language PDF.
                    </p>
                  </div>
                )}

                {/* Language Preview Tabs with Manual Assignment */}
                {isMultiLangMode && languageVariants.size > 1 && (
                  <div className="mb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Preview by Language:</span>
                      <span className="text-xs text-gray-500">Click to preview, use dropdown to reassign language</span>
                    </div>
                    <div className="flex gap-2">
                      {Array.from(languageVariants.keys()).map(lang => (
                        <div key={lang} className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setPreviewLanguage(lang);
                              const variant = languageVariants.get(lang);
                              if (variant) {
                                setPdfPages(variant.pdfPages);
                                setSelectedPages(new Set(variant.pdfPages.map((_, i) => i)));
                              }
                            }}
                            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                              previewLanguage === lang
                                ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {LANGUAGES[lang].nativeLabel}
                            <span className="ml-1 text-xs text-gray-400">
                              ({languageVariants.get(lang)?.pdfPages.length || 0})
                            </span>
                          </button>
                          {/* Language reassignment dropdown */}
                          <select
                            value={lang}
                            onChange={(e) => {
                              const newLang = e.target.value as Language;
                              if (newLang !== lang && !languageVariants.has(newLang)) {
                                // Reassign this variant to a new language
                                const variant = languageVariants.get(lang);
                                if (variant) {
                                  setLanguageVariants(prev => {
                                    const newMap = new Map(prev);
                                    newMap.delete(lang);
                                    newMap.set(newLang, variant);
                                    return newMap;
                                  });
                                  setSelectedLanguages(prev =>
                                    prev.map(l => l === lang ? newLang : l)
                                  );
                                  if (masterLanguage === lang) setMasterLanguage(newLang);
                                  if (previewLanguage === lang) setPreviewLanguage(newLang);
                                }
                              }
                            }}
                            className="text-xs border border-gray-200 rounded px-1 py-1 bg-white"
                            title="Reassign language"
                          >
                            <option value="en">EN</option>
                            <option value="si">SI</option>
                            <option value="ta">TA</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Page Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                  {pdfPages.map((pageImg, index) => (
                    <div
                      key={index}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedPages.has(index)
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => togglePageSelection(index)}
                    >
                      {/* Page Image */}
                      <div className="aspect-[3/4] bg-gray-100">
                        <img
                          src={pageImg}
                          alt={`Page ${index + 1}`}
                          className={`w-full h-full object-cover transition-opacity ${
                            selectedPages.has(index) ? 'opacity-100' : 'opacity-50'
                          }`}
                        />
                      </div>

                      {/* Selection Indicator */}
                      <div
                        className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          selectedPages.has(index)
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/80 text-gray-400 border border-gray-300'
                        }`}
                      >
                        {selectedPages.has(index) ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <span className="text-xs">{index + 1}</span>
                        )}
                      </div>

                      {/* Page Number */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 flex items-center justify-between">
                        <span className="text-white text-xs font-medium">Page {index + 1}</span>
                        {/* Master Page Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMasterPageIndex(index);
                          }}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                            masterPageIndex === index
                              ? 'bg-amber-500 text-white'
                              : 'bg-white/80 text-gray-600 hover:bg-amber-100'
                          }`}
                          title="Set as master page for field extraction"
                        >
                          {masterPageIndex === index ? (
                            <span className="flex items-center gap-1">
                              <Crown className="w-3 h-3" /> Master
                            </span>
                          ) : (
                            'Set Master'
                          )}
                        </button>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pdfPages.length > 1) {
                            deletePage(index);
                          } else {
                            setError('Cannot delete the last page');
                          }
                        }}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Delete page"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep('upload');
                      setPdfFile(null);
                      setPdfPages([]);
                      setSelectedPages(new Set());
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Upload Different PDF
                  </Button>
                  <Button
                    variant="primary"
                    onClick={proceedWithSelectedPages}
                    disabled={selectedPages.size === 0}
                    className="ml-auto"
                  >
                    Continue with {selectedPages.size} page{selectedPages.size !== 1 ? 's' : ''}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
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
                {/* Language Switcher for Preview */}
                {isMultiLangMode && languageVariants.size > 1 && (
                  <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2">
                    <Languages className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Preview:</span>
                    <div className="flex gap-1 ml-auto">
                      {Array.from(languageVariants.keys()).map(lang => (
                        <button
                          key={lang}
                          onClick={() => {
                            setEditPreviewLanguage(lang);
                            setCurrentPage(0);
                          }}
                          className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                            editPreviewLanguage === lang
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-600 hover:bg-blue-100 border border-gray-200'
                          }`}
                        >
                          {LANGUAGES[lang].nativeLabel}
                          {lang === masterLanguage && <Crown className="w-3 h-3 ml-1 inline text-amber-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                      {currentPage + 1} / {(isMultiLangMode ? languageVariants.get(editPreviewLanguage)?.pdfPages.length : pdfPages.length) || 0}
                    </span>
                    <button
                      onClick={() => {
                        const maxPage = (isMultiLangMode ? languageVariants.get(editPreviewLanguage)?.pdfPages.length : pdfPages.length) || 1;
                        setCurrentPage(Math.min(maxPage - 1, currentPage + 1));
                      }}
                      disabled={currentPage === ((isMultiLangMode ? languageVariants.get(editPreviewLanguage)?.pdfPages.length : pdfPages.length) || 1) - 1}
                      className="p-1 rounded hover:bg-gray-200 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div
                  ref={pdfPreviewRef}
                  onClick={handlePdfClick}
                  className={`p-4 bg-gray-100 max-h-[600px] overflow-auto relative ${
                    placementMode ? 'cursor-crosshair' : ''
                  }`}
                >
                  {placementMode && (
                    <div className="absolute inset-0 bg-blue-500/10 z-10 pointer-events-none flex items-center justify-center">
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                        Click on PDF to place field
                      </div>
                    </div>
                  )}
                  {(() => {
                    const currentPages = isMultiLangMode
                      ? languageVariants.get(editPreviewLanguage)?.pdfPages || pdfPages
                      : pdfPages;
                    return currentPages[currentPage];
                  })() && (
                    <div className="relative">
                      <img
                        src={isMultiLangMode
                          ? (languageVariants.get(editPreviewLanguage)?.pdfPages || pdfPages)[currentPage]
                          : pdfPages[currentPage]}
                        alt={`Page ${currentPage + 1}`}
                        className="w-full rounded shadow-lg"
                      />
                      {/* Field position markers */}
                      {fields
                        .filter(f => f.page === currentPage + 1 && f.position)
                        .map(f => (
                          <div
                            key={f.id}
                            className={`absolute border-2 rounded cursor-pointer transition-colors ${
                              showFieldPopup?.fieldId === f.id
                                ? 'border-blue-500 bg-blue-500/20'
                                : 'border-green-500 bg-green-500/10 hover:bg-green-500/20'
                            }`}
                            style={{
                              left: `${f.position!.x}%`,
                              top: `${f.position!.y}%`,
                              width: `${f.position!.width}%`,
                              height: `${f.position!.height}%`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowFieldPopup({
                                fieldId: f.id,
                                x: e.clientX,
                                y: e.clientY,
                              });
                            }}
                            title={f.label}
                          >
                            <span className="absolute -top-5 left-0 text-xs bg-green-600 text-white px-1 rounded truncate max-w-[100px]">
                              {f.label}
                            </span>
                          </div>
                        ))}
                    </div>
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
                <div className="bg-white rounded-xl border border-gray-200 p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                  <h3 className="font-semibold text-[#1A202C] mb-4 flex items-center gap-2 sticky top-0 bg-white py-2 -mt-2 z-10">
                    <Edit3 className="w-4 h-4" />
                    Form Details
                  </h3>

                  {/* Language Section */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Languages className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Languages</span>
                      <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        Detected: {LANGUAGES[detectedLanguage].nativeLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(['en', 'si', 'ta'] as Language[]).map(lang => (
                        <label
                          key={lang}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                            languageVariants.has(lang)
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : selectedLanguages.includes(lang)
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedLanguages.includes(lang)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLanguages([...selectedLanguages, lang]);
                              } else {
                                setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
                              }
                            }}
                            className="hidden"
                          />
                          <span>{LANGUAGES[lang].nativeLabel}</span>
                          {languageVariants.has(lang) && (
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          )}
                        </label>
                      ))}
                    </div>
                    {selectedLanguages.length > 1 && (
                      <div className="mt-2 text-xs text-blue-700">
                        Upload additional language PDFs using the same form structure for multi-language support.
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Multi-language titles */}
                    {isMultiLangMode && languageVariants.size > 1 ? (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Form Titles *</label>
                        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          {languageVariants.has('en') && (
                            <div className="flex items-center gap-2">
                              <span className="w-20 text-xs font-medium text-gray-500">English</span>
                              <input
                                type="text"
                                value={metadata.title}
                                onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                                placeholder="English title"
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                              />
                            </div>
                          )}
                          {languageVariants.has('si') && (
                            <div className="flex items-center gap-2">
                              <span className="w-20 text-xs font-medium text-gray-500">සිංහල</span>
                              <input
                                type="text"
                                value={metadata.titleSi}
                                onChange={(e) => setMetadata({ ...metadata, titleSi: e.target.value })}
                                placeholder="සිංහල මාතෘකාව"
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                              />
                            </div>
                          )}
                          {languageVariants.has('ta') && (
                            <div className="flex items-center gap-2">
                              <span className="w-20 text-xs font-medium text-gray-500">தமிழ்</span>
                              <input
                                type="text"
                                value={metadata.titleTa}
                                onChange={(e) => setMetadata({ ...metadata, titleTa: e.target.value })}
                                placeholder="தமிழ் தலைப்பு"
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input
                          type="text"
                          value={metadata.title}
                          onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                        />
                      </div>
                    )}
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
                      <div className="relative category-dropdown-container">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={categorySearch || metadata.category}
                            onChange={(e) => {
                              setCategorySearch(e.target.value);
                              setShowCategoryDropdown(true);
                            }}
                            onFocus={() => setShowCategoryDropdown(true)}
                            placeholder="Search or add category..."
                            className="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                          />
                          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                        {/* Category Dropdown */}
                        {showCategoryDropdown && (
                          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {allCategories
                              .filter(cat =>
                                cat.toLowerCase().includes((categorySearch || '').toLowerCase())
                              )
                              .map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    setMetadata({ ...metadata, category: cat });
                                    setCategorySearch('');
                                    setShowCategoryDropdown(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                                    metadata.category === cat ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                            {/* Add New Category Option */}
                            {categorySearch && !allCategories.some(cat =>
                              cat.toLowerCase() === categorySearch.toLowerCase()
                            ) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newCat = categorySearch.trim();
                                  if (newCat) {
                                    saveCustomCategory(newCat);
                                    setAllCategories([...allCategories, newCat]);
                                    setMetadata({ ...metadata, category: newCat });
                                    setCategorySearch('');
                                    setShowCategoryDropdown(false);
                                  }
                                }}
                                className="w-full text-left px-3 py-2 text-sm bg-green-50 text-green-700 hover:bg-green-100 border-t border-gray-100"
                              >
                                <Plus className="w-4 h-4 inline mr-2" />
                                Add "{categorySearch}"
                              </button>
                            )}
                            {allCategories.filter(cat =>
                              cat.toLowerCase().includes((categorySearch || '').toLowerCase())
                            ).length === 0 && !categorySearch && (
                              <div className="px-3 py-2 text-sm text-gray-500">No categories found</div>
                            )}
                          </div>
                        )}
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
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-gray-300" />
                              <div
                                className="flex-1 cursor-pointer"
                                onClick={() => setEditingField(field.id)}
                              >
                                <span className="font-medium text-sm">{field.label}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {field.type} • Page {field.page}
                                  {field.required && ' • Required'}
                                  {field.position && ' • Mapped'}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startFieldPlacement(field.id);
                                  setCurrentPage(field.page - 1);
                                }}
                                className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                                  field.position
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title="Map field position on PDF"
                              >
                                <MousePointer2 className="w-3 h-3" />
                                {field.position ? 'Remap' : 'Map'}
                              </button>
                              <Edit3
                                className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600"
                                onClick={() => setEditingField(field.id)}
                              />
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
                      setIsMultiLangMode(false);
                      setLanguageVariants(new Map());
                      setSelectedLanguages(['en']);
                      setMasterPageIndex(0);
                      setMasterLanguage('en');
                      setEditPreviewLanguage('en');
                      setCategorySearch('');
                      setShowCategoryDropdown(false);
                      setFileLanguageAssignments(new Map());
                      setMetadata({
                        title: '',
                        titleSi: '',
                        titleTa: '',
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

      {/* Field Properties Popup */}
      {showFieldPopup && (() => {
        const field = fields.find(f => f.id === showFieldPopup.fieldId);
        if (!field) return null;
        return (
          <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-64"
            style={{
              left: Math.min(showFieldPopup.x, window.innerWidth - 280),
              top: Math.min(showFieldPopup.y + 10, window.innerHeight - 300),
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm text-gray-900 truncate">{field.label}</span>
              <button
                onClick={() => setShowFieldPopup(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Width %</label>
                  <input
                    type="number"
                    value={field.position?.width ?? 20}
                    onChange={(e) => updateFieldPosition(field.id, { width: parseFloat(e.target.value) || 20 })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    min={1}
                    max={100}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Height %</label>
                  <input
                    type="number"
                    value={field.position?.height ?? 3}
                    onChange={(e) => updateFieldPosition(field.id, { height: parseFloat(e.target.value) || 3 })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    min={1}
                    max={50}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Font Size</label>
                  <input
                    type="number"
                    value={field.position?.fontSize ?? 12}
                    onChange={(e) => updateFieldPosition(field.id, { fontSize: parseInt(e.target.value) || 12 })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                    min={6}
                    max={36}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Align</label>
                  <select
                    value={field.position?.align ?? 'left'}
                    onChange={(e) => updateFieldPosition(field.id, { align: e.target.value as 'left' | 'center' | 'right' })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    startFieldPlacement(field.id);
                    setShowFieldPopup(null);
                  }}
                  className="flex-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                >
                  Reposition
                </button>
                <button
                  onClick={() => {
                    updateField(field.id, { position: undefined });
                    setShowFieldPopup(null);
                  }}
                  className="flex-1 px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
