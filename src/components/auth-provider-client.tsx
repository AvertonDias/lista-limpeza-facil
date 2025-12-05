"use client";

import { AuthProvider } from "./auth-provider";
import { Toaster } from "./ui/toaster";

export function AuthProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
}
