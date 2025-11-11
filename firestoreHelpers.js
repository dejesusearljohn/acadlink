import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./app/firebase";

//Create or update a user document
export async function saveUser(userId, data) {
  await setDoc(doc(db, "users", userId), data, { merge: true });
}

//Get a single user document
export async function getUser(userId) {
  const snapshot = await getDoc(doc(db, "users", userId));
  return snapshot.exists() ? snapshot.data() : null;
}

//Get all users
export async function getAllUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

//Delete a user
export async function deleteUser(userId) {
  await deleteDoc(doc(db, "users", userId));
}

//Save a department
export async function saveDepartment(departmentId, data) {
  await setDoc(doc(db, "departments", departmentId), data, { merge: true });
}

//Get all departments
export async function getAllDepartments() {
  const snapshot = await getDocs(collection(db, "departments"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/* -------------------- STUDENT PROFILE -------------------- */

//Create or update a student profile
export async function saveStudentProfile(userId, profileId, data) {
  const ref = doc(db, `users/${userId}/studentProfile/${profileId}`);
  await setDoc(ref, data, { merge: true });
}

//Get a specific student profile
export async function getStudentProfile(userId, profileId) {
  const ref = doc(db, `users/${userId}/studentProfile/${profileId}`);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

//Get all student profiles for a user
export async function getAllStudentProfiles(userId) {
  const ref = collection(db, `users/${userId}/studentProfile`);
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/* -------------------- FACULTY PROFILE -------------------- */

//Create or update a faculty profile
export async function saveFacultyProfile(userId, profileId, data) {
  const ref = doc(db, `users/${userId}/facultyProfile/${profileId}`);
  await setDoc(ref, data, { merge: true });
}

//Get a specific faculty profile
export async function getFacultyProfile(userId, profileId) {
  const ref = doc(db, `users/${userId}/facultyProfile/${profileId}`);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}

//Get all faculty profiles for a user
export async function getAllFacultyProfiles(userId) {
  const ref = collection(db, `users/${userId}/facultyProfile`);
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}