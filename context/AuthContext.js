"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../app/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import {
  saveUser,
  getUser,
  saveStudentProfile,
  saveFacultyProfile,
} from '../firestoreHelpers';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Attach Firebase auth listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Try to load user document from Firestore
        try {
          const userDoc = await getUser(user.uid);
          const combined = { uid: user.uid, email: user.email, ...userDoc };
          setCurrentUser(combined);
          try { window.localStorage?.setItem('proflink_user', JSON.stringify(combined)); } catch (e) {}
        } catch (e) {
          setCurrentUser({ uid: user.uid, email: user.email });
        }
      } else {
        setCurrentUser(null);
        try { window.localStorage?.removeItem('proflink_user'); } catch (e) {}
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password, userType) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const u = cred.user;
      const userDoc = await getUser(u.uid);
      const combined = { uid: u.uid, email: u.email, ...userDoc };
      setCurrentUser(combined);
      try { window.localStorage?.setItem('proflink_user', JSON.stringify(combined)); } catch (e) {}
      return { success: true, user: combined };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      try { window.localStorage?.removeItem('proflink_user'); } catch (e) {}
    } catch (e) {
      console.warn('Logout error', e);
    }
  };

  const register = async ({ firstName, lastName, email, password, userType }) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const u = cred.user;
      // Save profile in Firestore using helper
      const data = {
        personalInfo: { name: `${firstName} ${lastName}`, email },
        profile: { type: userType || 'student' },
        createdAt: new Date().toISOString(),
      };
      await saveUser(u.uid, data);
      try { await sendEmailVerification(u); } catch (e) { /* non-blocking */ }
      const combined = { uid: u.uid, email: u.email, ...data };
      setCurrentUser(combined);
      try { window.localStorage?.setItem('proflink_user', JSON.stringify(combined)); } catch (e) {}
      return { success: true, user: combined };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  };

  // Simple profile mutators that delegate to firestoreHelpers
  const updateStudentProfile = async (userId, data) => {
    try {
      await saveStudentProfile(userId, data.profileId || 'profile01', data);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  };

  const upsertStudentProfile = updateStudentProfile;
  const deleteStudentProfile = async () => ({ success: false });

  const updateFacultyProfile = async (userId, data) => {
    try {
      await saveFacultyProfile(userId, data.profileId || 'profile01', data);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || String(e) };
    }
  };

  const upsertFacultyProfile = updateFacultyProfile;
  const deleteFacultyProfile = async () => ({ success: false });

  return (
    <AuthContext.Provider value={{
      currentUser,
      login,
      logout,
      register,
      updateStudentProfile,
      upsertStudentProfile,
      deleteStudentProfile,
      updateFacultyProfile,
      upsertFacultyProfile,
      deleteFacultyProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      currentUser: null,
      login: async () => ({ success: false, error: 'no-auth-provider' }),
      logout: async () => {},
      register: async () => ({ success: false }),
      updateStudentProfile: async () => ({ success: false }),
      upsertStudentProfile: async () => ({ success: false }),
      deleteStudentProfile: async () => ({ success: false }),
      updateFacultyProfile: async () => ({ success: false }),
      upsertFacultyProfile: async () => ({ success: false }),
      deleteFacultyProfile: async () => ({ success: false }),
    };
  }
  return ctx;
};

export default AuthProvider;
