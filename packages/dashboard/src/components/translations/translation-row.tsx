'use client';

import { useState, KeyboardEvent } from 'react';
import { TranslationKey, Translation } from '@/lib/api';
import { StatusBadge } from './status-badge';
import { Td, Tr } from '@/components/ui/table';
import { truncate } from '@/lib/utils';

export interface TranslationRowProps {
  translationKey: TranslationKey;
  locales: string[];
  /** translations[locale] → Translation or undefined if not yet translated */
  translations: Record<string, Translation | undefined>;
  onSelect: (key: TranslationKey) => void;
  onSave: (keyId: string, locale: string, value: string) => Promise<void>;
}

/**
 * A single row in the translation editor table.
 * Clicking a cell makes it editable inline; pressing Enter or blurring saves.
 */
export function TranslationRow({
  translationKey,
  locales,
  translations,
  onSelect,
  onSave,
}: TranslationRowProps) {
  const [editing, setEditing] = useState<{ locale: string; value: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function commitEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await onSave(translationKey.id, editing.locale, editing.value);
    } finally {
      setEditing(null);
      setSaving(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === 'Escape') {
      setEditing(null);
    }
  }

  return (
    <Tr>
      {/* Key column */}
      <Td className="max-w-xs">
        <button
          onClick={() => onSelect(translationKey)}
          className="text-left font-mono text-xs text-blue-700 hover:underline break-all"
        >
          {translationKey.key}
        </button>
        {translationKey.namespace && (
          <p className="text-xs text-gray-400 mt-0.5">{translationKey.namespace}</p>
        )}
      </Td>

      {/* One column per locale */}
      {locales.map((locale) => {
        const t = translations[locale];
        const isEditing = editing?.locale === locale;

        return (
          <Td key={locale} className="min-w-[160px] max-w-xs">
            {isEditing ? (
              <textarea
                autoFocus
                value={editing.value}
                onChange={(e) => setEditing({ locale, value: e.target.value })}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                disabled={saving}
                rows={3}
                className="w-full text-sm border border-blue-400 rounded px-2 py-1 focus:outline-none resize-none"
              />
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setEditing({ locale, value: t?.value ?? '' })}
                onKeyDown={(e) => e.key === 'Enter' && setEditing({ locale, value: t?.value ?? '' })}
                className="min-h-[28px] cursor-text rounded px-1 py-0.5 hover:bg-blue-50 group"
                title="Click to edit"
              >
                {t ? (
                  <div>
                    <p className="text-sm text-gray-800">{truncate(t.value, 80)}</p>
                    <StatusBadge status={t.status} />
                  </div>
                ) : (
                  <span className="text-xs text-gray-300 italic group-hover:text-gray-400">
                    untranslated
                  </span>
                )}
              </div>
            )}
          </Td>
        );
      })}
    </Tr>
  );
}
