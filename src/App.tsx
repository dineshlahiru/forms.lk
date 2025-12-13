import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
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
  return (
    <BrowserRouter>
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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
