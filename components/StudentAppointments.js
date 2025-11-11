import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { ref, push, set } from 'firebase/database';
import { fs as rtdb } from '../app/firebase';
import { db } from '../app/firebase';
import { useAuth } from '../context/AuthContext';

const StudentAppointments = () => {
  const { currentUser } = useAuth();
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [apptError, setApptError] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);

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
          .map(d => d.data())
          .filter(x => x.role === 'faculty');
        setFaculty(list);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Subscribe to this student's appointments for realtime updates
  useEffect(() => {
    if (!currentUser) return;
    setLoadingAppts(true);
    const q = query(collection(db, 'appointments'), where('studentId', '==', currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side by createdAt desc if available
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
    const m = {};
    for (const f of faculty) m[f.uid] = f.name || f.email || f.uid;
    return m;
  }, [faculty]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (!currentUser) return;
      setError('');
      setSuccess('');
      if (!form.facultyId || !form.requestedTime) {
        setError('Please select a faculty and a requested time.');
        return;
      }
      const docRef = await addDoc(collection(db, 'appointments'), {
        studentId: currentUser.uid,
        studentName: (currentUser.personalInfo && currentUser.personalInfo.name) || currentUser.displayName || '',
        facultyId: form.facultyId,
        status: 'pending',
        requestedTime: new Date(form.requestedTime).toISOString(),
        scheduledTime: null,
        reason: form.reason || '',
        notes: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Notify faculty of new request
      try {
        const notifRef = ref(rtdb, `notifications/${form.facultyId}`);
        const newNotifRef = push(notifRef);
        await set(newNotifRef, {
          id: newNotifRef.key,
          type: 'appointment_request',
          to: form.facultyId,
          from: currentUser.uid,
          title: 'New appointment request',
          body: `${(currentUser.personalInfo && currentUser.personalInfo.name) || 'A student'} requested an appointment`,
          appointmentId: docRef.id,
          createdAt: Date.now(),
          read: false,
        });
      } catch (e) { /* non-blocking */ }
      setSuccess('Appointment request sent.');
      setForm({ facultyId: '', requestedTime: '', reason: '' });
    } catch (e) {
      setError(e.message || 'Failed to book appointment');
    }
  };

  const cancelAppointment = async (id, currentStatus) => {
    try {
      if (!currentUser) return;
      if (!['pending', 'rescheduled'].includes(currentStatus)) return;
      const confirmed = window.confirm('Cancel this appointment request?');
      if (!confirmed) return;
      await updateDoc(doc(db, 'appointments', id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      setSuccess('Appointment cancelled.');
    } catch (e) {
      setApptError(e.message || 'Failed to cancel appointment');
    }
  };

  return (
    <div className="main-content">
      <div className="container">
        <div className="page-container">
          <h2 className="page-title">Book an appointment</h2>
          {loading ? (
            <p className="text-muted">Loading faculty…</p>
          ) : (
            <div className="appointment-form-card">
              <form onSubmit={submit} className="appointment-form">
                <div className="form-group">
                  <label className="form-label">Select faculty</label>
                  <select name="facultyId" value={form.facultyId} onChange={handleChange} className="select">
                    <option value="">-- choose --</option>
                    {faculty.length === 0 && (
                      <option value="" disabled>(No faculty available yet)</option>
                    )}
                    {faculty.map(f => (
                      <option key={f.uid} value={f.uid}>
                        {f.name} {f.title ? `— ${f.title}` : ''} {f.department ? `(${f.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Requested time</label>
                  <input type="datetime-local" name="requestedTime" className="input" value={form.requestedTime} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason (optional)</label>
                  <input type="text" name="reason" className="input" value={form.reason} onChange={handleChange} placeholder="e.g., Project consultation" />
                </div>
                <div className="form-actions">
                  <button className="btn btn-primary" type="submit" disabled={!form.facultyId || !form.requestedTime}>Send request</button>
                </div>
                {success && <p className="success-message">{success}</p>}
                {error && <p className="error-message">{error}</p>}
              </form>
            </div>
          )}
          <h3 className="section-heading">My appointments</h3>
          <div className="appointments-list">
            {loadingAppts ? (
              <div className="appointment-card">
                <div className="loading-text">Loading your appointments…</div>
              </div>
            ) : appointments.length === 0 ? (
              <div className="appointment-card">
                <div className="empty-text">You have no appointments yet.</div>
              </div>
            ) : (
              appointments.map(item => (
                <div key={item.id} className="appointment-card">
                  <div className="appointment-content">
                    <div className="appointment-info">
                      <div className="appointment-faculty">
                        With: {facultyNameMap[item.facultyId] || item.facultyId}
                      </div>
                      <div className="appointment-time">
                        Requested: {item.requestedTime ? new Date(item.requestedTime).toLocaleString() : '—'}
                        {item.scheduledTime && <> · Scheduled: {new Date(item.scheduledTime).toLocaleString()}</>}
                      </div>
                      <div className="appointment-status">
                        Status: {item.status === 'accepted' && <span className="status-accepted">accepted</span>}
                        {item.status === 'declined' && <span className="status-declined">declined</span>}
                        {item.status === 'rescheduled' && <span className="status-rescheduled">rescheduled</span>}
                        {item.status === 'pending' && <span className="status-pending">pending</span>}
                        {item.status === 'cancelled' && <span className="status-cancelled">cancelled</span>}
                      </div>
                      {item.reason && <div className="appointment-reason">Reason: {item.reason}</div>}
                    </div>
                    <div className="appointment-actions">
                      {['pending','rescheduled'].includes(item.status) && (
                        <button className="btn btn-secondary" onClick={() => cancelAppointment(item.id, item.status)}>Cancel</button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {apptError && <p className="error-message">{apptError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAppointments;
