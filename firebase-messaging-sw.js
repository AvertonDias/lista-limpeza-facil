// Import the Firebase app and messaging packages.
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDizs1-cOZnBX5ilBXazQIuFJD_sUnkDCQ",
  authDomain: "studio-1326322560-ad791.firebaseapp.com",
  projectId: "studio-1326322560-ad791",
  storageBucket: "studio-1326322560-ad791.firebasestorage.app",
  messagingSenderId: "417616889091",
  appId: "1:417616889091:web:f2c93816e5eaec7ff4d536"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// This file is intentionally kept simple. 
// When a push notification is received while the app is in the background,
// Firebase's default behavior is to show the notification automatically
// if the payload contains a "notification" field. We are relying on this default behavior.
// Our server-side code in `fcm.ts` ensures this "notification" field is always present.
