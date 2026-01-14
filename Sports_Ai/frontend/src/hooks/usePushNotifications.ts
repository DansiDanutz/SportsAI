import { useState, useEffect, useCallback } from 'react';

export type NotificationPermissionState = 'default' | 'granted' | 'denied';

interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: {
    url?: string;
    type?: string;
    eventId?: string;
  };
}

interface UsePushNotificationsResult {
  permission: NotificationPermissionState;
  isSupported: boolean;
  requestPermission: () => Promise<NotificationPermissionState>;
  sendNotification: (options: PushNotificationOptions) => void;
  simulatePushNotification: () => void;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // Check initial permission state
  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission as NotificationPermissionState);
    }
  }, [isSupported]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (!isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      return result as NotificationPermissionState;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  // Send a notification
  const sendNotification = useCallback((options: PushNotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Cannot send notification: permission not granted');
      return;
    }

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.svg',
      tag: options.tag,
      data: options.data,
    });

    // Handle notification click
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();

      // Navigate to the specified URL if provided
      const data = options.data;
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.eventId) {
        window.location.href = `/event/${data.eventId}`;
      }

      notification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }, [isSupported, permission]);

  // Simulate receiving a push notification (for testing)
  const simulatePushNotification = useCallback(() => {
    // Intentionally disabled: the app must not fabricate notifications.
    // Notifications should come from the backend (/v1/notifications) when connected.
    console.warn('simulatePushNotification is disabled (no fabricated notifications).');
  }, []);

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    simulatePushNotification,
  };
}

export default usePushNotifications;
