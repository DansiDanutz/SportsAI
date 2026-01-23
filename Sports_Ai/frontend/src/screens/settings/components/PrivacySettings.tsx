import { useState, useEffect } from 'react';
import { api } from '../../../services/api';

interface PrivacySettingsProps {
  // No props needed - component is self-contained
}

export function PrivacySettings({}: PrivacySettingsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    isPending: boolean;
    jobId?: string;
    message?: string;
  }>({ isPending: false });

  // Check export status on mount
  useEffect(() => {
    const checkExportStatus = async () => {
      try {
        const response = await api.get('/v1/users/me/export/status');
        if (response.data.isPending) {
          setExportStatus({
            isPending: true,
            jobId: response.data.jobId,
            message: 'Export in progress...',
          });
        }
      } catch (error) {
        console.error('Failed to check export status:', error);
      }
    };
    checkExportStatus();
  }, []);

  const handleRequestExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.post('/v1/users/me/export');
      if (response.data.isPending) {
        setExportStatus({
          isPending: true,
          jobId: response.data.jobId,
          message: response.data.message,
        });
      } else {
        setExportStatus({
          isPending: true,
          jobId: response.data.jobId,
          message: response.data.message,
        });
      }
    } catch (error) {
      console.error('Failed to request export:', error);
      setExportStatus({
        isPending: false,
        message: 'Failed to request export. Please try again.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div id="privacy" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
      <h2 className="text-xl font-semibold text-white mb-4">Privacy & Data Controls</h2>
      <p className="text-gray-400 mb-4">
        Manage your data and privacy settings.
      </p>
      <div className="space-y-4">
        <label className="flex items-center justify-between">
          <div>
            <div className="text-white">Personalization</div>
            <div className="text-sm text-gray-400">Allow personalized recommendations</div>
          </div>
          <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800" />
        </label>
        <label className="flex items-center justify-between">
          <div>
            <div className="text-white">Analytics</div>
            <div className="text-sm text-gray-400">Help improve the app with usage data</div>
          </div>
          <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800" />
        </label>

        {/* Data Export Section */}
        <div className="pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white">Export Your Data</div>
              <div className="text-sm text-gray-400">
                Download a copy of your account data
              </div>
            </div>
            <button
              onClick={handleRequestExport}
              disabled={isExporting || exportStatus.isPending}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                exportStatus.isPending
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 cursor-not-allowed'
                  : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50'
              }`}
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Requesting...
                </>
              ) : exportStatus.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Export in Progress
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Request Export
                </>
              )}
            </button>
          </div>
          {exportStatus.message && (
            <div className={`mt-3 text-sm ${exportStatus.isPending ? 'text-yellow-400' : 'text-gray-400'}`}>
              {exportStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
