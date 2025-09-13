'use server';

import { admin, db, messaging } from './firebaseAdmin';

export async function sendNotification(userId: string, title: string, body: string) {
  if (!admin.apps.length) {
    return { success: false, error: 'Admin SDK não inicializado.' };
  }

  const userDocRef = db.collection('users').doc(userId);

  try {
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    const tokens = userDoc.data()?.fcmTokens || [];
    if (tokens.length === 0) {
      return { success: false, error: 'Nenhum token encontrado' };
    }

    const invalidTokens: string[] = [];
    const successes: string[] = [];

    const notifications = tokens.map((token: string) => {
      const msg: admin.messaging.Message = {
        token,
        notification: { title, body },
        webpush: {
          notification: { icon: '/images/placeholder-icon.png' },
          fcmOptions: { link: '/' },
        },
      };
      return messaging.send(msg).then((res) => {
        successes.push(res);
      }).catch((e: any) => {
        if (
          e.code === 'messaging/invalid-registration-token' ||
          e.code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(token);
        } else {
           // Log other errors for debugging
           console.error(`Falha ao enviar para o token ${token}:`, e);
        }
      });
    });

    await Promise.all(notifications);

    if (invalidTokens.length > 0) {
      await userDocRef.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
      });
    }

    return {
      success: successes.length > 0,
      sent: successes.length,
      removed: invalidTokens.length,
    };
  } catch (error) {
     console.error("Erro geral em sendNotification:", error);
     return { success: false, error: (error as Error).message };
  }
}
