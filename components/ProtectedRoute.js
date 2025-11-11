"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null, requireEmailVerification = false }) => {
  const { currentUser } = useAuth();
  const router = useRouter();

  const isAuthenticated = () => !!currentUser;
  const isStudent = () => (currentUser?.profile?.type || currentUser?.type) === 'student';
  const isFaculty = () => (currentUser?.profile?.type || currentUser?.type) === 'faculty';

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/');
      return;
    }
    if (requiredRole) {
      if (requiredRole === 'student' && !isStudent()) {
        router.replace('/');
      }
      if (requiredRole === 'faculty' && !isFaculty()) {
        router.replace('/');
      }
    }
  }, [currentUser, requiredRole]);

  if (!isAuthenticated()) return null;

  if (requireEmailVerification && !currentUser?.emailVerified && currentUser?.metadata?.emailVerified !== true) {
    return (
      <div className="email-verification-notice">
        <h3 className="verification-title">Email Verification Required</h3>
        <p className="verification-message">Please verify your email address to access this feature.</p>
        <p className="verification-instructions">Check your email for a verification link.</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
