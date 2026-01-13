import { Injectable, Logger } from '@nestjs/common';

// Language configuration by country
const COUNTRY_LANGUAGE_MAP: Record<string, { code: string; name: string; nativeName: string }> = {
  // Romanian
  RO: { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  MD: { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  // Spanish
  ES: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  MX: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  AR: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  CO: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  CL: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  PE: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  VE: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  EC: { code: 'es', name: 'Spanish', nativeName: 'Español' },
  // Portuguese
  PT: { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  BR: { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  // French
  FR: { code: 'fr', name: 'French', nativeName: 'Français' },
  BE: { code: 'fr', name: 'French', nativeName: 'Français' },
  CH: { code: 'de', name: 'German', nativeName: 'Deutsch' },
  CA: { code: 'en', name: 'English', nativeName: 'English' },
  // German
  DE: { code: 'de', name: 'German', nativeName: 'Deutsch' },
  AT: { code: 'de', name: 'German', nativeName: 'Deutsch' },
  // Italian
  IT: { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  // Dutch
  NL: { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  // Polish
  PL: { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  // Turkish
  TR: { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  // Russian
  RU: { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  BY: { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  KZ: { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  // Greek
  GR: { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  CY: { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  // Hungarian
  HU: { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  // Czech
  CZ: { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  // Swedish
  SE: { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  // Norwegian
  NO: { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  // Danish
  DK: { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  // Finnish
  FI: { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  // Japanese
  JP: { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  // Korean
  KR: { code: 'ko', name: 'Korean', nativeName: '한국어' },
  // Chinese
  CN: { code: 'zh', name: 'Chinese', nativeName: '中文' },
  TW: { code: 'zh', name: 'Chinese', nativeName: '中文' },
  HK: { code: 'zh', name: 'Chinese', nativeName: '中文' },
  // Arabic
  SA: { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  AE: { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  EG: { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  // Default English-speaking countries
  US: { code: 'en', name: 'English', nativeName: 'English' },
  GB: { code: 'en', name: 'English', nativeName: 'English' },
  AU: { code: 'en', name: 'English', nativeName: 'English' },
  NZ: { code: 'en', name: 'English', nativeName: 'English' },
  IE: { code: 'en', name: 'English', nativeName: 'English' },
};

// Supported languages for translation
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

interface GeoLocation {
  countryCode: string;
  country: string;
  city?: string;
  region?: string;
}

@Injectable()
export class LanguageService {
  private readonly logger = new Logger(LanguageService.name);

  /**
   * Get user's language based on their IP address
   */
  async getLanguageFromIP(ip: string): Promise<{ code: string; name: string; nativeName: string }> {
    try {
      this.logger.log(`Detecting language for IP: ${ip}`);
      const geoData = await this.getGeoLocation(ip);
      const countryCode = geoData?.countryCode?.toUpperCase();
      this.logger.log(`Country detected: ${countryCode || 'unknown'}`);

      if (countryCode && COUNTRY_LANGUAGE_MAP[countryCode]) {
        const lang = COUNTRY_LANGUAGE_MAP[countryCode];
        this.logger.log(`Language matched: ${lang.name}`);
        return lang;
      }

      // Default to English
      return { code: 'en', name: 'English', nativeName: 'English' };
    } catch (error) {
      this.logger.warn(`Failed to determine language from IP ${ip}: ${error}`);
      return { code: 'en', name: 'English', nativeName: 'English' };
    }
  }

  /**
   * Get geolocation data from IP
   */
  private async getGeoLocation(ip: string): Promise<GeoLocation | null> {
    // Skip for localhost/private IPs
    if (this.isPrivateIP(ip)) {
      // For development, we can use a fallback or environment variable
      const devCountry = process.env.DEV_COUNTRY_CODE;
      if (devCountry) {
        return { countryCode: devCountry, country: 'Development' };
      }
      return null;
    }

    try {
      // Primary: ip-api.com (Free, no key, 45 req/min)
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,country,city,regionName,status,message`);

      if (response.ok) {
        const data = await response.json() as any;
        if (data.status === 'success') {
          return {
            countryCode: data.countryCode || '',
            country: data.country || '',
            city: data.city,
            region: data.regionName,
          };
        }
      }

      // Fallback 1: ipwho.is (Free, no key, 10,000 req/month)
      const fb1Response = await fetch(`https://ipwho.is/${ip}`);
      if (fb1Response.ok) {
        const data = await fb1Response.json() as any;
        if (data.success) {
          return {
            countryCode: data.country_code || '',
            country: data.country || '',
            city: data.city,
            region: data.region,
          };
        }
      }

      // Fallback 2: ipapi.co (Free, no key, 1,000 req/day)
      const fb2Response = await fetch(`https://ipapi.co/${ip}/json/`);
      if (fb2Response.ok) {
        const data = await fb2Response.json() as any;
        if (!data.error) {
          return {
            countryCode: data.country_code || '',
            country: data.country_name || '',
            city: data.city,
            region: data.region,
          };
        }
      }

      this.logger.warn(`All geolocation fallbacks failed for IP: ${ip}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to fetch geolocation: ${error}`);
      return null;
    }
  }

  /**
   * Check if IP is private/localhost
   */
  private isPrivateIP(ip: string): boolean {
    // localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
      return true;
    }

    // Private IPv4 ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Get language info by code
   */
  getLanguageByCode(code: string): { code: string; name: string; nativeName: string } {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang || { code: 'en', name: 'English', nativeName: 'English' };
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Generate translation instruction for AI prompts
   */
  getTranslationInstruction(languageCode: string): string {
    if (languageCode === 'en') {
      return ''; // No translation needed for English
    }

    const language = this.getLanguageByCode(languageCode);

    return `IMPORTANT: All your responses MUST be in ${language.name} (${language.nativeName}).
This includes all text content, explanations, advice, news, tips, and any other written content.
Team names, league names, and proper nouns can remain in their original form, but all descriptive text and analysis must be in ${language.name}.`;
  }
}
