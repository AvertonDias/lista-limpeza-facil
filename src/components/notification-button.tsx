'use client';

import { useState, useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { messaging, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BellRing, BellOff } from 'lucide-react';

const FCM_VAPID_KEY = 'AAAA_s3mXlM:APA91bF9R1gYV_zK8w7B5J7s2Z_4hQ6K2h-Y6e7Z_3J_rJ5c5d0jF1o3X8zY6yX6f0z5k_tH7j7r_X1i9w_Z5f3k_2w_x_9c_V0e_B7n_N6o_C1p_T4t_R_S_Q_W_E_Y_U';

export default function NotificationButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isTokenSaved, setIsTokenSaved] = useState(false);

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
                        }
                    }
                } catch (err) {
                     console.error('An error occurred while retrieving token for check. ', err);
                }
            };

            checkToken();
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
    
    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);

      if (permission === 'granted') {
        toast({
          title: "Permissão Concedida!",
          description: "Você receberá notificações.",
        });
        
        // Get token and save it
        const currentToken = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });

        if (currentToken) {
          console.log('FCM Token:', currentToken);
          const userDocRef = doc(db, 'users', user.uid);
          
          // Use setDoc with merge to create doc if it doesn't exist
          await setDoc(userDocRef, { 
              fcmTokens: arrayUnion(currentToken) 
          }, { merge: true });

          setIsTokenSaved(true);
          toast({
            title: "Notificações Ativadas!",
            description: "Token salvo com sucesso.",
          });

        } else {
          console.log('No registration token available. Request permission to generate one.');
           toast({
            variant: "destructive",
            title: "Token não disponível",
            description: "Não foi possível obter o token para notificações.",
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
    }
  };
  
  if (notificationStatus === 'granted' || isTokenSaved) {
      return (
          <Button variant="outline" disabled>
              <BellRing className="mr-2 text-green-500"/>
              Notificações Ativas
          </Button>
      );
  }

  if (notificationStatus === 'denied') {
      return (
           <Button variant="outline" disabled>
              <BellOff className="mr-2 text-destructive" />
              Notificações Bloqueadas
          </Button>
      );
  }

  return (
    <Button variant="outline" onClick={handleRequestPermission}>
        <BellRing className="mr-2" />
        Ativar Notificações
    </Button>
  );
}
