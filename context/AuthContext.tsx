"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  saveUser,
  getUser,
  saveStudentProfile,
  saveFacultyProfile,
} from '../lib/firestoreHelpers';
import type { UserData, AuthResult, ProfileResult, StudentProfileData, FacultyProfileData } from '../types';

interface RegisterParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  userType: 'student' | 'faculty';
}

interface AuthContextType {
  currentUser: UserData | null;
  loading: boolean;
  login: (email: string, password: string, userType: 'student' | 'faculty') => Promise<AuthResult>;
  logout: () => Promise<void>;
  register: (params: RegisterParams) => Promise<AuthResult>;
  updateStudentProfile: (userId: string, data: Partial<StudentProfileData> & { profileId?: string }) => Promise<ProfileResult>;
  upsertStudentProfile: (userId: string, data: Partial<StudentProfileData> & { profileId?: string }) => Promise<ProfileResult>;
  deleteStudentProfile: () => Promise<ProfileResult>;
  updateFacultyProfile: (userId: string, data: Partial<FacultyProfileData> & { profileId?: string }) => Promise<ProfileResult>;
  upsertFacultyProfile: (userId: string, data: Partial<FacultyProfileData> & { profileId?: string }) => Promise<ProfileResult>;
  deleteFacultyProfile: () => Promise<ProfileResult>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        try {
          const userDoc = await getUser(user.uid);
          if (!userDoc) {
            try { await firebaseSignOut(auth); } catch (e) { /* ignore sign-out errors */ }
            setCurrentUser(null);
            try { window.localStorage?.removeItem('proflink_user'); } catch (e) { }
            return;
          }
          const combined: UserData = { 
            uid: user.uid, 
            email: user.email, 
            ...(userDoc as Partial<UserData>)
          };
          setCurrentUser(combined);
          try { window.localStorage?.setItem('proflink_user', JSON.stringify(combined)); } catch (e) { }
        } catch (e) {
          try { await firebaseSignOut(auth); } catch (err) { /* ignore */ }
          setCurrentUser(null);
          try { window.localStorage?.removeItem('proflink_user'); } catch (e) { }
        }
      } else {
        setCurrentUser(null);
        try { window.localStorage?.removeItem('proflink_user'); } catch (e) { }
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, userType: 'student' | 'faculty'): Promise<AuthResult> => {
    try {
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const u = cred.user;
      const userDoc = await getUser(u.uid);
      if (!userDoc) {
        try { await firebaseSignOut(auth); } catch (e) { /* ignore */ }
        return { success: false, error: 'Account not registered in database. Please contact support.' };
      }
      
      // Check if the account role matches the selected login type
      const accountRole = (userDoc as any).profile?.type || (userDoc as any).type;
      if (accountRole !== userType) {
        try { await firebaseSignOut(auth); } catch (e) { /* ignore */ }
        if (userType === 'student') {
          return { success: false, error: 'This is a faculty account. Please select Faculty to login.' };
        } else {
          return { success: false, error: 'This is a student account. Please select Student to login.' };
        }
      }
      
      const combined: UserData = { 
        uid: u.uid, 
        email: u.email, 
        ...(userDoc as Partial<UserData>)
      };
      setCurrentUser(combined);
      try { window.localStorage?.setItem('proflink_user', JSON.stringify(combined)); } catch (e) { }
      return { success: true, user: combined };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      try { window.localStorage?.removeItem('proflink_user'); } catch (e) { }
    } catch (e) {
      console.warn('Logout error', e);
    }
  };

  const register = async ({ firstName, lastName, email, password, userType }: RegisterParams): Promise<AuthResult> => {
    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const u = cred.user;
      const data: Partial<UserData> = {
        personalInfo: { name: `${firstName} ${lastName}`, email },
        profile: { type: userType || 'student' },
        createdAt: new Date().toISOString(),
      };
      await saveUser(u.uid, data);
      try { await sendEmailVerification(u); } catch (e) { /* non-blocking */ }
      const combined: UserData = { uid: u.uid, email: u.email, ...data };
      setCurrentUser(combined);
      try { window.localStorage?.setItem('proflink_user', JSON.stringify(combined)); } catch (e) { }
      return { success: true, user: combined };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    } finally {
      setLoading(false);
    }
  };

  const updateStudentProfile = async (
    userId: string,
    data: Partial<StudentProfileData> & { profileId?: string }
  ): Promise<ProfileResult> => {
    try {
      const profileId = data.profileId || 'profile01';
      const { profileId: _, ...profileData } = data;
      await saveStudentProfile(userId, profileId, profileData);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  };

  const upsertStudentProfile = updateStudentProfile;
  const deleteStudentProfile = async (): Promise<ProfileResult> => ({ success: false });

  const updateFacultyProfile = async (
    userId: string,
    data: Partial<FacultyProfileData> & { profileId?: string }
  ): Promise<ProfileResult> => {
    try {
      const profileId = data.profileId || 'profile01';
      const { profileId: _, ...profileData } = data;
      await saveFacultyProfile(userId, profileId, profileData);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  };

  const upsertFacultyProfile = updateFacultyProfile;
  const deleteFacultyProfile = async (): Promise<ProfileResult> => ({ success: false });

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
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

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      currentUser: null,
      loading: false,
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
