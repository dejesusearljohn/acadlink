"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { GraduationCap, User, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ref, onValue, off } from 'firebase/database';
import { rtdb } from '../lib/firebase';

const Navigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const [notifCount, setNotifCount] = useState<number>(0);

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
      return; 
    }
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

  return (
    <nav className="navbar" role="navigation">
      <div className="nav-container">
        <div className="nav-row">
          <Link
            href={isAuthenticated() ? (isFaculty() ? '/faculty-dashboard' : '/student-dashboard') : '/'}
            className="nav-brand"
          >
            <GraduationCap className="nav-icon" />
            ProfLink
          </Link>

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
                  <LogOut className="nav-icon-small" />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={`nav-link ${isActive('/login') ? 'nav-link-active' : ''}`}>
                  Login
                </Link>
                <Link href="/register" className="nav-link nav-cta">
                  Create Account  
                </Link>
              </>
            )}
          </div>

          <div className="nav-mobile-controls">
            {isAuthenticated() ? (
              <>
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
                  <LogOut className="nav-icon-small" />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={`nav-link ${isActive('/login') ? 'nav-link-active' : ''}`}>
                  Login
                </Link>
                <Link href="/create-account" className="nav-link nav-cta">
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
