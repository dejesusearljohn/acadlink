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

  return (
    <div className="appointments-container">
      <h2>Student Appointments</h2>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="appointments-section">
        <h3>Request New Appointment</h3>
        <form onSubmit={submit} className="appointment-form">
          <div className="form-group">
            <label>Select Faculty</label>
            <select name="facultyId" value={form.facultyId} onChange={handleChange} required>
              <option value="">-- Choose Faculty --</option>
              {faculty.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.department})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Requested Time</label>
            <input
              type="datetime-local"
              name="requestedTime"
              value={form.requestedTime}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Reason</label>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              rows={3}
            />
          </div>
          <button type="submit" className="btn btn-primary">Request Appointment</button>
        </form>
      </div>

      <div className="appointments-section">
        <h3>My Appointments</h3>
        {loadingAppts ? (
          <p>Loading appointments...</p>
        ) : apptError ? (
          <p className="text-error">{apptError}</p>
        ) : appointments.length === 0 ? (
          <p>No appointments yet.</p>
        ) : (
          <div className="appointments-list">
            {appointments.map(apt => (
              <div key={apt.id} className="appointment-card">
                <div><strong>Faculty:</strong> {facultyNameMap[apt.facultyId] || apt.facultyId}</div>
                <div><strong>Requested:</strong> {new Date(apt.requestedTime).toLocaleString()}</div>
                <div><strong>Status:</strong> <span className={`status-${apt.status}`}>{apt.status}</span></div>
                {apt.reason && <div><strong>Reason:</strong> {apt.reason}</div>}
                {apt.status === 'pending' && (
                  <button onClick={() => cancelAppointment(apt.id)} className="btn btn-secondary">
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAppointments;
