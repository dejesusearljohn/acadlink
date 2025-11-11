"use client";

import React from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import StudentAppointments from '../../components/StudentAppointments';

export default function StudentDashboardPage() {
  return (
  <ProtectedRoute requiredRole={"student" as any}>
      <main className="app-page">
        <div className="container px-4">
          <StudentAppointments />
        </div>
      </main>
    </ProtectedRoute>
  );
}
