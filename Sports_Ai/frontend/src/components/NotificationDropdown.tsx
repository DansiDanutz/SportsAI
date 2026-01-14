import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: string;
  url?: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export function NotificationDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/v1/notifications?limit=10');
      const notifs: Notification[] = response.data?.notifications || [];
      setNotifications(notifs);
      setUnreadCount(typeof response.data?.unreadCount === 'number' ? response.data.unreadCount : notifs.filter(n => !n.isRead).length);
    } catch (error) {
      // If notifications are not implemented in the backend yet, show nothing (no fabricated items).
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/v1/notifications/unread-count');
      if (response.data?.unreadCount !== undefined) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      // Keep existing unread count
    }
  }, []);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    // Update local state (API call is optional/best-effort)
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Try API call but don't block on it
    try {
      await api.post(`/v1/notifications/${id}/read`);
    } catch (error) {
      // Silently ignore API errors - local state is already updated
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    // Navigate to the notification's URL if available
    if (notification.url) {
      setIsOpen(false);
      navigate(notification.url);
    }
  };

  const handleMarkAllAsRead = async () => {
    // Update local state first
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);

    // Try API call but don't block on it
    try {
      await api.post('/v1/notifications/mark-all-read');
    } catch (error) {
      // Silently ignore API errors
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering notification click

    // Update local state first
    const notification = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notification && !notification.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Try API call but don't block on it
    try {
      await api.delete(`/v1/notifications/${id}`);
    } catch (error) {
      // Silently ignore API errors
    }
  };

  const handleClearAllNotifications = async () => {
    // Update local state first
    setNotifications([]);
    setUnreadCount(0);

    // Try API call but don't block on it
    try {
      await api.delete('/v1/notifications');
    } catch (error) {
      // Silently ignore API errors
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'arbitrage':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'odds_movement':
        return (
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4" />
          </svg>
        );
      case 'system':
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'promotion':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef} data-testid="notification-dropdown">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        data-testid="notification-bell"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
            data-testid="unread-count-badge"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden"
          data-testid="notification-panel"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-green-400 hover:text-green-300 transition-colors"
                data-testid="mark-all-read-button"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto" data-testid="notification-list">
            {isLoading ? (
              <div className="p-4 text-center text-gray-400">
                <svg className="animate-spin w-6 h-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  data-testid={`notification-item-${notification.id}`}
                  className={`px-4 py-3 border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50 transition-colors cursor-pointer ${
                    !notification.isRead ? 'bg-gray-700/30' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm">{notification.title}</span>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
                      <span className="text-xs text-gray-500 mt-1 block">
                        {getTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteNotification(notification.id, e)}
                      className="flex-shrink-0 p-1 text-gray-500 hover:text-red-400 hover:bg-gray-600/50 rounded transition-colors"
                      aria-label="Delete notification"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
              <button
                onClick={handleClearAllNotifications}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-green-400 hover:text-green-300 transition-colors"
              >
                View all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
