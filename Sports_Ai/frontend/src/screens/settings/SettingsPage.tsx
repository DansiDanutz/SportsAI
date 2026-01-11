import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { useAuthStore } from '../../store/authStore';
import { usePreferencesStore, OddsFormat, formatOdds } from '../../store/preferencesStore';
import { usePushNotifications } from '../../hooks/usePushNotifications';

import { api, authApi, subscriptionApi, profileApi, TwoFactorSetupResponse, TwoFactorStatusResponse, DeviceSession, SubscriptionCancellation } from '../../services/api';

// Available sports for settings
const availableSports = [
  { key: 'soccer', name: 'Soccer', icon: '⚽' },
  { key: 'basketball', name: 'Basketball', icon: '🏀' },
  { key: 'tennis', name: 'Tennis', icon: '🎾' },
  { key: 'american_football', name: 'American Football', icon: '🏈' },
  { key: 'ice_hockey', name: 'Ice Hockey', icon: '🏒' },
];

export function SettingsPage() {
  const { user, logout, updateUser } = useAuthStore();
  const { oddsFormat, setOddsFormat, timezone, setTimezone, theme, setTheme, language, setLanguage, resetToDefaults } = usePreferencesStore();
  const { permission: pushPermission, isSupported: isPushSupported, requestPermission, simulatePushNotification } = usePushNotifications();
  const location = useLocation();

  // Section refs for hash navigation
  const accountRef = useRef<HTMLDivElement>(null);
  const preferencesRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const privacyRef = useRef<HTMLDivElement>(null);
  const sportsRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);
  const gamblingRef = useRef<HTMLDivElement>(null);

  // Handle hash navigation on mount and hash change
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash) {
      const refs: Record<string, React.RefObject<HTMLDivElement>> = {
        account: accountRef,
        preferences: preferencesRef,
        notifications: notificationsRef,
        privacy: privacyRef,
        sports: sportsRef,
        security: securityRef,
        gambling: gamblingRef,
      };
      const targetRef = refs[hash];
      if (targetRef?.current) {
        setTimeout(() => {
          targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location.hash]);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | 'pro'>('premium');
  const [newEmail, setNewEmail] = useState('');
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Phone number state
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneSaveSuccess, setPhoneSaveSuccess] = useState(false);

  // Website URL state
  const [websiteUrl, setWebsiteUrl] = useState(user?.websiteUrl || '');
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [isSavingWebsite, setIsSavingWebsite] = useState(false);
  const [websiteSaveSuccess, setWebsiteSaveSuccess] = useState(false);

  // Profile picture state
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [profilePictureError, setProfilePictureError] = useState<string | null>(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureUploadSuccess, setPictureUploadSuccess] = useState(false);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  // Load existing profile picture on mount
  useEffect(() => {
    const loadProfilePicture = async () => {
      try {
        const profile = await profileApi.getProfile();
        if (profile.profilePictureUrl) {
          setProfilePicturePreview(`http://localhost:4000${profile.profilePictureUrl}`);
        }
      } catch (error) {
        console.error('Failed to load profile picture:', error);
      }
    };
    loadProfilePicture();
  }, []);

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [planChangeSuccess, setPlanChangeSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showResetPreferencesDialog, setShowResetPreferencesDialog] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Notification preferences
  const [notifications, setNotifications] = useState({
    arbitrageAlerts: true,
    oddsMovement: true,
    emailNotifications: false,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    isPending: boolean;
    jobId?: string;
    message?: string;
  }>({ isPending: false });

  // Responsible Gambling settings
  const [sessionRemindersEnabled, setSessionRemindersEnabled] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState('60'); // minutes
  const [showSelfExclusionModal, setShowSelfExclusionModal] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [sessionReminderActive, setSessionReminderActive] = useState(false);
  const [sessionReminderCountdown, setSessionReminderCountdown] = useState<number | null>(null);

  // Conditional validation: Notification preference with custom message
  const [notificationPreference, setNotificationPreference] = useState<'default' | 'custom'>('default');
  const [customNotificationMessage, setCustomNotificationMessage] = useState('');
  const [customMessageError, setCustomMessageError] = useState<string | null>(null);
  const [isSavingNotificationPref, setIsSavingNotificationPref] = useState(false);
  const [notificationPrefSaveSuccess, setNotificationPrefSaveSuccess] = useState(false);

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

  // Cancel Subscription state
  const [showCancelSubscriptionDialog, setShowCancelSubscriptionDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationSuccess, setCancellationSuccess] = useState(false);
  const [cancellationError, setCancellationError] = useState<string | null>(null);
  const [cancellationDetails, setCancellationDetails] = useState<SubscriptionCancellation | null>(null);

  // Cancellation reasons
  const cancellationReasons = [
    { id: 'too_expensive', label: 'Too expensive' },
    { id: 'not_using', label: "I'm not using it enough" },
    { id: 'missing_features', label: 'Missing features I need' },
    { id: 'found_alternative', label: 'Found a better alternative' },
    { id: 'temporary', label: 'Taking a break temporarily' },
    { id: 'other', label: 'Other reason' },
  ];

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

  // Handle notification preference changes
  const handleNotificationChange = async (key: keyof typeof notifications, value: boolean) => {
    const previousValue = notifications[key];
    // Optimistic update
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
      // Rollback on error
      setNotifications(prev => ({ ...prev, [key]: previousValue }));
    } finally {
      setSavingNotifications(false);
    }
  };

  // Handle language preference changes
  const handleLanguageChange = async (languageCode: string) => {
    try {
      await api.patch('/v1/users/me/preferences', {
        display: {
          language: languageCode === 'auto' ? null : languageCode,
        },
      });
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

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

  // Handle enabling 2FA - start setup process
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

  // Handle verifying TOTP code during setup
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

  // Handle disabling 2FA
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

  // Copy backup codes to clipboard
  const handleCopyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
  };

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
        // After revoking all, user will be logged out on next request
        // For now, just reload the sessions (should be empty or just current)
        await loadDeviceSessions();
        setShowRevokeAllDialog(false);
      }
    } catch (error: any) {
      setSessionError(error.response?.data?.message || 'Failed to revoke sessions');
    } finally {
      setIsRevokingAll(false);
    }
  };

  // Format relative time for session last active
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

  // Handle password change
  const handleChangePassword = async () => {
    setChangePasswordError(null);
    setChangePasswordSuccess(false);

    // Validate passwords match
    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('New passwords do not match');
      return;
    }

    // Validate password strength
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
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        // Close modal after a delay
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

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!cancellationReason) {
      setCancellationError('Please select a reason for cancellation');
      return;
    }

    setIsCancelling(true);
    setCancellationError(null);
    try {
      const result = await subscriptionApi.cancel(cancellationReason);
      if (result.success && result.cancellation) {
        setCancellationSuccess(true);
        setCancellationDetails(result.cancellation);
      } else {
        setCancellationError(result.message || 'Failed to cancel subscription');
      }
    } catch (error: any) {
      setCancellationError(error.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  // Reset cancel subscription dialog
  const resetCancelDialog = () => {
    setShowCancelSubscriptionDialog(false);
    setCancellationReason('');
    setCancellationError(null);
    // Don't reset cancellationSuccess/cancellationDetails - they persist for display
  };

  // Get device icon based on device type
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
      default: // desktop
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const handleRequestExport = async () => {
    setIsExporting(true);
    try {
      const response = await api.post('/v1/users/me/export');
      if (response.data.isPending) {
        // Already pending - show appropriate message
        setExportStatus({
          isPending: true,
          jobId: response.data.jobId,
          message: response.data.message,
        });
      } else {
        // New export requested
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

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await api.delete('/v1/users/me');
      if (response.data.success) {
        setShowDeleteDialog(false);
        logout();
      } else {
        console.error('Failed to delete account:', response.data.message);
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) return;
    setIsSendingVerification(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEmailVerificationSent(true);
    } catch (error) {
      console.error('Failed to send verification:', error);
    } finally {
      setIsSendingVerification(false);
    }
  };

  // Validate phone number
  const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
    // Allow empty phone (optional field)
    if (!phone) {
      return { valid: true };
    }

    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');

    // Check if it contains only valid characters (digits, spaces, dashes, parentheses, plus sign)
    const validCharsRegex = /^[0-9\s\-\(\)\+\.]+$/;
    if (!validCharsRegex.test(phone)) {
      return { valid: false, error: 'Phone number can only contain digits, spaces, dashes, and parentheses' };
    }

    // Check minimum length (at least 7 digits for a valid phone number)
    if (digitsOnly.length < 7) {
      return { valid: false, error: 'Phone number must have at least 7 digits' };
    }

    // Check maximum length (typically max 15 digits for international)
    if (digitsOnly.length > 15) {
      return { valid: false, error: 'Phone number cannot exceed 15 digits' };
    }

    return { valid: true };
  };

  // Handle phone number change with validation
  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    setPhoneSaveSuccess(false);
    const validation = validatePhoneNumber(value);
    if (!validation.valid) {
      setPhoneError(validation.error || 'Invalid phone number');
    } else {
      setPhoneError(null);
    }
  };

  // Save phone number
  const handleSavePhone = async () => {
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      setPhoneError(validation.error || 'Invalid phone number');
      return;
    }

    setIsSavingPhone(true);
    try {
      await api.patch('/v1/users/me', { phoneNumber });
      setPhoneSaveSuccess(true);
      setTimeout(() => setPhoneSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save phone number:', error);
      setPhoneError('Failed to save phone number. Please try again.');
    } finally {
      setIsSavingPhone(false);
    }
  };

  // Validate URL
  const validateUrl = (url: string): { valid: boolean; error?: string } => {
    // Allow empty URL (optional field)
    if (!url) {
      return { valid: true };
    }

    // Check for valid URL pattern
    try {
      const urlObj = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'URL must start with http:// or https://' };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: 'Please enter a valid URL (e.g., https://example.com)' };
    }
  };

  // Handle website URL change with validation
  const handleWebsiteChange = (value: string) => {
    setWebsiteUrl(value);
    setWebsiteSaveSuccess(false);
    const validation = validateUrl(value);
    if (!validation.valid) {
      setWebsiteError(validation.error || 'Invalid URL');
    } else {
      setWebsiteError(null);
    }
  };

  // Save website URL
  const handleSaveWebsite = async () => {
    const validation = validateUrl(websiteUrl);
    if (!validation.valid) {
      setWebsiteError(validation.error || 'Invalid URL');
      return;
    }

    setIsSavingWebsite(true);
    try {
      await api.patch('/v1/users/me', { websiteUrl });
      setWebsiteSaveSuccess(true);
      setTimeout(() => setWebsiteSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save website URL:', error);
      setWebsiteError('Failed to save website URL. Please try again.');
    } finally {
      setIsSavingWebsite(false);
    }
  };

  // Allowed image types for profile picture
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  // Validate profile picture file
  const validateProfilePicture = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const extension = file.name.toLowerCase().split('.').pop();
      if (extension === 'exe') {
        return { valid: false, error: 'Executable files (.exe) are not allowed. Please select an image file.' };
      }
      if (extension === 'pdf') {
        return { valid: false, error: 'PDF files are not allowed. Please select an image file (JPG, PNG, GIF, or WebP).' };
      }
      return { valid: false, error: `Invalid file type. Please select an image file (${ALLOWED_IMAGE_EXTENSIONS.join(', ')}).` };
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 5MB.' };
    }

    return { valid: true };
  };

  // Handle profile picture file selection
  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPictureUploadSuccess(false);
    const validation = validateProfilePicture(file);

    if (!validation.valid) {
      setProfilePictureError(validation.error || 'Invalid file');
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
      // Reset input
      if (profilePictureInputRef.current) {
        profilePictureInputRef.current.value = '';
      }
      return;
    }

    setProfilePictureError(null);
    setProfilePictureFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfilePicturePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload profile picture
  const handleUploadProfilePicture = async () => {
    if (!profilePictureFile) return;

    setIsUploadingPicture(true);
    try {
      const response = await profileApi.uploadPicture(profilePictureFile);
      if (response.success && response.profilePictureUrl) {
        // Update the auth store with the new profile picture URL
        if (user) {
          updateUser({ ...user, profilePictureUrl: response.profilePictureUrl });
        }
        // Update preview to show the server URL
        setProfilePicturePreview(`http://localhost:4000${response.profilePictureUrl}`);
        setPictureUploadSuccess(true);
        setTimeout(() => setPictureUploadSuccess(false), 3000);
        // Clear the file since it's now uploaded
        setProfilePictureFile(null);
        if (profilePictureInputRef.current) {
          profilePictureInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      setProfilePictureError('Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploadingPicture(false);
    }
  };

  // Validate conditional custom notification message
  const validateCustomNotificationMessage = (): { valid: boolean; error?: string } => {
    // Only validate if custom is selected
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

  // Handle notification preference change
  const handleNotificationPreferenceChange = (value: 'default' | 'custom') => {
    setNotificationPreference(value);
    setNotificationPrefSaveSuccess(false);
    // Clear error when switching back to default
    if (value === 'default') {
      setCustomMessageError(null);
    }
  };

  // Handle custom message change
  const handleCustomMessageChange = (value: string) => {
    setCustomNotificationMessage(value);
    setNotificationPrefSaveSuccess(false);
    // Validate on change if custom is selected - use the passed value directly
    if (notificationPreference === 'custom') {
      // Validate with the current value being typed
      if (!value.trim()) {
        setCustomMessageError('Custom message is required when "Custom" is selected');
      } else if (value.trim().length < 5) {
        setCustomMessageError('Custom message must be at least 5 characters');
      } else {
        setCustomMessageError(null);
      }
    }
  };

  // Save notification preference
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

  const handleSaveChanges = async () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    // Start demo timer if session reminders are enabled
    if (sessionRemindersEnabled) {
      startReminderDemo();
    }
  };

  const handleResetPreferences = () => {
    resetToDefaults();
    setResetSuccess(true);
    setShowResetPreferencesDialog(false);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const response = await api.post('/v1/users/me/subscription/upgrade', { tier: 'premium' });
      if (response.data.success && response.data.user) {
        // Update the user in the auth store
        updateUser(response.data.user);
        setUpgradeSuccess(true);
        setTimeout(() => {
          setShowUpgradeDialog(false);
          setUpgradeSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to upgrade:', error);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleChangePlan = async () => {
    if (selectedPlan === user?.subscriptionTier) return;

    setIsChangingPlan(true);
    try {
      const response = await api.post('/v1/users/me/subscription/upgrade', { tier: selectedPlan });
      if (response.data.success && response.data.user) {
        updateUser(response.data.user);
        setPlanChangeSuccess(true);
        setTimeout(() => {
          setShowChangePlanDialog(false);
          setPlanChangeSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to change plan:', error);
    } finally {
      setIsChangingPlan(false);
    }
  };

  // Calculate prorated amount for plan changes
  const calculateProration = (currentPlan: string, newPlan: string): { amount: number; isRefund: boolean; daysRemaining: number } => {
    const planPrices: Record<string, number> = { free: 0, premium: 19.99, pro: 49.99 };
    const currentPrice = planPrices[currentPlan] || 0;
    const newPrice = planPrices[newPlan] || 0;
    const daysRemaining = 15; // Mock: days remaining in billing cycle
    const dailyRate = (newPrice - currentPrice) / 30;
    const amount = Math.abs(dailyRate * daysRemaining);
    return {
      amount: Math.round(amount * 100) / 100,
      isRefund: newPrice < currentPrice,
      daysRemaining,
    };
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-2">
            Manage your account and preferences
          </p>
        </div>

        <div className="max-w-3xl space-y-6">
          {/* Account Section */}
          <div ref={accountRef} id="account" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
            <h2 className="text-xl font-semibold text-white mb-4">Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Profile Picture</label>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {profilePicturePreview ? (
                      <img
                        src={profilePicturePreview}
                        alt="Profile preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-green-500"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={profilePictureInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                      data-testid="profile-picture-input"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => profilePictureInputRef.current?.click()}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        data-testid="choose-picture-button"
                      >
                        Choose File
                      </button>
                      {profilePictureFile && !profilePictureError && (
                        <button
                          onClick={handleUploadProfilePicture}
                          disabled={isUploadingPicture}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                          data-testid="upload-picture-button"
                        >
                          {isUploadingPicture ? 'Uploading...' : 'Upload'}
                        </button>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-2">
                      Accepted formats: JPG, PNG, GIF, WebP (max 5MB)
                    </p>
                    {profilePictureFile && !profilePictureError && (
                      <p className="text-gray-400 text-sm mt-1">
                        Selected: {profilePictureFile.name}
                      </p>
                    )}
                    {profilePictureError && (
                      <p className="text-red-400 text-sm mt-1" data-testid="profile-picture-error">
                        {profilePictureError}
                      </p>
                    )}
                    {pictureUploadSuccess && (
                      <p className="text-green-400 text-sm mt-1">
                        Profile picture uploaded successfully!
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                <div className="flex space-x-3">
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-300"
                  />
                  <button
                    onClick={() => setShowEmailDialog(true)}
                    className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Subscription</label>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    user?.subscriptionTier === 'premium'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : user?.subscriptionTier === 'pro'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-gray-600 text-gray-300'
                  }`}>
                    {user?.subscriptionTier === 'premium' ? 'Premium' : user?.subscriptionTier === 'pro' ? 'Pro' : 'Free'}
                  </span>
                  {user?.subscriptionTier !== 'premium' && user?.subscriptionTier !== 'pro' && (
                    <button
                      onClick={() => setShowUpgradeDialog(true)}
                      className="text-green-500 hover:text-green-400 text-sm font-medium"
                    >
                      Upgrade to Premium
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedPlan(user?.subscriptionTier === 'premium' ? 'pro' : 'premium');
                      setShowChangePlanDialog(true);
                    }}
                    className="text-blue-500 hover:text-blue-400 text-sm font-medium"
                    data-testid="change-plan-button"
                  >
                    Change Plan
                  </button>
                  {(user?.subscriptionTier === 'premium' || user?.subscriptionTier === 'pro') && !cancellationSuccess && (
                    <button
                      onClick={() => setShowCancelSubscriptionDialog(true)}
                      className="text-red-500 hover:text-red-400 text-sm font-medium"
                      data-testid="cancel-subscription-button"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
                {/* Show cancellation notice if subscription is cancelled */}
                {cancellationSuccess && cancellationDetails && (
                  <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg" data-testid="cancellation-notice">
                    <div className="flex items-start space-x-2">
                      <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-yellow-400 font-medium text-sm">Subscription Cancelled</p>
                        <p className="text-gray-400 text-sm mt-1">
                          Your premium access will continue until {new Date(cancellationDetails.accessEndsAt).toLocaleDateString()}. No further charges will be made.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="Enter your phone number"
                      className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white focus:outline-none ${
                        phoneError
                          ? 'border-red-500 focus:border-red-500'
                          : phoneSaveSuccess
                            ? 'border-green-500'
                            : 'border-gray-600 focus:border-green-500'
                      }`}
                      data-testid="phone-input"
                    />
                    {phoneError && (
                      <p className="text-red-400 text-sm mt-1" data-testid="phone-error">
                        {phoneError}
                      </p>
                    )}
                    {phoneSaveSuccess && (
                      <p className="text-green-400 text-sm mt-1">
                        Phone number saved successfully!
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleSavePhone}
                    disabled={!!phoneError || isSavingPhone}
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    data-testid="save-phone-button"
                  >
                    {isSavingPhone ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Website URL</label>
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => handleWebsiteChange(e.target.value)}
                      placeholder="https://example.com"
                      className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white focus:outline-none ${
                        websiteError
                          ? 'border-red-500 focus:border-red-500'
                          : websiteSaveSuccess
                            ? 'border-green-500'
                            : 'border-gray-600 focus:border-green-500'
                      }`}
                      data-testid="website-input"
                    />
                    {websiteError && (
                      <p className="text-red-400 text-sm mt-1" data-testid="website-error">
                        {websiteError}
                      </p>
                    )}
                    {websiteSaveSuccess && (
                      <p className="text-green-400 text-sm mt-1">
                        Website URL saved successfully!
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleSaveWebsite}
                    disabled={!!websiteError || isSavingWebsite}
                    className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    data-testid="save-website-button"
                  >
                    {isSavingWebsite ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sport-Specific Settings */}
          <div ref={sportsRef} id="sports" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
            <h2 className="text-xl font-semibold text-white mb-4">Sport Settings</h2>
            <p className="text-gray-400 text-sm mb-4">
              Configure markets, periods, and preferences for each sport
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {availableSports.map((sport) => (
                <Link
                  key={sport.key}
                  to={`/settings/sports/${sport.key}`}
                  className="flex flex-col items-center p-4 bg-gray-700/50 rounded-lg border border-gray-600 hover:border-green-500/50 hover:bg-gray-700 transition-colors group"
                >
                  <span className="text-3xl mb-2">{sport.icon}</span>
                  <span className="text-sm text-gray-300 group-hover:text-white">{sport.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Security Section - Two-Factor Authentication */}
          <div ref={securityRef} id="security" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
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

                {/* Backup codes info when 2FA is enabled */}
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

              {/* Connected Devices / Active Sessions */}
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

          {/* Display Preferences */}
          <div ref={preferencesRef} id="preferences" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Display Preferences</h2>
              <button
                onClick={() => setShowResetPreferencesDialog(true)}
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
                {/* Preview current format */}
                <div className="mt-2 p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Preview (2.50 decimal):</div>
                  <div className="text-white font-medium">{formatOdds(2.50, oddsFormat)}</div>
                </div>
              </div>
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

          {/* Notifications */}
          <div ref={notificationsRef} id="notifications" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
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

                {/* Conditional field: Only show when "Custom" is selected */}
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

          {/* Responsible Gambling */}
          <div ref={gamblingRef} id="gambling" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
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
                    onClick={() => setShowSelfExclusionModal(true)}
                    className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50 rounded-lg transition-colors text-sm"
                  >
                    View Options
                  </button>
                </div>
              </div>

              {/* Regional Resources */}
              <button
                onClick={() => setShowResourcesModal(true)}
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

          {/* Privacy & Data Controls */}
          <div ref={privacyRef} id="privacy" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
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

          {/* Danger Zone */}
          <div className="bg-gray-800 rounded-xl border border-red-500/30 p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-4">Danger Zone</h2>
            <p className="text-gray-400 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/50 rounded-lg transition-colors"
            >
              Delete Account
            </button>
          </div>

          {/* Save Button */}
          <div className="flex justify-between items-center">
            {saveSuccess && (
              <div className="flex items-center text-green-500">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Changes saved successfully!
              </div>
            )}
            <div className="flex-1" />
            <button
              onClick={handleSaveChanges}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeleteConfirmText('');
        }}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message={
          <div>
            <p>Are you sure you want to delete your account?</p>
            <p className="mt-2 text-sm">This will permanently delete:</p>
            <ul className="text-sm mt-2 text-left list-disc list-inside">
              <li>All your favorites and presets</li>
              <li>Your credit balance ({user?.creditBalance || 0} credits)</li>
              <li>Your transaction history</li>
              <li>All personalization settings</li>
            </ul>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm mb-2">To confirm deletion, type <span className="font-mono text-red-400 font-bold">DELETE</span> below:</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 text-center font-mono"
                autoComplete="off"
              />
            </div>
          </div>
        }
        confirmText="Delete My Account"
        cancelText="Keep My Account"
        variant="danger"
        isLoading={isDeleting}
        confirmDisabled={deleteConfirmText !== 'DELETE'}
      />

      {/* Revoke All Sessions Confirmation Dialog */}
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

      {/* Change Email Dialog */}
      {showEmailDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowEmailDialog(false);
              setEmailVerificationSent(false);
              setNewEmail('');
            }}
          />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-white text-center mb-2">
              Change Email Address
            </h3>

            {!emailVerificationSent ? (
              <>
                <p className="text-gray-400 text-center mb-4">
                  Enter your new email address. We'll send a verification link to confirm the change.
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Current Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    New Email
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowEmailDialog(false);
                      setNewEmail('');
                    }}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangeEmail}
                    disabled={!newEmail || !newEmail.includes('@') || isSendingVerification}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSendingVerification ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      'Send Verification'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-400">
                    We've sent a verification link to:
                  </p>
                  <p className="text-white font-medium mt-1">{newEmail}</p>
                  <p className="text-gray-500 text-sm mt-4">
                    Please check your inbox and click the link to confirm your new email address.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowEmailDialog(false);
                    setEmailVerificationSent(false);
                    setNewEmail('');
                  }}
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upgrade to Premium Dialog */}
      <ConfirmationDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        onConfirm={handleUpgrade}
        title="Upgrade to Premium"
        message={
          upgradeSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-400 font-medium">Successfully upgraded to Premium!</p>
              <p className="text-gray-400 text-sm mt-1">Enjoy all premium features.</p>
            </div>
          ) : (
            <div>
              <p className="mb-4">Unlock all premium features:</p>
              <ul className="space-y-2 text-left">
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full arbitrage opportunity details
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Line Movement Analysis
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  AI-Powered Insights
                </li>
                <li className="flex items-center text-sm">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority Support
                </li>
              </ul>
              <div className="mt-4 p-3 bg-gray-700/50 rounded-lg text-center">
                <span className="text-2xl font-bold text-white">$29.99</span>
                <span className="text-gray-400">/month</span>
              </div>
            </div>
          )
        }
        confirmText={upgradeSuccess ? '' : 'Upgrade Now'}
        cancelText={upgradeSuccess ? 'Close' : 'Cancel'}
        variant="info"
        isLoading={isUpgrading}
      />

      {/* Change Plan Dialog */}
      {showChangePlanDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowChangePlanDialog(false);
              setPlanChangeSuccess(false);
            }}
          />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-2xl mx-4 p-6" data-testid="change-plan-dialog">
            {planChangeSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">Plan Changed Successfully!</h3>
                <p className="text-gray-400 mt-2">Your new plan is now active.</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-white mb-2">Change Your Plan</h3>
                <p className="text-gray-400 mb-6">Select a new plan. Changes take effect immediately.</p>

                {/* Plan Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Free Plan */}
                  <button
                    onClick={() => setSelectedPlan('free')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPlan === 'free'
                        ? 'border-green-500 bg-green-500/10'
                        : user?.subscriptionTier === 'free'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                    }`}
                    data-testid="select-free-plan"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-white">Free</span>
                      {user?.subscriptionTier === 'free' && (
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Current</span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white mb-2">$0<span className="text-sm text-gray-400">/mo</span></div>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• Basic arbitrage alerts</li>
                      <li>• 5 events per day</li>
                      <li>• Standard support</li>
                    </ul>
                  </button>

                  {/* Premium Plan */}
                  <button
                    onClick={() => setSelectedPlan('premium')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPlan === 'premium'
                        ? 'border-green-500 bg-green-500/10'
                        : user?.subscriptionTier === 'premium'
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                    }`}
                    data-testid="select-premium-plan"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-white">Premium</span>
                      {user?.subscriptionTier === 'premium' && (
                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">Current</span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white mb-2">$19.99<span className="text-sm text-gray-400">/mo</span></div>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• All Free features</li>
                      <li>• Unlimited events</li>
                      <li>• Full arbitrage details</li>
                      <li>• Priority support</li>
                    </ul>
                  </button>

                  {/* Pro Plan */}
                  <button
                    onClick={() => setSelectedPlan('pro')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPlan === 'pro'
                        ? 'border-green-500 bg-green-500/10'
                        : user?.subscriptionTier === 'pro'
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                    }`}
                    data-testid="select-pro-plan"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-white">Pro</span>
                      {user?.subscriptionTier === 'pro' && (
                        <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">Current</span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white mb-2">$49.99<span className="text-sm text-gray-400">/mo</span></div>
                    <ul className="text-sm text-gray-400 space-y-1">
                      <li>• All Premium features</li>
                      <li>• AI-powered insights</li>
                      <li>• API access</li>
                      <li>• Dedicated support</li>
                    </ul>
                  </button>
                </div>

                {/* Proration Summary */}
                {selectedPlan !== user?.subscriptionTier && (
                  <div className="mb-6 p-4 bg-gray-700/50 rounded-lg" data-testid="proration-summary">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Billing Summary</h4>
                    {(() => {
                      const proration = calculateProration(user?.subscriptionTier || 'free', selectedPlan);
                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Days remaining in cycle:</span>
                            <span className="text-white">{proration.daysRemaining} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">
                              {proration.isRefund ? 'Credit to account:' : 'Prorated charge:'}
                            </span>
                            <span className={proration.isRefund ? 'text-green-400' : 'text-yellow-400'}>
                              {proration.isRefund ? '+' : ''}${proration.amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-gray-600 flex justify-between font-medium">
                            <span className="text-gray-300">New plan starts:</span>
                            <span className="text-white">Immediately</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowChangePlanDialog(false);
                      setPlanChangeSuccess(false);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePlan}
                    disabled={selectedPlan === user?.subscriptionTier || isChangingPlan}
                    className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="confirm-plan-change"
                  >
                    {isChangingPlan ? 'Changing...' : selectedPlan === user?.subscriptionTier ? 'Current Plan' : 'Confirm Change'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cancel Subscription Dialog */}
      {showCancelSubscriptionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={resetCancelDialog}
          />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 p-6" data-testid="cancel-subscription-dialog">
            {cancellationSuccess && cancellationDetails ? (
              // Success state
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Subscription Cancelled</h3>
                <div className="space-y-3 text-left bg-gray-700/50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Access until:</span>
                    <span className="text-white font-medium" data-testid="access-end-date">
                      {new Date(cancellationDetails.accessEndsAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Next billing:</span>
                    <span className="text-green-400 font-medium" data-testid="no-renewal">No renewal scheduled</span>
                  </div>
                  <div className="pt-2 border-t border-gray-600">
                    <p className="text-gray-300 text-sm">
                      Your premium features will remain active until the end of your current billing period. You won't be charged again.
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetCancelDialog}
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              // Cancellation form
              <>
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>

                <h3 className="text-xl font-semibold text-white text-center mb-2">Cancel Subscription</h3>
                <p className="text-gray-400 text-center mb-6">
                  We're sorry to see you go. Please tell us why you're cancelling.
                </p>

                {/* Cancellation details */}
                <div className="bg-gray-700/50 rounded-lg p-4 mb-6" data-testid="cancellation-details">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">What happens next:</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Premium access continues until end of billing period</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>No further charges will be made</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>You can resubscribe at any time</span>
                    </li>
                  </ul>
                </div>

                {/* Reason selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Reason for cancellation <span className="text-red-400">*</span>
                  </label>
                  <div className="space-y-2" data-testid="cancellation-reasons">
                    {cancellationReasons.map((reason) => (
                      <button
                        key={reason.id}
                        onClick={() => {
                          setCancellationReason(reason.id);
                          setCancellationError(null);
                        }}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          cancellationReason === reason.id
                            ? 'border-red-500 bg-red-500/10 text-white'
                            : 'border-gray-600 hover:border-gray-500 text-gray-300'
                        }`}
                        data-testid={`reason-${reason.id}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            cancellationReason === reason.id
                              ? 'border-red-500'
                              : 'border-gray-500'
                          }`}>
                            {cancellationReason === reason.id && (
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                            )}
                          </div>
                          <span>{reason.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {cancellationError && (
                    <p className="text-red-400 text-sm mt-2" data-testid="cancellation-error">
                      {cancellationError}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={resetCancelDialog}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={isCancelling || !cancellationReason}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="confirm-cancellation"
                  >
                    {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Self-Exclusion Options Modal */}
      {showSelfExclusionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSelfExclusionModal(false)}
          />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-white text-center mb-2">Self-Exclusion Options</h3>
            <p className="text-gray-400 text-center mb-6">
              Choose how you'd like to limit your access to SportsAI.
            </p>

            <div className="space-y-3">
              <button className="w-full p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">24-Hour Timeout</div>
                    <div className="text-sm text-gray-400">Take a short break from the platform</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button className="w-full p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">7-Day Exclusion</div>
                    <div className="text-sm text-gray-400">Lock your account for a week</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button className="w-full p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-left transition-colors border border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">30-Day Exclusion</div>
                    <div className="text-sm text-gray-400">Extended break for a month</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-left transition-colors border border-red-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-red-400 font-medium">Permanent Self-Exclusion</div>
                    <div className="text-sm text-gray-400">Permanently close your account</div>
                  </div>
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowSelfExclusionModal(false)}
              className="w-full mt-6 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Regional Resources Modal */}
      {showResourcesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowResourcesModal(false)}
          />
          <div className="relative bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-white text-center mb-2">Gambling Support Resources</h3>
            <p className="text-gray-400 text-center mb-6">
              If you or someone you know needs help with problem gambling, these organizations can provide support.
            </p>

            <div className="space-y-4">
              {/* USA */}
              <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🇺🇸</span>
                  <span className="text-white font-medium">United States</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">National Council on Problem Gambling</span>
                    <a href="tel:1-800-522-4700" className="text-green-400 hover:text-green-300">1-800-522-4700</a>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">Gamblers Anonymous</span>
                    <a href="https://www.gamblersanonymous.org" target="_blank" className="text-green-400 hover:text-green-300">Website →</a>
                  </li>
                </ul>
              </div>

              {/* UK */}
              <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🇬🇧</span>
                  <span className="text-white font-medium">United Kingdom</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">GamCare</span>
                    <a href="tel:0808-8020-133" className="text-green-400 hover:text-green-300">0808 8020 133</a>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">BeGambleAware</span>
                    <a href="https://www.begambleaware.org" target="_blank" className="text-green-400 hover:text-green-300">Website →</a>
                  </li>
                </ul>
              </div>

              {/* Canada */}
              <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🇨🇦</span>
                  <span className="text-white font-medium">Canada</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">Problem Gambling Helpline</span>
                    <a href="tel:1-866-531-2600" className="text-green-400 hover:text-green-300">1-866-531-2600</a>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">Responsible Gambling Council</span>
                    <a href="https://www.responsiblegambling.org" target="_blank" className="text-green-400 hover:text-green-300">Website →</a>
                  </li>
                </ul>
              </div>

              {/* Australia */}
              <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🇦🇺</span>
                  <span className="text-white font-medium">Australia</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-gray-300">Gambling Help Online</span>
                    <a href="tel:1800-858-858" className="text-green-400 hover:text-green-300">1800 858 858</a>
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowResourcesModal(false)}
              className="w-full mt-6 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reset Preferences Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showResetPreferencesDialog}
        onClose={() => setShowResetPreferencesDialog(false)}
        onConfirm={handleResetPreferences}
        title="Reset Preferences"
        message="Are you sure you want to reset all display preferences to their default values? This will reset your odds format, timezone, and theme settings."
        confirmText="Reset to Defaults"
        cancelText="Cancel"
        variant="warning"
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
                {/* Current Password */}
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

                {/* New Password */}
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

                {/* Confirm New Password */}
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

                {/* Password Requirements */}
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

                {/* Error Message */}
                {changePasswordError && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm" data-testid="password-error">
                    {changePasswordError}
                  </div>
                )}

                {/* Actions */}
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

            {/* QR Code */}
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

            {/* Manual Entry Option */}
            <div className="mb-6 p-3 bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Or enter this code manually:</p>
              <code className="text-sm text-green-400 font-mono break-all" data-testid="2fa-secret">
                {twoFactorSetup.secret}
              </code>
            </div>

            {/* Verification Code Input */}
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

            {/* Actions */}
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

            {/* Warning */}
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <p className="text-yellow-400 text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Each backup code can only be used once. Store them securely!</span>
              </p>
            </div>

            {/* Backup Codes Grid */}
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

            {/* Copy Button */}
            <button
              onClick={handleCopyBackupCodes}
              className="w-full mb-3 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy All Codes
            </button>

            {/* Done Button */}
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

            {/* Verification Code Input */}
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

            {/* Actions */}
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
    </Layout>
  );
}
