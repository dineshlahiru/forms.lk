import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  Download,
  Globe,
  Smartphone,
  Cloud,
  Shield,
  Languages,
  CheckCircle,
  Users,
  Search,
  Loader2,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { useAllForms, useCategories } from '../hooks';
import {
  searchForms,
  getFormLocalizedTitle,
  getCategoryLocalizedName,
} from '../services';
import type { FirebaseForm } from '../types/firebase';

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Firebase hooks
  const { data: forms, loading: formsLoading } = useAllForms();
  const { data: categories, loading: categoriesLoading } = useCategories();

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter suggestions based on search query
  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2 || !forms) return [];
    return searchForms(forms, searchQuery).slice(0, 6); // Limit to 6 suggestions
  }, [searchQuery, forms]);

  // Get popular categories with form counts
  const popularCategories = useMemo(() => {
    if (!categories) return [];
    return categories
      .filter(cat => cat.isActive)
      .sort((a, b) => b.formCount - a.formCount)
      .slice(0, 6);
  }, [categories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (searchQuery.trim()) {
      navigate(`/forms?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/forms');
    }
  };

  const handleSuggestionClick = (form: FirebaseForm) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/form/${form.id}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(true);
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1A365D] via-[#2B4C7E] to-[#3182CE] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-6">
              <Globe className="w-4 h-4" />
              <span className="text-sm">Available in English, සිංහල, தமிழ்</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-8">
              forms.lk
            </h1>

            {/* Search Bar with Suggestions */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
              <div className="relative" ref={searchRef}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleInputChange}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search forms by name, category, institution..."
                  className={`w-full pl-12 pr-32 py-4 text-gray-800 text-lg placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-white/30 shadow-lg ${
                    showSuggestions && suggestions.length > 0 ? 'rounded-t-2xl rounded-b-none' : 'rounded-full'
                  }`}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#3182CE] hover:bg-[#2B6CB0] text-white px-6 py-2 rounded-full font-medium transition-colors z-10"
                >
                  Search
                </button>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border-t border-gray-100 rounded-b-2xl shadow-lg overflow-hidden z-20">
                    {suggestions.map((form) => (
                      <button
                        key={form.id}
                        type="button"
                        onClick={() => handleSuggestionClick(form)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <FileText className="w-5 h-5 text-[#3182CE] mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {getFormLocalizedTitle(form, 'en')}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {form.institutionId} • {form.categoryId}
                          </div>
                        </div>
                      </button>
                    ))}
                    {searchQuery.trim() && (
                      <button
                        type="submit"
                        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left border-t border-gray-100"
                      >
                        <Search className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-600">
                          Search for "<span className="font-medium text-gray-900">{searchQuery}</span>"
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </form>

            <p className="text-blue-200 mb-8 max-w-2xl mx-auto text-lg">
              Access government and official forms in your preferred language.
              Fill online, export to PDF, and print - completely free.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/forms">
                <Button variant="secondary" size="lg" icon={<FileText className="w-5 h-5" />}>
                  Browse All Forms
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  variant="outline"
                  size="lg"
                  icon={<Smartphone className="w-5 h-5" />}
                  className="border-white text-white hover:bg-white hover:text-[#1A365D]"
                >
                  Create Free Account
                </Button>
              </Link>
            </div>
            <p className="text-blue-200 text-sm mt-6">
              No sign-up required to use. Create account to save your forms.
            </p>
          </div>
        </div>
      </section>

      {/* Language Bar */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="flex items-center gap-3">
              <Languages className="w-5 h-5 text-[#3182CE]" />
              <span className="text-gray-600 font-medium">Forms available in:</span>
            </div>
            <div className="flex gap-4">
              <span className="px-4 py-2 bg-blue-50 text-[#1A365D] rounded-full font-medium">English</span>
              <span className="px-4 py-2 bg-green-50 text-green-700 rounded-full font-medium">සිංහල</span>
              <span className="px-4 py-2 bg-orange-50 text-orange-700 rounded-full font-medium">தமிழ்</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A202C] mb-4">How It Works</h2>
            <p className="text-[#718096] max-w-2xl mx-auto text-lg">
              Simple 3-step process to get your forms ready
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-[#3182CE]">1</span>
              </div>
              <h3 className="font-semibold text-xl mb-3">Find Your Form</h3>
              <p className="text-[#718096]">
                Search by category, institution, or name. Select your preferred language.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="font-semibold text-xl mb-3">Fill Online</h3>
              <p className="text-[#718096]">
                Complete the form in your browser. Your progress is automatically saved.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-semibold text-xl mb-3">Download & Print</h3>
              <p className="text-[#718096]">
                Export as PDF, print at home, or save to your account for later.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link to="/forms">
              <Button variant="primary" size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                Browse All Forms
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A202C] mb-4">Why forms.lk?</h2>
            <p className="text-[#718096] max-w-2xl mx-auto text-lg">
              The easiest way to access official forms in Sri Lanka
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6 text-[#3182CE]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Multi-Language Support</h3>
                <p className="text-[#718096]">
                  Forms available in English, Sinhala, and Tamil. Choose your preferred language.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">100% Free</h3>
                <p className="text-[#718096]">
                  No hidden charges. Browse, fill, and download forms completely free.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                <Download className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Export to PDF</h3>
                <p className="text-[#718096]">
                  Download filled forms as professional PDFs ready for printing.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Easy Sign Up</h3>
                <p className="text-[#718096]">
                  Create account with just your mobile number. No email required.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center shrink-0">
                <Cloud className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Save Online</h3>
                <p className="text-[#718096]">
                  Create an account to save your filled forms and access them anytime.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Verified Forms</h3>
                <p className="text-[#718096]">
                  All forms are verified by our team for accuracy and authenticity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A202C] mb-4">Popular Categories</h2>
            <p className="text-[#718096] max-w-2xl mx-auto">
              Find forms from various government institutions
            </p>
          </div>

          {categoriesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {popularCategories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/forms?category=${encodeURIComponent(cat.id)}`}
                  className="bg-white rounded-xl p-6 text-center hover:shadow-md transition-shadow group"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 transition-colors">
                    <FileText className="w-6 h-6 text-[#3182CE]" />
                  </div>
                  <h3 className="font-medium text-sm text-gray-800 mb-1">
                    {getCategoryLocalizedName(cat, 'en')}
                  </h3>
                  <p className="text-xs text-gray-500">{cat.formCount} forms</p>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link to="/forms" className="text-[#3182CE] hover:text-[#2B6CB0] font-medium inline-flex items-center gap-1">
              View All Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Account CTA */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#1A365D] to-[#2B6CB0] rounded-3xl p-8 md:p-16 text-center text-white">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Create Your Free Account
            </h2>
            <p className="text-blue-100 mb-8 max-w-xl mx-auto text-lg">
              Save your filled forms online and access them from anywhere.
              Sign up with just your mobile number.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" size="lg" icon={<Smartphone className="w-5 h-5" />}>
                Sign Up with Mobile
              </Button>
            </div>
            <p className="text-blue-200 text-sm mt-6">
              Free forever. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-[#1A365D] mb-2">
                {formsLoading ? '...' : `${forms?.length || 0}+`}
              </div>
              <div className="text-[#718096]">Forms Available</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#1A365D] mb-2">3</div>
              <div className="text-[#718096]">Languages</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#1A365D] mb-2">50k+</div>
              <div className="text-[#718096]">Downloads</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#1A365D] mb-2">100%</div>
              <div className="text-[#718096]">Free</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 md:py-20 bg-[#1A365D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Start Using forms.lk Today
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Find official Sri Lankan forms in your language, fill them online, and download as PDF.
          </p>
          <Link to="/forms">
            <Button variant="secondary" size="lg" icon={<FileText className="w-5 h-5" />}>
              Browse Forms
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
