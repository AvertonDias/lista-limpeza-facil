"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { auth, onAuthStateChanged, User, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };
  
  const signup = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
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
