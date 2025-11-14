import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import type { UserData, StudentProfileData, FacultyProfileData, Department } from "../types";

// User document operations
export async function saveUser(userId: string, data: Partial<UserData>): Promise<void> {
  await setDoc(doc(db, "users", userId), data, { merge: true });
}

export async function getUser(userId: string): Promise<DocumentData | null> {
  const snapshot = await getDoc(doc(db, "users", userId));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function getAllUsers(): Promise<Array<{ id: string } & DocumentData>> {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function deleteUser(userId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId));
}

// Department operations
export async function saveDepartment(departmentId: string, data: Partial<Department>): Promise<void> {
  await setDoc(doc(db, "departments", departmentId), data, { merge: true });
}

export async function getAllDepartments(): Promise<Array<{ id: string } & DocumentData>> {
  const snapshot = await getDocs(collection(db, "departments"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Student profile operations
export async function saveStudentProfile(
  userId: string,
  profileId: string,
  data: Partial<StudentProfileData>
): Promise<void> {
  const ref = doc(db, `users/${userId}/studentProfile/${profileId}`);
  await setDoc(ref, data, { merge: true });
}

export async function getStudentProfile(userId: string, profileId: string): Promise<DocumentData | null> {
  const ref = doc(db, `users/${userId}/studentProfile/${profileId}`);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function getAllStudentProfiles(userId: string): Promise<Array<{ id: string } & DocumentData>> {
  const ref = collection(db, `users/${userId}/studentProfile`);
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Faculty profile operations
export async function saveFacultyProfile(
  userId: string,
  profileId: string,
  data: Partial<FacultyProfileData>
): Promise<void> {
  const ref = doc(db, `users/${userId}/facultyProfile/${profileId}`);
  await setDoc(ref, data, { merge: true });
}

export async function getFacultyProfile(userId: string, profileId: string): Promise<DocumentData | null> {
  const ref = doc(db, `users/${userId}/facultyProfile/${profileId}`);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function getAllFacultyProfiles(userId: string): Promise<Array<{ id: string } & DocumentData>> {
  const ref = collection(db, `users/${userId}/facultyProfile`);
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
