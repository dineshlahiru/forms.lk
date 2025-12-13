import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Type,
  AlignLeft,
  Heading,
  CheckSquare,
  Circle,
  ChevronDown,
  Calendar,
  PenTool,
  Minus,
  FileText,
  Save,
  Eye,
  Upload,
  Trash2,
  Copy,
  Plus,
  X,
  GripVertical,
  Square,
  Columns,
  LayoutGrid,
  Undo2,
  Redo2,
  Keyboard,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Toast, useToast } from '../components/ui/Toast';
import type { ElementType } from '../types';

// Types for row-based layout
interface Field {
  id: string;
  type: ElementType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface Row {
  id: string;
  columns: Field[][];
  columnCount: 1 | 2 | 3;
}

interface Page {
  id: string;
  label: string;
  rows: Row[];
}

interface HistoryEntry {
  pages: Page[];
  activePage: string;
}

interface ToolItem {
  type: ElementType;
  label: string;
  icon: React.ElementType;
}

const fieldTools: ToolItem[] = [
  { type: 'text', label: 'Text Input', icon: Type },
  { type: 'paragraph', label: 'Paragraph', icon: AlignLeft },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'radio', label: 'Radio Group', icon: Circle },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'signature', label: 'Signature', icon: PenTool },
];

const layoutTools: ToolItem[] = [
  { type: 'heading', label: 'Heading', icon: Heading },
  { type: 'static-text', label: 'Static Text', icon: FileText },
  { type: 'divider', label: 'Divider', icon: Minus },
];

let idCounter = 0;
const generateId = () => `id-${++idCounter}-${Date.now()}`;

// Sortable Row Component
function SortableRow({
  row,
  rowIndex: _rowIndex,
  totalRows: _totalRows,
  isSelected,
  selectedField,
  onRowClick,
  onFieldClick,
  onChangeLayout,
  onDeleteRow,
  renderFieldPreview,
  onFieldDoubleClick,
  editingFieldId,
  editingLabel,
  onEditingLabelChange,
  onEditingLabelSave,
  onEditingLabelCancel,
}: {
  row: Row;
  rowIndex: number;
  totalRows: number;
  isSelected: boolean;
  selectedField: { rowId: string; colIndex: number; fieldId: string } | null;
  onRowClick: (rowId: string) => void;
  onFieldClick: (rowId: string, colIndex: number, fieldId: string) => void;
  onChangeLayout: (rowId: string, cols: 1 | 2 | 3) => void;
  onDeleteRow: (rowId: string) => void;
  renderFieldPreview: (field: Field, isEditing: boolean, editingLabel: string, onLabelChange: (val: string) => void, onSave: () => void, onCancel: () => void) => React.ReactNode;
  onFieldDoubleClick: (fieldId: string, currentLabel: string) => void;
  editingFieldId: string | null;
  editingLabel: string;
  onEditingLabelChange: (val: string) => void;
  onEditingLabelSave: () => void;
  onEditingLabelCancel: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 rounded-lg transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50/30'
          : 'border-transparent hover:border-gray-300'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onRowClick(row.id);
      }}
    >
      {/* Drag Handle */}
      <div
        className={`absolute -left-10 top-0 bottom-0 flex flex-col items-center justify-center gap-1 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <div
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      </div>

      {/* Row Header - Column Layout Options */}
      {isSelected && (
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-200 rounded-t-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-blue-700">Row Layout:</span>
            <div className="flex gap-1">
              {([1, 2, 3] as const).map((cols) => (
                <button
                  key={cols}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeLayout(row.id, cols);
                  }}
                  className={`px-2 py-1 text-xs rounded ${
                    row.columnCount === cols
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {cols} Col
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRow(row.id);
            }}
            className="p-1 text-red-500 hover:bg-red-100 rounded"
            title="Delete row (Del)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Columns Grid */}
      <div
        className="grid gap-3 p-3"
        style={{ gridTemplateColumns: `repeat(${row.columnCount}, 1fr)` }}
      >
        {row.columns.map((column, colIndex) => (
          <div
            key={colIndex}
            className={`min-h-[60px] border-2 border-dashed rounded-lg p-2 transition-colors ${
              column.length === 0
                ? 'border-gray-200 bg-gray-50'
                : 'border-transparent'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(row.id);
            }}
          >
            {column.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                <Plus className="w-4 h-4 mr-1" /> Add field
              </div>
            ) : (
              <div className="space-y-2">
                {column.map((field) => {
                  const isFieldSelected = selectedField?.fieldId === field.id;
                  const isEditing = editingFieldId === field.id;

                  return (
                    <div
                      key={field.id}
                      className={`relative p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        isFieldSelected
                          ? 'border-blue-500 bg-white shadow-sm'
                          : 'border-transparent hover:border-gray-300 bg-white'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFieldClick(row.id, colIndex, field.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (field.type !== 'divider') {
                          onFieldDoubleClick(field.id, field.label);
                        }
                      }}
                    >
                      {renderFieldPreview(
                        field,
                        isEditing,
                        editingLabel,
                        onEditingLabelChange,
                        onEditingLabelSave,
                        onEditingLabelCancel
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormBuilderPage() {
  const [formTitle, setFormTitle] = useState('Untitled Form');
  const [pages, setPages] = useState<Page[]>([
    { id: 'page-1', label: 'Page 1', rows: [] },
  ]);
  const [activePage, setActivePage] = useState('page-1');
  const [selectedField, setSelectedField] = useState<{
    rowId: string;
    colIndex: number;
    fieldId: string;
  } | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  // History for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);

  // Inline editing
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  // Page context menu
  const [pageContextMenu, setPageContextMenu] = useState<{
    pageId: string;
    x: number;
    y: number;
  } | null>(null);

  // Keyboard shortcuts help
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  // Get current page
  const currentPage = pages.find((p) => p.id === activePage) || pages[0];
  const rows = currentPage?.rows || [];

  // Save to history
  const saveToHistory = useCallback(() => {
    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }

    const newEntry: HistoryEntry = {
      pages: JSON.parse(JSON.stringify(pages)),
      activePage,
    };

    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newEntry);
      // Keep last 50 entries
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [pages, activePage, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedo.current = true;
      const entry = history[historyIndex - 1];
      setPages(JSON.parse(JSON.stringify(entry.pages)));
      setActivePage(entry.activePage);
      setHistoryIndex((prev) => prev - 1);
      addToast('info', 'Undone');
    }
  }, [history, historyIndex, addToast]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedo.current = true;
      const entry = history[historyIndex + 1];
      setPages(JSON.parse(JSON.stringify(entry.pages)));
      setActivePage(entry.activePage);
      setHistoryIndex((prev) => prev + 1);
      addToast('info', 'Redone');
    }
  }, [history, historyIndex, addToast]);

  // Update rows helper
  const updateRows = useCallback(
    (updater: (rows: Row[]) => Row[]) => {
      saveToHistory();
      setPages((prev) =>
        prev.map((page) =>
          page.id === activePage ? { ...page, rows: updater(page.rows) } : page
        )
      );
    },
    [activePage, saveToHistory]
  );

  // Add a new row
  const addRow = useCallback(
    (columnCount: 1 | 2 | 3 = 1) => {
      const newRow: Row = {
        id: generateId(),
        columns: Array(columnCount)
          .fill(null)
          .map(() => []),
        columnCount,
      };
      updateRows((prev) => [...prev, newRow]);
      setSelectedRow(newRow.id);
      setSelectedField(null);
    },
    [updateRows]
  );

  // Change row column layout
  const changeRowLayout = useCallback(
    (rowId: string, columnCount: 1 | 2 | 3) => {
      updateRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          const allFields = row.columns.flat();
          const newColumns: Field[][] = Array(columnCount)
            .fill(null)
            .map(() => []);
          allFields.forEach((field, index) => {
            newColumns[index % columnCount].push(field);
          });
          return { ...row, columns: newColumns, columnCount };
        })
      );
    },
    [updateRows]
  );

  // Add field to row
  const addFieldToRow = useCallback(
    (type: ElementType, rowId?: string, colIndex: number = 0) => {
      const newField: Field = {
        id: generateId(),
        type,
        label:
          type === 'divider'
            ? ''
            : `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        placeholder:
          type === 'text' || type === 'paragraph' ? 'Enter text...' : undefined,
        required: false,
        options: ['checkbox', 'radio', 'dropdown'].includes(type)
          ? ['Option 1', 'Option 2', 'Option 3']
          : undefined,
      };

      if (rowId) {
        updateRows((prev) =>
          prev.map((row) => {
            if (row.id !== rowId) return row;
            const newColumns = [...row.columns];
            newColumns[colIndex] = [...newColumns[colIndex], newField];
            return { ...row, columns: newColumns };
          })
        );
        setSelectedField({ rowId, colIndex, fieldId: newField.id });
      } else {
        const newRow: Row = {
          id: generateId(),
          columns: [[newField]],
          columnCount: 1,
        };
        updateRows((prev) => [...prev, newRow]);
        setSelectedField({
          rowId: newRow.id,
          colIndex: 0,
          fieldId: newField.id,
        });
      }
      setSelectedRow(null);
    },
    [updateRows]
  );

  // Update field
  const updateField = useCallback(
    (
      rowId: string,
      colIndex: number,
      fieldId: string,
      updates: Partial<Field>
    ) => {
      updateRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          const newColumns = row.columns.map((col, idx) => {
            if (idx !== colIndex) return col;
            return col.map((field) =>
              field.id === fieldId ? { ...field, ...updates } : field
            );
          });
          return { ...row, columns: newColumns };
        })
      );
    },
    [updateRows]
  );

  // Delete field
  const deleteField = useCallback(
    (rowId: string, colIndex: number, fieldId: string) => {
      updateRows((prev) =>
        prev.map((row) => {
          if (row.id !== rowId) return row;
          const newColumns = row.columns.map((col, idx) => {
            if (idx !== colIndex) return col;
            return col.filter((field) => field.id !== fieldId);
          });
          return { ...row, columns: newColumns };
        })
      );
      setSelectedField(null);
      addToast('info', 'Field deleted');
    },
    [updateRows, addToast]
  );

  // Duplicate field
  const duplicateField = useCallback(
    (rowId: string, colIndex: number, fieldId: string) => {
      const row = rows.find((r) => r.id === rowId);
      if (!row) return;
      const field = row.columns[colIndex].find((f) => f.id === fieldId);
      if (!field) return;

      const newField: Field = {
        ...field,
        id: generateId(),
        label: field.label + ' (copy)',
      };

      updateRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          const newColumns = [...r.columns];
          const fieldIndex = newColumns[colIndex].findIndex(
            (f) => f.id === fieldId
          );
          newColumns[colIndex] = [
            ...newColumns[colIndex].slice(0, fieldIndex + 1),
            newField,
            ...newColumns[colIndex].slice(fieldIndex + 1),
          ];
          return { ...r, columns: newColumns };
        })
      );
      setSelectedField({ rowId, colIndex, fieldId: newField.id });
      addToast('success', 'Field duplicated');
    },
    [rows, updateRows, addToast]
  );

  // Delete row
  const deleteRow = useCallback(
    (rowId: string) => {
      const row = rows.find((r) => r.id === rowId);
      const fieldCount = row?.columns.flat().length || 0;

      if (fieldCount > 0) {
        if (
          !confirm(`Delete row and ${fieldCount} field${fieldCount > 1 ? 's' : ''}?`)
        ) {
          return;
        }
      }

      updateRows((prev) => prev.filter((r) => r.id !== rowId));
      setSelectedRow(null);
      setSelectedField(null);
      addToast('info', 'Row deleted');
    },
    [rows, updateRows, addToast]
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveRowId(event.active.id as string);
  };

  // Handle drag end for rows
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveRowId(null);

    if (over && active.id !== over.id) {
      updateRows((prev) => {
        const oldIndex = prev.findIndex((r) => r.id === active.id);
        const newIndex = prev.findIndex((r) => r.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
      addToast('info', 'Row moved');
    }
  };

  // Add page
  const addPage = useCallback(() => {
    saveToHistory();
    const newPage: Page = {
      id: `page-${Date.now()}`,
      label: `Page ${pages.length + 1}`,
      rows: [],
    };
    setPages((prev) => [...prev, newPage]);
    setActivePage(newPage.id);
  }, [pages.length, saveToHistory]);

  // Delete page
  const deletePage = useCallback(
    (pageId: string) => {
      if (pages.length <= 1) {
        addToast('error', 'Cannot delete the last page');
        return;
      }

      const page = pages.find((p) => p.id === pageId);
      const fieldCount =
        page?.rows.reduce(
          (acc, row) => acc + row.columns.flat().length,
          0
        ) || 0;

      if (
        !confirm(
          `Delete page "${page?.label}"${fieldCount > 0 ? ` and ${fieldCount} fields` : ''}?`
        )
      ) {
        return;
      }

      saveToHistory();
      setPages((prev) => {
        const filtered = prev.filter((p) => p.id !== pageId);
        // Update page labels
        return filtered.map((p, i) => ({ ...p, label: `Page ${i + 1}` }));
      });
      if (activePage === pageId) {
        setActivePage(pages[0].id === pageId ? pages[1]?.id : pages[0].id);
      }
      addToast('info', 'Page deleted');
    },
    [pages, activePage, saveToHistory, addToast]
  );

  // Handle page right-click
  const handlePageContextMenu = (
    e: React.MouseEvent,
    pageId: string
  ) => {
    e.preventDefault();
    setPageContextMenu({ pageId, x: e.clientX, y: e.clientY });
  };

  // Inline label editing
  const startEditingLabel = (fieldId: string, currentLabel: string) => {
    setEditingFieldId(fieldId);
    setEditingLabel(currentLabel);
  };

  const saveEditingLabel = () => {
    if (editingFieldId && selectedField) {
      updateField(
        selectedField.rowId,
        selectedField.colIndex,
        editingFieldId,
        { label: editingLabel }
      );
    }
    setEditingFieldId(null);
    setEditingLabel('');
  };

  const cancelEditingLabel = () => {
    setEditingFieldId(null);
    setEditingLabel('');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        // But allow Escape to close editing
        if (e.key === 'Escape' && editingFieldId) {
          cancelEditingLabel();
        }
        // Allow Enter to save editing
        if (e.key === 'Enter' && editingFieldId) {
          e.preventDefault();
          saveEditingLabel();
        }
        return;
      }

      // Escape - deselect/close
      if (e.key === 'Escape') {
        setSelectedField(null);
        setSelectedRow(null);
        setShowShortcuts(false);
      }

      // Delete/Backspace - delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedField) {
          e.preventDefault();
          deleteField(
            selectedField.rowId,
            selectedField.colIndex,
            selectedField.fieldId
          );
        } else if (selectedRow) {
          e.preventDefault();
          deleteRow(selectedRow);
        }
      }

      // Ctrl/Cmd + D - duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (selectedField) {
          e.preventDefault();
          duplicateField(
            selectedField.rowId,
            selectedField.colIndex,
            selectedField.fieldId
          );
        }
      }

      // Ctrl/Cmd + Z - undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl/Cmd + Shift + Z or Ctrl + Y - redo
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        redo();
      }

      // Ctrl/Cmd + S - save (prevent default)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        addToast('success', 'Draft saved');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedField,
    selectedRow,
    editingFieldId,
    deleteField,
    deleteRow,
    duplicateField,
    undo,
    redo,
    addToast,
  ]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setPageContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Initialize history
  useEffect(() => {
    if (history.length === 0) {
      setHistory([{ pages: JSON.parse(JSON.stringify(pages)), activePage }]);
      setHistoryIndex(0);
    }
  }, []);

  // Render field preview
  const renderFieldPreview = (
    field: Field,
    isEditing: boolean,
    editLabel: string,
    onLabelChange: (val: string) => void,
    onSave: () => void,
    onCancel: () => void
  ) => {
    const labelElement =
      field.type !== 'divider' ? (
        isEditing ? (
          <input
            type="text"
            value={editLabel}
            onChange={(e) => onLabelChange(e.target.value)}
            onBlur={onSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
              if (e.key === 'Escape') onCancel();
            }}
            className="text-sm font-medium text-gray-700 border-b-2 border-blue-500 outline-none bg-transparent w-full"
            autoFocus
          />
        ) : (
          <span className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </span>
        )
      ) : null;

    switch (field.type) {
      case 'heading':
        return (
          <div className="text-lg font-bold text-gray-900">
            {isEditing ? (
              <input
                type="text"
                value={editLabel}
                onChange={(e) => onLabelChange(e.target.value)}
                onBlur={onSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSave();
                  if (e.key === 'Escape') onCancel();
                }}
                className="text-lg font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent w-full"
                autoFocus
              />
            ) : (
              field.label
            )}
          </div>
        );
      case 'static-text':
        return (
          <div className="text-gray-600 text-sm">
            {isEditing ? (
              <input
                type="text"
                value={editLabel}
                onChange={(e) => onLabelChange(e.target.value)}
                onBlur={onSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSave();
                  if (e.key === 'Escape') onCancel();
                }}
                className="text-gray-600 text-sm border-b-2 border-blue-500 outline-none bg-transparent w-full"
                autoFocus
              />
            ) : (
              field.label
            )}
          </div>
        );
      case 'divider':
        return <div className="border-t-2 border-gray-300 my-2" />;
      case 'text':
        return (
          <div>
            <label className="block mb-1">{labelElement}</label>
            <div className="h-10 border border-gray-300 rounded-md bg-gray-50 px-3 flex items-center text-gray-400 text-sm">
              {field.placeholder}
            </div>
          </div>
        );
      case 'paragraph':
        return (
          <div>
            <label className="block mb-1">{labelElement}</label>
            <div className="h-20 border border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-gray-400 text-sm">
              {field.placeholder}
            </div>
          </div>
        );
      case 'date':
        return (
          <div>
            <label className="block mb-1">{labelElement}</label>
            <div className="h-10 border border-gray-300 rounded-md bg-gray-50 px-3 flex items-center gap-2 text-gray-400 text-sm">
              <Calendar className="w-4 h-4" /> DD/MM/YYYY
            </div>
          </div>
        );
      case 'checkbox':
        return (
          <div>
            <label className="block mb-2">{labelElement}</label>
            <div className="space-y-1">
              {field.options?.slice(0, 2).map((opt, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <div className="w-4 h-4 border border-gray-400 rounded" />
                  {opt}
                </div>
              ))}
            </div>
          </div>
        );
      case 'radio':
        return (
          <div>
            <label className="block mb-2">{labelElement}</label>
            <div className="space-y-1">
              {field.options?.slice(0, 2).map((opt, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <div className="w-4 h-4 border border-gray-400 rounded-full" />
                  {opt}
                </div>
              ))}
            </div>
          </div>
        );
      case 'dropdown':
        return (
          <div>
            <label className="block mb-1">{labelElement}</label>
            <div className="h-10 border border-gray-300 rounded-md bg-gray-50 px-3 flex items-center justify-between text-gray-400 text-sm">
              Select an option... <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        );
      case 'signature':
        return (
          <div>
            <label className="block mb-1">{labelElement}</label>
            <div className="h-16 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
              <PenTool className="w-4 h-4 mr-2" /> Signature Area
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const activeRow = rows.find((r) => r.id === activeRowId);

  return (
    <Layout hideFooter>
      <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="text-lg font-semibold text-gray-900 border border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none rounded px-2 py-1"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded"
              title="Keyboard shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              icon={<Eye className="w-4 h-4" />}
            >
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              onClick={() => addToast('success', 'Draft saved')}
            >
              Save Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Upload className="w-4 h-4" />}
            >
              Publish
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Tools */}
          <div className="w-52 bg-white border-r border-gray-200 overflow-y-auto shrink-0 p-3">
            {/* Add Row Section */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                Add Row
              </h3>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => addRow(1)}
                  className="flex flex-col items-center p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded border border-gray-200 hover:border-blue-300"
                  title="1 Column"
                >
                  <Square className="w-5 h-5 mb-1" />
                  <span className="text-xs">1 Col</span>
                </button>
                <button
                  onClick={() => addRow(2)}
                  className="flex flex-col items-center p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded border border-gray-200 hover:border-blue-300"
                  title="2 Columns"
                >
                  <Columns className="w-5 h-5 mb-1" />
                  <span className="text-xs">2 Col</span>
                </button>
                <button
                  onClick={() => addRow(3)}
                  className="flex flex-col items-center p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded border border-gray-200 hover:border-blue-300"
                  title="3 Columns"
                >
                  <LayoutGrid className="w-5 h-5 mb-1" />
                  <span className="text-xs">3 Col</span>
                </button>
              </div>
            </div>

            {/* Field Types */}
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              Fields
            </h3>
            <div className="space-y-1 mb-4">
              {fieldTools.map((tool) => (
                <button
                  key={tool.type}
                  onClick={() =>
                    addFieldToRow(tool.type, selectedRow || undefined)
                  }
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors"
                >
                  <tool.icon className="w-4 h-4" />
                  {tool.label}
                </button>
              ))}
            </div>

            {/* Layout Elements */}
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              Layout
            </h3>
            <div className="space-y-1">
              {layoutTools.map((tool) => (
                <button
                  key={tool.type}
                  onClick={() =>
                    addFieldToRow(tool.type, selectedRow || undefined)
                  }
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors"
                >
                  <tool.icon className="w-4 h-4" />
                  {tool.label}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Area */}
          <div
            className="flex-1 overflow-auto p-6"
            onClick={() => {
              setSelectedField(null);
              setSelectedRow(null);
            }}
          >
            <div className="max-w-[650px] mx-auto">
              {/* A4 Canvas */}
              <div className="bg-white shadow-lg rounded-lg border border-gray-200 min-h-[842px] p-8">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  {rows.length === 0 ? (
                    /* Empty State */
                    <div className="h-full min-h-[700px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                      <div className="text-center p-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Plus className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          Start Building Your Form
                        </h3>
                        <p className="text-gray-500 text-sm mb-4 max-w-sm">
                          Add a row from the left panel, then add fields to it.
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => addRow(1)}
                          icon={<Plus className="w-4 h-4" />}
                        >
                          Add First Row
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Rows */
                    <div className="space-y-3">
                      <SortableContext
                        items={rows.map((r) => r.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {rows.map((row, rowIndex) => (
                          <SortableRow
                            key={row.id}
                            row={row}
                            rowIndex={rowIndex}
                            totalRows={rows.length}
                            isSelected={selectedRow === row.id}
                            selectedField={selectedField}
                            onRowClick={(rowId) => {
                              setSelectedRow(rowId);
                              setSelectedField(null);
                            }}
                            onFieldClick={(rowId, colIndex, fieldId) => {
                              setSelectedField({ rowId, colIndex, fieldId });
                              setSelectedRow(null);
                            }}
                            onChangeLayout={changeRowLayout}
                            onDeleteRow={deleteRow}
                            renderFieldPreview={renderFieldPreview}
                            onFieldDoubleClick={startEditingLabel}
                            editingFieldId={editingFieldId}
                            editingLabel={editingLabel}
                            onEditingLabelChange={setEditingLabel}
                            onEditingLabelSave={saveEditingLabel}
                            onEditingLabelCancel={cancelEditingLabel}
                          />
                        ))}
                      </SortableContext>

                      {/* Add Row Button */}
                      <button
                        onClick={() => addRow(1)}
                        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" /> Add Row
                      </button>
                    </div>
                  )}

                  {/* Drag Overlay */}
                  <DragOverlay>
                    {activeRow && (
                      <div className="bg-white shadow-xl rounded-lg border-2 border-blue-500 p-3 opacity-90">
                        <div className="text-sm text-gray-500">
                          Row with {activeRow.columns.flat().length} field(s)
                        </div>
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              </div>
            </div>
          </div>

          {/* Floating Property Panel */}
          {selectedField && (
            <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto shrink-0 p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-700">
                  Properties
                </span>
                <button
                  onClick={() => setSelectedField(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {(() => {
                const row = rows.find((r) => r.id === selectedField.rowId);
                const field = row?.columns[selectedField.colIndex]?.find(
                  (f) => f.id === selectedField.fieldId
                );
                if (!field) return null;

                return (
                  <>
                    {/* Label Input */}
                    {field.type !== 'divider' && (
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Label
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) =>
                            updateField(
                              selectedField.rowId,
                              selectedField.colIndex,
                              field.id,
                              { label: e.target.value }
                            )
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Placeholder */}
                    {(field.type === 'text' || field.type === 'paragraph') && (
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) =>
                            updateField(
                              selectedField.rowId,
                              selectedField.colIndex,
                              field.id,
                              { placeholder: e.target.value }
                            )
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Required Toggle */}
                    {!['divider', 'heading', 'static-text'].includes(
                      field.type
                    ) && (
                      <label className="flex items-center gap-2 mb-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateField(
                              selectedField.rowId,
                              selectedField.colIndex,
                              field.id,
                              { required: e.target.checked }
                            )
                          }
                          className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">Required</span>
                      </label>
                    )}

                    {/* Options for choice fields */}
                    {['checkbox', 'radio', 'dropdown'].includes(field.type) &&
                      field.options && (
                        <div className="mb-4">
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Options
                          </label>
                          <div className="space-y-2">
                            {field.options.map((opt, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const newOptions = [...field.options!];
                                    newOptions[optIndex] = e.target.value;
                                    updateField(
                                      selectedField.rowId,
                                      selectedField.colIndex,
                                      field.id,
                                      { options: newOptions }
                                    );
                                  }}
                                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                {field.options!.length > 2 && (
                                  <button
                                    onClick={() => {
                                      const newOptions = field.options!.filter(
                                        (_, i) => i !== optIndex
                                      );
                                      updateField(
                                        selectedField.rowId,
                                        selectedField.colIndex,
                                        field.id,
                                        { options: newOptions }
                                      );
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newOptions = [
                                  ...field.options!,
                                  `Option ${field.options!.length + 1}`,
                                ];
                                updateField(
                                  selectedField.rowId,
                                  selectedField.colIndex,
                                  field.id,
                                  { options: newOptions }
                                );
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              + Add option
                            </button>
                          </div>
                        </div>
                      )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() =>
                          duplicateField(
                            selectedField.rowId,
                            selectedField.colIndex,
                            selectedField.fieldId
                          )
                        }
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Duplicate (Ctrl+D)"
                      >
                        <Copy className="w-4 h-4" /> Duplicate
                      </button>
                      <button
                        onClick={() =>
                          deleteField(
                            selectedField.rowId,
                            selectedField.colIndex,
                            selectedField.fieldId
                          )
                        }
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete (Del)"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer - Pages */}
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => setActivePage(page.id)}
                onContextMenu={(e) => handlePageContextMenu(e, page.id)}
                className={`px-3 py-1.5 text-sm rounded ${
                  activePage === page.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {page.label}
              </button>
            ))}
            <button
              onClick={addPage}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
              title="Add page"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm text-gray-500">
            {rows.length} row{rows.length !== 1 ? 's' : ''} ·{' '}
            {rows.reduce((acc, r) => acc + r.columns.flat().length, 0)} field
            {rows.reduce((acc, r) => acc + r.columns.flat().length, 0) !== 1
              ? 's'
              : ''}
          </div>
        </div>
      </div>

      {/* Page Context Menu */}
      {pageContextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50"
          style={{ left: pageContextMenu.x, top: pageContextMenu.y }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              deletePage(pageContextMenu.pageId);
              setPageContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete Page
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { keys: 'Delete / Backspace', action: 'Delete selected element' },
                { keys: 'Ctrl/⌘ + D', action: 'Duplicate selected field' },
                { keys: 'Ctrl/⌘ + Z', action: 'Undo' },
                { keys: 'Ctrl/⌘ + Shift + Z', action: 'Redo' },
                { keys: 'Ctrl/⌘ + S', action: 'Save draft' },
                { keys: 'Escape', action: 'Deselect / Close panel' },
                { keys: 'Double-click', action: 'Edit label inline' },
                { keys: 'Right-click page', action: 'Delete page' },
              ].map((shortcut, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{shortcut.action}</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </Layout>
  );
}
