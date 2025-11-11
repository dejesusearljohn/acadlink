import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc as setFirestoreDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../app/firebase';

const FacultyProfile = () => {
  const { currentUser, updateFacultyProfile, upsertFacultyProfile, deleteFacultyProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [faculty, setFaculty] = useState({
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
  const [expertiseCSV, setExpertiseCSV] = useState('');
  const [educationCSV, setEducationCSV] = useState('');
  const [consultTypesCSV, setConsultTypesCSV] = useState('');

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
          const updated = {
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
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    };
    load();
  }, [currentUser]);

  const handleAcademicChange = (e) => {
    const { name, value } = e.target;
    setFaculty(prev => ({
      ...prev,
      academicInfo: { ...prev.academicInfo, [name]: value }
    }));
  };

  const handleSettingsChange = (e) => {
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
        consultationSettings: { ...faculty.consultationSettings, consultationTypes },
      });

      // Mirror changes to directory for student discovery
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
        console.warn('Directory sync failed:', e?.message);
      }

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

      const expertise = expertiseCSV.split(',').map(s => s.trim()).filter(Boolean);
      const education = educationCSV.split(',').map(s => s.trim()).filter(Boolean);
      const consultationTypes = consultTypesCSV.split(',').map(s => s.trim()).filter(Boolean);

      await upsertFacultyProfile(
        currentUser.uid,
        {
          academicInfo: { ...faculty.academicInfo, expertise, education },
          consultationSettings: { ...faculty.consultationSettings, consultationTypes },
          availability: faculty.availability,
        },
        true
      );

      setSuccess('Profile saved (create or update) successfully.');

      // Mirror changes to directory for student discovery
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
        console.warn('Directory sync failed:', e?.message);
      }
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      if (!currentUser) return;
      const confirmed = window.confirm('Delete your faculty profile? This cannot be undone.');
      if (!confirmed) return;
      setSaving(true);
      setError('');
      setSuccess('');

      await deleteFacultyProfile(currentUser.uid);

      setFaculty(prev => ({
        ...prev,
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
      }));
      setExpertiseCSV('');
      setEducationCSV('');
      setConsultTypesCSV('');
      setSuccess('Faculty profile deleted.');
    } catch (e) {
      setError(e.message || 'Failed to delete');
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
    <div className="main-content">
      <div className="container">
        {loading ? (
          <p className="text-muted">Loading profile…</p>
        ) : error ? (
          <p className="text-error">{error}</p>
        ) : (
          <div className="faculty-profile-layout">
            {/* Cover + Header */}
            <div className="faculty-header-card">
              <div className="faculty-cover">
                <img
                  src={`https://picsum.photos/1200/400?blur=2`}
                  alt="Cover"
                  className="faculty-cover-image"
                />
              </div>

              <div className="faculty-header-grid">
                <div className="faculty-avatar">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(faculty.personal.name)}&background=1877f2&color=fff&size=128&rounded=true`}
                    alt="Avatar"
                    className="faculty-avatar-image"
                  />
                </div>

                <div className="faculty-header-content">
                  <div className="faculty-info-section">
                    <div className="faculty-info">
                      <h1 className="faculty-name">{faculty.personal.name}</h1>
                      <p className="faculty-details">{faculty.personal.email}  {faculty.personal.code}</p>
                    </div>
                    <div className="faculty-actions">
                      <button className="btn btn-secondary" onClick={handleUpsert} disabled={saving}>
                        {saving ? 'Saving' : 'Create/Upsert'}
                      </button>
                      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving' : 'Save changes'}
                      </button>
                      <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Delete</button>
                    </div>
                  </div>
                  {success && <p className="message-success">{success}</p>}
                  {error && <p className="message-error">{error}</p>}
                </div>
              </div>
            </div>

            {/* Main content grid */}
            <div className="faculty-content-grid">
              {/* Left column */}
              <div className="faculty-sidebar">
                <div className="info-card">
                  <h3 className="info-card-title">About</h3>
                  <p className="text-muted">Faculty profile details and consultation settings.</p>
                </div>
                <div className="info-card">
                  <h3 className="info-card-title">Availability</h3>
                  <div className="availability-info">
                    <div>Time Zone: {faculty.availability.timeZone}</div>
                    <div>Weekly schedule configured: {Object.keys(faculty.availability.weeklySchedule || {}).length > 0 ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="faculty-main-content">
                {/* Academic Info */}
                <div className="form-card">
                  <h3 className="form-card-title">Academic information</h3>
                  <div className="form-grid">
                    {['employeeId', 'title', 'department', 'office', 'publications', 'yearsExperience'].map((field) => (
                      <div key={field} className="form-group">
                        <label className="form-label">{field.replace(/([A-Z])/g, ' $1')}</label>
                        <input
                          name={field}
                          type={['publications','yearsExperience'].includes(field) ? 'number' : 'text'}
                          className="form-input"
                          value={faculty.academicInfo[field]}
                          onChange={handleAcademicChange}
                        />
                      </div>
                    ))}
                    <div className="form-group">
                      <label className="form-label">Expertise (comma-separated)</label>
                      <input className="form-input" value={expertiseCSV} onChange={(e) => setExpertiseCSV(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Education (comma-separated)</label>
                      <input className="form-input" value={educationCSV} onChange={(e) => setEducationCSV(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Consultation Settings */}
                <div className="form-card">
                  <h3 className="form-card-title">Consultation settings</h3>
                  <div className="form-grid">
                    {[
                      { key: 'defaultDuration', label: 'Default duration (minutes)', type: 'number' },
                      { key: 'maxDailyAppointments', label: 'Max daily appointments', type: 'number' },
                      { key: 'bufferTime', label: 'Buffer time (minutes)', type: 'number' },
                      { key: 'advanceBookingDays', label: 'Advance booking days', type: 'number' },
                    ].map((cfg) => (
                      <div key={cfg.key} className="form-group">
                        <label className="form-label">{cfg.label}</label>
                        <input
                          name={cfg.key}
                          type={cfg.type}
                          className="form-input"
                          value={faculty.consultationSettings[cfg.key]}
                          onChange={handleSettingsChange}
                        />
                      </div>
                    ))}
                    <div className="form-group form-group-full">
                      <label className="form-label">Consultation Types (comma-separated)</label>
                      <input className="form-input" value={consultTypesCSV} onChange={(e) => setConsultTypesCSV(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyProfile;
