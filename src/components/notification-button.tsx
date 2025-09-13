
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
  const [status, setStatus] = useState<'default'|'granted'|'denied'>('default');
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  useEffect(() => {
    if (!user || !messaging || !vapidKey) { setLoading(false); return; }

    const initToken = async () => {
      setLoading(true);
      const permission = Notification.permission;
      setStatus(permission);
      if (permission === 'granted') {
        try {
          const token = await getToken(messaging, { vapidKey });
          if (token) {
            const ref = doc(db, 'users', user.uid);
            const docSnap = await getDoc(ref);
            if (!docSnap.exists() || !docSnap.data()?.fcmTokens?.includes(token)) {
              await setDoc(ref, { fcmTokens: arrayUnion(token) }, { merge: true });
            }
            setIsSaved(true);
          }
        } catch(e) { console.error(e); setIsSaved(false); }
      } else {
        setIsSaved(false);
      }
      setLoading(false);
    };

    initToken();
  }, [user, vapidKey]);

  const enableNotifications = async () => {
    if (!messaging || !user || !vapidKey) return;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission);
      if (permission === 'granted') {
        const token = await getToken(messaging, { vapidKey });
        if (token) {
          await setDoc(doc(db, 'users', user.uid), { fcmTokens: arrayUnion(token) }, { merge: true });
          setIsSaved(true);
          toast({ title: "Notificações Ativadas!" });
        }
      }
    } catch(e) { console.error(e); toast({ variant:"destructive", title:"Erro" }); }
    setLoading(false);
  };

  const disableNotifications = async () => {
    if (!messaging || !user || !vapidKey) return;
    setLoading(true);
    try {
      const token = await getToken(messaging, { vapidKey });
      if (token) {
        await deleteToken(messaging);
        await setDoc(doc(db, 'users', user.uid), { fcmTokens: arrayRemove(token) }, { merge: true });
        setIsSaved(false);
        setStatus('default');
        toast({ title: "Notificações Desativadas" });
      }
    } catch(e){ console.error(e); toast({ variant:"destructive", title:"Erro" }); }
    setLoading(false);
  };

  if (loading) return <div className="flex items-center gap-2"><Loader2 className="animate-spin"/> Carregando...</div>;
  if (status === 'denied') return <div className="text-destructive flex items-center gap-2"><BellOff/> Bloqueadas</div>;
  if (isSaved) return <button onClick={disableNotifications} className="flex items-center gap-2"><BellOff/> Desativar</button>;
  return <button onClick={enableNotifications} className="flex items-center gap-2"><BellRing/> Ativar</button>;
}
