import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDizs1-cOZnBX5ilBXazQIuFJD_sUnkDCQ",
  authDomain: "studio-1326322560-ad791.firebaseapp.com",
  projectId: "studio-1326322560-ad791",
  storageBucket: "studio-1326322560-ad791.appspot.com",
  messagingSenderId: "417616889091",
  appId: "1:417616889091:web:f2c93816e5eaec7ff4d536"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
// Explicitly set the database ID to match the region.
const db = getFirestore(app, '(default)');

export { app, auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword };
export type { User };
