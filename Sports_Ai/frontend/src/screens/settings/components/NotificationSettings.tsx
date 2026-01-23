import { useState } from 'react';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { api } from '../../../services/api';

interface NotificationSettingsProps {
  // No props needed - component is self-contained
}

export function NotificationSettings({}: NotificationSettingsProps) {
  const { permission: pushPermission, isSupported: isPushSupported, requestPermission, simulatePushNotification } = usePushNotifications();

  // Notification preferences
  const [notifications, setNotifications] = useState({
    arbitrageAlerts: true,
    oddsMovement: true,
    emailNotifications: false,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Conditional validation: Notification preference with custom message
  const [notificationPreference, setNotificationPreference] = useState<'default' | 'custom'>('default');
  const [customNotificationMessage, setCustomNotificationMessage] = useState('');
  const [customMessageError, setCustomMessageError] = useState<string | null>(null);
  const [isSavingNotificationPref, setIsSavingNotificationPref] = useState(false);
  const [notificationPrefSaveSuccess, setNotificationPrefSaveSuccess] = useState(false);

  const handleNotificationChange = async (key: keyof typeof notifications, value: boolean) => {
    const previousValue = notifications[key];
    setNotifications(prev => ({ ...prev, [key]: value }));
    setSavingNotifications(true);
    try {
      await api.patch('/v1/users/me/preferences', {
        notifications: {
          ...notifications,
          [key]: value,
        },
      });
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      setNotifications(prev => ({ ...prev, [key]: previousValue }));
    } finally {
      setSavingNotifications(false);
    }
  };

  const validateCustomNotificationMessage = (): { valid: boolean; error?: string } => {
    if (notificationPreference !== 'custom') {
      return { valid: true };
    }
    if (!customNotificationMessage.trim()) {
      return { valid: false, error: 'Custom message is required when "Custom" is selected' };
    }
    if (customNotificationMessage.trim().length < 5) {
      return { valid: false, error: 'Custom message must be at least 5 characters' };
    }
    return { valid: true };
  };

  const handleNotificationPreferenceChange = (value: 'default' | 'custom') => {
    setNotificationPreference(value);
    setNotificationPrefSaveSuccess(false);
    if (value === 'default') {
      setCustomMessageError(null);
    }
  };

  const handleCustomMessageChange = (value: string) => {
    setCustomNotificationMessage(value);
    setNotificationPrefSaveSuccess(false);
    if (notificationPreference === 'custom') {
      if (!value.trim()) {
        setCustomMessageError('Custom message is required when "Custom" is selected');
      } else if (value.trim().length < 5) {
        setCustomMessageError('Custom message must be at least 5 characters');
      } else {
        setCustomMessageError(null);
      }
    }
  };

  const handleSaveNotificationPref = async () => {
    const validation = validateCustomNotificationMessage();
    if (!validation.valid) {
      setCustomMessageError(validation.error || 'Invalid input');
      return;
    }
    setIsSavingNotificationPref(true);
    setCustomMessageError(null);
    try {
      await api.patch('/v1/users/me/preferences', {
        notificationPreference,
        customNotificationMessage: notificationPreference === 'custom' ? customNotificationMessage : null,
      });
      setNotificationPrefSaveSuccess(true);
      setTimeout(() => setNotificationPrefSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save notification preference:', error);
      setCustomMessageError('Failed to save. Please try again.');
    } finally {
      setIsSavingNotificationPref(false);
    }
  };

  return (
    <div id="notifications" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Notifications</h2>
        {savingNotifications && (
          <span className="text-sm text-gray-400 flex items-center gap-1">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Saving...
          </span>
        )}
      </div>
      <div className="space-y-4">
        {/* Push Notifications Section */}
        {isPushSupported && (
          <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-white font-medium">Push Notifications</div>
                <div className="text-sm text-gray-400">
                  {pushPermission === 'granted'
                    ? 'Push notifications are enabled'
                    : pushPermission === 'denied'
                      ? 'Push notifications are blocked'
                      : 'Enable push notifications for real-time alerts'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pushPermission === 'granted' ? (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Enabled
                  </span>
                ) : pushPermission === 'denied' ? (
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-full">
                    Blocked
                  </span>
                ) : (
                  <button
                    onClick={requestPermission}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                    data-testid="enable-push-button"
                  >
                    Enable
                  </button>
                )}
              </div>
            </div>
            {pushPermission === 'granted' && (
              <div className="pt-3 border-t border-gray-600">
                <button
                  onClick={simulatePushNotification}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  data-testid="test-push-button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Send Test Notification
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Click to test push notifications. The notification will appear and clicking it will navigate to a page.
                </p>
              </div>
            )}
            {pushPermission === 'denied' && (
              <p className="text-xs text-gray-500 mt-2">
                Push notifications are blocked. Please enable them in your browser settings for this site.
              </p>
            )}
          </div>
        )}

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-white">Arbitrage Alerts</div>
            <div className="text-sm text-gray-400">Get notified about new opportunities</div>
          </div>
          <input
            type="checkbox"
            checked={notifications.arbitrageAlerts}
            onChange={(e) => handleNotificationChange('arbitrageAlerts', e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-white">Odds Movement</div>
            <div className="text-sm text-gray-400">Alert when odds move significantly</div>
          </div>
          <input
            type="checkbox"
            checked={notifications.oddsMovement}
            onChange={(e) => handleNotificationChange('oddsMovement', e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-white">Email Notifications</div>
            <div className="text-sm text-gray-400">Receive updates via email</div>
          </div>
          <input
            type="checkbox"
            checked={notifications.emailNotifications}
            onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800"
          />
        </label>

        {/* Conditional Validation: Notification Preference */}
        <div className="pt-4 border-t border-gray-700">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Notification Message Style
            </label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="notificationPreference"
                  value="default"
                  checked={notificationPreference === 'default'}
                  onChange={() => handleNotificationPreferenceChange('default')}
                  className="w-4 h-4 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800 border-gray-600"
                  data-testid="notification-default-radio"
                />
                <span className="ml-2 text-white">Default Messages</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="notificationPreference"
                  value="custom"
                  checked={notificationPreference === 'custom'}
                  onChange={() => handleNotificationPreferenceChange('custom')}
                  className="w-4 h-4 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800 border-gray-600"
                  data-testid="notification-custom-radio"
                />
                <span className="ml-2 text-white">Custom Message</span>
              </label>
            </div>
          </div>

          {notificationPreference === 'custom' && (
            <div className="pl-6 border-l-2 border-green-500/30 mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Custom Message <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={customNotificationMessage}
                onChange={(e) => handleCustomMessageChange(e.target.value)}
                placeholder="Enter your custom notification message"
                className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white focus:outline-none ${
                  customMessageError
                    ? 'border-red-500 focus:border-red-500'
                    : notificationPrefSaveSuccess
                      ? 'border-green-500'
                      : 'border-gray-600 focus:border-green-500'
                }`}
                data-testid="custom-message-input"
              />
              {customMessageError && (
                <p className="text-red-400 text-sm mt-1" data-testid="custom-message-error">
                  {customMessageError}
                </p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                This message will be shown in all notifications (min 5 characters)
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveNotificationPref}
              disabled={isSavingNotificationPref || (notificationPreference === 'custom' && !!customMessageError)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              data-testid="save-notification-pref-button"
            >
              {isSavingNotificationPref ? 'Saving...' : 'Save Preference'}
            </button>
            {notificationPrefSaveSuccess && (
              <span className="text-green-400 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
