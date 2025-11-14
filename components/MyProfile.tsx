"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { StudentProfileData } from '../types';

interface StudentState extends StudentProfileData {
  personal: {
    name: string;
    email: string;
    code: string;
  };
}

const MyProfile: React.FC = () => {
  const { currentUser, updateStudentProfile } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [profileDocId, setProfileDocId] = useState<string>('');
  const [student, setStudent] = useState<StudentState>({
    academicInfo: {
      studentId: '',
      year: '',
      major: '',
      department: '',
      gpa: 0,
      expectedGraduation: '',
    },
    preferences: {
      preferredDepartments: [],
      consultationTypes: [],
      notificationSettings: {},
    },
    statistics: {
      totalAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
    },
    personal: {
      name: '',
      email: '',
      code: '',
    }
  });

  const isStudent = (currentUser?.profile?.type || currentUser?.type) === 'student';
  const [preferredDepartmentsCSV, setPreferredDepartmentsCSV] = useState<string>('');
  const [consultationTypesCSV, setConsultationTypesCSV] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        if (!currentUser) return;
        const uid = currentUser.uid;
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (!userSnap.exists()) {
          setError('User record not found');
          setLoading(false);
          return;
        }
        const userData = userSnap.data();
        const docId = userData.profile?.docId || 'profile01';
        setProfileDocId(docId);

        if (isStudent) {
          const profSnap = await getDoc(doc(db, `users/${uid}/studentProfile/${docId}`));
          const profileData = profSnap.exists() ? profSnap.data() : {};
          const updated: StudentState = {
            ...student,
            academicInfo: { ...student.academicInfo, ...(profileData.academicInfo || {}) },
            preferences: { ...student.preferences, ...(profileData.preferences || {}) },
            statistics: { ...student.statistics, ...(profileData.statistics || {}) },
            personal: {
              name: userData.personalInfo?.name || '',
              email: userData.personalInfo?.email || '',
              code: userData.code || '',
            }
          };
          setStudent(updated);
          setPreferredDepartmentsCSV((updated.preferences?.preferredDepartments || []).join(', '));
          setConsultationTypesCSV((updated.preferences?.consultationTypes || []).join(', '));
        }
        setLoading(false);
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const handleAcademicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStudent(prev => ({
      ...prev,
      academicInfo: { ...prev.academicInfo, [name]: value }
    }));
  };

  const handleSave = async () => {
    try {
      if (!currentUser) return;
      setSaving(true);
      setError('');
      setSuccess('');

      const preferDepts = preferredDepartmentsCSV.split(',').map(s => s.trim()).filter(Boolean);
      const consultTypes = consultationTypesCSV.split(',').map(s => s.trim()).filter(Boolean);

      await updateStudentProfile(currentUser.uid, {
        profileId: profileDocId,
        academicInfo: student.academicInfo,
        preferences: {
          ...student.preferences,
          preferredDepartments: preferDepts,
          consultationTypes: consultTypes,
        },
      });

      setSuccess('Profile updated successfully.');
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isStudent) {
    return (
      <div className="page-container">
        <h2 className="page-title">My Profile</h2>
        <p className="text-muted">Faculty profile editing coming soon.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      {loading ? (
        <p className="text-muted">Loading profile…</p>
      ) : error ? (
        <p className="text-error">{error}</p>
      ) : (
        <div className="profile-layout">
          <div className="profile-header-card">
            <div className="profile-cover-bg">
              <img
                src={`https://picsum.photos/1200/300?blur=2&random=${student.personal.code}`}
                alt="Cover"
                className="profile-cover-image"
              />
            </div>
            
            <div className="profile-header-content-wrapper">
              <div className="profile-avatar-container">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(student.personal.name)}&background=3A7DCE&color=fff&size=160&rounded=true`}
                  alt="Profile Avatar"
                  className="profile-avatar-img"
                />
              </div>
              
              <div className="profile-header-info">
                <div className="profile-identity-block">
                  <h1 className="profile-name">{student.personal.name}</h1>
                  <div className="profile-meta-row">
                    <span className="profile-email">{student.personal.email}</span>
                    <span className="profile-divider">•</span>
                    <span className="profile-code">{student.personal.code}</span>
                  </div>
                </div>
                
                <div className="profile-actions-block">
                  <button
                    className="btn btn-primary profile-save-btn"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>

            {success && <div className="profile-alert profile-alert-success">{success}</div>}
            {error && <div className="profile-alert profile-alert-error">{error}</div>}
          </div>

          <div className="profile-grid">
            <div className="profile-sidebar">
              <div className="info-card">
                <h3 className="card-title">About</h3>
                <p className="text-muted">Student profile details and preferences.</p>
              </div>
              <div className="info-card">
                <h3 className="card-title">Statistics</h3>
                <ul className="stats-list">
                  <li>Total appointments: {student.statistics.totalAppointments}</li>
                  <li>Completed: {student.statistics.completedAppointments}</li>
                  <li>Cancelled: {student.statistics.cancelledAppointments}</li>
                </ul>
              </div>
            </div>

            <div className="profile-main">
              <div className="form-card">
                <h3 className="section-title">Academic information</h3>
                <div className="form-grid">
                  {['studentId', 'year', 'major', 'department', 'gpa', 'expectedGraduation'].map((field) => (
                    <div key={field} className="form-field">
                      <label className="field-label">{field.replace(/([A-Z])/g, ' $1')}</label>
                      <input
                        name={field}
                        type={field === 'gpa' ? 'number' : 'text'}
                        step={field === 'gpa' ? '0.01' : undefined}
                        className="form-input"
                        value={student.academicInfo[field as keyof typeof student.academicInfo]}
                        onChange={handleAcademicChange}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-card">
                <h3 className="section-title">Preferences</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label className="field-label">Preferred Departments (comma-separated)</label>
                    <input
                      className="form-input"
                      value={preferredDepartmentsCSV}
                      onChange={(e) => setPreferredDepartmentsCSV(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Consultation Types (comma-separated)</label>
                    <input
                      className="form-input"
                      value={consultationTypesCSV}
                      onChange={(e) => setConsultationTypesCSV(e.target.value)}
                    />
                  </div>
                </div>

                <div className="preferences-display">
                  <div><strong>Current departments:</strong> {student.preferences.preferredDepartments?.join(', ') || '—'}</div>
                  <div><strong>Current consultation types:</strong> {student.preferences.consultationTypes?.join(', ') || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
