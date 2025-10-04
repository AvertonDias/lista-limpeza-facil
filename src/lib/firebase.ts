import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, UserCredential } from "firebase/auth";
import { getFirestore, arrayUnion, arrayRemove } from "firebase/firestore";
import { getMessaging, getToken, deleteToken } from "firebase/messaging";

export const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDizs1-cOZnBX5ilBXazQIuFJD_sUnkDCQ",
  authDomain: "studio-1326322560-ad791.firebaseapp.com",
  projectId: "studio-1326322560-ad791",
  storageBucket: "studio-1326322560-ad791.firebasestorage.app",
  messagingSenderId: "417616889091",
  appId: "1:417616889091:web:f2c93816e5eaec7ff4d536"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Get a messaging instance
const messaging = (typeof window !== 'undefined') ? getMessaging(app) : null;


export { app, auth, db, messaging, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, getToken, deleteToken, arrayRemove, arrayUnion };
export type { User, UserCredential };
