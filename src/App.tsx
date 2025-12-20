import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UploadQueueProvider } from './context/UploadQueueContext';
import { isLocalStorage, seedLocalDatabase, isLocalDatabaseSeeded, devLogin } from './services';
import { HomePage } from './pages/HomePage';
import { FormsLibraryPage } from './pages/FormsLibraryPage';
import { FormDetailPage } from './pages/FormDetailPage';
import { FormBuilderPage } from './pages/FormBuilderPage';
import { FormFillerPage } from './pages/FormFillerPage';
import { DisasterReliefFormPage } from './pages/DisasterReliefFormPage';
import { PassportApplicationPage } from './pages/PassportApplicationPage';
import { PoliceClearanceFormPage } from './pages/PoliceClearanceFormPage';
import { DualCitizenshipFormPage } from './pages/DualCitizenshipFormPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { FormDigitizerPage } from './pages/FormDigitizerPage';
import { InstitutionIntelligencePage } from './pages/InstitutionIntelligencePage';
import { SetupPage } from './pages/SetupPage';
import { CustomFormFillerPage } from './pages/CustomFormFillerPage';
import { AdvancedFormFillerPage } from './pages/AdvancedFormFillerPage';
import { Layout } from './components/layout/Layout';

function NotFoundPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
        <Link to="/" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Go Home
        </Link>
      </div>
    </Layout>
  );
}

function App() {
  const [isInitialized, setIsInitialized] = useState(!isLocalStorage());

  // Initialize local database when in local mode
  useEffect(() => {
    if (!isLocalStorage()) return;

    const initLocalMode = async () => {
      try {
        // Check if database needs seeding
        const isSeeded = await isLocalDatabaseSeeded();
        if (!isSeeded) {
          console.log('[App] Seeding local database...');
          const result = await seedLocalDatabase();
          console.log('[App] Seed result:', result);
        } else {
          console.log('[App] Local database already seeded');
        }

        // Auto-login as dev admin for convenience
        console.log('[App] Auto-logging in as dev admin...');
        await devLogin();
        console.log('[App] Dev login complete');
      } catch (error) {
        console.error('[App] Local mode initialization failed:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initLocalMode();
  }, []);

  // Show loading while initializing local mode
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing local database...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <UploadQueueProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/forms" element={<FormsLibraryPage />} />
            <Route path="/form/:formId" element={<FormDetailPage />} />
            <Route path="/fill/:formId" element={<FormFillerPage />} />
            <Route path="/fill/disaster-relief" element={<DisasterReliefFormPage />} />
            <Route path="/fill/passport-application" element={<PassportApplicationPage />} />
            <Route path="/fill/police-clearance-embassy" element={<PoliceClearanceFormPage />} />
            <Route path="/fill/dual-citizenship" element={<DualCitizenshipFormPage />} />
            <Route path="/fill/custom/:formId" element={<CustomFormFillerPage />} />
            <Route path="/fill/advanced/:formId" element={<AdvancedFormFillerPage />} />
            <Route path="/builder" element={<FormBuilderPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/digitizer" element={<FormDigitizerPage />} />
            <Route path="/admin/institution/:institutionId" element={<InstitutionIntelligencePage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </UploadQueueProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
