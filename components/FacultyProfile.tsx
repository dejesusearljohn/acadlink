"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc as setFirestoreDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface FacultyAcademicInfo {
  employeeId: string;
  title: string;
  department: string;
  office: string;
  expertise: string[];
  education: string[];
  publications: number;
  yearsExperience: number;
}

interface ConsultationSettings {
  defaultDuration: number;
  maxDailyAppointments: number;
  bufferTime: number;
  advanceBookingDays: number;
  consultationTypes: string[];
}

interface Availability {
  weeklySchedule: Record<string, any>;
  timeZone: string;
}

interface FacultyState {
  academicInfo: FacultyAcademicInfo;
  consultationSettings: ConsultationSettings;
  availability: Availability;
  personal: {
    name: string;
    email: string;
    code: string;
  };
}

const FacultyProfile: React.FC = () => {
  const { currentUser, updateFacultyProfile } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>('');
  const [error, setError] = useState<string>('');

  const [faculty, setFaculty] = useState<FacultyState>({
    academicInfo: {
      employeeId: '',
      title: '',
      department: '',
      office: '',
      expertise: [],
      education: [],
      publications: 0,
      yearsExperience: 0,
    },
    consultationSettings: {
      defaultDuration: 30,
      maxDailyAppointments: 5,
      bufferTime: 10,
      advanceBookingDays: 7,
      consultationTypes: ['virtual'],
    },
    availability: {
      weeklySchedule: {},
      timeZone: 'Asia/Manila',
    },
    personal: {
      name: '',
      email: '',
      code: '',
    }
  });

  const isFaculty = (currentUser?.profile?.type || currentUser?.type) === 'faculty';
  const [expertiseCSV, setExpertiseCSV] = useState<string>('');
  const [educationCSV, setEducationCSV] = useState<string>('');
  const [consultTypesCSV, setConsultTypesCSV] = useState<string>('');

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

        if (isFaculty) {
          const profSnap = await getDoc(doc(db, `users/${uid}/facultyProfile/${docId}`));
          const profileData = profSnap.exists() ? profSnap.data() : {};
          const updated: FacultyState = {
            ...faculty,
            academicInfo: { ...faculty.academicInfo, ...(profileData.academicInfo || {}) },
            consultationSettings: { ...faculty.consultationSettings, ...(profileData.consultationSettings || {}) },
            availability: { ...faculty.availability, ...(profileData.availability || {}) },
            personal: {
              name: userData.personalInfo?.name || '',
              email: userData.personalInfo?.email || '',
              code: userData.code || '',
            }
          };
          setFaculty(updated);
          setExpertiseCSV((updated.academicInfo.expertise || []).join(', '));
          setEducationCSV((updated.academicInfo.education || []).join(', '));
          setConsultTypesCSV((updated.consultationSettings.consultationTypes || []).join(', '));
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
    setFaculty(prev => ({
      ...prev,
      academicInfo: { ...prev.academicInfo, [name]: value }
    }));
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFaculty(prev => ({
      ...prev,
      consultationSettings: { ...prev.consultationSettings, [name]: value }
    }));
  };

  const handleSave = async () => {
    try {
      if (!currentUser) return;
      setSaving(true);
      setError('');
      setSuccess('');

      const expertise = expertiseCSV.split(',').map(s => s.trim()).filter(Boolean);
      const education = educationCSV.split(',').map(s => s.trim()).filter(Boolean);
      const consultationTypes = consultTypesCSV.split(',').map(s => s.trim()).filter(Boolean);

      await updateFacultyProfile(currentUser.uid, {
        academicInfo: { ...faculty.academicInfo, expertise, education },
        consultationSettings: { ...faculty.consultationSettings, consultationTypes } as any,
      });

      try {
        await setFirestoreDoc(doc(db, 'directory', currentUser.uid), {
          uid: currentUser.uid,
          name: faculty.personal.name,
          email: faculty.personal.email,
          role: 'faculty',
          title: faculty.academicInfo.title || '',
          department: faculty.academicInfo.department || '',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn('Directory sync failed:', e);
      }

      setSuccess('Profile updated successfully.');
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!isFaculty) {
    return (
      <div className="main-content">
        <div className="container">
          <h2 className="page-title">My Profile</h2>
          <p className="text-muted">Student profile editing is available on student accounts.</p>
        </div>
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
                src={`https://picsum.photos/1200/300?blur=2&random=${faculty.personal.code}`}
                alt="Cover"
                className="profile-cover-image"
              />
            </div>
            
            <div className="profile-header-content-wrapper">
              <div className="profile-avatar-container">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(faculty.personal.name)}&background=3A7DCE&color=fff&size=160&rounded=true`}
                  alt="Profile Avatar"
                  className="profile-avatar-img"
                />
              </div>
              
              <div className="profile-header-info">
                <div className="profile-identity-block">
                  <h1 className="profile-name">{faculty.personal.name}</h1>
                  <div className="profile-meta-row">
                    <span className="profile-email">{faculty.personal.email}</span>
                    <span className="profile-divider">•</span>
                    <span className="profile-code">{faculty.personal.code}</span>
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
                <p className="text-muted">Faculty profile details and consultation settings.</p>
              </div>
              <div className="info-card">
                <h3 className="card-title">Availability</h3>
                <ul className="stats-list">
                  <li><span>Time Zone:</span> <strong>{faculty.availability.timeZone}</strong></li>
                  <li><span>Weekly Schedule:</span> <strong>{Object.keys(faculty.availability.weeklySchedule || {}).length > 0 ? 'Configured' : 'Not Set'}</strong></li>
                </ul>
              </div>
            </div>

            <div className="profile-main">
              <div className="form-card">
                <h3 className="section-title">Academic Information</h3>
                <div className="form-grid">
                  {['employeeId', 'title', 'department', 'office', 'publications', 'yearsExperience'].map((field) => (
                    <div key={field} className="form-field">
                      <label className="field-label">{field.replace(/([A-Z])/g, ' $1')}</label>
                      <input
                        name={field}
                        type={['publications','yearsExperience'].includes(field) ? 'number' : 'text'}
                        className="form-input"
                        value={faculty.academicInfo[field as keyof FacultyAcademicInfo]}
                        onChange={handleAcademicChange}
                      />
                    </div>
                  ))}
                  <div className="form-field">
                    <label className="field-label">Expertise (comma-separated)</label>
                    <input className="form-input" value={expertiseCSV} onChange={(e) => setExpertiseCSV(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Education (comma-separated)</label>
                    <input className="form-input" value={educationCSV} onChange={(e) => setEducationCSV(e.target.value)} />
                  </div>
                </div>

                <div className="preferences-display">
                  <div><strong>Current expertise:</strong> {faculty.academicInfo.expertise?.join(', ') || '—'}</div>
                  <div><strong>Current education:</strong> {faculty.academicInfo.education?.join(', ') || '—'}</div>
                </div>
              </div>

              <div className="form-card">
                <h3 className="section-title">Consultation Settings</h3>
                <div className="form-grid">
                  {[
                    { key: 'defaultDuration', label: 'Default duration (minutes)', type: 'number' },
                    { key: 'maxDailyAppointments', label: 'Max daily appointments', type: 'number' },
                    { key: 'bufferTime', label: 'Buffer time (minutes)', type: 'number' },
                    { key: 'advanceBookingDays', label: 'Advance booking days', type: 'number' },
                  ].map((cfg) => (
                    <div key={cfg.key} className="form-field">
                      <label className="field-label">{cfg.label}</label>
                      <input
                        name={cfg.key}
                        type={cfg.type}
                        className="form-input"
                        value={faculty.consultationSettings[cfg.key as keyof ConsultationSettings]}
                        onChange={handleSettingsChange}
                      />
                    </div>
                  ))}
                  <div className="form-field">
                    <label className="field-label">Consultation Types (comma-separated)</label>
                    <input className="form-input" value={consultTypesCSV} onChange={(e) => setConsultTypesCSV(e.target.value)} />
                  </div>
                </div>

                <div className="preferences-display">
                  <div><strong>Current consultation types:</strong> {faculty.consultationSettings.consultationTypes?.join(', ') || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyProfile;
