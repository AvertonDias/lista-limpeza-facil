"use client";

import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, UserCredential, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { getFirestore, arrayUnion, arrayRemove } from "firebase/firestore";

// Your web app's Firebase configuration
export const firebaseConfig: FirebaseOptions = {
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
const db = getFirestore(app);
const messaging = null; // Removido


export { app, auth, db, messaging, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, arrayRemove, arrayUnion, onMessage, sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset };
export type { User, UserCredential };

// A função onMessage não está mais disponível aqui, pois o messaging foi removido.
// Se precisar usar, terá que ser re-introduzido.
const onMessage = () => { console.warn("Firebase Messaging não está mais configurado.")};
