'use client';

import { useState, useEffect } from 'react';
import { getToken, deleteToken } from 'firebase/messaging';
import { doc, getDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { messaging, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { BellRing, BellOff, Loader2 } from 'lucide-react';

// This is the VAPID key from the Firebase console (Project settings > Cloud Messaging > Web configuration)
const FCM_VAPID_KEY = "BGPAu-EMBx9dG68-A3g5iN9X8zY6_t5k_jR9w_Z5f3k_2w_x_9c_V0e_B7n_N6o_C1p_T4t_R_S_Q_W_E_Y_U";

export default function NotificationButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isTokenSaved, setIsTokenSaved] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);


  // Effect to check current permission status and if token is saved
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && user) {
        const currentPermission = Notification.permission;
        setNotificationStatus(currentPermission);
        
        // Check if the token is already saved for this user only if permission is granted
        if (currentPermission === 'granted') {
            const checkToken = async () => {
                if (!messaging) return;

                try {
                    const currentToken = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
                    if (currentToken) {
                        const userDocRef = doc(db, 'users', user.uid);
                        const userDoc = await getDoc(userDocRef);
                        if (userDoc.exists() && userDoc.data().fcmTokens?.includes(currentToken)) {
                            setIsTokenSaved(true);
                        } else {
                            setIsTokenSaved(false);
                        }
                    }
                } catch (err) {
                     console.error('An error occurred while retrieving token for check. ', err);
                     setIsTokenSaved(false);
                }
            };

            checkToken();
        } else {
            setIsTokenSaved(false);
        }
    }
  }, [user]);
  
  const handleRequestPermission = async () => {
    if (!messaging || !user) {
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
        // Get token and save it
        try {
            const currentToken = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
            if (currentToken) {
                const userDocRef = doc(db, 'users', user.uid);
                
                await setDoc(userDocRef, { 
                    fcmTokens: arrayUnion(currentToken) 
                }, { merge: true });

                setIsTokenSaved(true);
                toast({
                    title: "Notificações Ativadas!",
                    description: "Você receberá notificações importantes.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Token não disponível",
                    description: "Não foi possível obter o token para notificações.",
                });
            }
        } catch (err) {
            console.error('An error occurred while retrieving token. ', err);
            toast({
                variant: "destructive",
                title: "Erro ao obter token",
                description: "Não foi possível obter o token. Verifique as configurações do seu navegador.",
            });
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
      toast({
        variant: "destructive",
        title: "Erro ao pedir permissão",
        description: "Ocorreu um erro. Verifique as configurações do seu navegador.",
      });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (!messaging || !user) return;
    
    setIsProcessing(true);
    try {
        const currentToken = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
        if (currentToken) {
            // Delete token from FCM
            await deleteToken(messaging);

            // Remove token from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                fcmTokens: arrayRemove(currentToken)
            }, { merge: true });
            
            setIsTokenSaved(false);
            setNotificationStatus('default'); // Reset status to allow re-enabling
            toast({
                title: "Notificações Desativadas",
                description: "Você não receberá mais notificações neste dispositivo.",
            });
        }
    } catch(error) {
        console.error('Error disabling notifications: ', error);
        toast({
            variant: "destructive",
            title: "Erro ao desativar",
            description: "Não foi possível desativar as notificações. Tente novamente.",
        });
    } finally {
        setIsProcessing(false);
    }
  };
  
  if (isProcessing) {
     return (
           <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
          </div>
      );
  }

  if (notificationStatus === 'granted' || isTokenSaved) {
      return (
          <button className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50" onClick={handleDisableNotifications}>
              <BellOff className="mr-2 text-destructive inline-block"/>
              Desativar Notificações
          </button>
      );
  }

  if (notificationStatus === 'denied') {
      return (
           <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none">
              <BellOff className="mr-2 text-destructive inline-block" />
              Notificações Bloqueadas
          </div>
      );
  }

  return (
    <button className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50" onClick={handleRequestPermission}>
        <BellRing className="mr-2 inline-block" />
        Ativar Notificações
    </button>
  );
}
