export const SUPPORTED_LOCALES = ['en', 'hi', 'ta', 'te', 'kn', 'bn', 'mr', 'gu', 'ml'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const LOCALE_DISPLAY_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  hi: 'हिन्दी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
  bn: 'বাংলা',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  ml: 'മലയാളം',
};

export const DEFAULT_LOCALE: SupportedLocale = 'en';

/**
 * Maps a browser locale string (e.g. "hi-IN", "ta") to a SupportedLocale.
 * Returns the default locale if no match is found.
 */
export function mapBrowserLocale(browserLocale: string): SupportedLocale {
  const lang = browserLocale.split('-')[0].toLowerCase();
  if (SUPPORTED_LOCALES.includes(lang as SupportedLocale)) {
    return lang as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}
