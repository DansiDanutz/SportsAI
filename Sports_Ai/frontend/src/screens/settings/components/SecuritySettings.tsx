import { useState, useEffect } from 'react';
import { ConfirmationDialog } from '../../../components/ConfirmationDialog';
import { authApi, TwoFactorSetupResponse, TwoFactorStatusResponse, DeviceSession } from '../../../services/api';

interface SecuritySettingsProps {
  onRevokeAllSessions?: () => void;
}

export function SecuritySettings({ onRevokeAllSessions }: SecuritySettingsProps) {
  // Two-Factor Authentication state
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatusResponse | null>(null);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetupResponse | null>(null);
  const [isLoadingTwoFactor, setIsLoadingTwoFactor] = useState(true);
  const [isEnablingTwoFactor, setIsEnablingTwoFactor] = useState(false);
  const [isVerifyingTwoFactor, setIsVerifyingTwoFactor] = useState(false);
  const [isDisablingTwoFactor, setIsDisablingTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [showTwoFactorSetupModal, setShowTwoFactorSetupModal] = useState(false);
  const [showTwoFactorDisableModal, setShowTwoFactorDisableModal] = useState(false);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Device Session Management state
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  // Change Password state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);

  // Load 2FA status on mount
  useEffect(() => {
    const loadTwoFactorStatus = async () => {
      try {
        const status = await authApi.getTwoFactorStatus();
        setTwoFactorStatus(status);
      } catch (error) {
        console.error('Failed to load 2FA status:', error);
      } finally {
        setIsLoadingTwoFactor(false);
      }
    };
    loadTwoFactorStatus();
  }, []);

  // Load device sessions on mount
  useEffect(() => {
    loadDeviceSessions();
  }, []);

  const loadDeviceSessions = async () => {
    setIsLoadingSessions(true);
    setSessionError(null);
    try {
      const sessions = await authApi.getSessions();
      setDeviceSessions(sessions);
    } catch (error: any) {
      setSessionError(error.response?.data?.message || 'Failed to load sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleEnableTwoFactor = async () => {
    setIsEnablingTwoFactor(true);
    setTwoFactorError(null);
    try {
      const setup = await authApi.enableTwoFactor();
      setTwoFactorSetup(setup);
      setShowTwoFactorSetupModal(true);
    } catch (error: any) {
      setTwoFactorError(error.response?.data?.message || 'Failed to enable 2FA');
    } finally {
      setIsEnablingTwoFactor(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    if (twoFactorCode.length !== 6) {
      setTwoFactorError('Please enter a 6-digit code');
      return;
    }
    setIsVerifyingTwoFactor(true);
    setTwoFactorError(null);
    try {
      const result = await authApi.verifyTwoFactor(twoFactorCode);
      if (result.success && result.backupCodes) {
        setBackupCodes(result.backupCodes);
        setShowTwoFactorSetupModal(false);
        setShowBackupCodesModal(true);
        setTwoFactorStatus({ enabled: true, backupCodesRemaining: result.backupCodes.length });
        setTwoFactorCode('');
        setTwoFactorSetup(null);
      }
    } catch (error: any) {
      setTwoFactorError(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setIsVerifyingTwoFactor(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (twoFactorCode.length !== 6 && twoFactorCode.length !== 8) {
      setTwoFactorError('Please enter a valid code');
      return;
    }
    setIsDisablingTwoFactor(true);
    setTwoFactorError(null);
    try {
      await authApi.disableTwoFactor(twoFactorCode);
      setTwoFactorStatus({ enabled: false, backupCodesRemaining: 0 });
      setShowTwoFactorDisableModal(false);
      setTwoFactorCode('');
    } catch (error: any) {
      setTwoFactorError(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setIsDisablingTwoFactor(false);
    }
  };

  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    setSessionError(null);
    try {
      const result = await authApi.revokeSession(sessionId);
      if (result.success) {
        setDeviceSessions(prev => prev.filter(s => s.id !== sessionId));
      } else {
        setSessionError(result.message);
      }
    } catch (error: any) {
      setSessionError(error.response?.data?.message || 'Failed to revoke session');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    setIsRevokingAll(true);
    setSessionError(null);
    try {
      const result = await authApi.revokeAllSessions();
      if (result.success) {
        await loadDeviceSessions();
        setShowRevokeAllDialog(false);
        if (onRevokeAllSessions) {
          onRevokeAllSessions();
        }
      }
    } catch (error: any) {
      setSessionError(error.response?.data?.message || 'Failed to revoke sessions');
    } finally {
      setIsRevokingAll(false);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'tablet':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const handleChangePassword = async () => {
    setChangePasswordError(null);
    setChangePasswordSuccess(false);
    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setChangePasswordError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setChangePasswordError('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setChangePasswordError('Password must contain at least one lowercase letter');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setChangePasswordError('Password must contain at least one number');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      setChangePasswordError('Password must contain at least one special character');
      return;
    }
    setIsChangingPassword(true);
    try {
      const result = await authApi.changePassword(currentPassword, newPassword);
      if (result.success) {
        setChangePasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => {
          setShowChangePasswordModal(false);
          setChangePasswordSuccess(false);
        }, 2000);
      }
    } catch (error: any) {
      setChangePasswordError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <div id="security" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Security</h2>
            <p className="text-gray-400 text-sm">Protect your account with two-factor authentication</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Change Password */}
          <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Change Password</div>
                <div className="text-sm text-gray-400 mt-1">
                  Update your password to keep your account secure
                </div>
              </div>
              <button
                onClick={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setChangePasswordError(null);
                  setChangePasswordSuccess(false);
                  setShowChangePasswordModal(true);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
                data-testid="change-password-button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Change Password
              </button>
            </div>
          </div>

          {/* 2FA Status */}
          <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium flex items-center gap-2">
                  Two-Factor Authentication
                  {twoFactorStatus?.enabled && (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Enabled</span>
                  )}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {isLoadingTwoFactor ? (
                    'Loading...'
                  ) : twoFactorStatus?.enabled ? (
                    <>Add an extra layer of security using an authenticator app</>
                  ) : (
                    'Secure your account with a time-based one-time password'
                  )}
                </div>
              </div>
              <div>
                {isLoadingTwoFactor ? (
                  <div className="w-8 h-8 border-2 border-gray-600 border-t-green-500 rounded-full animate-spin" />
                ) : twoFactorStatus?.enabled ? (
                  <button
                    onClick={() => {
                      setTwoFactorCode('');
                      setTwoFactorError(null);
                      setShowTwoFactorDisableModal(true);
                    }}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-lg transition-colors text-sm"
                    data-testid="disable-2fa-button"
                  >
                    Disable 2FA
                  </button>
                ) : (
                  <button
                    onClick={handleEnableTwoFactor}
                    disabled={isEnablingTwoFactor}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
                    data-testid="enable-2fa-button"
                  >
                    {isEnablingTwoFactor ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Setting up...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Enable 2FA
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {twoFactorStatus?.enabled && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-400">
                    Backup codes remaining: <span className="text-white font-medium">{twoFactorStatus.backupCodesRemaining}</span>
                  </div>
                  {twoFactorStatus.backupCodesRemaining <= 3 && (
                    <span className="text-yellow-400 text-xs">Consider generating new backup codes</span>
                  )}
                </div>
              </div>
            )}

            {twoFactorError && !showTwoFactorSetupModal && !showTwoFactorDisableModal && (
              <div className="mt-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
                {twoFactorError}
              </div>
            )}
          </div>

          {/* Security Tips */}
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Security Tips
            </h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Use a strong, unique password for your account</li>
              <li>• Enable two-factor authentication for extra security</li>
              <li>• Never share your backup codes with anyone</li>
              <li>• Use an authenticator app like Google Authenticator or Authy</li>
            </ul>
          </div>

          {/* Connected Devices */}
          <div className="mt-6 pt-6 border-t border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Connected Devices
                </h3>
                <p className="text-sm text-gray-400 mt-1">Manage devices that are currently signed in to your account</p>
              </div>
              {deviceSessions.length > 1 && (
                <button
                  onClick={() => setShowRevokeAllDialog(true)}
                  className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-lg transition-colors"
                  data-testid="revoke-all-sessions-button"
                >
                  Sign out all devices
                </button>
              )}
            </div>

            {sessionError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {sessionError}
              </div>
            )}

            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-gray-600 border-t-green-500 rounded-full animate-spin" />
              </div>
            ) : deviceSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p>No active sessions found</p>
                <p className="text-sm mt-1">Session tracking will begin with your next login</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deviceSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-lg border ${
                      session.isCurrent
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-gray-700/50 border-gray-600'
                    }`}
                    data-testid={`session-${session.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${session.isCurrent ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
                          {getDeviceIcon(session.deviceType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{session.deviceName}</span>
                            {session.isCurrent && (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                This device
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-400 mt-1 space-y-0.5">
                            {session.ipAddress && (
                              <div className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                                <span>{session.ipAddress}</span>
                                {session.location && <span>• {session.location}</span>}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Last active: {formatRelativeTime(session.lastActiveAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokingSessionId === session.id}
                          className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 text-gray-300 border border-gray-500 rounded-lg transition-colors disabled:opacity-50"
                          data-testid={`revoke-session-${session.id}`}
                        >
                          {revokingSessionId === session.id ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            'Revoke'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revoke All Sessions Dialog */}
      <ConfirmationDialog
        isOpen={showRevokeAllDialog}
        onClose={() => setShowRevokeAllDialog(false)}
        onConfirm={handleRevokeAllSessions}
        title="Sign Out All Devices"
        message={
          <div>
            <p>Are you sure you want to sign out from all devices?</p>
            <p className="mt-2 text-sm text-gray-400">
              This will revoke all active sessions, including this one. You will need to sign in again on all devices.
            </p>
          </div>
        }
        confirmText="Sign Out All"
        cancelText="Cancel"
        variant="danger"
        isLoading={isRevokingAll}
      />

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!isChangingPassword) {
                setShowChangePasswordModal(false);
                setChangePasswordError(null);
              }
            }}
          />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 p-6" data-testid="change-password-modal">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-white text-center mb-2">
              Change Password
            </h3>
            <p className="text-gray-400 text-center mb-6">
              Enter your current password and choose a new password
            </p>

            {changePasswordSuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-400 font-medium" data-testid="password-change-success">Password changed successfully!</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="current-password-input"
                    disabled={isChangingPassword}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="new-password-input"
                    disabled={isChangingPassword}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="confirm-new-password-input"
                    disabled={isChangingPassword}
                  />
                </div>

                <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">Password requirements:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li className={newPassword.length >= 8 ? 'text-green-400' : ''}>• At least 8 characters</li>
                    <li className={/[A-Z]/.test(newPassword) ? 'text-green-400' : ''}>• One uppercase letter</li>
                    <li className={/[a-z]/.test(newPassword) ? 'text-green-400' : ''}>• One lowercase letter</li>
                    <li className={/[0-9]/.test(newPassword) ? 'text-green-400' : ''}>• One number</li>
                    <li className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-400' : ''}>• One special character</li>
                  </ul>
                </div>

                {changePasswordError && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm" data-testid="password-error">
                    {changePasswordError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowChangePasswordModal(false);
                      setChangePasswordError(null);
                    }}
                    disabled={isChangingPassword}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={!currentPassword || !newPassword || !confirmNewPassword || isChangingPassword}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    data-testid="submit-password-change"
                  >
                    {isChangingPassword ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Changing...
                      </>
                    ) : (
                      'Change Password'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {showTwoFactorSetupModal && twoFactorSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowTwoFactorSetupModal(false);
              setTwoFactorCode('');
              setTwoFactorError(null);
            }}
          />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 p-6" data-testid="2fa-setup-modal">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-white text-center mb-2">
              Set Up Two-Factor Authentication
            </h3>
            <p className="text-gray-400 text-center mb-6">
              Scan this QR code with your authenticator app
            </p>

            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white rounded-lg">
                <img
                  src={twoFactorSetup.qrCodeDataUrl}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                  data-testid="2fa-qr-code"
                />
              </div>
            </div>

            <div className="mb-6 p-3 bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Or enter this code manually:</p>
              <code className="text-sm text-green-400 font-mono break-all" data-testid="2fa-secret">
                {twoFactorSetup.secret}
              </code>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Enter the 6-digit code from your app
              </label>
              <input
                type="text"
                value={twoFactorCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setTwoFactorCode(value);
                  setTwoFactorError(null);
                }}
                placeholder="000000"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={6}
                data-testid="2fa-verify-input"
              />
              {twoFactorError && (
                <p className="text-red-400 text-sm mt-2">{twoFactorError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTwoFactorSetupModal(false);
                  setTwoFactorCode('');
                  setTwoFactorError(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyTwoFactor}
                disabled={twoFactorCode.length !== 6 || isVerifyingTwoFactor}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                data-testid="2fa-verify-button"
              >
                {isVerifyingTwoFactor ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Modal */}
      {showBackupCodesModal && backupCodes.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 p-6" data-testid="backup-codes-modal">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-white text-center mb-2">
              Two-Factor Authentication Enabled!
            </h3>
            <p className="text-gray-400 text-center mb-4">
              Save these backup codes in a safe place. You can use them if you lose access to your authenticator app.
            </p>

            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <p className="text-yellow-400 text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Each backup code can only be used once. Store them securely!</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6 p-4 bg-gray-700/50 rounded-lg" data-testid="backup-codes-list">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="px-3 py-2 bg-gray-800 rounded border border-gray-600 font-mono text-sm text-center text-green-400"
                >
                  {code}
                </div>
              ))}
            </div>

            <button
              onClick={handleCopyBackupCodes}
              className="w-full mb-3 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy All Codes
            </button>

            <button
              onClick={() => {
                setShowBackupCodesModal(false);
                setBackupCodes([]);
              }}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              data-testid="backup-codes-done-button"
            >
              I've Saved My Codes
            </button>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {showTwoFactorDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowTwoFactorDisableModal(false);
              setTwoFactorCode('');
              setTwoFactorError(null);
            }}
          />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 p-6" data-testid="2fa-disable-modal">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-white text-center mb-2">
              Disable Two-Factor Authentication
            </h3>
            <p className="text-gray-400 text-center mb-6">
              Enter a verification code to confirm disabling 2FA. This will make your account less secure.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Enter a 6-digit code or backup code
              </label>
              <input
                type="text"
                value={twoFactorCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
                  setTwoFactorCode(value);
                  setTwoFactorError(null);
                }}
                placeholder="000000 or BACKUPCD"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                maxLength={8}
                data-testid="2fa-disable-input"
              />
              {twoFactorError && (
                <p className="text-red-400 text-sm mt-2">{twoFactorError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTwoFactorDisableModal(false);
                  setTwoFactorCode('');
                  setTwoFactorError(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableTwoFactor}
                disabled={(twoFactorCode.length !== 6 && twoFactorCode.length !== 8) || isDisablingTwoFactor}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                data-testid="2fa-disable-confirm-button"
              >
                {isDisablingTwoFactor ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Disabling...
                  </>
                ) : (
                  'Disable 2FA'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
