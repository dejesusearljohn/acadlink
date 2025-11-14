"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  runTransaction,
  deleteDoc,
} from 'firebase/firestore';
import {
  getUser,
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
  logout: () => void;
  register: (params: RegisterParams) => Promise<AuthResult>;
  updateStudentProfile: (userId: string, updates: any) => Promise<void>;
  upsertStudentProfile: (userId: string, data: any, merge?: boolean) => Promise<void>;
  deleteStudentProfile: (userId: string) => Promise<void>;
  updateFacultyProfile: (userId: string, updates: any) => Promise<void>;
  upsertFacultyProfile: (userId: string, data: any, merge?: boolean) => Promise<void>;
  deleteFacultyProfile: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    // Ensure minimum loading time of 500ms for better UX
    const minLoadTime = setTimeout(() => {
      setInitialLoad(false);
    }, 500);

    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const merged = { ...user, ...userSnap.data() } as UserData;
          setCurrentUser(merged);

          // Ensure faculty have a directory entry (backfill for older accounts)
          try {
            const role = merged.profile?.type;
            if (role === 'faculty') {
              const dirRef = doc(db, 'directory', user.uid);
              const existing = await getDoc(dirRef);
              if (!existing.exists()) {
                await setDoc(dirRef, {
                  uid: user.uid,
                  name: merged.personalInfo?.name || user.displayName || 'Faculty',
                  email: merged.personalInfo?.email || user.email || '',
                  role: 'faculty',
                  department: '',
                  title: '',
                  createdAt: serverTimestamp(),
                }, { merge: true });
              }
            }
          } catch (e: any) {
            console.warn('Directory ensure (auth) failed:', e?.code, e?.message);
          }
        } else {
          setCurrentUser(user as any);
        }
      } else {
        setCurrentUser(null);
      }
      
      // Wait for minimum load time before hiding loading screen
      if (initialLoad) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      setLoading(false);
    });
    
    return () => {
      clearTimeout(minLoadTime);
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, userType: 'student' | 'faculty'): Promise<AuthResult> => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await user.reload();

      if (!user.emailVerified) {
        await firebaseSignOut(auth);
        setLoading(false);
        return {
          success: false,
          error: "Email not verified. Please check your inbox for the verification link before logging in.",
        };
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        if (data.profile?.type !== userType) {
          await firebaseSignOut(auth);
          setLoading(false);
          const accountType = data.profile?.type === 'student' ? 'student' : 'faculty';
          const selectedType = userType === 'student' ? 'Student' : 'Faculty';
          return {
            success: false,
            error: `This is a ${accountType} account. Please select ${accountType === 'student' ? 'Student' : 'Faculty'} to login.`,
          };
        }

        await updateDoc(userRef, {
          "personalInfo.lastLoginAt": serverTimestamp(),
        });

        if (user.emailVerified && !data.metadata?.emailVerified) {
          await updateDoc(userRef, {
            "metadata.emailVerified": true,
          });
          console.log("✅ Firestore updated: emailVerified set to true");
        }

        // Don't set loading to false here - let onAuthStateChanged handle it
        return {
          success: true,
          user: { ...user, ...data } as UserData,
        };
      } else {
        setLoading(false);
        return {
          success: false,
          error: "No user record found in Firestore.",
        };
      }
    } catch (error: any) {
      console.error("❌ Login failed:", error.message);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const logout = () => firebaseSignOut(auth);

  const register = async ({ firstName, lastName, email, password, userType }: RegisterParams): Promise<AuthResult> => {
    try {
      const name = `${firstName} ${lastName}`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      try {
        const counterRef = doc(db, "meta", "counters");
        const { userCode, profileCode, profileId } = await runTransaction(db, async (transaction) => {
          const counterSnap = await transaction.get(counterRef);
          let userCounter = 1;
          let profileCounter = 1;

          if (counterSnap.exists()) {
            const data = counterSnap.data();
            userCounter = (data.user || 0) + 1;
            if (userType === "student") {
              profileCounter = (data.student || 0) + 1;
            } else if (userType === "faculty") {
              profileCounter = (data.faculty || 0) + 1;
            }
          }

          transaction.set(
            counterRef,
            {
              user: userCounter,
              [userType]: profileCounter,
            },
            { merge: true }
          );

          const userCode = `user${String(userCounter).padStart(2, "0")}`;
          const profileCode =
            userType === "student"
              ? `stud${String(profileCounter).padStart(2, "0")}`
              : `prof${String(profileCounter).padStart(2, "0")}`;
          const profileId = profileCode;

          return { userCode, profileCode, profileId };
        });

        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          code: userCode,
          personalInfo: {
            name,
            email,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          },
          profile: {
            type: userType,
            docId: profileId,
            status: "active",
            preferences: {},
          },
          metadata: {
            emailVerified: false,
            profileComplete: false,
            termsAccepted: serverTimestamp(),
            lastUpdated: serverTimestamp(),
          },
        });

        const profileCollectionName = userType === "student" ? "studentProfile" : "facultyProfile";
        const profileRef = doc(db, "users", user.uid, profileCollectionName, profileId);

        if (userType === "student") {
          await setDoc(profileRef, {
            code: profileCode,
            academicInfo: {
              studentId: "",
              year: "",
              major: "",
              department: "",
              gpa: 0,
              expectedGraduation: null,
            },
            preferences: {
              emailNotifications: true,
              pushNotifications: true,
              theme: "light",
            },
            statistics: {
              totalAppointments: 0,
              completedAppointments: 0,
              canceledAppointments: 0,
              averageRating: 0,
            },
          });
        } else if (userType === "faculty") {
          await setDoc(profileRef, {
            code: profileCode,
            academicInfo: {
              employeeId: "",
              title: "",
              department: "",
              office: "",
              expertise: [],
              education: [],
              publications: 0,
              yearsExperience: 0,
            },
            consultationSettings: {
              defaultDuration: 30,
              maxDailyAppointments: 10,
              bufferTime: 5,
              advanceBookingDays: 7,
              consultationTypes: ["Academic Advising", "Thesis Consultation", "General Inquiry"],
            },
            availability: {
              weeklySchedule: {},
              timeZone: "UTC",
            },
            statistics: {
              totalAppointments: 0,
              completedAppointments: 0,
              canceledAppointments: 0,
              averageRating: 0,
              totalStudentsHelped: 0,
            },
          });

          const directoryRef = doc(db, "directory", user.uid);
          await setDoc(directoryRef, {
            uid: user.uid,
            name,
            email,
            role: userType,
            department: "",
            title: "",
            createdAt: serverTimestamp(),
          });
        }

        await sendEmailVerification(user);
        await firebaseSignOut(auth);

        return {
          success: true,
          requiresVerification: true,
        };
      } catch (firestoreError: any) {
        console.error("Firestore registration failed:", firestoreError);
        try {
          await user.delete();
          console.log("Orphaned auth account cleaned up");
        } catch (deleteError) {
          console.error("Failed to delete orphaned auth account:", deleteError);
        }
        return {
          success: false,
          error: firestoreError.message || "Registration failed. Please try again.",
        };
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: error.message || "An unexpected error occurred during registration.",
      };
    }
  };

  const updateStudentProfile = async (userId: string, updates: any): Promise<void> => {
    const profileId = currentUser?.profile?.docId;
    if (!profileId) throw new Error('No profile ID found');
    const profileRef = doc(db, 'users', userId, 'studentProfile', profileId);
    await updateDoc(profileRef, updates);
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'metadata.profileComplete': true,
      'metadata.lastUpdated': serverTimestamp(),
    });
  };

  const upsertStudentProfile = async (userId: string, data: any, merge = true): Promise<void> => {
    const profileId = currentUser?.profile?.docId;
    if (!profileId) throw new Error('No profile ID found');
    const profileRef = doc(db, 'users', userId, 'studentProfile', profileId);
    await setDoc(profileRef, data, { merge });
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'metadata.profileComplete': true,
      'metadata.lastUpdated': serverTimestamp(),
    });
  };

  const deleteStudentProfile = async (userId: string): Promise<void> => {
    const profileId = currentUser?.profile?.docId;
    if (!profileId) throw new Error('No profile ID found');
    const profileRef = doc(db, 'users', userId, 'studentProfile', profileId);
    await deleteDoc(profileRef);
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'metadata.profileComplete': false,
      'metadata.lastUpdated': serverTimestamp(),
    });
  };

  const updateFacultyProfile = async (userId: string, updates: any): Promise<void> => {
    const profileId = currentUser?.profile?.docId;
    if (!profileId) throw new Error('No profile ID found');
    const profileRef = doc(db, 'users', userId, 'facultyProfile', profileId);
    await updateDoc(profileRef, updates);
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'metadata.profileComplete': true,
      'metadata.lastUpdated': serverTimestamp(),
    });
  };

  const upsertFacultyProfile = async (userId: string, data: any, merge = true): Promise<void> => {
    const profileId = currentUser?.profile?.docId;
    if (!profileId) throw new Error('No profile ID found');
    const profileRef = doc(db, 'users', userId, 'facultyProfile', profileId);
    await setDoc(profileRef, data, { merge });
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'metadata.profileComplete': true,
      'metadata.lastUpdated': serverTimestamp(),
    });
  };

  const deleteFacultyProfile = async (userId: string): Promise<void> => {
    const profileId = currentUser?.profile?.docId;
    if (!profileId) throw new Error('No profile ID found');
    const profileRef = doc(db, 'users', userId, 'facultyProfile', profileId);
    await deleteDoc(profileRef);
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'metadata.profileComplete': false,
      'metadata.lastUpdated': serverTimestamp(),
    });
  };

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
      logout: () => {},
      register: async () => ({ success: false }),
      updateStudentProfile: async () => {},
      upsertStudentProfile: async () => {},
      deleteStudentProfile: async () => {},
      updateFacultyProfile: async () => {},
      upsertFacultyProfile: async () => {},
      deleteFacultyProfile: async () => {},
    };
  }
  return ctx;
};

export default AuthProvider;
