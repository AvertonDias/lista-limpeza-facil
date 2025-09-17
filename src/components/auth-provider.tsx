"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { auth, onAuthStateChanged, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, UserCredential, messaging, db } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
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
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

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
    if (!messaging || !vapidKey) {
      if (!vapidKey) {
        console.warn("AVISO: A variável de ambiente NEXT_PUBLIC_FIREBASE_VAPID_KEY não está definida. As notificações push na web não funcionarão.");
      }
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const currentToken = await getToken(messaging, { vapidKey });
        if (currentToken) {
          console.log('FCM Token:', currentToken);
          const userDocRef = doc(db, 'users', currentUser.uid);
          await setDoc(userDocRef, { 
            fcmTokens: arrayUnion(currentToken) 
          }, { merge: true });
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
