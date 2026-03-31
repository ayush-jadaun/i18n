'use client';

import { TranslationKey, Translation } from '@/lib/api';
import { StatusBadge } from './status-badge';
import { formatDate, localeLabel } from '@/lib/utils';

export interface KeyDetailPanelProps {
  translationKey: TranslationKey;
  /** All translations for this key, keyed by locale */
  translations: Record<string, Translation>;
  onClose: () => void;
}

/**
 * Slide-in side panel showing full details of a selected translation key
 * including all locale values and their statuses.
 */
export function KeyDetailPanel({ translationKey, translations, onClose }: KeyDetailPanelProps) {
  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Key details</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close panel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Key metadata */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Key</p>
          <p className="text-sm font-mono text-gray-900 break-all">{translationKey.key}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Namespace</p>
          <p className="text-sm text-gray-700">{translationKey.namespace || 'default'}</p>
        </div>

        {translationKey.description && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Description</p>
            <p className="text-sm text-gray-700">{translationKey.description}</p>
          </div>
        )}

        {/* Translations per locale */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
            Translations
          </p>
          <div className="space-y-3">
            {Object.entries(translations).map(([locale, t]) => (
              <div key={locale} className="rounded border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">
                    {localeLabel(locale)} ({locale})
                  </span>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-sm text-gray-800 break-words">
                  {t.value || <span className="text-gray-400 italic">empty</span>}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Updated {formatDate(t.updatedAt)}
                </p>
              </div>
            ))}
            {Object.keys(translations).length === 0 && (
              <p className="text-sm text-gray-400 italic">No translations yet</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
