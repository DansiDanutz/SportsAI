import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { api } from '../../services/api';
import { useFormAutosave } from '../../hooks/useFormAutosave';

interface PresetFormData {
  name: string;
  filters: string;
}

interface Preset {
  id: string;
  userId: string;
  name: string;
  filters: string;
  sportId?: string;
  isPinned: boolean;
  updatedAt: string;
  deletedAt?: string | null;
}

export function PresetsPage() {
  const navigate = useNavigate();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<Preset | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nameError, setNameError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [presetToEdit, setPresetToEdit] = useState<Preset | null>(null);
  const [editPresetName, setEditPresetName] = useState('');
  const [editPresetFilters, setEditPresetFilters] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editNameError, setEditNameError] = useState('');
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [isEditFormDirty, setIsEditFormDirty] = useState(false);
  const [originalEditName, setOriginalEditName] = useState('');
  const [originalEditFilters, setOriginalEditFilters] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [deletedPresets, setDeletedPresets] = useState<Preset[]>([]);
  const [showDeletedSection, setShowDeletedSection] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

  // Autosave hook for create preset form
  const initialFormData: PresetFormData = { name: '', filters: '' };
  const {
    formData: createFormData,
    updateField: updateCreateField,
    isDraft: hasCreateDraft,
    isSaving: isAutosaving,
    getLastSavedText,
    resetForm: resetCreateForm,
    hasDraft: hasRestoredDraft,
  } = useFormAutosave<PresetFormData>(initialFormData, {
    key: 'preset_create',
    debounceMs: 1000,
  });

  // Alias for easier access
  const newPresetName = createFormData.name;
  const newPresetFilters = createFormData.filters;
  const setNewPresetName = useCallback((value: string) => updateCreateField('name', value), [updateCreateField]);
  const setNewPresetFilters = useCallback((value: string) => updateCreateField('filters', value), [updateCreateField]);

  // Show success message with auto-dismiss
  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const response = await api.get('/v1/presets');
      setPresets(response.data.presets || []);
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedPresets = async () => {
    try {
      const response = await api.get('/v1/presets/deleted/list');
      setDeletedPresets(response.data.presets || []);
    } catch (error) {
      console.error('Failed to fetch deleted presets:', error);
    }
  };

  const handleRestorePreset = async (id: string) => {
    try {
      setIsRestoring(id);
      const response = await api.post(`/v1/presets/${id}/restore`);
      if (response.data.success) {
        // Move preset from deleted to active
        setDeletedPresets(prev => prev.filter(p => p.id !== id));
        setPresets(prev => [...prev, response.data.preset]);
        showSuccess('Preset restored successfully!');
      }
    } catch (error) {
      console.error('Failed to restore preset:', error);
    } finally {
      setIsRestoring(null);
    }
  };

  const handleDuplicatePreset = async (preset: Preset) => {
    try {
      setIsDuplicating(preset.id);
      const response = await api.post(`/v1/presets/${preset.id}/duplicate`);
      if (response.data.success) {
        setPresets(prev => [...prev, response.data.preset]);
        showSuccess(`Preset duplicated as "${response.data.preset.name}"!`);
      }
    } catch (error) {
      console.error('Failed to duplicate preset:', error);
    } finally {
      setIsDuplicating(null);
    }
  };

  const handleCreatePreset = async () => {
    const trimmedName = newPresetName.trim();
    setNameError('');

    if (!trimmedName) return;

    // Validate minimum length (3 characters)
    if (trimmedName.length < 3) {
      setNameError('Preset name must be at least 3 characters');
      return;
    }

    // Validate maximum length (100 characters)
    if (trimmedName.length > 100) {
      setNameError('Preset name must be 100 characters or less');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post('/v1/presets', {
        name: newPresetName,
        filters: newPresetFilters || '{}',
        isPinned: false,
      });
      if (response.data.success) {
        setPresets(prev => [...prev, response.data.preset]);
        // Clear the autosaved draft on successful submission
        resetCreateForm();
        setShowCreateModal(false);
        showSuccess('Preset saved successfully!');
      }
    } catch (error) {
      console.error('Failed to create preset:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTogglePin = async (preset: Preset) => {
    try {
      const response = await api.put(`/v1/presets/${preset.id}`, {
        isPinned: !preset.isPinned,
      });
      if (response.data.success) {
        setPresets(prev =>
          prev.map(p =>
            p.id === preset.id ? { ...p, isPinned: !p.isPinned } : p
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleDeletePreset = async () => {
    if (!presetToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/v1/presets/${presetToDelete.id}`);
      setPresets(prev => prev.filter(p => p.id !== presetToDelete.id));
      setShowDeleteDialog(false);
      setPresetToDelete(null);
      showSuccess('Preset deleted successfully!');
    } catch (error) {
      console.error('Failed to delete preset:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (preset: Preset) => {
    setPresetToDelete(preset);
    setShowDeleteDialog(true);
  };

  const openEditModal = (preset: Preset) => {
    setPresetToEdit(preset);
    setEditPresetName(preset.name);
    setEditPresetFilters(preset.filters);
    setOriginalEditName(preset.name);
    setOriginalEditFilters(preset.filters);
    setEditNameError('');
    setIsEditFormDirty(false);
    setShowEditModal(true);
  };

  const handleEditFormChange = (field: 'name' | 'filters', value: string) => {
    if (field === 'name') {
      setEditPresetName(value);
      setEditNameError('');
      setIsEditFormDirty(value !== originalEditName || editPresetFilters !== originalEditFilters);
    } else {
      setEditPresetFilters(value);
      setIsEditFormDirty(editPresetName !== originalEditName || value !== originalEditFilters);
    }
  };

  const handleCancelEdit = () => {
    if (isEditFormDirty) {
      setShowUnsavedChangesDialog(true);
    } else {
      closeEditModal();
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setPresetToEdit(null);
    setEditNameError('');
    setIsEditFormDirty(false);
    setConflictError(null);
  };

  const handleDiscardChanges = () => {
    setShowUnsavedChangesDialog(false);
    closeEditModal();
  };

  const handleEditPreset = async () => {
    if (!presetToEdit) return;

    const trimmedName = editPresetName.trim();
    setEditNameError('');
    setConflictError(null);

    if (!trimmedName) return;

    // Validate minimum length (3 characters)
    if (trimmedName.length < 3) {
      setEditNameError('Preset name must be at least 3 characters');
      return;
    }

    // Validate maximum length (100 characters)
    if (trimmedName.length > 100) {
      setEditNameError('Preset name must be 100 characters or less');
      return;
    }

    setIsEditing(true);
    try {
      const response = await api.put(`/v1/presets/${presetToEdit.id}`, {
        name: trimmedName,
        filters: editPresetFilters || '{}',
        expectedUpdatedAt: presetToEdit.updatedAt,
      });
      if (response.data.success) {
        setPresets(prev =>
          prev.map(p =>
            p.id === presetToEdit.id
              ? { ...p, name: trimmedName, filters: editPresetFilters || '{}', updatedAt: response.data.preset.updatedAt }
              : p
          )
        );
        closeEditModal();
        showSuccess('Preset updated successfully!');
      }
    } catch (error: unknown) {
      console.error('Failed to edit preset:', error);
      // Handle conflict error (HTTP 409)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 409) {
          setConflictError(
            axiosError.response.data?.message ||
            'This preset was modified by another session. Please refresh and try again.'
          );
        }
      }
    } finally {
      setIsEditing(false);
    }
  };

  const handleApplyPreset = (preset: Preset) => {
    try {
      const filters = JSON.parse(preset.filters);
      // Build query params from the preset filters
      const params = new URLSearchParams();

      // Map common filter keys to URL params
      if (filters.league) params.set('league', filters.league);
      if (filters.time) params.set('time', filters.time);
      if (filters.sport) params.set('sport', filters.sport);
      if (filters.market) params.set('market', filters.market);
      if (filters.team) params.set('team', filters.team);
      if (filters.status) params.set('status', filters.status);
      if (filters.minOdds) params.set('minOdds', String(filters.minOdds));
      if (filters.maxOdds) params.set('maxOdds', String(filters.maxOdds));

      // Add any additional filter keys (catches future filter additions)
      Object.entries(filters).forEach(([key, value]) => {
        if (!params.has(key) && value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });

      // Navigate to sports page with the sport from preset or default to soccer
      const sport = filters.sport || preset.sportId || 'soccer';
      const queryString = params.toString();
      navigate(`/sports/${sport}${queryString ? `?${queryString}` : ''}`);
    } catch {
      // If filters can't be parsed, just navigate to sports hub
      navigate('/sports');
    }
  };

  // Filter presets based on search query (trim to treat whitespace-only as empty)
  const trimmedSearchQuery = searchQuery.trim();
  const filteredPresets = presets.filter(p =>
    p.name.toLowerCase().includes(trimmedSearchQuery.toLowerCase())
  );
  const pinnedPresets = filteredPresets.filter(p => p.isPinned);
  const unpinnedPresets = filteredPresets.filter(p => !p.isPinned);

  return (
    <Layout>
      {/* Success Toast */}
      {successMessage && (
        <div
          className="fixed top-4 right-4 z-50 transition-all duration-300 ease-out"
          role="alert"
          aria-live="polite"
        >
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 border border-green-400">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Preset Manager</h1>
            <p className="text-gray-400 mt-2">
              Manage your saved filter presets
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search presets..."
                className="w-64 px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              + Create Preset
            </button>
          </div>
        </div>

        {/* Statistics Bar */}
        {!loading && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="text-sm text-gray-400">Total Presets</div>
              <div className="text-2xl font-bold text-white" data-testid="total-preset-count">{presets.length}</div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="text-sm text-gray-400">Pinned</div>
              <div className="text-2xl font-bold text-yellow-400" data-testid="pinned-preset-count">{presets.filter(p => p.isPinned).length}</div>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <div className="text-sm text-gray-400">Unpinned</div>
              <div className="text-2xl font-bold text-gray-300" data-testid="unpinned-preset-count">{presets.filter(p => !p.isPinned).length}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <>
            {/* Pinned Presets */}
            {pinnedPresets.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Pinned Presets
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinnedPresets.map(preset => (
                    <PresetCard
                      key={preset.id}
                      preset={preset}
                      onTogglePin={handleTogglePin}
                      onEdit={openEditModal}
                      onDelete={openDeleteDialog}
                      onApply={handleApplyPreset}
                      onDuplicate={handleDuplicatePreset}
                      isDuplicating={isDuplicating === preset.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Presets */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                {pinnedPresets.length > 0 ? 'Other Presets' : 'All Presets'}
              </h2>
              {unpinnedPresets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unpinnedPresets.map(preset => (
                    <PresetCard
                      key={preset.id}
                      preset={preset}
                      onTogglePin={handleTogglePin}
                      onEdit={openEditModal}
                      onDelete={openDeleteDialog}
                      onApply={handleApplyPreset}
                      onDuplicate={handleDuplicatePreset}
                      isDuplicating={isDuplicating === preset.id}
                    />
                  ))}
                </div>
              ) : pinnedPresets.length === 0 && presets.length === 0 ? (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
                  <div className="text-4xl mb-4">📋</div>
                  <h3 className="text-xl text-white mb-2">No presets yet</h3>
                  <p className="text-gray-400 mb-4">
                    Create filter presets to quickly apply your favorite settings
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Create Your First Preset
                  </button>
                </div>
              ) : trimmedSearchQuery && filteredPresets.length === 0 ? (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-xl text-white mb-2">No presets found</h3>
                  <p className="text-gray-400 mb-4">
                    No presets match "{trimmedSearchQuery}"
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">
                  All your presets are pinned
                </p>
              )}
            </div>

            {/* Deleted Presets Section */}
            <div className="mt-8 pt-8 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowDeletedSection(!showDeletedSection);
                  if (!showDeletedSection) {
                    fetchDeletedPresets();
                  }
                }}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showDeletedSection ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>Deleted Presets ({deletedPresets.length})</span>
              </button>

              {showDeletedSection && (
                <div className="mt-4">
                  {deletedPresets.length === 0 ? (
                    <p className="text-gray-500 text-sm">No deleted presets</p>
                  ) : (
                    <div className="space-y-2">
                      {deletedPresets.map(preset => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between bg-gray-800/50 rounded-lg border border-gray-700 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <div>
                              <span className="text-gray-300">{preset.name}</span>
                              {preset.deletedAt && (
                                <span className="text-xs text-gray-500 ml-2">
                                  Deleted {new Date(preset.deletedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRestorePreset(preset.id)}
                            disabled={isRestoring === preset.id}
                            className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors disabled:opacity-50"
                          >
                            {isRestoring === preset.id ? 'Restoring...' : 'Restore'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Create Preset Modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => {
              setShowCreateModal(false);
              setNameError('');
            }}
          >
            <div
              className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Create New Preset</h3>
                {/* Autosave indicator */}
                {(hasCreateDraft || isAutosaving) && (
                  <span className="text-xs text-gray-400 flex items-center gap-1" data-testid="autosave-indicator">
                    {isAutosaving ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{getLastSavedText()}</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              {/* Restored draft notification */}
              {hasRestoredDraft && (newPresetName || newPresetFilters) && (
                <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-300 text-sm flex items-center justify-between">
                  <span>Draft restored from previous session</span>
                  <button
                    onClick={() => {
                      resetCreateForm();
                    }}
                    className="text-xs underline hover:text-blue-200"
                  >
                    Clear draft
                  </button>
                </div>
              )}
              {nameError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm" role="alert">
                  {nameError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Preset Name</label>
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => {
                      setNewPresetName(e.target.value);
                      setNameError('');
                    }}
                    placeholder="e.g., Premier League Goals"
                    maxLength={100}
                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 ${nameError ? 'border-red-500' : 'border-gray-600'}`}
                  />
                  <p className="text-gray-500 text-xs mt-1">{newPresetName.trim().length}/100 characters (min 3)</p>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Filters (JSON)</label>
                  <textarea
                    value={newPresetFilters}
                    onChange={(e) => setNewPresetFilters(e.target.value)}
                    placeholder='{"sport": "soccer", "market": "over_under"}'
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNameError('');
                    // Draft is preserved for next time
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePreset}
                  disabled={!newPresetName.trim() || isCreating}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create Preset'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Preset Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Edit Preset</h3>
                {isEditFormDirty && (
                  <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                    Unsaved changes
                  </span>
                )}
              </div>
              {editNameError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {editNameError}
                </div>
              )}
              {conflictError && (
                <div className="mb-4 p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg text-orange-400 text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium">Conflict Detected</p>
                    <p className="text-sm mt-1">{conflictError}</p>
                    <button
                      onClick={() => {
                        fetchPresets();
                        closeEditModal();
                      }}
                      className="mt-2 text-sm underline hover:text-orange-300"
                    >
                      Refresh and try again
                    </button>
                  </div>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Preset Name</label>
                  <input
                    type="text"
                    value={editPresetName}
                    onChange={(e) => handleEditFormChange('name', e.target.value)}
                    placeholder="e.g., Premier League Goals"
                    maxLength={100}
                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 ${editNameError ? 'border-red-500' : 'border-gray-600'}`}
                  />
                  <p className="text-gray-500 text-xs mt-1">{editPresetName.trim().length}/100 characters (min 3)</p>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Filters (JSON)</label>
                  <textarea
                    value={editPresetFilters}
                    onChange={(e) => handleEditFormChange('filters', e.target.value)}
                    placeholder='{"sport": "soccer", "market": "over_under"}'
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditPreset}
                  disabled={!editPresetName.trim() || isEditing}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEditing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unsaved Changes Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showUnsavedChangesDialog}
          onClose={() => setShowUnsavedChangesDialog(false)}
          onConfirm={handleDiscardChanges}
          title="Unsaved Changes"
          message="You have unsaved changes. Are you sure you want to discard them?"
          confirmText="Discard Changes"
          cancelText="Keep Editing"
          variant="warning"
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setPresetToDelete(null);
          }}
          onConfirm={handleDeletePreset}
          title="Delete Preset"
          message={`Are you sure you want to delete "${presetToDelete?.name}"? This action cannot be undone.`}
          confirmText={isDeleting ? 'Deleting...' : 'Delete'}
          confirmDisabled={isDeleting}
          variant="danger"
        />
      </div>
    </Layout>
  );
}

interface PresetCardProps {
  preset: Preset;
  onTogglePin: (preset: Preset) => void;
  onEdit: (preset: Preset) => void;
  onDelete: (preset: Preset) => void;
  onApply: (preset: Preset) => void;
  onDuplicate: (preset: Preset) => void;
  isDuplicating: boolean;
}

function PresetCard({ preset, onTogglePin, onEdit, onDelete, onApply, onDuplicate, isDuplicating }: PresetCardProps) {
  let filters: Record<string, unknown> = {};
  try {
    filters = JSON.parse(preset.filters);
  } catch {
    // Invalid JSON, use empty object
  }

  const filterCount = Object.keys(filters).length;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{preset.name}</h3>
            <p className="text-gray-500 text-sm">{filterCount} filters</p>
          </div>
        </div>
        <button
          onClick={() => onTogglePin(preset)}
          className={`transition-colors ${preset.isPinned ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-500 hover:text-yellow-400'}`}
          title={preset.isPinned ? 'Unpin preset' : 'Pin preset'}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      </div>

      {/* Filter preview */}
      {filterCount > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(filters).slice(0, 3).map(([key, value]) => (
            <span
              key={key}
              className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300"
            >
              {key}: {String(value)}
            </span>
          ))}
          {filterCount > 3 && (
            <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-400">
              +{filterCount - 3} more
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onApply(preset)}
          className="flex-1 px-3 py-2 bg-green-500/10 text-green-500 rounded-lg text-sm font-medium hover:bg-green-500/20 transition-colors"
        >
          Apply
        </button>
        <button
          onClick={() => onDuplicate(preset)}
          disabled={isDuplicating}
          className="px-3 py-2 bg-purple-500/10 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Duplicate preset"
        >
          {isDuplicating ? '...' : 'Duplicate'}
        </button>
        <button
          onClick={() => onEdit(preset)}
          className="px-3 py-2 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(preset)}
          className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
