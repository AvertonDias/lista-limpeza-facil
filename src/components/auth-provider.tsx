"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { auth, onAuthStateChanged, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, UserCredential, messaging, db, getToken } from "@/lib/firebase";
import { doc, setDoc, getDoc, arrayUnion, updateDoc } from "firebase/firestore";
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
    if (!messaging || typeof Notification === 'undefined' || !VAPID_KEY) {
      console.log('Firebase Messaging is not available in this environment or VAPID key is missing.');
      return;
    }
  
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (currentToken) {
          console.log('FCM Token:', currentToken);
          
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if(userDoc.exists()) {
            const existingTokens = userDoc.data()?.fcmTokens || [];
            if (!existingTokens.includes(currentToken)) {
               await updateDoc(userDocRef, { 
                fcmTokens: arrayUnion(currentToken)
              });
              console.log('FCM token saved successfully.');
            } else {
              console.log('FCM token already exists for this user.');
            }
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
