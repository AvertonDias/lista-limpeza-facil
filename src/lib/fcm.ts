'use server';

import { admin } from '@/lib/firebaseAdmin';

interface UserData {
    fcmTokens?: string[];
    displayName?: string;
    email?: string;
}

export async function sendNotification(userId: string, title: string, body: string) {
  if (!admin.apps.length) {
    console.error(
      "Firebase Admin SDK não inicializado. Não é possível enviar notificações."
    );
    return { success: false, error: "Admin SDK não inicializado" };
  }

  try {
    const adminFirestore = admin.firestore();
    const userDocRef = adminFirestore.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      console.error('Usuário não encontrado:', userId);
      return { success: false, error: 'Usuário não encontrado' };
    }
    
    const userData = userDoc.data() as UserData;
    const tokens = userData.fcmTokens;

    if (!tokens || tokens.length === 0) {
      console.log('Nenhum token FCM para o usuário:', userId);
      return { success: false, error: 'Nenhum token encontrado' };
    }
    
    const messagePayload = {
        title,
        body,
        icon: '/images/placeholder-icon.png?v=2',
        click_action: 'https://lista-limpeza-facil.web.app/'
    };
    
    const message = {
        tokens: tokens,
        data: messagePayload
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    const tokensToRemove: string[] = [];

    response.responses.forEach((result, index) => {
        if (!result.success) {
            console.error('Falha ao enviar para o token:', tokens[index], result.error);
             if (
                result.error.code === 'messaging/invalid-registration-token' ||
                result.error.code === 'messaging/registration-token-not-registered'
             ) {
                tokensToRemove.push(tokens[index]);
             }
        }
    });

    if (tokensToRemove.length > 0) {
        console.log("Removendo tokens inválidos:", tokensToRemove);
        await userDocRef.update({ 
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove) 
        });
    }

    if (response.successCount > 0) {
         return { success: true, count: response.successCount, removed: tokensToRemove };
    } else {
         return { success: false, error: "Nenhuma mensagem pôde ser enviada.", removed: tokensToRemove };
    }
    
  } catch (error: any) {
    console.error('Erro ao enviar mensagem FCM:', error);
    return { success: false, error: error.code || (error as Error).message };
  }
}
