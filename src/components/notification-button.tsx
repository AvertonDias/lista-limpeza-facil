'use client';

import { useState, useEffect } from 'react';
import { getToken, deleteToken } from 'firebase/messaging';
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

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && user && messaging && vapidKey) {
      const checkAndRefreshToken = async () => {
        setIsProcessing(true);
        const currentPermission = Notification.permission;
        setNotificationStatus(currentPermission);

        if (currentPermission === 'granted') {
          try {
            const currentToken = await getToken(messaging, { vapidKey });
            if (currentToken) {
              const userDocRef = doc(db, 'users', user.uid);
              const userDoc = await getDoc(userDocRef);
              
              // Ensure token is saved on load if permission is granted
              if (!userDoc.exists() || !userDoc.data().fcmTokens?.includes(currentToken)) {
                 await setDoc(userDocRef, { fcmTokens: arrayUnion(currentToken) }, { merge: true });
              }
              setIsTokenSaved(true);

            } else {
              setIsTokenSaved(false);
            }
          } catch (err) {
            console.error('An error occurred while retrieving token for check. ', err);
            setIsTokenSaved(false);
          }
        } else {
          setIsTokenSaved(false);
        }
        setIsProcessing(false);
      };
      checkAndRefreshToken();
    } else {
        setIsProcessing(false);
    }
  }, [user, vapidKey]);
  
  const handleRequestPermission = async () => {
    if (!messaging || !user || !vapidKey) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Recurso de notificação não está disponível ou usuário não está logado.",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);

      if (permission === 'granted') {
        try {
          const currentToken = await getToken(messaging, { vapidKey });
          if (currentToken) {
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, { fcmTokens: arrayUnion(currentToken) }, { merge: true });
            setIsTokenSaved(true);
            toast({
              title: "Notificações Ativadas!",
              description: "Você receberá notificações importantes.",
            });
          } else {
             toast({ variant: "destructive", title: "Token não disponível" });
          }
        } catch (err) {
          console.error('An error occurred while retrieving token. ', err);
          toast({ variant: "destructive", title: "Erro ao obter token" });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Permissão Negada",
          description: "Você não receberá notificações.",
        });
      }
    } catch (error) {
      console.error('An error occurred while requesting permission. ', error);
      toast({ variant: "destructive", title: "Erro ao pedir permissão" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (!messaging || !user || !vapidKey) return;
    
    setIsProcessing(true);
    try {
      const currentToken = await getToken(messaging, { vapidKey });
      if (currentToken) {
        await deleteToken(messaging);
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { fcmTokens: arrayRemove(currentToken) }, { merge: true });
        setIsTokenSaved(false);
        setNotificationStatus('default');
        toast({
          title: "Notificações Desativadas",
          description: "Você não receberá mais notificações neste dispositivo.",
        });
      }
    } catch(error) {
      console.error('Error disabling notifications: ', error);
      toast({ variant: "destructive", title: "Erro ao desativar" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (isProcessing) {
    return (
      <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando...
      </div>
    );
  }

  if (notificationStatus === 'denied') {
    return (
      <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none">
        <BellOff className="mr-2 h-4 w-4" />
        <span>Notificações bloqueadas</span>
      </div>
    );
  }

  if (isTokenSaved) {
    return (
      <button className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground" onClick={handleDisableNotifications}>
        <BellOff className="mr-2 h-4 w-4 text-destructive" />
        Desativar Notificações
      </button>
    );
  }

  return (
    <button className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground" onClick={handleRequestPermission}>
      <BellRing className="mr-2 h-4 w-4" />
      Ativar Notificações
    </button>
  );
}
