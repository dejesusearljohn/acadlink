"use client";

import React from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import FacultyAppointments from '../../components/FacultyAppointments';

export default function FacultyDashboardPage() {
  return (
    <ProtectedRoute requiredRole={"faculty" as any}>
      <main className="app-page">
        <div className="container px-4">
          <FacultyAppointments />
        </div>
      </main>
    </ProtectedRoute>
  );
}
