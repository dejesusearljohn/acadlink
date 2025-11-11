import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDjftUaFIYEZfXzn7ZC99Ya7hqKhHuesK4",
  authDomain: "proflinkv2.firebaseapp.com",
  databaseURL: "https://proflinkv2-default-rtdb.firebaseio.com",
  projectId: "proflinkv2",
  storageBucket: "proflinkv2.firebasestorage.app",
  messagingSenderId: "99403356527",
  appId: "1:99403356527:web:5ae2d8eedaccc48337b09a"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const fs = getDatabase(app);
export const auth = getAuth(app);

export default app;