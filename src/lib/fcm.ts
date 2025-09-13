'use server';

import admin from 'firebase-admin';

// Inicializa Firebase Admin apenas uma vez
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log("Firebase Admin SDK inicializado com sucesso.");
  } catch (error) {
    console.error(
      "Falha ao inicializar o Firebase Admin SDK. Verifique suas variáveis de ambiente.",
      error
    );
  }
}

interface UserData {
    fcmTokens?: string[];
    displayName?: string;
    email?: string;
}

export async function sendNotification(userId: string, title: string, body: string, data?: Record<string, string>) {
  if (!admin.apps.length) {
    console.error("Firebase Admin SDK não inicializado.");
    return { success: false, error: "Admin SDK não inicializado" };
  }

  const adminFirestore = admin.firestore();

  try {
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

    const tokensToRemove: string[] = [];
    const successfulSends: string[] = [];

    await Promise.all(
      tokens.map(async (token) => {
        const message: admin.messaging.Message = {
          token,
          notification: { title, body },
          data: data || {},
          webpush: {
            fcmOptions: {
              link: data?.click_action || '/', // página que abre ao clicar
            },
            notification: {
              icon: '/images/placeholder-icon.png?v=2',
              tag: new Date().getTime().toString(), // evita duplicação
            },
          },
        };

        try {
          const response = await admin.messaging().send(message);
          successfulSends.push(response);
        } catch (error: any) {
          if (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'
          ) {
            tokensToRemove.push(token);
          } else {
            console.error('Falha ao enviar para o token:', token, error);
          }
        }
      })
    );

    // Remove tokens inválidos
    if (tokensToRemove.length > 0) {
      console.log("Removendo tokens inválidos:", tokensToRemove);
      const { FieldValue } = await import('firebase-admin/firestore');
      await userDocRef.update({ 
          fcmTokens: FieldValue.arrayRemove(...tokensToRemove) 
      });
    }

    return { success: successfulSends.length > 0, count: successfulSends.length, removed: tokensToRemove };
  } catch (error: any) {
    console.error('Erro ao enviar mensagem FCM:', error);
    return { success: false, error: error.code || (error as Error).message };
  }
}
