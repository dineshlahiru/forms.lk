import { useState, useEffect } from 'react';
import { Database, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { seedDatabase, isDatabaseSeeded } from '../seed';
import { hasSuperAdmin, createSuperAdmin } from '../services';
import { auth } from '../lib/firebase';
import type { SeedResult } from '../seed';

export function SetupPage() {
  const [isSeeded, setIsSeeded] = useState<boolean | null>(null);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [adminCreated, setAdminCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin form state
  const [adminPhone, setAdminPhone] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      const seeded = await isDatabaseSeeded();
      setIsSeeded(seeded);

      if (seeded) {
        const adminExists = await hasSuperAdmin();
        setHasAdmin(adminExists);
      }
    } catch (err) {
      setError('Failed to check database status. Make sure Firebase is configured correctly.');
      console.error(err);
    }
  }

  async function handleSeedDatabase() {
    setIsSeeding(true);
    setError(null);
    setSeedResult(null);

    try {
      const result = await seedDatabase(false);
      setSeedResult(result);
      setIsSeeded(result.success);

      if (result.success) {
        const adminExists = await hasSuperAdmin();
        setHasAdmin(adminExists);
      }
    } catch (err) {
      setError(`Failed to seed database: ${err}`);
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    setIsCreatingAdmin(true);
    setError(null);

    try {
      // Generate a temporary UID for the admin
      // In production, this should be done after the admin logs in via phone auth
      const currentUser = auth.currentUser;

      if (!currentUser) {
        // For initial setup without auth, create a placeholder
        // The admin will need to sign in later to claim this account
        const tempUid = `admin-${Date.now()}`;
        await createSuperAdmin(tempUid, adminPhone, adminName, adminEmail || undefined);
        setAdminCreated(true);
        setHasAdmin(true);
      } else {
        await createSuperAdmin(currentUser.uid, adminPhone, adminName, adminEmail || undefined);
        setAdminCreated(true);
        setHasAdmin(true);
      }
    } catch (err) {
      setError(`Failed to create admin: ${err}`);
    } finally {
      setIsCreatingAdmin(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">forms.lk Setup</h1>
          <p className="mt-2 text-gray-600">Initialize your database and create the first admin user</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Step 1: Seed Database */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-full ${isSeeded ? 'bg-green-100' : 'bg-blue-100'}`}>
              {isSeeded ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <Database className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">Step 1: Seed Database</h2>
              <p className="text-sm text-gray-500">
                {isSeeded ? 'Database is seeded' : 'Add categories, institutions, and system config'}
              </p>
            </div>
          </div>

          {isSeeded === null ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking database status...
            </div>
          ) : isSeeded ? (
            <div className="text-green-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Database has been seeded successfully
            </div>
          ) : (
            <button
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Seeding Database...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Seed Database
                </>
              )}
            </button>
          )}

          {seedResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
              <p><strong>Categories seeded:</strong> {seedResult.categoriesSeeded}</p>
              <p><strong>Institutions seeded:</strong> {seedResult.institutionsSeeded}</p>
              <p><strong>System config:</strong> {seedResult.systemConfigSeeded ? 'Yes' : 'No'}</p>
              {seedResult.errors.length > 0 && (
                <div className="mt-2 text-red-600">
                  <strong>Errors:</strong>
                  <ul className="list-disc list-inside">
                    {seedResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Create Admin */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-full ${hasAdmin ? 'bg-green-100' : 'bg-blue-100'}`}>
              {hasAdmin ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <Users className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">Step 2: Create Super Admin</h2>
              <p className="text-sm text-gray-500">
                {hasAdmin ? 'Super admin exists' : 'Create the first admin account'}
              </p>
            </div>
          </div>

          {!isSeeded ? (
            <p className="text-gray-500">Complete Step 1 first</p>
          ) : hasAdmin || adminCreated ? (
            <div className="text-green-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Super admin has been created
            </div>
          ) : (
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="+94 77 123 4567"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Admin Name"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@forms.lk"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingAdmin || !adminPhone || !adminName}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreatingAdmin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Admin...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Create Super Admin
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Completion */}
        {isSeeded && hasAdmin && (
          <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-800">Setup Complete!</h3>
            <p className="text-green-700 mt-1">
              Your database is ready. You can now start adding forms.
            </p>
            <a
              href="/"
              className="inline-block mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Go to Homepage
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
