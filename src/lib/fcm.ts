'use server';

import { admin } from './firebaseAdmin';

async function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  const applicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!applicationCredentials) {
    console.warn("AVISO: A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON não foi encontrada. As notificações push não funcionarão. Verifique se ela está definida no arquivo .env ou .env.local e reinicie o servidor de desenvolvimento.");
    return;
  }
  
  try {
    let serviceAccount;
    try {
        // First, try to parse it as Base64-encoded JSON
        serviceAccount = JSON.parse(Buffer.from(applicationCredentials, 'base64').toString('utf8'));
    } catch (e) {
        try {
            // If that fails, try to parse it as a direct JSON string
            serviceAccount = JSON.parse(applicationCredentials);
        } catch (jsonError) {
             throw new Error(`As credenciais são inválidas. Não foi possível analisá-las como JSON direto nem como Base64. Verifique se o conteúdo do arquivo de credenciais foi copiado corretamente para a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON. Erro: ${(jsonError as Error).message}`);
        }
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK inicializado sob demanda com sucesso.");
  } catch (error) {
    console.error("ERRO CRÍTICO: Falha ao inicializar o Firebase Admin SDK.", error);
    throw new Error(`Falha na inicialização do servidor: ${(error as Error).message}`);
  }
}

interface NotificationResult {
    success: boolean;
    sent: number;
    removed: number;
    error?: string;
}

export async function clearAllFcmTokens(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await initializeFirebaseAdmin();
    if (admin.apps.length === 0) {
      console.warn("Admin SDK não inicializado, pulando a limpeza de tokens.");
      return { success: true };
    }
    const db = admin.firestore();
    const userDocRef = db.collection('users').doc(userId);
    await userDocRef.update({ fcmTokens: [] });
    console.log(`Todos os tokens FCM para o usuário ${userId} foram removidos.`);
    return { success: true };
  } catch (error) {
    console.error(`Erro ao limpar tokens FCM para o usuário ${userId}:`, error);
    return { success: false, error: (error as Error).message };
  }
}

export async function sendNotification(userId: string, title: string, body: string): Promise<NotificationResult> {
  try {
    await initializeFirebaseAdmin();

    if (admin.apps.length === 0) {
      console.warn("Admin SDK não inicializado, pulando envio de notificação.");
      return { success: true, sent: 0, removed: 0 };
    }

    const db = admin.firestore();
    const messaging = admin.messaging();
    
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return { success: false, sent: 0, removed: 0, error: 'Usuário não encontrado' };
    }

    const tokens = userDoc.data()?.fcmTokens || [];
    if (tokens.length === 0) {
      return { success: true, sent: 0, removed: 0 };
    }
    
    console.log(`Encontrados ${tokens.length} tokens. Tentando enviar notificação para todos.`);

    const messagePayload = {
      notification: {
        title,
        body,
        image: '/images/placeholder-icon.png?v=2'
      },
      data: {
        link: '/', // Para uso interno
      },
      android: {
        priority: 'high' as const,
      },
      apns: {
          headers: { 'apns-priority': '10' },
      },
      webpush: {
        notification: {
            icon: '/images/placeholder-icon.png?v=2',
        },
        fcm_options: {
            link: '/',
        }
      }
    };

    const sendPromises = tokens.map((token: string) => messaging.send({ ...messagePayload, token }));
    const results = await Promise.allSettled(sendPromises);

    const invalidTokens: string[] = [];
    let successCount = 0;

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`Notificação enviada com sucesso para o token ${index}.`);
            successCount++;
        } else {
            const error = result.reason;
            console.error(`Falha ao enviar para o token ${index}:`, error.errorInfo);
            const errorCode = error?.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(tokens[index]);
            }
        }
    });

    if (invalidTokens.length > 0) {
      const uniqueInvalidTokens = [...new Set(invalidTokens)];
      await userDocRef.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...uniqueInvalidTokens),
      });
      console.log(`Removidos ${uniqueInvalidTokens.length} tokens inválidos.`);
    }

    console.log(`Resultado final: ${successCount} notificações enviadas com sucesso, ${invalidTokens.length} tokens inválidos removidos.`);
    return {
      success: true,
      sent: successCount,
      removed: invalidTokens.length,
    };
  } catch (error) {
     console.error("Erro geral em sendNotification:", error);
     return { success: false, sent: 0, removed: 0, error: (error as Error).message };
  }
}
