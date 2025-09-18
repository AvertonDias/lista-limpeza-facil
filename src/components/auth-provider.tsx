
"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { auth, onAuthStateChanged, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, UserCredential, messaging, db } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, arrayUnion, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<UserCredential>;
  signup: (email: string, pass: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// This function will clear old tokens. It's safe to call from the client
// because Firestore security rules should be configured to only allow a user
// to edit their own document.
const clearAllFcmTokens = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  const userDocRef = doc(db, 'users', userId);
  try {
    // Overwrite the fcmTokens field with an empty array.
    await updateDoc(userDocRef, {
      fcmTokens: []
    });
    console.log(`All FCM tokens for user ${userId} have been cleared.`);
    return { success: true };
  } catch (error) {
    // If the document or field doesn't exist, it might throw an error, which is fine.
    // We can just log it and continue.
    console.warn(`Could not clear FCM tokens for user ${userId}:`, (error as Error).message);
    // Return success as the main goal is to add a new token anyway.
    return { success: true };
  }
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        requestPermissionAndSaveToken(user);
      }
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (messaging) {
        const unsubscribeOnMessage = onMessage(messaging, (payload) => {
          console.log("Foreground message received.", payload);
          toast({
            title: payload.notification?.title,
            description: payload.notification?.body,
          });
        });
        return () => unsubscribeOnMessage();
      }
    }
  }, [toast]);

  const requestPermissionAndSaveToken = async (currentUser: User) => {
    if (!messaging) {
      console.log('Firebase Messaging is not available.');
      return;
    }
  
    try {
      // Clear any old tokens for this user on this device.
      await clearAllFcmTokens(currentUser.uid);
  
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const currentToken = await getToken(messaging);
        if (currentToken) {
          console.log('FCM Token:', currentToken);
          
          const userDocRef = doc(db, 'users', currentUser.uid);
          // Add the new token to the 'fcmTokens' array.
          // Using merge: true ensures we don't overwrite the whole doc.
          await setDoc(userDocRef, { 
            fcmTokens: arrayUnion(currentToken)
          }, { merge: true });
          console.log('FCM token saved/updated successfully.');
  
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }
      } else {
        console.log('Unable to get permission to notify.');
      }
    } catch (error) {
      console.error('An error occurred while retrieving token. ', error);
    }
  };
  
  const login = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };
  
  const signup = (email: string, pass: string) => {
    return createUserWithEmailAndPassword(auth, email, pass);
  };
  
  const logout = async () => {
    await signOut(auth);
  };


  const value = {
    user,
    loading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
