"use client";

import React from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import ProfilePage from '../../components/ProfilePage';

export default function ProfilePageRoute() {
  return (
    <ProtectedRoute>
      <main className="app-page">
        <div className="container px-4">
          <ProfilePage />
        </div>
      </main>
    </ProtectedRoute>
  );
}
