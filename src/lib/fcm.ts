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
        serviceAccount = JSON.parse(Buffer.from(applicationCredentials, 'base64').toString('utf8'));
    } catch (e) {
        try {
            serviceAccount = JSON.parse(applicationCredentials);
        } catch (jsonError) {
             throw new Error(`As credenciais são inválidas. Não foi possível analisá-las como Base64 nem como JSON direto. Verifique se o conteúdo do arquivo de credenciais foi copiado corretamente para a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON. Erro: ${(jsonError as Error).message}`);
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

export async function sendNotification(userId: string, title: string, body: string): Promise<NotificationResult> {
  try {
    await initializeFirebaseAdmin();

    if (admin.apps.length === 0) {
      return { success: true, sent: 0, removed: 0, error: 'Admin SDK not initialized' };
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
      data: {
        title,
        body,
        icon: '/images/placeholder-icon.png?v=2',
        link: '/',
      },
      android: {
        priority: 'high' as const,
      },
      apns: {
          headers: { 'apns-priority': '10' },
      },
    };

    const sendPromises = tokens.map((token: string) => messaging.send({ ...messagePayload, token }));
    const results = await Promise.allSettled(sendPromises);

    const invalidTokens: string[] = [];
    let successCount = 0;

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`Notificação enviada para o token ${index}:`, result.value);
            successCount++;
        } else {
            const error = result.reason;
            console.error(`Falha ao enviar para o token ${index}:`, error.errorInfo);
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
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
