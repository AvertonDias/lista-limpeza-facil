"use client";

import { AuthProvider } from "./auth-provider";
import { Toaster } from "./ui/toaster";
import { useNotificationManager } from "@/hooks/use-notification-manager";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import type { User } from "firebase/auth";

function NotificationHandler() {
  const { user } = useAuth();
  const { init: initNotifications } = useNotificationManager();

  useEffect(() => {
    // Apenas inicializa se houver um usuário e garante que seja executado apenas uma vez.
    if (user) {
      initNotifications(user);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Depender do 'user' para garantir que ele não seja nulo.

  return null;
}

export function AuthProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <NotificationHandler />
      {children}
      <Toaster />
    </AuthProvider>
  );
}
