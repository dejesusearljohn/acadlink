"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, DocumentData } from 'firebase/firestore';
import { ref, push, set } from 'firebase/database';
import { rtdb, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { Appointment, FacultyMember } from '../types';

const StudentAppointments: React.FC = () => {
  const { currentUser } = useAuth();
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [apptError, setApptError] = useState<string>('');
  const [appointments, setAppointments] = useState<(Appointment & { id: string })[]>([]);
  const [loadingAppts, setLoadingAppts] = useState<boolean>(true);

  const [form, setForm] = useState({
    facultyId: '',
    requestedTime: '',
    reason: '',
  });

  const [feedbackMap, setFeedbackMap] = useState<Record<string, { feedback: string; rating: number }>>({});
  const [showFeedbackForm, setShowFeedbackForm] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'directory'));
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as FacultyMember))
          .filter(x => x.role === 'faculty');
        setFaculty(list);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setLoadingAppts(true);
    const q = query(collection(db, 'appointments'), where('studentId', '==', currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment & { id: string }));
      items.sort((a, b) => {
        const ta = (a.createdAt?.toMillis && a.createdAt.toMillis()) || 0;
        const tb = (b.createdAt?.toMillis && b.createdAt.toMillis()) || 0;
        return tb - ta;
      });
      setAppointments(items);
      setLoadingAppts(false);
    }, (err) => {
      setApptError(err.message || 'Failed to load appointments');
      setLoadingAppts(false);
    });
    return () => unsub();
  }, [currentUser]);

  const facultyNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const f of faculty) m[f.id] = f.name || f.email || f.id;
    return m;
  }, [faculty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (!currentUser) return;
      setError('');
      setSuccess('');
      if (!form.facultyId || !form.requestedTime) {
        setError('Please select a faculty and a requested time.');
        return;
      }
      const selectedFaculty = faculty.find(f => f.id === form.facultyId);
      await addDoc(collection(db, 'appointments'), {
        studentId: currentUser.uid,
        studentName: (currentUser.personalInfo && currentUser.personalInfo.name) || currentUser.email || '',
        studentEmail: currentUser.email || '',
        facultyId: form.facultyId,
        facultyName: selectedFaculty?.name || '',
        facultyEmail: selectedFaculty?.email || '',
        status: 'pending',
        requestedTime: new Date(form.requestedTime).toISOString(),
        reason: form.reason || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      try {
        const notifRef = ref(rtdb, `notifications/${form.facultyId}`);
        const newNotifRef = push(notifRef);
        await set(newNotifRef, {
          id: newNotifRef.key,
          type: 'appointment_request',
          to: form.facultyId,
          from: currentUser.uid,
          title: 'New Appointment Request',
          body: `${(currentUser.personalInfo && currentUser.personalInfo.name) || currentUser.email} requested an appointment`,
          createdAt: Date.now(),
          read: false,
        });
      } catch (e) { /* non-blocking */ }

      setSuccess('Appointment requested successfully.');
      setForm({ facultyId: '', requestedTime: '', reason: '' });
    } catch (e: any) {
      setError(e.message || 'Failed to request appointment');
    }
  };

  const cancelAppointment = async (id: string) => {
    try {
      setError('');
      setSuccess('');
      await updateDoc(doc(db, 'appointments', id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      setSuccess('Appointment cancelled.');
    } catch (e: any) {
      setError(e.message || 'Failed to cancel');
    }
  };

  const submitFeedback = async (id: string) => {
    try {
      setError('');
      setSuccess('');
      const data = feedbackMap[id];
      if (!data || !data.feedback || !data.rating) {
        setError('Please provide both feedback and rating.');
        return;
      }
      await updateDoc(doc(db, 'appointments', id), {
        studentFeedback: data.feedback,
        studentRating: data.rating,
        feedbackSubmittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSuccess('Feedback submitted successfully.');
      setShowFeedbackForm(prev => ({ ...prev, [id]: false }));
      setFeedbackMap(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    } catch (e: any) {
      setError(e.message || 'Failed to submit feedback');
    }
  };

  return (
    <div className="page-container">
      {(error || success) && (
        <div className="appointments-notifications">
          {error && <div className="notification-toast error">{error}</div>}
          {success && <div className="notification-toast success">{success}</div>}
        </div>
      )}
      
      <div className="appointments-page">
        <div className="appointments-header">
          <h1 className="appointments-title">Student Appointments</h1>
          <p className="text-muted">Request and manage your faculty appointments</p>
        </div>

        <div className="profile-grid">
          <div className="profile-sidebar">
            <div className="info-card">
              <h3 className="card-title">Quick Stats</h3>
              <ul className="stats-list">
                <li><span>Total Appointments:</span> <strong>{appointments.length}</strong></li>
                <li><span>Pending:</span> <strong>{appointments.filter(a => a.status === 'pending').length}</strong></li>
                <li><span>Accepted:</span> <strong>{appointments.filter(a => a.status === 'accepted').length}</strong></li>
                <li><span>Cancelled:</span> <strong>{appointments.filter(a => a.status === 'cancelled').length}</strong></li>
              </ul>
            </div>
          </div>

          <div className="profile-main">
            <div className="form-card">
              <h3 className="section-title">Request New Appointment</h3>
              <form onSubmit={submit}>
                <div className="form-grid">
                  <div className="form-field">
                    <label className="field-label">Select Faculty</label>
                    <select name="facultyId" value={form.facultyId} onChange={handleChange} required className="form-input">
                      <option value="">-- Choose Faculty --</option>
                      {faculty.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.department})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="field-label">Requested Time</label>
                    <input
                      type="datetime-local"
                      name="requestedTime"
                      value={form.requestedTime}
                      onChange={handleChange}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label className="field-label">Reason</label>
                    <textarea
                      name="reason"
                      value={form.reason}
                      onChange={handleChange}
                      rows={3}
                      className="form-input"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary profile-save-btn" style={{ marginTop: '1rem' }}>Request Appointment</button>
              </form>
            </div>

            <div className="form-card">
              <h3 className="section-title">My Appointments</h3>
              {loadingAppts ? (
                <p className="text-muted">Loading appointments...</p>
              ) : apptError ? (
                <p className="text-error">{apptError}</p>
              ) : appointments.length === 0 ? (
                <p className="text-muted">No appointments yet.</p>
              ) : (
                <div className="appointments-list">
                  {appointments.map(apt => (
                    <div key={apt.id} className="appointment-item">
                      <div className="appointment-header">
                        <div className="appointment-code">Appointment #{apt.id.slice(-6).toUpperCase()}</div>
                        <h3 className="appointment-title">{facultyNameMap[apt.facultyId] || apt.facultyId}</h3>
                        <div className="appointment-meta">
                          <div className="appointment-meta-item">
                            <span>📅 {new Date(apt.requestedTime).toLocaleDateString()}</span>
                          </div>
                          <div className="appointment-meta-item">
                            <span>🕒 {new Date(apt.requestedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="appointment-body">
                        <div className="appointment-details">
                          {apt.reason && (
                            <div className="appointment-row">
                              <span className="appointment-label">Reason</span>
                              <span className="appointment-value">{apt.reason}</span>
                            </div>
                          )}
                          <div className="appointment-row">
                            <span className="appointment-label">Status</span>
                            <span className={`appointment-status status-${apt.status}`}>{apt.status}</span>
                          </div>
                          {(apt as any).facultyNotes && (
                            <div className="appointment-row">
                              <span className="appointment-label">Faculty Notes</span>
                              <span className="appointment-value">{(apt as any).facultyNotes}</span>
                            </div>
                          )}
                          {(apt as any).studentFeedback && (
                            <div className="appointment-row">
                              <span className="appointment-label">Your Feedback</span>
                              <span className="appointment-value">{(apt as any).studentFeedback}</span>
                            </div>
                          )}
                          {(apt as any).studentRating && (
                            <div className="appointment-row">
                              <span className="appointment-label">Your Rating</span>
                              <span className="appointment-value">{'⭐'.repeat((apt as any).studentRating)} ({(apt as any).studentRating}/5)</span>
                            </div>
                          )}
                          {(apt as any).videoConferenceLink && (
                            <div className="appointment-row">
                              <span className="appointment-label">Video Conference</span>
                              <a 
                                href={(apt as any).videoConferenceLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="appointment-value"
                                style={{ color: '#0066cc', textDecoration: 'underline', cursor: 'pointer' }}
                              >
                                🎥 Join Meeting
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {apt.status === 'pending' && (
                        <div className="appointment-footer">
                          <span></span>
                          <button onClick={() => cancelAppointment(apt.id)} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                            Cancel
                          </button>
                        </div>
                      )}

                      {apt.status === 'accepted' && !(apt as any).studentFeedback && (
                        <div className="appointment-footer" style={{ flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
                          {!showFeedbackForm[apt.id] ? (
                            <button 
                              onClick={() => setShowFeedbackForm(prev => ({ ...prev, [apt.id]: true }))}
                              className="btn btn-primary" 
                              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', alignSelf: 'flex-end' }}
                            >
                              Leave Feedback & Rating
                            </button>
                          ) : (
                            <div className="feedback-form">
                              <div className="form-field">
                                <label className="field-label">Rating</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setFeedbackMap(prev => ({ 
                                        ...prev, 
                                        [apt.id]: { ...prev[apt.id], feedback: prev[apt.id]?.feedback || '', rating: star } 
                                      }))}
                                      style={{ 
                                        background: 'none', 
                                        border: 'none', 
                                        fontSize: '1.5rem', 
                                        cursor: 'pointer',
                                        filter: (feedbackMap[apt.id]?.rating || 0) >= star ? 'none' : 'grayscale(100%) brightness(2)',
                                        WebkitTextStroke: '0.5px #333',
                                        transition: 'all 0.2s ease'
                                      }}
                                    >
                                      ⭐
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="form-field">
                                <label className="field-label">Feedback</label>
                                <textarea
                                  value={feedbackMap[apt.id]?.feedback || ''}
                                  onChange={(e) => setFeedbackMap(prev => ({ 
                                    ...prev, 
                                    [apt.id]: { ...prev[apt.id], rating: prev[apt.id]?.rating || 0, feedback: e.target.value } 
                                  }))}
                                  rows={3}
                                  className="form-input"
                                  placeholder="Share your experience..."
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={() => setShowFeedbackForm(prev => ({ ...prev, [apt.id]: false }))}
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => submitFeedback(apt.id)}
                                  className="btn btn-primary" 
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                >
                                  Submit Feedback
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAppointments;
