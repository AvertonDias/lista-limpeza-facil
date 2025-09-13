'use client';

import { useState, useEffect } from 'react';
import { getToken, deleteToken, onMessage } from 'firebase/messaging';
import { doc, getDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { messaging, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { BellRing, BellOff, Loader2 } from 'lucide-react';

export default function NotificationButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isTokenSaved, setIsTokenSaved] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  // Função para sincronizar o token do dispositivo
  const syncToken = async () => {
    if (!user || !messaging || !vapidKey) return;

    try {
      const currentToken = await getToken(messaging, { vapidKey });
      if (!currentToken) return;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      const savedTokens = userDoc.exists() ? userDoc.data().fcmTokens || [] : [];

      if (!savedTokens.includes(currentToken)) {
        await setDoc(userDocRef, { fcmTokens: arrayUnion(currentToken) }, { merge: true });
      }

      setIsTokenSaved(true);
    } catch (err) {
      console.error('Erro ao sincronizar token:', err);
      setIsTokenSaved(false);
    }
  };

  // Checa permissão e sincroniza token ao montar o componente
  useEffect(() => {
    if (!user || !messaging || !vapidKey) {
      setIsProcessing(false);
      return;
    }

    const initialize = async () => {
      setIsProcessing(true);
      const permission = Notification.permission;
      setNotificationStatus(permission);

      if (permission === 'granted') {
        await syncToken();
      }

      setIsProcessing(false);
    };

    initialize();

    // Listener para mensagens em primeiro plano
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Mensagem recebida em primeiro plano:', payload);
      // Aqui você pode exibir um toast ou UI customizada
      toast({
        title: payload.notification?.title || 'Nova notificação',
        description: payload.notification?.body || '',
      });
    });

    return () => unsubscribe();
  }, [user, vapidKey]);

  const handleRequestPermission = async () => {
    if (!user || !messaging || !vapidKey) return;

    setIsProcessing(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);

      if (permission === 'granted') {
        await syncToken();
        toast({
          title: "Notificações Ativadas!",
          description: "Você receberá notificações importantes neste dispositivo.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Permissão Negada",
          description: "Você não receberá notificações neste dispositivo.",
        });
      }
    } catch (err) {
      console.error('Erro ao solicitar permissão:', err);
      toast({ variant: "destructive", title: "Erro ao solicitar permissão" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (!user || !messaging || !vapidKey) return;

    setIsProcessing(true);
    try {
      const currentToken = await getToken(messaging, { vapidKey });
      if (!currentToken) return;

      await deleteToken(messaging);

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { fcmTokens: arrayRemove(currentToken) }, { merge: true });

      setIsTokenSaved(false);
      setNotificationStatus('default');

      toast({
        title: "Notificações Desativadas",
        description: "Você não receberá mais notificações neste dispositivo.",
      });
    } catch (err) {
      console.error('Erro ao desativar notificações:', err);
      toast({ variant: "destructive", title: "Erro ao desativar notificações" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando...
      </div>
    );
  }

  if (notificationStatus === 'denied') {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-destructive">
        <BellOff className="h-4 w-4" />
        Notificações bloqueadas
      </div>
    );
  }

  if (isTokenSaved) {
    return (
      <button
        className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
        onClick={handleDisableNotifications}
      >
        <BellOff className="h-4 w-4 text-destructive" />
        Desativar Notificações
      </button>
    );
  }

  return (
    <button
      className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
      onClick={handleRequestPermission}
    >
      <BellRing className="h-4 w-4" />
      Ativar Notificações
    </button>
  );
}
