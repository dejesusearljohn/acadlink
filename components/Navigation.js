"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GraduationCap, User, LogOut, Bell, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ref, onValue, off } from 'firebase/database';
import { fs as rtdb } from '../app/firebase';

const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const [notifCount, setNotifCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAuthenticated = () => !!currentUser;
  const isStudent = () => (currentUser?.profile?.type || currentUser?.type) === 'student';
  const isFaculty = () => (currentUser?.profile?.type || currentUser?.type) === 'faculty';
  const isActive = (path) => pathname === path;

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
    if (!currentUser) { setNotifCount(0); return; }
    const uid = currentUser.uid;
    const notifRef = ref(rtdb, `notifications/${uid}`);
    const handler = onValue(notifRef, (snap) => {
      const data = snap.val() || {};
      const count = Object.keys(data).length;
      setNotifCount(count);
    }, (err) => {
      console.warn('RTDB notifications error:', err?.message);
    });
    return () => off(notifRef, 'value', handler);
  }, [currentUser]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

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

  return (
    <>
      <nav className="navbar" role="navigation">
        <div className="nav-container">
          <div className="nav-row">
            <Link
              href={isAuthenticated() ? (isFaculty() ? '/faculty-dashboard' : '/student-dashboard') : '/'}
              className="nav-brand"
            >
              <GraduationCap className="nav-icon" />
              <span className="nav-brand-text">ProfLink</span>
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
                    <button className="nav-link" title="Notifications" type="button">
                      <Bell className="nav-icon-small" />
                    </button>
                    {notifCount > 0 && (
                      <span className="notification-badge">
                        {notifCount}
                      </span>
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
                <GraduationCap className="nav-icon" />
                <span className="nav-brand-text">ProfLink</span>
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
                    <button className="nav-link" title="Notifications" type="button">
                      <Bell className="nav-icon-small" /> Notifications
                    </button>
                    {notifCount > 0 && (
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

