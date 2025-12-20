// Institution Intelligence Page - Full page for managing institution contacts & sync

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Users,
  FolderOpen,
  History,
  RefreshCw,
  Loader2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Edit3,
  ExternalLink,
  Search,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Plus,
  X,
  Save,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { SyncPanel } from '../components/institution-intel/SyncPanel';
import { ContactPreview } from '../components/institution-intel/ContactPreview';
import { DivisionList } from '../components/institution-intel/DivisionList';
import { BudgetMonitor } from '../components/institution-intel/BudgetMonitor';
import {
  getInstitution,
  getInstitutionLocalizedName,
  getContactsByInstitution,
  getContactsByDivision,
  getDivisions,
  getSyncHistory,
  getInstitutionSyncStatus,
  updateContact,
  deleteContact,
} from '../services';
import type { FirebaseInstitution } from '../types/firebase';
import type { Contact, Division, ExtractedData, UpdateContactInput } from '../types/institution-intel';

type TabType = 'overview' | 'contacts' | 'divisions' | 'sync' | 'history';

export function InstitutionIntelligencePage() {
  const { institutionId } = useParams<{ institutionId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [institution, setInstitution] = useState<FirebaseInstitution | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [syncHistory, setSyncHistory] = useState<{
    id: string;
    sourceUrl: string;
    status: string;
    contactsFound: number;
    contactsImported: number;
    changesDetected: boolean;
    tokensUsed: number;
    costUsd: number;
    errorMessage?: string;
    syncedAt: string;
  }[]>([]);
  const [syncStatus, setSyncStatus] = useState<{
    hasSourceUrl: boolean;
    lastSyncedAt?: string;
    autoSyncEnabled: boolean;
    syncFrequency: string;
    contactCount: number;
    divisionCount: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivision, setFilterDivision] = useState<string>('all');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  // Edit contact state
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    position: '',
    phones: '',
    email: '',
    fax: '',
    divisionId: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Division panel state
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [divisionSearch, setDivisionSearch] = useState('');
  const [divisionContacts, setDivisionContacts] = useState<Contact[]>([]);

  // Load data
  const loadData = useCallback(async () => {
    if (!institutionId) return;

    setLoading(true);
    try {
      const [inst, contactsData, divisionsData, status, history] = await Promise.all([
        getInstitution(institutionId),
        getContactsByInstitution(institutionId),
        getDivisions(institutionId),
        getInstitutionSyncStatus(institutionId),
        getSyncHistory(institutionId),
      ]);

      setInstitution(inst);
      setContacts(contactsData);
      setDivisions(divisionsData);
      setSyncStatus(status);
      setSyncHistory(history);
    } catch (error) {
      console.error('Failed to load institution data:', error);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter contacts
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = !searchQuery ||
      contact.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDivision = filterDivision === 'all' || contact.divisionId === filterDivision;

    return matchesSearch && matchesDivision;
  });

  // Group contacts by division
  const contactsByDivision = filteredContacts.reduce((acc, contact) => {
    const divId = contact.divisionId;
    if (!acc[divId]) {
      acc[divId] = [];
    }
    acc[divId].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  // Handle edit contact
  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setEditForm({
      name: contact.name || '',
      position: contact.position,
      phones: contact.phones.join(', '),
      email: contact.email || '',
      fax: contact.fax || '',
      divisionId: contact.divisionId,
    });
  };

  // Handle save edited contact
  const handleSaveContact = async () => {
    if (!editingContact) return;

    setIsSaving(true);
    try {
      const input: UpdateContactInput = {
        name: editForm.name || undefined,
        position: editForm.position,
        phones: editForm.phones.split(',').map(p => p.trim()).filter(Boolean),
        email: editForm.email || undefined,
        fax: editForm.fax || undefined,
        divisionId: editForm.divisionId,
      };

      await updateContact(editingContact.id, input);
      setEditingContact(null);
      await loadData();
    } catch (error) {
      console.error('Failed to update contact:', error);
      alert('Failed to update contact');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete contact
  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteContact(contactId);
      setDeleteConfirmId(null);
      await loadData();
    } catch (error) {
      console.error('Failed to delete contact:', error);
      alert('Failed to delete contact');
    }
  };

  // Handle select division (for right panel)
  const handleSelectDivision = async (division: Division) => {
    setSelectedDivision(division);
    try {
      const contacts = await getContactsByDivision(division.id);
      setDivisionContacts(contacts);
    } catch (error) {
      console.error('Failed to load division contacts:', error);
      setDivisionContacts([]);
    }
  };

  // Filter divisions by search
  const filteredDivisions = divisions.filter(div =>
    divisionSearch === '' ||
    div.name.toLowerCase().includes(divisionSearch.toLowerCase()) ||
    div.district?.toLowerCase().includes(divisionSearch.toLowerCase()) ||
    div.address?.toLowerCase().includes(divisionSearch.toLowerCase())
  );

  if (!institutionId) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-red-600">Institution not found</h1>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!institution) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Institution Not Found</h1>
          <p className="text-gray-600 mb-6">The institution you're looking for doesn't exist.</p>
          <Link to="/admin">
            <Button variant="primary">Back to Admin</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const tabs: { id: TabType; label: string; icon: typeof Users }[] = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'divisions', label: 'Divisions', icon: FolderOpen },
    { id: 'sync', label: 'Sync', icon: RefreshCw },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-[#1A365D] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => navigate('/admin')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">
                  {getInstitutionLocalizedName(institution, 'en')}
                </h1>
                <p className="text-blue-200 text-sm mt-1">Institution Intelligence</p>
              </div>
              <Link to={`/admin`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-blue-200 text-sm">Contacts</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-bold">{divisions.length}</p>
                <p className="text-blue-200 text-sm">Divisions</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-bold">{syncHistory.length}</p>
                <p className="text-blue-200 text-sm">Syncs</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-2xl font-bold">
                  {syncStatus?.lastSyncedAt
                    ? new Date(syncStatus.lastSyncedAt).toLocaleDateString()
                    : 'Never'}
                </p>
                <p className="text-blue-200 text-sm">Last Synced</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto py-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#1A365D] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {tab.id === 'contacts' && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
                      }`}>
                        {contacts.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Institution Info */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Institution Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {institution.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Address</p>
                          <p className="text-sm text-gray-600">{institution.address}</p>
                        </div>
                      </div>
                    )}
                    {institution.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Phone</p>
                          <p className="text-sm text-gray-600">{institution.phone}</p>
                        </div>
                      </div>
                    )}
                    {institution.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Email</p>
                          <a href={`mailto:${institution.email}`} className="text-sm text-blue-600 hover:underline">
                            {institution.email}
                          </a>
                        </div>
                      </div>
                    )}
                    {institution.website && (
                      <div className="flex items-start gap-3">
                        <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Website</p>
                          <a
                            href={institution.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {institution.website}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Contacts */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Recent Contacts</h3>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('contacts')}>
                      View All
                    </Button>
                  </div>
                  {contacts.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No contacts yet. Run a sync to import contacts.</p>
                  ) : (
                    <div className="space-y-3">
                      {contacts.slice(0, 5).map((contact) => (
                        <div key={contact.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{contact.position}</p>
                            {contact.name && (
                              <p className="text-sm text-gray-500 truncate">{contact.name}</p>
                            )}
                          </div>
                          {contact.phones.length > 0 && (
                            <a
                              href={`tel:${contact.phones[0].replace(/\s/g, '')}`}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {contact.phones[0]}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <BudgetMonitor />
                <DivisionList
                  institutionId={institutionId}
                  onSelectDivision={(id) => {
                    setFilterDivision(id);
                    setActiveTab('contacts');
                  }}
                />
              </div>
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              {/* Search & Filter */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <select
                    value={filterDivision}
                    onChange={(e) => setFilterDivision(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Divisions</option>
                    {divisions.map((div) => (
                      <option key={div.id} value={div.id}>{div.name}</option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Showing {filteredContacts.length} of {contacts.length} contacts
                </p>
              </div>

              {/* Contacts Grid */}
              {filteredContacts.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Contacts Found</h3>
                  <p className="text-gray-500 mb-4">
                    {contacts.length === 0
                      ? 'Run a sync to import contacts from the website.'
                      : 'Try adjusting your search or filter.'}
                  </p>
                  {contacts.length === 0 && (
                    <Button variant="primary" onClick={() => setActiveTab('sync')}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Start Sync
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredContacts.map((contact) => {
                    const division = divisions.find((d) => d.id === contact.divisionId);
                    const isDeleting = deleteConfirmId === contact.id;
                    return (
                      <div key={contact.id} className="bg-white rounded-xl border border-gray-200 p-4 group relative">
                        {/* Action buttons */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditContact(contact)}
                            className="p-1.5 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit contact"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(contact.id)}
                            className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete contact"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Delete confirmation overlay */}
                        {isDeleting && (
                          <div className="absolute inset-0 bg-white/95 rounded-xl flex flex-col items-center justify-center gap-3 z-10">
                            <p className="text-sm text-gray-700 font-medium">Delete this contact?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDeleteContact(contact.id)}
                                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{contact.position}</p>
                            {contact.name && (
                              <p className="text-sm text-gray-600 truncate">{contact.name}</p>
                            )}
                            {division && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                {division.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                          {contact.phones.length > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4 text-green-500" />
                              <div className="flex flex-wrap gap-1.5">
                                {contact.phones.map((phone, idx) => (
                                  <a
                                    key={idx}
                                    href={`tel:${phone.replace(/\s/g, '')}`}
                                    className="text-blue-600 hover:underline"
                                  >
                                    {phone}{idx < contact.phones.length - 1 ? ',' : ''}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {contact.fax && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4 text-orange-500" />
                              <span className="truncate">Fax: {contact.fax}</span>
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4 text-blue-500" />
                              <a href={`mailto:${contact.email}`} className="truncate hover:underline">
                                {contact.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Divisions Tab */}
          {activeTab === 'divisions' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Division List with Search */}
              <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200">
                {/* Search Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={divisionSearch}
                      onChange={(e) => setDivisionSearch(e.target.value)}
                      placeholder="Search divisions..."
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {filteredDivisions.length} of {divisions.length} divisions
                  </p>
                </div>

                {/* Division List */}
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {filteredDivisions.length === 0 ? (
                    <div className="p-8 text-center">
                      <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No divisions found</p>
                    </div>
                  ) : (
                    filteredDivisions.map((division) => (
                      <button
                        key={division.id}
                        onClick={() => handleSelectDivision(division)}
                        className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                          selectedDivision?.id === division.id ? 'bg-blue-50 border-l-2 border-blue-600' : ''
                        }`}
                      >
                        <p className="font-medium text-gray-900 text-sm">{division.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">
                            {division.contactCount} contacts
                          </span>
                          {division.locationType === 'district_office' && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                              District
                            </span>
                          )}
                        </div>
                        {division.address && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{division.address}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Division Details Panel */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                {selectedDivision ? (
                  <div>
                    {/* Division Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{selectedDivision.name}</h3>
                        {selectedDivision.district && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-sm">
                            {selectedDivision.district} District
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDivision(null);
                          setDivisionContacts([]);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>

                    {/* Division Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {selectedDivision.address && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Address</p>
                            <p className="text-sm text-gray-900">{selectedDivision.address}</p>
                          </div>
                        </div>
                      )}

                      {selectedDivision.phones && selectedDivision.phones.length > 0 && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <Phone className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Phone Numbers</p>
                            <div className="space-y-1">
                              {selectedDivision.phones.map((phone, idx) => (
                                <a
                                  key={idx}
                                  href={`tel:${phone.replace(/\s/g, '')}`}
                                  className="block text-sm text-blue-600 hover:underline"
                                >
                                  {phone}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedDivision.fax && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <Phone className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Fax</p>
                            <p className="text-sm text-gray-900">{selectedDivision.fax}</p>
                          </div>
                        </div>
                      )}

                      {selectedDivision.email && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Email</p>
                            <a
                              href={`mailto:${selectedDivision.email}`}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {selectedDivision.email}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Division Contacts */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Contacts ({divisionContacts.length})
                      </h4>
                      {divisionContacts.length === 0 ? (
                        <p className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded-lg">
                          No contacts in this division
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {divisionContacts.map((contact) => (
                            <div key={contact.id} className="p-3 border border-gray-200 rounded-lg">
                              <p className="font-medium text-gray-900 text-sm">{contact.position}</p>
                              {contact.name && (
                                <p className="text-sm text-gray-600">{contact.name}</p>
                              )}
                              <div className="mt-2 space-y-1">
                                {contact.phones.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-3 h-3 text-green-500" />
                                    <div className="flex flex-wrap gap-2">
                                      {contact.phones.map((phone, idx) => (
                                        <a
                                          key={idx}
                                          href={`tel:${phone.replace(/\s/g, '')}`}
                                          className="text-xs text-blue-600 hover:underline"
                                        >
                                          {phone}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {contact.email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-3 h-3 text-blue-500" />
                                    <a
                                      href={`mailto:${contact.email}`}
                                      className="text-xs text-blue-600 hover:underline"
                                    >
                                      {contact.email}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <FolderOpen className="w-12 h-12 mb-3" />
                    <p className="text-gray-500">Select a division to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sync Tab */}
          {activeTab === 'sync' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SyncPanel
                institutionId={institutionId}
                institutionName={getInstitutionLocalizedName(institution, 'en')}
                onSyncComplete={loadData}
                onExtractedData={setExtractedData}
              />
              {extractedData && (
                <ContactPreview data={extractedData} />
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-600" />
                  Sync History
                </h3>
              </div>
              {syncHistory.length === 0 ? (
                <div className="p-12 text-center">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Sync History</h3>
                  <p className="text-gray-500 mb-4">Run your first sync to see history here.</p>
                  <Button variant="primary" onClick={() => setActiveTab('sync')}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Start Sync
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {syncHistory.map((sync) => (
                    <div key={sync.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {sync.status === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {sync.status === 'success' ? 'Sync Successful' : 'Sync Failed'}
                            </p>
                            <p className="text-sm text-gray-500">{sync.sourceUrl}</p>
                            {sync.errorMessage && (
                              <p className="text-sm text-red-600 mt-1">{sync.errorMessage}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(sync.syncedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                        <span>Found: {sync.contactsFound}</span>
                        <span>Imported: {sync.contactsImported}</span>
                        <span>Tokens: {sync.tokensUsed.toLocaleString()}</span>
                        <span>Cost: ${sync.costUsd.toFixed(3)}</span>
                        {sync.changesDetected && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                            Changes Detected
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Contact</h3>
              <button
                onClick={() => setEditingContact(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., Director General"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                <select
                  value={editForm.divisionId}
                  onChange={(e) => setEditForm({ ...editForm, divisionId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>{div.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Numbers
                </label>
                <input
                  type="text"
                  value={editForm.phones}
                  onChange={(e) => setEditForm({ ...editForm, phones: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Separate multiple with commas"
                />
                <p className="text-xs text-gray-500 mt-1">e.g., 011-2234567, 011-2234568</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                <input
                  type="text"
                  value={editForm.fax}
                  onChange={(e) => setEditForm({ ...editForm, fax: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., 011-2234569"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., contact@gov.lk"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingContact(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveContact}
                disabled={isSaving || !editForm.position.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
