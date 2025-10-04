"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { auth, onAuthStateChanged, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, UserCredential, messaging, db, getToken, arrayUnion } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { VAPID_KEY } from "@/lib/vapidKey";

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

  const requestPermissionAndSaveToken = async (currentUser: User) => {
    if (!messaging) {
      console.log('Firebase Messaging is not available in this environment.');
      return;
    }
  
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (currentToken) {
          console.log('FCM Token:', currentToken);
          
          const userDocRef = doc(db, 'users', currentUser.uid);
          // Check if token already exists to avoid unnecessary writes
          const userDoc = await getDoc(userDocRef);
          const existingTokens = userDoc.data()?.fcmTokens || [];
          if (!existingTokens.includes(currentToken)) {
             await setDoc(userDocRef, { 
              fcmTokens: arrayUnion(currentToken)
            }, { merge: true });
            console.log('FCM token saved/updated successfully.');
          } else {
            console.log('FCM token already exists for this user.');
          }
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }
      } else {
        console.log('Unable to get permission to notify.');
        toast({
          variant: "destructive",
          title: "Permissão de Notificação Negada",
          description: "Você não receberá notificações de novos itens.",
        });
      }
    } catch (error) {
      console.error('An error occurred while retrieving token. ', error);
       toast({
        variant: "destructive",
        title: "Erro ao obter token de notificação",
        description: "Não foi possível registrar para notificações. Tente recarregar a página.",
      });
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
