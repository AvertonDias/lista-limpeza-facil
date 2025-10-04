"use client";

import { useEffect } from 'react';
import { onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";

export function ForegroundNotificationHandler() {
  const { toast } = useToast();

  useEffect(() => {
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log("[FCM Foreground] Mensagem recebida:", payload);
        toast({
          title: payload.notification?.title,
          description: payload.notification?.body,
        });
      });
      return () => unsubscribe();
    }
  }, [toast]);
  
  return null;
}
