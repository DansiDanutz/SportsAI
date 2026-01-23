import { useState, useEffect } from 'react';

interface ResponsibleGamblingSettingsProps {
  onSelfExclusionClick?: () => void;
  onResourcesClick?: () => void;
}

export function ResponsibleGamblingSettings({ onSelfExclusionClick, onResourcesClick }: ResponsibleGamblingSettingsProps) {
  const [sessionRemindersEnabled, setSessionRemindersEnabled] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState('60'); // minutes
  const [sessionReminderActive, setSessionReminderActive] = useState(false);
  const [sessionReminderCountdown, setSessionReminderCountdown] = useState<number | null>(null);

  // Demo: Session reminder countdown effect
  useEffect(() => {
    if (sessionReminderActive && sessionReminderCountdown !== null && sessionReminderCountdown > 0) {
      const timer = setInterval(() => {
        setSessionReminderCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [sessionReminderActive, sessionReminderCountdown]);

  // Start demo timer when reminders are enabled and saved
  const startReminderDemo = () => {
    setSessionReminderActive(true);
    setSessionReminderCountdown(10); // 10 seconds for demo purposes
  };

  return (
    <div id="gambling" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
      <h2 className="text-xl font-semibold text-white mb-4">Responsible Gambling</h2>
      <p className="text-gray-400 mb-4">
        Set limits and reminders to help you stay in control.
      </p>
      <div className="space-y-4">
        {/* Session Reminder Toggle */}
        <label className="flex items-center justify-between">
          <div>
            <div className="text-white">Session Reminders</div>
            <div className="text-sm text-gray-400">Remind me after extended sessions</div>
          </div>
          <input
            type="checkbox"
            checked={sessionRemindersEnabled}
            onChange={(e) => setSessionRemindersEnabled(e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800"
          />
        </label>

        {/* Reminder Frequency - only show when enabled */}
        {sessionRemindersEnabled && (
          <div className="pl-4 border-l-2 border-green-500/30">
            <label className="block text-sm font-medium text-gray-400 mb-1">Reminder Frequency</label>
            <select
              value={reminderFrequency}
              onChange={(e) => setReminderFrequency(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="30">Every 30 minutes</option>
              <option value="60">Every 1 hour</option>
              <option value="120">Every 2 hours</option>
              <option value="180">Every 3 hours</option>
            </select>
          </div>
        )}

        {/* Session Reminder Demo Timer */}
        {sessionReminderActive && sessionReminderCountdown !== null && (
          <div className={`p-4 rounded-lg border ${sessionReminderCountdown === 0 ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-blue-500/10 border-blue-500/30'}`}>
            {sessionReminderCountdown > 0 ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-blue-400 font-medium">Demo: Session Reminder Active</div>
                  <div className="text-sm text-gray-400">Next reminder in {sessionReminderCountdown} seconds</div>
                </div>
                <div className="text-2xl font-mono text-blue-400">{sessionReminderCountdown}s</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-yellow-400 font-medium text-lg mb-2">⏰ Session Reminder!</div>
                <p className="text-gray-300 mb-3">You've been using SportsAI for a while. Consider taking a break.</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setSessionReminderActive(false);
                      setSessionReminderCountdown(null);
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={startReminderDemo}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Remind Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Self-Exclusion Options */}
        <div className="pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-white">Self-Exclusion Options</div>
              <div className="text-sm text-gray-400">Temporarily or permanently limit your account access</div>
            </div>
            <button
              onClick={onSelfExclusionClick}
              className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50 rounded-lg transition-colors text-sm"
            >
              View Options
            </button>
          </div>
        </div>

        {/* Regional Resources */}
        <button
          onClick={onResourcesClick}
          className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-400 font-medium">Gambling Support Resources</div>
              <div className="text-sm text-gray-400">Find help organizations in your region</div>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}
