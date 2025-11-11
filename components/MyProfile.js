import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../app/firebase';

const MyProfile = () => {
  const { currentUser, updateStudentProfile, upsertStudentProfile, deleteStudentProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [profileDocId, setProfileDocId] = useState('');
  const [student, setStudent] = useState({
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
  const [preferredDepartmentsCSV, setPreferredDepartmentsCSV] = useState('');
  const [consultationTypesCSV, setConsultationTypesCSV] = useState('');

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
          const updated = {
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
          setPreferredDepartmentsCSV((updated.preferences.preferredDepartments || []).join(', '));
          setConsultationTypesCSV((updated.preferences.consultationTypes || []).join(', '));
        }
        setLoading(false);
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const handleAcademicChange = (e) => {
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
        academicInfo: student.academicInfo,
        preferences: {
          ...student.preferences,
          preferredDepartments: preferDepts,
          consultationTypes: consultTypes,
        },
      });

      setSuccess('Profile updated successfully.');
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleUpsert = async () => {
    try {
      if (!currentUser) return;
      setSaving(true);
      setError('');
      setSuccess('');

      const preferDepts = preferredDepartmentsCSV.split(',').map(s => s.trim()).filter(Boolean);
      const consultTypes = consultationTypesCSV.split(',').map(s => s.trim()).filter(Boolean);

      await upsertStudentProfile(
        currentUser.uid,
        {
          academicInfo: student.academicInfo,
          preferences: {
            ...student.preferences,
            preferredDepartments: preferDepts,
            consultationTypes: consultTypes,
          },
        },
        true // merge
      );

      setSuccess('Profile saved (create or update) successfully.');
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (!currentUser) return;
      const confirmed = window.confirm('Delete your student profile? This cannot be undone.');
      if (!confirmed) return;
      setSaving(true);
      setError('');
      setSuccess('');

      await deleteStudentProfile(currentUser.uid);

      // Reset editable sections to defaults but keep personal info
      setStudent(prev => ({
        ...prev,
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
      }));
      setPreferredDepartmentsCSV('');
      setConsultationTypesCSV('');
      setSuccess('Student profile deleted.');
    } catch (e) {
      setError(e.message || 'Failed to delete');
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
          {/* Cover + Avatar */}
          <div className="profile-header-card">
            <div className="profile-cover">
              <img
                src={`https://picsum.photos/1200/400?blur=2`}
                alt="Cover"
                className="cover-image"
              />
            </div>

            {/* Grid-based header: left = avatar, right = info + actions on larger screens; stacked on mobile */}
            <div className="profile-header-grid">
              <div className="profile-avatar-cell">
                <div className="profile-avatar-wrapper">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(student.personal.name)}&background=1877f2&color=fff&size=128&rounded=true`}
                    alt="Avatar"
                    className="profile-avatar"
                  />
                </div>
              </div>

              <div className="profile-info-cell">
                <div className="profile-content">
                  <div className="profile-header-content">
                    <div className="profile-info">
                      <h1 className="profile-name">{student.personal.name}</h1>
                      <p className="profile-details">{student.personal.email}  {student.personal.code}</p>
                    </div>
                    <div className="profile-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={handleUpsert}
                        disabled={saving}
                        title="Create or merge your profile"
                      >
                        {saving ? 'Saving' : 'Create/Upsert'}
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? 'Saving' : 'Save changes'}
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={handleDelete}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {success && <p className="message message-success">{success}</p>}
                  {error && <p className="message message-error">{error}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Main content grid */}
          <div className="profile-grid">
            {/* Left column */}
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

            {/* Right column */}
            <div className="profile-main">
              {/* Academic Info */}
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
                        value={student.academicInfo[field]}
                        onChange={handleAcademicChange}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Preferences */}
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
