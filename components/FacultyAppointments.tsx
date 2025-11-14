"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, where, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, push, set } from 'firebase/database';
import { rtdb, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { Appointment } from '../types';

type StatusFilter = 'all' | 'pending' | 'accepted' | 'declined' | 'rescheduled' | 'cancelled';

const FacultyAppointments: React.FC = () => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<(Appointment & { id: string })[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [rescheduleMap, setRescheduleMap] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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
      await updateDoc(doc(db, 'appointments', id), {
        status,
        updatedAt: serverTimestamp(),
      });
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

  return (
    <div className="faculty-appointments-container">
      <h2>Faculty Appointments</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="filter-section">
        <button onClick={() => setStatusFilter('all')} className={statusFilter === 'all' ? 'active' : ''}>
          All ({counts.all})
        </button>
        <button onClick={() => setStatusFilter('pending')} className={statusFilter === 'pending' ? 'active' : ''}>
          Pending ({counts.pending})
        </button>
        <button onClick={() => setStatusFilter('accepted')} className={statusFilter === 'accepted' ? 'active' : ''}>
          Accepted ({counts.accepted})
        </button>
        <button onClick={() => setStatusFilter('declined')} className={statusFilter === 'declined' ? 'active' : ''}>
          Declined ({counts.declined})
        </button>
        <button onClick={() => setStatusFilter('rescheduled')} className={statusFilter === 'rescheduled' ? 'active' : ''}>
          Rescheduled ({counts.rescheduled})
        </button>
        <button onClick={() => setStatusFilter('cancelled')} className={statusFilter === 'cancelled' ? 'active' : ''}>
          Cancelled ({counts.cancelled})
        </button>
      </div>

      {loading ? (
        <p>Loading appointments...</p>
      ) : filteredItems.length === 0 ? (
        <p>No appointments in this category.</p>
      ) : (
        <div className="appointments-list">
          {filteredItems.map(apt => (
            <div key={apt.id} className="appointment-card">
              <div><strong>Student:</strong> {apt.studentName || apt.studentEmail}</div>
              <div><strong>Requested:</strong> {new Date(apt.requestedTime).toLocaleString()}</div>
              <div><strong>Status:</strong> <span className={`status-${apt.status}`}>{apt.status}</span></div>
              {apt.reason && <div><strong>Reason:</strong> {apt.reason}</div>}
              
              {apt.status === 'pending' && (
                <div className="appointment-actions">
                  <button onClick={() => setStatus(apt.id, 'accepted')} className="btn btn-success">Accept</button>
                  <button onClick={() => setStatus(apt.id, 'declined')} className="btn btn-danger">Decline</button>
                  <div className="reschedule-group">
                    <input
                      type="datetime-local"
                      value={rescheduleMap[apt.id] || ''}
                      onChange={(e) => setRescheduleMap(prev => ({ ...prev, [apt.id]: e.target.value }))}
                    />
                    <button onClick={() => reschedule(apt.id)} className="btn btn-secondary">Reschedule</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FacultyAppointments;
