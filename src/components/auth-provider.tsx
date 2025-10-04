"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { auth, onAuthStateChanged, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, UserCredential, messaging, db, arrayUnion } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<UserCredential>;
  signup: (email: string, pass: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const currentToken = await getToken(messaging);
        if (currentToken) {
          console.log('FCM Token:', currentToken);
          
          const userDocRef = doc(db, 'users', currentUser.uid);
          // Use the modular arrayUnion to add the token
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
