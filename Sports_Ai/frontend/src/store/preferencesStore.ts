import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeGetItem, safeSetItem, safeRemoveItem, StorageResult } from '../utils/storage';

export type OddsFormat = 'decimal' | 'american' | 'fractional';

/**
 * Detect the default odds format based on user's region/locale
 * - US users: American odds (+150, -110)
 * - UK/Ireland users: Fractional odds (3/2, 5/4)
 * - Rest of world: Decimal odds (2.50, 1.80)
 */
function getRegionalOddsDefault(): OddsFormat {
  try {
    // Get user's locale from browser
    const locale = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'en';
    const region = locale.split('-')[1]?.toUpperCase() || '';

    // US regions use American odds
    if (region === 'US' || locale.toLowerCase() === 'en-us') {
      return 'american';
    }

    // UK and Ireland traditionally use fractional odds
    if (region === 'GB' || region === 'IE' || locale.toLowerCase() === 'en-gb') {
      return 'fractional';
    }

    // Default to decimal for rest of world (Europe, Asia, etc.)
    return 'decimal';
  } catch {
    // Fallback to decimal if locale detection fails
    return 'decimal';
  }
}

interface PreferencesState {
  oddsFormat: OddsFormat;
  timezone: string;
  theme: 'dark' | 'light' | 'system';
  language: string; // Language code like 'en', 'ro', 'es', etc.

  // Actions
  setOddsFormat: (format: OddsFormat) => void;
  setTimezone: (timezone: string) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setLanguage: (language: string) => void;
  resetToDefaults: () => void;
}

// Custom storage with fallback support
const preferencesStorage = {
  getItem: (name: string): string | null => {
    return safeGetItem(name, true);
  },
  setItem: (name: string, value: string): void => {
    const result: StorageResult = safeSetItem(name, value, true);
    if (!result.success && result.error === 'quota_exceeded') {
      console.warn('Failed to save preferences due to storage quota. Using session-only storage.');
    }
  },
  removeItem: (name: string): void => {
    safeRemoveItem(name);
    // Also remove from sessionStorage fallback
    try {
      sessionStorage.removeItem(name);
    } catch {
      // Ignore
    }
  },
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      oddsFormat: getRegionalOddsDefault(),
      timezone: 'local',
      theme: 'dark',
      language: 'auto', // 'auto' means use IP-based detection

      setOddsFormat: (format: OddsFormat) => set({ oddsFormat: format }),
      setTimezone: (timezone: string) => set({ timezone }),
      setTheme: (theme: 'dark' | 'light' | 'system') => set({ theme }),
      setLanguage: (language: string) => set({ language }),
      resetToDefaults: () => set({
        oddsFormat: getRegionalOddsDefault(),
        timezone: 'local',
        theme: 'dark',
        language: 'auto',
      }),
    }),
    {
      name: 'preferences-storage',
      storage: createJSONStorage(() => preferencesStorage),
    }
  )
);

// Odds conversion utilities
export function decimalToAmerican(decimal: number): string {
  if (decimal >= 2) {
    // Positive American odds
    const american = Math.round((decimal - 1) * 100);
    return `+${american}`;
  } else {
    // Negative American odds
    const american = Math.round(-100 / (decimal - 1));
    return `${american}`;
  }
}

export function decimalToFractional(decimal: number): string {
  // Common fractional odds mappings for cleaner display
  const fractions: Record<string, string> = {
    '1.10': '1/10',
    '1.11': '1/9',
    '1.12': '1/8',
    '1.14': '1/7',
    '1.17': '1/6',
    '1.20': '1/5',
    '1.25': '1/4',
    '1.33': '1/3',
    '1.40': '2/5',
    '1.50': '1/2',
    '1.57': '4/7',
    '1.62': '5/8',
    '1.67': '2/3',
    '1.73': '8/11',
    '1.80': '4/5',
    '1.83': '5/6',
    '1.91': '10/11',
    '2.00': '1/1',
    '2.10': '11/10',
    '2.20': '6/5',
    '2.25': '5/4',
    '2.38': '11/8',
    '2.50': '3/2',
    '2.62': '13/8',
    '2.75': '7/4',
    '2.88': '15/8',
    '3.00': '2/1',
    '3.25': '9/4',
    '3.40': '12/5',
    '3.50': '5/2',
    '3.75': '11/4',
    '4.00': '3/1',
    '4.33': '10/3',
    '4.50': '7/2',
    '5.00': '4/1',
    '5.50': '9/2',
    '6.00': '5/1',
    '7.00': '6/1',
    '8.00': '7/1',
    '9.00': '8/1',
    '10.00': '9/1',
    '11.00': '10/1',
  };

  // Check for exact match in common fractions
  const key = decimal.toFixed(2);
  if (fractions[key]) {
    return fractions[key];
  }

  // Calculate fractional for other values
  const decPart = decimal - 1;
  // Find GCD to simplify fraction
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

  // Convert to fraction with denominator of 100 then simplify
  const numerator = Math.round(decPart * 100);
  const denominator = 100;
  const divisor = gcd(numerator, denominator);

  return `${numerator / divisor}/${denominator / divisor}`;
}

export function formatOdds(decimalOdds: number | null | undefined, format: OddsFormat): string {
  if (decimalOdds === null || decimalOdds === undefined || !Number.isFinite(decimalOdds)) {
    return '—';
  }
  switch (format) {
    case 'decimal':
      return decimalOdds.toFixed(2);
    case 'american':
      return decimalToAmerican(decimalOdds);
    case 'fractional':
      return decimalToFractional(decimalOdds);
    default:
      return decimalOdds.toFixed(2);
  }
}

// Timezone mapping to IANA timezone identifiers
const timezoneMap: Record<string, string> = {
  'local': '', // Use browser's local timezone
  'utc': 'UTC',
  'et': 'America/New_York',
  'pt': 'America/Los_Angeles',
};

/**
 * Format a date with timezone adjustment
 * @param date - The date to format
 * @param timezone - The timezone setting from preferences (local, utc, et, pt)
 * @returns Formatted date string with timezone applied
 */
export function formatDateWithTimezone(date: Date, timezone: string): { time: string; dayLabel: string } {
  const tz = timezoneMap[timezone] || timezoneMap['local'];

  // Get time string in the specified timezone
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...(tz ? { timeZone: tz } : {}),
  };

  const timeStr = date.toLocaleTimeString('en-US', timeOptions);

  // Calculate "today" and "tomorrow" in the target timezone
  const now = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(tz ? { timeZone: tz } : {}),
  };

  const dateInTz = date.toLocaleDateString('en-US', dateOptions);
  const todayInTz = now.toLocaleDateString('en-US', dateOptions);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowInTz = tomorrow.toLocaleDateString('en-US', dateOptions);

  let dayLabel: string;
  if (dateInTz === todayInTz) {
    dayLabel = 'Today';
  } else if (dateInTz === tomorrowInTz) {
    dayLabel = 'Tomorrow';
  } else {
    dayLabel = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      ...(tz ? { timeZone: tz } : {}),
    });
  }

  return { time: timeStr, dayLabel };
}

/**
 * Format event time with timezone-aware display
 * @param date - The date to format
 * @param timezone - The timezone setting from preferences
 * @returns Formatted string like "Today 06:02 AM" or "Tomorrow 01:02 PM"
 */
export function formatEventTimeWithTimezone(date: Date, timezone: string): string {
  const { time, dayLabel } = formatDateWithTimezone(date, timezone);
  return `${dayLabel} ${time}`;
}
