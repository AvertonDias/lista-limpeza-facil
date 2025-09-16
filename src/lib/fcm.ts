'use server';

import { admin, db, messaging } from './firebaseAdmin';

export async function sendNotification(userId: string, title: string, body: string) {
  // Verificação robusta para garantir que os serviços do Admin SDK estão disponíveis.
  if (!db || !messaging) {
    const errorMessage = "ERRO: O Firebase Admin SDK não foi inicializado corretamente. As notificações não podem ser enviadas.";
    console.error(errorMessage);
    return { success: false, error: errorMessage };
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

    // O ícone deve ser uma URL pública
    const iconUrl = 'https://lista-de-limpeza-facil.vercel.app/images/placeholder-icon.png';

    const notifications = tokens.map((token: string) => {
      const msg: admin.messaging.Message = {
        token,
        // Usamos o payload "data" para ter controle total no cliente (service worker)
        data: {
          title,
          body,
          icon: iconUrl,
          // O link deve ser a raiz do seu app para lidar com a navegação corretamente
          link: 'https://lista-de-limpeza-facil.vercel.app/'
        },
        webpush: {
          // É uma boa prática definir uma prioridade alta para as notificações.
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
