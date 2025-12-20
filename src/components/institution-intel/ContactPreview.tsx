// Contact Preview Component - Shows extracted contacts before import

import { useState, useMemo } from 'react';
import {
  User,
  Phone,
  Mail,
  Building2,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Search,
  Users,
  MapPin,
} from 'lucide-react';
import type { ExtractedData, ExtractedContact } from '../../types/institution-intel';

interface ContactPreviewProps {
  data: ExtractedData;
  selectedContacts?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
}

export function ContactPreview({
  data,
  selectedContacts,
  onSelectionChange,
}: ContactPreviewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['headOffice', 'branches']));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivision, setFilterDivision] = useState<string>('all');

  // Generate unique IDs for contacts
  const contactsWithIds = useMemo(() => {
    const headOffice = data.headOffice.map((c, i) => ({
      ...c,
      id: `head-${i}`,
      type: 'headOffice' as const,
    }));
    const branches = data.branches.map((c, i) => ({
      ...c,
      id: `branch-${i}`,
      type: 'branch' as const,
    }));
    return { headOffice, branches };
  }, [data]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    const filterFn = (contact: ExtractedContact) => {
      const matchesSearch = !searchQuery ||
        contact.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.division?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDivision = filterDivision === 'all' ||
        contact.division === filterDivision ||
        (!contact.division && filterDivision === 'Head Office');

      return matchesSearch && matchesDivision;
    };

    return {
      headOffice: contactsWithIds.headOffice.filter(filterFn),
      branches: contactsWithIds.branches.filter(filterFn),
    };
  }, [contactsWithIds, searchQuery, filterDivision]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const next = new Set(expandedSections);
    if (next.has(section)) {
      next.delete(section);
    } else {
      next.add(section);
    }
    setExpandedSections(next);
  };

  // Toggle contact selection
  const toggleContact = (id: string) => {
    if (!onSelectionChange || !selectedContacts) return;

    const next = new Set(selectedContacts);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  // Select/deselect all in section
  const toggleSectionSelection = (section: 'headOffice' | 'branches') => {
    if (!onSelectionChange || !selectedContacts) return;

    const contacts = section === 'headOffice' ? filteredContacts.headOffice : filteredContacts.branches;
    const allSelected = contacts.every(c => selectedContacts.has(c.id));

    const next = new Set(selectedContacts);
    if (allSelected) {
      contacts.forEach(c => next.delete(c.id));
    } else {
      contacts.forEach(c => next.add(c.id));
    }
    onSelectionChange(next);
  };

  const ContactCard = ({ contact, showCheckbox }: { contact: ExtractedContact & { id: string; type: string }; showCheckbox: boolean }) => {
    const isSelected = selectedContacts?.has(contact.id) ?? false;

    return (
      <div
        className={`p-3 rounded-lg border transition-colors ${
          isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'
        }`}
      >
        <div className="flex items-start gap-3">
          {showCheckbox && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleContact(contact.id)}
              className="mt-1 w-4 h-4 rounded border-gray-300"
            />
          )}
          <div className="flex-1 min-w-0">
            {/* Position & Name */}
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{contact.position}</p>
                {contact.name && (
                  <p className="text-sm text-gray-600 truncate">{contact.name}</p>
                )}
              </div>
            </div>

            {/* Division */}
            {contact.division && (
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{contact.division}</span>
              </div>
            )}

            {/* Contact Info */}
            <div className="mt-2 space-y-1">
              {contact.phones && contact.phones.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Phone className="w-3 h-3 text-green-500" />
                  <span className="truncate">{contact.phones.join(', ')}</span>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Mail className="w-3 h-3 text-blue-500" />
                  <span className="truncate">{contact.email}</span>
                </div>
              )}
              {contact.fax && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <span className="w-3 h-3 text-gray-400 text-[10px] font-bold">FAX</span>
                  <span className="truncate">{contact.fax}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SectionHeader = ({
    title,
    icon: Icon,
    count,
    section,
    filteredCount,
  }: {
    title: string;
    icon: typeof User;
    count: number;
    section: 'headOffice' | 'branches';
    filteredCount: number;
  }) => {
    const isExpanded = expandedSections.has(section);
    const contacts = section === 'headOffice' ? filteredContacts.headOffice : filteredContacts.branches;
    const allSelected = selectedContacts && contacts.length > 0 && contacts.every(c => selectedContacts.has(c.id));

    return (
      <div
        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
        onClick={() => toggleSection(section)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <Icon className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-700">{title}</span>
          <span className="px-2 py-0.5 bg-white rounded-full text-xs text-gray-500">
            {filteredCount}/{count}
          </span>
        </div>
        {selectedContacts && filteredCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSectionSelection(section);
            }}
            className={`text-xs px-2 py-1 rounded ${
              allSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>
    );
  };

  const totalContacts = data.headOffice.length + data.branches.length;
  const filteredTotal = filteredContacts.headOffice.length + filteredContacts.branches.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Extracted Contacts
          </h3>
          <span className="text-sm text-gray-500">
            {selectedContacts ? `${selectedContacts.size} selected` : `${totalContacts} total`}
          </span>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterDivision}
            onChange={(e) => setFilterDivision(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Divisions</option>
            {data.divisions.map((div) => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>

        {filteredTotal < totalContacts && (
          <p className="mt-2 text-xs text-gray-500">
            Showing {filteredTotal} of {totalContacts} contacts
          </p>
        )}
      </div>

      {/* Divisions Summary */}
      {data.divisions.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 mb-2">DIVISIONS FOUND</p>
          <div className="flex flex-wrap gap-1">
            {data.divisions.map((div) => (
              <span
                key={div}
                className="px-2 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600"
              >
                {div}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact Lists */}
      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {/* Head Office Section */}
        {data.headOffice.length > 0 && (
          <div>
            <SectionHeader
              title="Head Office"
              icon={Building2}
              count={data.headOffice.length}
              section="headOffice"
              filteredCount={filteredContacts.headOffice.length}
            />
            {expandedSections.has('headOffice') && (
              <div className="mt-2 space-y-2">
                {filteredContacts.headOffice.length > 0 ? (
                  filteredContacts.headOffice.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      showCheckbox={!!selectedContacts}
                    />
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No matching contacts</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Branches Section */}
        {data.branches.length > 0 && (
          <div>
            <SectionHeader
              title="Branches"
              icon={MapPin}
              count={data.branches.length}
              section="branches"
              filteredCount={filteredContacts.branches.length}
            />
            {expandedSections.has('branches') && (
              <div className="mt-2 space-y-2">
                {filteredContacts.branches.length > 0 ? (
                  filteredContacts.branches.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      showCheckbox={!!selectedContacts}
                    />
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No matching contacts</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {data.headOffice.length === 0 && data.branches.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No contacts extracted</p>
          </div>
        )}
      </div>
    </div>
  );
}
