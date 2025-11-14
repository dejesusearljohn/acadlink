"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { User, LogOut, Bell, Menu, X } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { ref, onValue, off, remove } from 'firebase/database';
import { rtdb } from '../lib/firebase';

const Navigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const [notifCount, setNotifCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState<boolean>(false);
  const [hasUnread, setHasUnread] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const isAuthenticated = () => !!currentUser;
  const isStudent = () => (currentUser?.profile?.type || currentUser?.type) === 'student';
  const isFaculty = () => (currentUser?.profile?.type || currentUser?.type) === 'faculty';
  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      router.replace('/');
    }
  };

  useEffect(() => {
    if (!currentUser) { 
      setNotifCount(0);
      setNotifications([]);
      setHasUnread(false);
      return; 
    }
    const uid = currentUser.uid;
    const notifRef = ref(rtdb, `notifications/${uid}`);
    const handler = onValue(notifRef, (snap) => {
      const data = snap.val() || {};
      const notifArray = Object.entries(data).map(([key, value]: [string, any]) => ({
        id: key,
        ...value,
      })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setNotifications(notifArray);
      setNotifCount(notifArray.length);
      setHasUnread(notifArray.length > 0);
    }, (err) => {
      console.warn('RTDB notifications error:', err?.message);
    });
    return () => off(notifRef, 'value', handler);
  }, [currentUser]);

  // Close notification panel on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (notifPanelOpen) setNotifPanelOpen(false);
        if (sidebarOpen) setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen, notifPanelOpen]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Close sidebar on desktop breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  const closeSidebar = () => setSidebarOpen(false);

  const formatNotificationTime = (timestamp: number) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const removeNotification = async (notificationId: string) => {
    if (!currentUser) return;
    try {
      const notifRef = ref(rtdb, `notifications/${currentUser.uid}/${notificationId}`);
      await remove(notifRef);
      console.log('Notification removed:', notificationId);
    } catch (error) {
      console.error('Failed to remove notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!currentUser) return;
    try {
      const notifRef = ref(rtdb, `notifications/${currentUser.uid}`);
      await remove(notifRef);
      setHasUnread(false);
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const handleBellClick = () => {
    setNotifPanelOpen(!notifPanelOpen);
    if (!notifPanelOpen) {
      // Mark as read when opening panel
      setHasUnread(false);
    }
  };

  return (
    <>
      <nav className="navbar" role="navigation">
        <div className="nav-container">
          <div className="nav-row">
            <Link
              href={isAuthenticated() ? (isFaculty() ? '/faculty-dashboard' : '/student-dashboard') : '/'}
              className="nav-brand"
            >
              <Image 
                src="/AcadLinkLogo.png" 
                alt="AcadLink" 
                width={150} 
                height={100} 
                className="nav-logo nav-logo-desktop" 
                priority
              />
              <Image 
                src="/AcadLinkSmallLogo.png" 
                alt="AcadLink" 
                width={40} 
                height={40} 
                className="nav-logo nav-logo-mobile" 
                priority
              />
            </Link>

            {/* Desktop navigation */}
            <div className="nav-desktop-links">
              {isAuthenticated() ? (
                <>
                  {isStudent() && (
                    <Link href="/student-dashboard" className={`nav-link ${isActive('/student-dashboard') ? 'nav-link-active' : ''}`}>
                      Appointments
                    </Link>
                  )}
                  {isFaculty() && (
                    <Link href="/faculty-dashboard" className={`nav-link ${isActive('/faculty-dashboard') ? 'nav-link-active' : ''}`}>
                      Appointments
                    </Link>
                  )}
                  <div className="nav-notification-wrapper">
                    <button 
                      className="nav-link" 
                      title="Notifications" 
                      type="button"
                      onClick={handleBellClick}
                    >
                      <Bell className="nav-icon-small" />
                    </button>
                    {hasUnread && notifCount > 0 && (
                      <span className="notification-badge">
                        {notifCount}
                      </span>
                    )}
                    
                    {/* Notification Panel */}
                    {notifPanelOpen && (
                      <div className="notification-panel">
                        <div className="notification-header">
                          <h3>Notifications</h3>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {notifications.length > 0 && (
                              <button 
                                onClick={clearAllNotifications} 
                                className="clear-all-btn"
                                title="Clear all"
                              >
                                Clear all
                              </button>
                            )}
                            <button onClick={() => setNotifPanelOpen(false)} className="close-panel-btn">
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="notification-list">
                          {notifications.length === 0 ? (
                            <div className="no-notifications">
                              <Bell size={32} style={{ opacity: 0.3 }} />
                              <p>No notifications</p>
                            </div>
                          ) : (
                            notifications.map((notif) => (
                              <div key={notif.id} className="notification-item">
                                <div className="notification-content">
                                  <p className="notification-message">{notif.message || notif.title || 'Notification'}</p>
                                  {notif.body && <p className="notification-body">{notif.body}</p>}
                                  <span className="notification-time">{formatNotificationTime(notif.timestamp)}</span>
                                </div>
                                <button
                                  onClick={() => removeNotification(notif.id)}
                                  className="remove-notification-btn"
                                  title="Dismiss"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <Link href="/profile" className={`nav-link ${isActive('/profile') ? 'nav-link-active' : ''}`}>
                    <User className="nav-icon-small" /> My Profile
                  </Link>
                  <button onClick={handleLogout} className="nav-link nav-button" title="Logout">
                    <LogOut className="nav-icon-small" /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className={`nav-link ${isActive('/login') ? 'nav-link-active' : ''}`}>
                    Login
                  </Link>
                  <Link href="/register" className="nav-link nav-cta">
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger button */}
            <button
              className="nav-hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
            >
              <Menu className="nav-icon-small" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="mobile-sidebar-overlay" onClick={closeSidebar} role="presentation">
          <div 
            className="mobile-sidebar" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="mobile-sidebar-header">
              <Link
                href={isAuthenticated() ? (isFaculty() ? '/faculty-dashboard' : '/student-dashboard') : '/'}
                className="nav-brand"
                onClick={closeSidebar}
              >
                <Image 
                  src="/AcadLinkSmallLogo.png" 
                  alt="AcadLink" 
                  width={32} 
                  height={32} 
                  className="nav-logo" 
                />
              </Link>
              <button
                className="mobile-sidebar-close"
                onClick={closeSidebar}
                aria-label="Close menu"
              >
                <X className="nav-icon-small" />
              </button>
            </div>

            <div className="mobile-sidebar-content">
              {isAuthenticated() ? (
                <>
                  {isStudent() && (
                    <Link 
                      href="/student-dashboard" 
                      className={`mobile-sidebar-link ${isActive('/student-dashboard') ? 'mobile-sidebar-link-active' : ''}`}
                      onClick={closeSidebar}
                    >
                      Appointments
                    </Link>
                  )}
                  {isFaculty() && (
                    <Link 
                      href="/faculty-dashboard" 
                      className={`mobile-sidebar-link ${isActive('/faculty-dashboard') ? 'mobile-sidebar-link-active' : ''}`}
                      onClick={closeSidebar}
                    >
                      Appointments
                    </Link>
                  )}
                  <div className="mobile-sidebar-divider"></div>
                  <Link 
                    href="/profile" 
                    className={`mobile-sidebar-link ${isActive('/profile') ? 'mobile-sidebar-link-active' : ''}`}
                    onClick={closeSidebar}
                  >
                    <User className="nav-icon-small" /> My Profile
                  </Link>
                  <div className="nav-notification-wrapper mobile-sidebar-link">
                    <button 
                      className="nav-link" 
                      title="Notifications" 
                      type="button"
                      onClick={handleBellClick}
                    >
                      <Bell className="nav-icon-small" /> Notifications
                    </button>
                    {hasUnread && notifCount > 0 && (
                      <span className="notification-badge">
                        {notifCount}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => { handleLogout(); closeSidebar(); }} 
                    className="mobile-sidebar-link mobile-sidebar-logout"
                  >
                    <LogOut className="nav-icon-small" /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className={`mobile-sidebar-link ${isActive('/login') ? 'mobile-sidebar-link-active' : ''}`}
                    onClick={closeSidebar}
                  >
                    Login
                  </Link>
                  <Link 
                    href="/register" 
                    className="mobile-sidebar-link mobile-sidebar-cta"
                    onClick={closeSidebar}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
