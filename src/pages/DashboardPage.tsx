import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FileText,
  Edit3,
  Eye,
  Trash2,
  MoreVertical,
  Clock,
  Download,
  Copy,
  Check,
  Search,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';

type Tab = 'all' | 'drafts' | 'published' | 'filled';

interface UserForm {
  id: string;
  title: string;
  status: 'draft' | 'published';
  views: number;
  downloads: number;
  updatedAt: string;
}

// Mock user forms data
const userForms: UserForm[] = [
  {
    id: 'user-form-1',
    title: 'Bank Account Opening Form',
    status: 'draft',
    views: 0,
    downloads: 0,
    updatedAt: '2024-12-05T10:30:00Z',
  },
  {
    id: 'user-form-2',
    title: 'Passport Application Checklist',
    status: 'published',
    views: 45,
    downloads: 12,
    updatedAt: '2024-11-28T14:20:00Z',
  },
];

// Mock filled forms data
const filledForms = [
  {
    id: 'filled-1',
    formId: 'form-ds-character',
    formTitle: 'Character Certificate Application',
    filledAt: '2024-12-01T09:15:00Z',
  },
];

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'All Forms', count: userForms.length },
    { id: 'drafts', label: 'Drafts', count: userForms.filter((f) => f.status === 'draft').length },
    { id: 'published', label: 'Published', count: userForms.filter((f) => f.status === 'published').length },
    { id: 'filled', label: 'Filled Forms', count: filledForms.length },
  ];

  const filteredForms = userForms.filter((form) => {
    const matchesSearch = form.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'drafts' && form.status === 'draft') ||
      (activeTab === 'published' && form.status === 'published');
    return matchesSearch && matchesTab;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1A202C]">My Forms</h1>
            <p className="text-[#718096] mt-1">Manage your created and filled forms</p>
          </div>
          <Link to="/builder">
            <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
              Create New Form
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#3182CE] text-[#3182CE]'
                    : 'border-transparent text-[#718096] hover:text-[#1A202C]'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-[#EBF4FF]' : 'bg-gray-100'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          {activeTab !== 'filled' && (
            <div className="p-4 border-b border-gray-100">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your forms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182CE]"
                />
              </div>
            </div>
          )}

          {/* Content */}
          {activeTab !== 'filled' ? (
            // Forms Table
            <div className="overflow-x-auto">
              {filteredForms.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#718096] uppercase tracking-wider">
                        Form Title
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#718096] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#718096] uppercase tracking-wider">
                        Views
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#718096] uppercase tracking-wider">
                        Downloads
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#718096] uppercase tracking-wider">
                        Updated
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-[#718096] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredForms.map((form) => (
                      <tr key={form.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#EBF4FF] rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-[#3182CE]" />
                            </div>
                            <span className="font-medium text-[#1A202C]">{form.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              form.status === 'published'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {form.status === 'published' && <Check className="w-3 h-3" />}
                            {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#718096]">{form.views}</td>
                        <td className="px-6 py-4 text-[#718096]">{form.downloads}</td>
                        <td className="px-6 py-4 text-[#718096]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(form.updatedAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={() => setOpenMenu(openMenu === form.id ? null : form.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                              <MoreVertical className="w-4 h-4 text-[#718096]" />
                            </button>
                            {openMenu === form.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                <button className="w-full px-4 py-2 text-left text-sm text-[#4A5568] hover:bg-gray-50 flex items-center gap-2">
                                  <Edit3 className="w-4 h-4" /> Edit
                                </button>
                                <button className="w-full px-4 py-2 text-left text-sm text-[#4A5568] hover:bg-gray-50 flex items-center gap-2">
                                  <Eye className="w-4 h-4" /> Preview
                                </button>
                                <button className="w-full px-4 py-2 text-left text-sm text-[#4A5568] hover:bg-gray-50 flex items-center gap-2">
                                  <Copy className="w-4 h-4" /> Duplicate
                                </button>
                                <hr className="my-1" />
                                <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1A202C] mb-2">No forms yet</h3>
                  <p className="text-[#718096] mb-6">
                    {searchQuery
                      ? 'No forms match your search.'
                      : 'Create your first form to help digitize Sri Lanka.'}
                  </p>
                  {!searchQuery && (
                    <Link to="/builder">
                      <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
                        Create Form
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Filled Forms List
            <div className="p-6">
              {filledForms.length > 0 ? (
                <div className="space-y-4">
                  {filledForms.map((filled) => (
                    <div
                      key={filled.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#EBF4FF] rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-[#3182CE]" />
                        </div>
                        <div>
                          <h3 className="font-medium text-[#1A202C]">{filled.formTitle}</h3>
                          <p className="text-sm text-[#718096]">
                            Filled on {new Date(filled.filledAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>
                          Download PDF
                        </Button>
                        <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4 text-red-500" />}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1A202C] mb-2">No filled forms</h3>
                  <p className="text-[#718096] mb-6">
                    Forms you fill will appear here for easy access.
                  </p>
                  <Link to="/forms">
                    <Button variant="primary">Browse Forms</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
