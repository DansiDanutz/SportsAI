import { usePreferencesStore, OddsFormat, formatOdds } from '../../../store/preferencesStore';
import { api } from '../../../services/api';

interface DisplayPreferencesProps {
  onReset?: () => void;
  resetSuccess?: boolean;
}

export function DisplayPreferences({ onReset, resetSuccess }: DisplayPreferencesProps) {
  const { oddsFormat, setOddsFormat, timezone, setTimezone, theme, setTheme, language, setLanguage, resetToDefaults } = usePreferencesStore();

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await api.patch('/v1/users/me/preferences', {
        display: {
          language: newLanguage,
        },
      });
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  const handleReset = () => {
    resetToDefaults();
    if (onReset) {
      onReset();
    }
  };

  return (
    <div id="preferences" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Display Preferences</h2>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors flex items-center gap-1.5"
          data-testid="reset-preferences-button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset to Defaults
        </button>
      </div>
      {resetSuccess && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2 text-green-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Preferences reset to defaults
        </div>
      )}
      <div className="space-y-4">
        {/* Odds Format */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Odds Format</label>
          <select
            value={oddsFormat}
            onChange={(e) => setOddsFormat(e.target.value as OddsFormat)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="decimal">Decimal (2.50)</option>
            <option value="american">American (+150)</option>
            <option value="fractional">Fractional (3/2)</option>
          </select>
          <div className="mt-2 p-3 bg-gray-700/50 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Preview (2.50 decimal):</div>
            <div className="text-white font-medium">{formatOdds(2.50, oddsFormat)}</div>
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="local">Local Time</option>
            <option value="utc">UTC</option>
            <option value="et">ET (Eastern Time)</option>
            <option value="pt">PT (Pacific Time)</option>
          </select>
        </div>

        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>

        {/* AI Content Language */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">AI Content Language</label>
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              handleLanguageChange(e.target.value);
            }}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="auto">Auto-detect (based on your location)</option>
            <option value="en">English</option>
            <option value="ro">Română (Romanian)</option>
            <option value="es">Español (Spanish)</option>
            <option value="pt">Português (Portuguese)</option>
            <option value="fr">Français (French)</option>
            <option value="de">Deutsch (German)</option>
            <option value="it">Italiano (Italian)</option>
            <option value="nl">Nederlands (Dutch)</option>
            <option value="pl">Polski (Polish)</option>
            <option value="tr">Türkçe (Turkish)</option>
            <option value="ru">Русский (Russian)</option>
            <option value="el">Ελληνικά (Greek)</option>
            <option value="hu">Magyar (Hungarian)</option>
            <option value="cs">Čeština (Czech)</option>
            <option value="sv">Svenska (Swedish)</option>
            <option value="no">Norsk (Norwegian)</option>
            <option value="da">Dansk (Danish)</option>
            <option value="fi">Suomi (Finnish)</option>
            <option value="ja">日本語 (Japanese)</option>
            <option value="ko">한국어 (Korean)</option>
            <option value="zh">中文 (Chinese)</option>
            <option value="ar">العربية (Arabic)</option>
          </select>
          <p className="mt-2 text-sm text-gray-500">
            Choose the language for AI-generated content like news, advice, and tips.
            {language === 'auto' && ' Your location will be used to determine the language automatically.'}
          </p>
        </div>
      </div>
    </div>
  );
}
