import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, where, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, push, set } from 'firebase/database';
import { fs as rtdb } from '../app/firebase';
import { db } from '../app/firebase';
import { useAuth } from '../context/AuthContext';

const FacultyAppointments = () => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rescheduleMap, setRescheduleMap] = useState({});
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | accepted | declined | rescheduled | cancelled

  // Realtime subscription for this faculty's appointments
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const qy = query(collection(db, 'appointments'), where('facultyId', '==', currentUser.uid));
    const unsub = onSnapshot(qy, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // optional sorting by createdAt desc when available
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
    const base = { all: items.length, pending: 0, accepted: 0, declined: 0, rescheduled: 0, cancelled: 0 };
    for (const it of items) {
      if (base[it.status] !== undefined) base[it.status] += 1;
    }
    return base;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return items;
    return items.filter(i => i.status === statusFilter);
  }, [items, statusFilter]);

  const setStatus = async (id, status) => {
    try {
      setError(''); setSuccess('');
      await updateDoc(doc(db, 'appointments', id), {
        status,
        updatedAt: serverTimestamp(),
      });
      setSuccess(`Appointment ${status}.`);
      // Notify student of decision
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
            from: currentUser.uid,
            title: `Appointment ${status}`,
            body: `Your appointment request was ${status}.`,
            appointmentId: id,
            createdAt: Date.now(),
            read: false,
          });
        }
      } catch (e) { /* non-blocking */ }
      // Realtime subscription will refresh the list automatically
    } catch (e) {
      setError(e.message || 'Failed to update');
    }
  };

  const reschedule = async (id) => {
    try {
      setError(''); setSuccess('');
      const newTime = rescheduleMap[id];
      if (!newTime) { setError('Pick a new time first.'); return; }
      await updateDoc(doc(db, 'appointments', id), {
        status: 'rescheduled',
        scheduledTime: new Date(newTime).toISOString(),
        updatedAt: serverTimestamp(),
      });
      setSuccess('Appointment rescheduled.');
      // Notify student of reschedule
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
            from: currentUser.uid,
            title: 'Appointment rescheduled',
            body: `Your appointment was moved to ${new Date(newTime).toLocaleString()}.`,
            appointmentId: id,
            createdAt: Date.now(),
            read: false,
          });
        }
      } catch (e) { /* non-blocking */ }
      // Realtime subscription will refresh the list automatically
    } catch (e) {
      setError(e.message || 'Failed to reschedule');
    }
  };

  const setRescheduleTime = (id, value) => {
    setRescheduleMap(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="main-content">
      <div className="container">
        <h2 className="page-title">Appointments</h2>
        
        {/* Summary cards */}
        <div className="appointments-summary">
          <div className="summary-card">
            <div className="summary-label">All</div>
            <div className="summary-count">{counts.all}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Pending</div>
            <div className="summary-count">{counts.pending}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Accepted</div>
            <div className="summary-count">{counts.accepted}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Declined</div>
            <div className="summary-count">{counts.declined}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Rescheduled</div>
            <div className="summary-count">{counts.rescheduled}</div>
          </div>
        </div>

        {/* Filter controls */}
        <div className="appointment-filters">
          {['all','pending','accepted','declined','rescheduled','cancelled'].map(s => (
            <button 
              key={s} 
              className={`filter-btn ${statusFilter===s ? 'filter-btn-active' : ''}`} 
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <div className="appointments-list">
            {filteredItems.length === 0 && (
              <div className="empty-state">No appointments in this view.</div>
            )}
            {filteredItems.map(item => (
              <div key={item.id} className="appointment-card">
                <div className="appointment-content">
                  <div className="appointment-info">
                    <div className="appointment-student">From: {item.studentName || item.studentId}</div>
                    <div className="appointment-times">
                      Requested: {item.requestedTime ? new Date(item.requestedTime).toLocaleString() : '—'}
                      {item.scheduledTime && <> · Scheduled: {new Date(item.scheduledTime).toLocaleString()}</>}
                    </div>
                    <div className="appointment-reason">Reason: {item.reason || '—'}</div>
                    <div className="appointment-status-line">Status: <strong>{item.status}</strong></div>
                  </div>
                  <div className="appointment-actions">
                    {item.status !== 'accepted' && (
                      <button className="btn btn-primary" onClick={() => setStatus(item.id, 'accepted')}>Accept</button>
                    )}
                    {item.status !== 'declined' && (
                      <button className="btn btn-secondary" onClick={() => setStatus(item.id, 'declined')}>Decline</button>
                    )}
                    <input 
                      type="datetime-local" 
                      value={rescheduleMap[item.id] || ''} 
                      onChange={(e) => setRescheduleTime(item.id, e.target.value)} 
                      className="form-input reschedule-input" 
                    />
                    <button className="btn btn-ghost" onClick={() => reschedule(item.id)}>Reschedule</button>
                  </div>
                </div>
              </div>
            ))}
            {success && <p className="message-success">{success}</p>}
            {error && <p className="message-error">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyAppointments;
