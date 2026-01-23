import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { api, profileApi } from '../../../services/api';

interface AccountSettingsProps {
  onEmailChange?: () => void;
  onUpgrade?: () => void;
  onPlanChange?: () => void;
  onCancelSubscription?: () => void;
  cancellationSuccess?: boolean;
  cancellationDetails?: { accessEndsAt: string };
}

export function AccountSettings({
  onEmailChange,
  onUpgrade,
  onPlanChange,
  onCancelSubscription,
  cancellationSuccess,
  cancellationDetails,
}: AccountSettingsProps) {
  const { user, updateUser } = useAuthStore();

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

  // Validate phone number
  const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
    if (!phone) return { valid: true };
    const digitsOnly = phone.replace(/\D/g, '');
    const validCharsRegex = /^[0-9\s\-\(\)\+\.]+$/;
    if (!validCharsRegex.test(phone)) {
      return { valid: false, error: 'Phone number can only contain digits, spaces, dashes, and parentheses' };
    }
    if (digitsOnly.length < 7) {
      return { valid: false, error: 'Phone number must have at least 7 digits' };
    }
    if (digitsOnly.length > 15) {
      return { valid: false, error: 'Phone number cannot exceed 15 digits' };
    }
    return { valid: true };
  };

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
    if (!url) return { valid: true };
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'URL must start with http:// or https://' };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: 'Please enter a valid URL (e.g., https://example.com)' };
    }
  };

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

  // Profile picture validation and upload
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const validateProfilePicture = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { valid: false, error: `Invalid file type. Please select an image file (JPG, PNG, GIF, or WebP).` };
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 5MB.' };
    }
    return { valid: true };
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPictureUploadSuccess(false);
    const validation = validateProfilePicture(file);
    if (!validation.valid) {
      setProfilePictureError(validation.error || 'Invalid file');
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
      if (profilePictureInputRef.current) {
        profilePictureInputRef.current.value = '';
      }
      return;
    }
    setProfilePictureError(null);
    setProfilePictureFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfilePicturePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadProfilePicture = async () => {
    if (!profilePictureFile) return;
    setIsUploadingPicture(true);
    try {
      const response = await profileApi.uploadPicture(profilePictureFile);
      if (response.success && response.profilePictureUrl) {
        if (user) {
          updateUser({ ...user, profilePictureUrl: response.profilePictureUrl });
        }
        setProfilePicturePreview(`http://localhost:4000${response.profilePictureUrl}`);
        setPictureUploadSuccess(true);
        setTimeout(() => setPictureUploadSuccess(false), 3000);
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

  return (
    <div id="account" className="bg-gray-800 rounded-xl border border-gray-700 p-6 scroll-mt-4">
      <h2 className="text-xl font-semibold text-white mb-4">Account</h2>
      <div className="space-y-4">
        {/* Profile Picture */}
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

        {/* Email */}
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
              onClick={onEmailChange}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Change
            </button>
          </div>
        </div>

        {/* Subscription */}
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
                onClick={onUpgrade}
                className="text-green-500 hover:text-green-400 text-sm font-medium"
              >
                Upgrade to Premium
              </button>
            )}
            <button
              onClick={onPlanChange}
              className="text-blue-500 hover:text-blue-400 text-sm font-medium"
              data-testid="change-plan-button"
            >
              Change Plan
            </button>
            {(user?.subscriptionTier === 'premium' || user?.subscriptionTier === 'pro') && !cancellationSuccess && (
              <button
                onClick={onCancelSubscription}
                className="text-red-500 hover:text-red-400 text-sm font-medium"
                data-testid="cancel-subscription-button"
              >
                Cancel Subscription
              </button>
            )}
          </div>
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

        {/* Phone Number */}
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

        {/* Website URL */}
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
  );
}
