'use client';

import { useState, useEffect } from 'react';
import { getToken, deleteToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, onSnapshot, setDoc, getDoc, arrayRemove } from 'firebase/firestore';
import { messaging, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BellRing, BellOff, Loader2 } from 'lucide-react';

const FCM_VAPID_KEY = 'AAAA_s3mXlM:APA91bF9R1gYV_zK8w7B5J7s2Z_4hQ6K2h-Y6e7Z_3J_rJ5c5d0jF1o3X8zY6yX6f0z5k_tH7j7r_X1i9w_Z5f3k_2w_x_9c_V0e_B7n_N6o_C1p_T4t_R_S_Q_W_E_Y_U';

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
            await updateDoc(userDocRef, {
                fcmTokens: arrayRemove(currentToken)
            });
            
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
           <div className="flex items-center justify-center w-full text-left cursor-default">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
          </div>
      );
  }

  if (notificationStatus === 'granted' || isTokenSaved) {
      return (
          <button className="w-full text-left" onClick={handleDisableNotifications}>
              <BellOff className="mr-2 text-destructive inline-block"/>
              Desativar Notificações
          </button>
      );
  }

  if (notificationStatus === 'denied') {
      return (
           <div className="text-destructive w-full text-left cursor-default flex items-center">
              <BellOff className="mr-2 text-destructive inline-block" />
              Notificações Bloqueadas
          </div>
      );
  }

  return (
    <button className="w-full text-left flex items-center" onClick={handleRequestPermission}>
        <BellRing className="mr-2 inline-block" />
        Ativar Notificações
    </button>
  );
}
