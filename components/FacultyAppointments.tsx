"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, where, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, push, set } from 'firebase/database';
import { rtdb, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { Appointment } from '../types';

type StatusFilter = 'all' | 'pending' | 'accepted' | 'declined' | 'rescheduled' | 'cancelled';

// Generate unique video conference link
const generateMeetLink = (appointmentId: string): string => {
  const roomName = `ProfLink-${appointmentId.slice(-8)}`;
  return `https://meet.jit.si/${roomName}`;
};

const FacultyAppointments: React.FC = () => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<(Appointment & { id: string })[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [rescheduleMap, setRescheduleMap] = useState<Record<string, string>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [showNotesForm, setShowNotesForm] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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
    if (!currentUser) return;
    setLoading(true);
    const qy = query(collection(db, 'appointments'), where('facultyId', '==', currentUser.uid));
    const unsub = onSnapshot(qy, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment & { id: string }));
      list.sort((a, b) => {
        const ta = (a.createdAt?.toMillis && a.createdAt.toMillis()) || 0;
        const tb = (b.createdAt?.toMillis && b.createdAt.toMillis()) || 0;
        return tb - ta;
      });
      setItems(list);
      setLoading(false);
    }, (e) => {
      setError(e.message || 'Failed to load');
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = { 
      all: items.length, 
      pending: 0, 
      accepted: 0, 
      declined: 0, 
      rescheduled: 0, 
      cancelled: 0 
    };
    for (const it of items) {
      if (base[it.status as StatusFilter] !== undefined) base[it.status as StatusFilter] += 1;
    }
    return base;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return items;
    return items.filter(i => i.status === statusFilter);
  }, [items, statusFilter]);

  const setStatus = async (id: string, status: string) => {
    try {
      setError(''); 
      setSuccess('');
      
      const updateData: any = {
        status,
        updatedAt: serverTimestamp(),
      };
      
      // Generate video conference link when accepting
      if (status === 'accepted') {
        updateData.videoConferenceLink = generateMeetLink(id);
      }
      
      await updateDoc(doc(db, 'appointments', id), updateData);
      setSuccess(`Appointment ${status}.`);
      
      try {
        const appt = items.find(x => x.id === id);
        if (appt) {
          const to = appt.studentId;
          const notifRef = ref(rtdb, `notifications/${to}`);
          const newNotifRef = push(notifRef);
          await set(newNotifRef, {
            id: newNotifRef.key,
            type: `appointment_${status}`,
            to,
            from: currentUser?.uid,
            title: `Appointment ${status}`,
            body: `Your appointment request was ${status}.`,
            appointmentId: id,
            createdAt: Date.now(),
            read: false,
          });
        }
      } catch (e) { /* non-blocking */ }
    } catch (e: any) {
      setError(e.message || 'Failed to update');
    }
  };

  const reschedule = async (id: string) => {
    try {
      setError(''); 
      setSuccess('');
      const newTime = rescheduleMap[id];
      if (!newTime) { 
        setError('Pick a new time first.'); 
        return; 
      }
      await updateDoc(doc(db, 'appointments', id), {
        status: 'rescheduled',
        rescheduleTime: new Date(newTime).toISOString(),
        updatedAt: serverTimestamp(),
      });
      setSuccess('Appointment rescheduled.');
      
      try {
        const appt = items.find(x => x.id === id);
        if (appt) {
          const to = appt.studentId;
          const notifRef = ref(rtdb, `notifications/${to}`);
          const newNotifRef = push(notifRef);
          await set(newNotifRef, {
            id: newNotifRef.key,
            type: 'appointment_rescheduled',
            to,
            from: currentUser?.uid,
            title: 'Appointment Rescheduled',
            body: `Your appointment has been rescheduled to ${new Date(newTime).toLocaleString()}`,
            appointmentId: id,
            createdAt: Date.now(),
            read: false,
          });
        }
      } catch (e) { /* non-blocking */ }
    } catch (e: any) {
      setError(e.message || 'Failed to reschedule');
    }
  };

  const submitNotes = async (id: string) => {
    try {
      setError('');
      setSuccess('');
      const notes = notesMap[id];
      if (!notes || notes.trim() === '') {
        setError('Please enter notes.');
        return;
      }
      await updateDoc(doc(db, 'appointments', id), {
        facultyNotes: notes,
        notesUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSuccess('Notes saved successfully.');
      setShowNotesForm(prev => ({ ...prev, [id]: false }));
      setNotesMap(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      
      try {
        const appt = items.find(x => x.id === id);
        if (appt) {
          const to = appt.studentId;
          const notifRef = ref(rtdb, `notifications/${to}`);
          const newNotifRef = push(notifRef);
          await set(newNotifRef, {
            id: newNotifRef.key,
            type: 'faculty_notes',
            to,
            from: currentUser?.uid,
            title: 'Faculty Notes Added',
            body: `${appt.facultyName} added notes to your appointment.`,
            appointmentId: id,
            createdAt: Date.now(),
            read: false,
          });
        }
      } catch (e) { /* non-blocking */ }
    } catch (e: any) {
      setError(e.message || 'Failed to save notes');
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
          <div className="header-content">
            <div>
              <h1 className="appointments-title">Faculty Appointments</h1>
              <p className="text-muted">Manage student appointment requests</p>
            </div>
            <div className="filter-tabs">
              <button onClick={() => setStatusFilter('all')} className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}>
                All ({counts.all})
              </button>
              <button onClick={() => setStatusFilter('pending')} className={`filter-tab ${statusFilter === 'pending' ? 'active' : ''}`}>
                Pending ({counts.pending})
              </button>
              <button onClick={() => setStatusFilter('accepted')} className={`filter-tab ${statusFilter === 'accepted' ? 'active' : ''}`}>
                Accepted ({counts.accepted})
              </button>
              <button onClick={() => setStatusFilter('declined')} className={`filter-tab ${statusFilter === 'declined' ? 'active' : ''}`}>
                Declined ({counts.declined})
              </button>
              <button onClick={() => setStatusFilter('rescheduled')} className={`filter-tab ${statusFilter === 'rescheduled' ? 'active' : ''}`}>
                Rescheduled ({counts.rescheduled})
              </button>
              <button onClick={() => setStatusFilter('cancelled')} className={`filter-tab ${statusFilter === 'cancelled' ? 'active' : ''}`}>
                Cancelled ({counts.cancelled})
              </button>
            </div>
          </div>
        </div>

        <div className="appointments-content">
            <div className="form-card">
              <h3 className="section-title">Appointment Requests</h3>
              {loading ? (
                <p className="text-muted">Loading appointments...</p>
              ) : filteredItems.length === 0 ? (
                <p className="text-muted">No appointments in this category.</p>
              ) : (
                <div className="appointments-list">
                  {filteredItems.map(apt => (
                    <div key={apt.id} className="appointment-item">
                      <div className="appointment-header">
                        <h3 className="appointment-title">{apt.studentName || apt.studentEmail}</h3>
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
                          {(apt as any).studentRating && (
                            <div className="appointment-row">
                              <span className="appointment-label">Student Rating</span>
                              <span className="appointment-value">{'⭐'.repeat((apt as any).studentRating)} ({(apt as any).studentRating}/5)</span>
                            </div>
                          )}
                          {(apt as any).studentFeedback && (
                            <div className="appointment-row">
                              <span className="appointment-label">Student Feedback</span>
                              <span className="appointment-value">{(apt as any).studentFeedback}</span>
                            </div>
                          )}
                          {(apt as any).facultyNotes && (
                            <div className="appointment-row">
                              <span className="appointment-label">Your Notes</span>
                              <span className="appointment-value">{(apt as any).facultyNotes}</span>
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
                        <div className="appointment-actions">
                          <div className="action-buttons">
                            <button onClick={() => setStatus(apt.id, 'accepted')} className="btn btn-success">Accept</button>
                            <button onClick={() => setStatus(apt.id, 'declined')} className="btn btn-danger">Decline</button>
                          </div>
                          <div className="reschedule-section">
                            <label className="field-label">Reschedule to:</label>
                            <div className="reschedule-controls">
                              <input
                                type="datetime-local"
                                value={rescheduleMap[apt.id] || ''}
                                onChange={(e) => setRescheduleMap(prev => ({ ...prev, [apt.id]: e.target.value }))}
                                className="form-input"
                              />
                              <button onClick={() => reschedule(apt.id)} className="btn btn-secondary">Reschedule</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {(apt.status === 'accepted' || apt.status === 'rescheduled') && (
                        <div className="appointment-actions" style={{ marginTop: '1rem' }}>
                          {!showNotesForm[apt.id] ? (
                            <button 
                              onClick={() => {
                                setNotesMap(prev => ({ ...prev, [apt.id]: (apt as any).facultyNotes || '' }));
                                setShowNotesForm(prev => ({ ...prev, [apt.id]: true }));
                              }}
                              className="btn btn-primary" 
                              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            >
                              {(apt as any).facultyNotes ? 'Edit Notes' : 'Add Notes'}
                            </button>
                          ) : (
                            <div className="notes-form" style={{ width: '100%' }}>
                              <div className="form-field">
                                <label className="field-label">Notes for Student</label>
                                <textarea
                                  value={notesMap[apt.id] || ''}
                                  onChange={(e) => setNotesMap(prev => ({ ...prev, [apt.id]: e.target.value }))}
                                  rows={3}
                                  className="form-input"
                                  placeholder="Add notes for the student to view..."
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={() => setShowNotesForm(prev => ({ ...prev, [apt.id]: false }))}
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => submitNotes(apt.id)}
                                  className="btn btn-primary" 
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                >
                                  Save Notes
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
  );
};

export default FacultyAppointments;
