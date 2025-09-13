'use server';

import { admin, db, messaging } from './firebaseAdmin';

export async function sendNotification(userId: string, title: string, body: string) {
  if (!admin.apps.length) {
    // This check might be redundant if the admin initialization is solid, but good for safety.
    console.error("ERRO: Admin SDK não inicializado antes de chamar sendNotification.");
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
      return { success: false, error: 'Nenhum token encontrado para notificações.' };
    }

    const invalidTokens: string[] = [];
    const successes: string[] = [];

    // The icon must be a public URL
    const iconUrl = 'https://lista-de-limpeza-facil.vercel.app/images/placeholder-icon.png';

    const notifications = tokens.map((token: string) => {
      const msg: admin.messaging.Message = {
        token,
        // We use the "data" payload to have full control on the client (service worker)
        data: {
          title,
          body,
          icon: iconUrl,
          // The link should be the root of your app to handle navigation correctly
          link: 'https://lista-de-limpeza-facil.vercel.app/'
        },
        webpush: {
          // It's a good practice to set a high priority for notifications.
          headers: {
            Urgency: 'high',
          },
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
