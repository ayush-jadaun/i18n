/**
 * Shared utility functions for the dashboard.
 */

/**
 * Merge class names, filtering out falsy values.
 * Lightweight alternative to clsx for simple use cases.
 * @param classes - class name segments (strings or falsy)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format a Date or ISO string as a short localised date.
 * @param date - Date object or ISO date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Compute the translation coverage percentage.
 * @param translated - number of translated keys
 * @param total - total number of keys
 * @returns percentage (0–100), rounded to the nearest integer
 */
export function coverage(translated: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((translated / total) * 100);
}

/**
 * Return a Tailwind colour class for a coverage percentage.
 * @param pct - coverage percentage (0–100)
 */
export function coverageColor(pct: number): string {
  if (pct >= 90) return 'text-green-600';
  if (pct >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Truncate a string to a maximum length, appending an ellipsis if needed.
 * @param str - input string
 * @param max - maximum character length (default 60)
 */
export function truncate(str: string, max = 60): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '…';
}

/**
 * Debounce a function so it only executes after `delay` ms of inactivity.
 * @param fn - function to debounce
 * @param delay - delay in milliseconds (default 300)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Convert a locale code to a human-readable label.
 * @param locale - BCP-47 locale code (e.g. "en", "zh-CN")
 */
export function localeLabel(locale: string): string {
  try {
    const displayName = new Intl.DisplayNames(['en'], { type: 'language' });
    return displayName.of(locale) ?? locale;
  } catch {
    return locale;
  }
}
