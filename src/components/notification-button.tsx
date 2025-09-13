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
  const [status, setStatus] = useState<'default'|'granted'|'denied'>('default');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  useEffect(() => {
    if (!user || !vapidKey || !messaging) { setLoading(false); return; }

    const init = async () => {
      setLoading(true);
      const permission = Notification.permission;
      setStatus(permission);

      if (permission === 'granted') {
        try {
          const currentToken = await getToken(messaging, { vapidKey });
          if (currentToken) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists() || !userDoc.data().fcmTokens?.includes(currentToken)) {
              await setDoc(userDocRef, { fcmTokens: arrayUnion(currentToken) }, { merge: true });
            }
            setTokenSaved(true);
          }
        } catch {}
      }
      setLoading(false);
    };
    init();

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
  }, [user, vapidKey, toast]);

  const enableNotifications = async () => {
    if (!user || !vapidKey || !messaging) return;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission);
      if (permission === 'granted') {
        const currentToken = await getToken(messaging, { vapidKey });
        if (currentToken) {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, { fcmTokens: arrayUnion(currentToken) }, { merge: true });
          setTokenSaved(true);
          toast({ title: 'Notificações Ativadas!' });
        }
      } else {
        toast({ variant: 'destructive', title: 'Permissão Negada' });
      }
    } catch {}
    setLoading(false);
  };

  const disableNotifications = async () => {
    if (!user || !vapidKey || !messaging) return;
    setLoading(true);
    try {
      const currentToken = await getToken(messaging, { vapidKey });
      if (currentToken) {
        await deleteToken(messaging);
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { fcmTokens: arrayRemove(currentToken) }, { merge: true });
        setTokenSaved(false);
        setStatus('default');
        toast({ title: 'Notificações Desativadas' });
      }
    } catch {}
    setLoading(false);
  };

    if (loading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (status === 'denied')
    return <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-destructive"><BellOff className="h-4 w-4" /> Notificações Bloqueadas</div>;

  if (tokenSaved)
    return <button className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent" onClick={disableNotifications}><BellOff className="h-4 w-4" /> Desativar Notificações</button>;

  return <button className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent" onClick={enableNotifications}><BellRing className="h-4 w-4" /> Ativar Notificações</button>;
}
