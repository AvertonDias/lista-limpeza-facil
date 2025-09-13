'use server';

import { doc, getDoc, setDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import admin from 'firebase-admin';

// Inicializa Firebase Admin apenas uma vez.
// CRÍTICO: Crie um arquivo `serviceAccountKey.json` na raiz do seu projeto
// com as credenciais da sua conta de serviço do Firebase.
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../../../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Falha ao inicializar o Firebase Admin SDK. Verifique se o arquivo `serviceAccountKey.json` existe na raiz do projeto.", error);
  }
}

interface UserData {
    fcmTokens?: string[];
    displayName?: string;
    email?: string;
}

export async function sendNotification(userId: string, title: string, body: string) {
  if (!admin.apps.length) {
    console.error("Firebase Admin SDK não inicializado. Não é possível enviar notificações.");
    return { success: false, error: "Admin SDK não inicializado" };
  }
  
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.error('Usuário não encontrado:', userId);
      return { success: false, error: 'Usuário não encontrado' };
    }
    
    const userData = userDoc.data() as UserData;
    const tokens = userData.fcmTokens;

    if (!tokens || tokens.length === 0) {
      console.log('Nenhum token FCM para o usuário:', userId);
      return { success: false, error: 'Nenhum token encontrado' };
    }
    
    const tokensToRemove: string[] = [];
    const successfulSends: string[] = [];
    
    await Promise.all(
        tokens.map(async (token) => {
            const message: admin.messaging.Message = {
                token: token,
                notification: {
                    title,
                    body,
                },
                webpush: {
                    notification: {
                        icon: '/images/placeholder-icon.png?v=2',
                    },
                    fcm_options: {
                        link: 'https://lista-limpeza-facil.web.app/', // Usar URL absoluta
                    }
                }
            };
            
            try {
                const response = await admin.messaging().send(message);
                successfulSends.push(response);
            } catch (error: any) {
                 console.error('Erro ao enviar notificação:', error.code, error.message);
                 if (
                    error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered'
                 ) {
                    tokensToRemove.push(token);
                 }
            }
        })
    );

    // Limpa tokens inválidos do Firestore
    if (tokensToRemove.length > 0) {
        console.log("Removendo tokens inválidos:", tokensToRemove);
        await setDoc(userDocRef, { fcmTokens: arrayRemove(...tokensToRemove) }, { merge: true });
    }

    if (successfulSends.length > 0) {
         return { success: true, count: successfulSends.length, removed: tokensToRemove };
    } else {
         return { success: false, error: "Nenhuma mensagem pôde ser enviada." };
    }
    
  } catch (error) {
    console.error('Erro ao enviar mensagem FCM:', error);
    return { success: false, error: (error as Error).message };
  }
}
