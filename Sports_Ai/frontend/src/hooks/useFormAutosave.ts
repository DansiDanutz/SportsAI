import { useEffect, useRef, useState, useCallback } from 'react';

interface AutosaveOptions {
  key: string;
  debounceMs?: number;
}

interface AutosaveState<T> {
  data: T;
  savedAt: number | null;
  isDraft: boolean;
}

export function useFormAutosave<T extends object>(
  initialData: T,
  options: AutosaveOptions
) {
  const { key, debounceMs = 1000 } = options;
  const storageKey = `form_autosave_${key}`;

  // Load initial state from localStorage
  const loadDraft = useCallback((): AutosaveState<T> | null => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as AutosaveState<T>;
        // Validate the stored data has the expected shape
        if (parsed.data && typeof parsed.data === 'object') {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load form draft:', error);
    }
    return null;
  }, [storageKey]);

  const draft = loadDraft();
  const [formData, setFormData] = useState<T>(draft?.data || initialData);
  const [isDraft, setIsDraft] = useState(!!draft?.isDraft);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(draft?.savedAt || null);
  const [isSaving, setIsSaving] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUnsavedChanges = useRef(false);

  // Save draft to localStorage
  const saveDraft = useCallback((data: T) => {
    try {
      const state: AutosaveState<T> = {
        data,
        savedAt: Date.now(),
        isDraft: true,
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
      setLastSavedAt(state.savedAt);
      setIsDraft(true);
      hasUnsavedChanges.current = false;
    } catch (error) {
      console.warn('Failed to save form draft:', error);
    }
  }, [storageKey]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setIsDraft(false);
      setLastSavedAt(null);
      hasUnsavedChanges.current = false;
    } catch (error) {
      console.warn('Failed to clear form draft:', error);
    }
  }, [storageKey]);

  // Reset form to initial state and clear draft
  const resetForm = useCallback(() => {
    setFormData(initialData);
    clearDraft();
  }, [initialData, clearDraft]);

  // Update a single field
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      hasUnsavedChanges.current = true;
      return newData;
    });
  }, []);

  // Debounced autosave effect
  useEffect(() => {
    if (!hasUnsavedChanges.current) return;

    // Show saving indicator immediately
    setIsSaving(true);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer
    debounceTimer.current = setTimeout(() => {
      saveDraft(formData);
      setIsSaving(false);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [formData, debounceMs, saveDraft]);

  // Clean up on unmount - save any pending changes
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges.current) {
        // Force immediate save on unmount
        try {
          const state: AutosaveState<T> = {
            data: formData,
            savedAt: Date.now(),
            isDraft: true,
          };
          localStorage.setItem(storageKey, JSON.stringify(state));
        } catch (error) {
          console.warn('Failed to save draft on unmount:', error);
        }
      }
    };
  }, [formData, storageKey]);

  // Format the last saved time
  const getLastSavedText = useCallback(() => {
    if (!lastSavedAt) return null;

    const now = Date.now();
    const diff = now - lastSavedAt;

    if (diff < 5000) return 'Just saved';
    if (diff < 60000) return `Saved ${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)}m ago`;

    return `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`;
  }, [lastSavedAt]);

  return {
    formData,
    setFormData,
    updateField,
    isDraft,
    isSaving,
    lastSavedAt,
    getLastSavedText,
    clearDraft,
    resetForm,
    hasDraft: !!draft,
  };
}

export default useFormAutosave;
