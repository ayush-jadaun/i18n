'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, TranslationKey, Translation, Project } from '@/lib/api';
import { TranslationRow } from './translation-row';
import { KeyDetailPanel } from './key-detail-panel';
import { Table, Thead, Tbody, Th, Tr } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { debounce, localeLabel } from '@/lib/utils';

export interface TranslationEditorProps {
  project: Project;
}

/**
 * Main translation editor component.
 *
 * Renders a table where:
 * - Each row is a translation key
 * - Each column (after the key column) is a locale
 * - Cells are inline-editable
 * - A side panel shows key details when a row is selected
 */
export function TranslationEditor({ project }: TranslationEditorProps) {
  const { showToast } = useToast();
  const [keys, setKeys] = useState<TranslationKey[]>([]);
  const [translations, setTranslations] = useState<Record<string, Record<string, Translation>>>({});
  const [selectedKey, setSelectedKey] = useState<TranslationKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [nsFilter, setNsFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Load keys and all locale translations on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [fetchedKeys, ...localeTrans] = await Promise.all([
          api.listKeys(project.id),
          ...project.locales.map((l) => api.getTranslations(project.id, l)),
        ]);
        if (cancelled) return;
        setKeys(fetchedKeys as TranslationKey[]);

        // Build nested map: keyId → locale → Translation
        const map: Record<string, Record<string, Translation>> = {};
        project.locales.forEach((locale, i) => {
          const trans = localeTrans[i] as Translation[];
          trans.forEach((t) => {
            if (!map[t.keyId]) map[t.keyId] = {};
            map[t.keyId][locale] = t;
          });
        });
        setTranslations(map);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to load translations', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [project.id, project.locales, showToast]);

  // Debounced search to avoid querying on every keystroke
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce(async (term: string, ns: string) => {
      try {
        const fetched = await api.listKeys(project.id, {
          search: term || undefined,
          namespace: ns || undefined,
        });
        setKeys(fetched as TranslationKey[]);
      } catch {
        // silently fail on search errors
      }
    }, 350),
    [project.id]
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    debouncedSearch(value, nsFilter);
  }

  function handleNsChange(value: string) {
    setNsFilter(value);
    debouncedSearch(search, value);
  }

  async function handleSave(keyId: string, locale: string, value: string) {
    try {
      const updated = await api.updateTranslation(project.id, locale, keyId, { value });
      setTranslations((prev) => ({
        ...prev,
        [keyId]: { ...(prev[keyId] ?? {}), [locale]: updated as Translation },
      }));
      showToast('Saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
      throw err;
    }
  }

  // Derive unique namespaces for filter
  const namespaces = Array.from(new Set(keys.map((k) => k.namespace).filter(Boolean)));

  // Client-side status filter (status is per-translation)
  const filteredKeys = keys.filter((k) => {
    if (!statusFilter) return true;
    const keyTrans = translations[k.id] ?? {};
    return Object.values(keyTrans).some((t) => t.status === statusFilter);
  });

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'review', label: 'Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'outdated', label: 'Outdated' },
  ];

  const nsOptions = [
    { value: '', label: 'All namespaces' },
    ...namespaces.map((ns) => ({ value: ns, label: ns })),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 border-b border-gray-200 bg-white">
        <div className="flex-1 min-w-[180px]">
          <Input
            placeholder="Search keys..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <Select
          options={nsOptions}
          value={nsFilter}
          onChange={(e) => handleNsChange(e.target.value)}
          className="w-44"
        />
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        />
        <span className="self-center text-xs text-gray-400">
          {filteredKeys.length} key{filteredKeys.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table + panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Loading…
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              No keys found
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th className="sticky left-0 bg-gray-50 z-10">Key</Th>
                  {project.locales.map((locale) => (
                    <Th key={locale}>
                      {localeLabel(locale)} ({locale})
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {filteredKeys.map((key) => (
                  <TranslationRow
                    key={key.id}
                    translationKey={key}
                    locales={project.locales}
                    translations={translations[key.id] ?? {}}
                    onSelect={setSelectedKey}
                    onSave={handleSave}
                  />
                ))}
              </Tbody>
            </Table>
          )}
        </div>

        {/* Side panel */}
        {selectedKey && (
          <KeyDetailPanel
            translationKey={selectedKey}
            translations={translations[selectedKey.id] ?? {}}
            onClose={() => setSelectedKey(null)}
          />
        )}
      </div>
    </div>
  );
}
