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
    // Apenas inicializa se houver um usuário
    if (user) {
      initNotifications(user);
    }
  }, [user, initNotifications]);

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
