// Division List Component - Manages divisions for an institution

import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Plus,
  Edit3,
  Trash2,
  Users,
  Loader2,
  ChevronRight,
  GripVertical,
  X,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  getDivisions,
  createDivision,
  updateDivision,
  deleteDivision,
  getContactsByDivision,
} from '../../services';
import type { Division, Contact } from '../../types/institution-intel';

interface DivisionListProps {
  institutionId: string;
  onSelectDivision?: (divisionId: string) => void;
  selectedDivisionId?: string;
}

export function DivisionList({
  institutionId,
  onSelectDivision,
  selectedDivisionId,
}: DivisionListProps) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDivisionName, setNewDivisionName] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);
  const [divisionContacts, setDivisionContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Load divisions
  const loadDivisions = useCallback(async () => {
    try {
      const data = await getDivisions(institutionId);
      setDivisions(data);
    } catch (error) {
      console.error('Failed to load divisions:', error);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    loadDivisions();
  }, [loadDivisions]);

  // Load contacts when expanding a division
  const handleExpandDivision = async (divisionId: string) => {
    if (expandedDivision === divisionId) {
      setExpandedDivision(null);
      setDivisionContacts([]);
      return;
    }

    setExpandedDivision(divisionId);
    setLoadingContacts(true);
    try {
      const contacts = await getContactsByDivision(divisionId);
      setDivisionContacts(contacts);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Add new division
  const handleAdd = async () => {
    if (!newDivisionName.trim()) return;

    setSaving(true);
    try {
      await createDivision({
        institutionId,
        name: newDivisionName.trim(),
      });
      setNewDivisionName('');
      setShowAddForm(false);
      await loadDivisions();
    } catch (error) {
      console.error('Failed to create division:', error);
    } finally {
      setSaving(false);
    }
  };

  // Start editing
  const handleStartEdit = (division: Division) => {
    setEditingId(division.id);
    setEditName(division.name);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    setSaving(true);
    try {
      await updateDivision(editingId, { name: editName.trim() });
      setEditingId(null);
      setEditName('');
      await loadDivisions();
    } catch (error) {
      console.error('Failed to update division:', error);
    } finally {
      setSaving(false);
    }
  };

  // Delete division
  const handleDelete = async (divisionId: string) => {
    if (!confirm('Are you sure you want to delete this division? Contacts in this division will need to be reassigned.')) {
      return;
    }

    try {
      await deleteDivision(divisionId);
      await loadDivisions();
      if (expandedDivision === divisionId) {
        setExpandedDivision(null);
        setDivisionContacts([]);
      }
    } catch (error) {
      console.error('Failed to delete division:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-amber-600" />
          Divisions
          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
            {divisions.length}
          </span>
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 border-b border-gray-100 bg-blue-50">
          <p className="text-sm font-medium text-gray-700 mb-2">New Division</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDivisionName}
              onChange={(e) => setNewDivisionName(e.target.value)}
              placeholder="Division name..."
              autoFocus
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') {
                  setShowAddForm(false);
                  setNewDivisionName('');
                }
              }}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdd}
              disabled={!newDivisionName.trim() || saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setNewDivisionName('');
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Division List */}
      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {divisions.length === 0 ? (
          <div className="p-8 text-center">
            <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No divisions yet</p>
            <p className="text-gray-400 text-xs mt-1">Add divisions to organize contacts</p>
          </div>
        ) : (
          divisions.map((division) => (
            <div key={division.id}>
              {/* Division Row */}
              <div
                className={`flex items-center gap-2 p-3 hover:bg-gray-50 transition-colors ${
                  selectedDivisionId === division.id ? 'bg-blue-50' : ''
                }`}
              >
                <GripVertical className="w-4 h-4 text-gray-300 cursor-move" />

                {/* Expand Button */}
                <button
                  onClick={() => handleExpandDivision(division.id)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      expandedDivision === division.id ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Content */}
                {editingId === division.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditName('');
                        }
                      }}
                    />
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditName('');
                      }}
                      className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => onSelectDivision?.(division.id)}
                    >
                      <p className="font-medium text-gray-900 text-sm">{division.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="w-3 h-3" />
                          {division.contactCount} contacts
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(division)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(division.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Expanded Contacts */}
              {expandedDivision === division.id && (
                <div className="pl-10 pr-3 pb-3 bg-gray-50">
                  {loadingContacts ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  ) : divisionContacts.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">No contacts in this division</p>
                  ) : (
                    <div className="space-y-1">
                      {divisionContacts.slice(0, 5).map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center gap-2 p-2 bg-white rounded border border-gray-100"
                        >
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="w-3 h-3 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{contact.position}</p>
                            {contact.name && (
                              <p className="text-xs text-gray-500 truncate">{contact.name}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {divisionContacts.length > 5 && (
                        <p className="text-xs text-gray-500 text-center py-1">
                          +{divisionContacts.length - 5} more contacts
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
