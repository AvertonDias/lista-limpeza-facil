'use server';

import { admin } from './firebaseAdmin';

// Função auxiliar para inicializar o Firebase Admin SDK sob demanda.
async function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return; // Já inicializado
  }

  const applicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!applicationCredentials) {
    console.error("ERRO CRÍTICO: A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON não foi encontrada. As notificações não funcionarão.");
    throw new Error("Configuração do servidor incompleta. GOOGLE_APPLICATION_CREDENTIALS_JSON não definida.");
  }

  try {
    let serviceAccount;
    // Tenta primeiro decodificar de Base64, que é o caso de uso comum em ambientes de produção.
    try {
        serviceAccount = JSON.parse(Buffer.from(applicationCredentials, 'base64').toString('utf8'));
    } catch (e) {
        // Se a decodificação Base64 falhar, tenta analisar diretamente como JSON.
        // Isso cobre o caso em que a variável de ambiente contém o JSON bruto.
        try {
            serviceAccount = JSON.parse(applicationCredentials);
        } catch (jsonError) {
             throw new Error(`As credenciais são inválidas. Não foi possível analisá-las como Base64 nem como JSON direto. Verifique o formato de GOOGLE_APPLICATION_CREDENTIALS_JSON. Erro: ${(jsonError as Error).message}`);
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
    sent?: number;
    removed?: number;
    error?: string;
}

export async function sendNotification(userId: string, title: string, body: string): Promise<NotificationResult> {
  try {
    // Garante que o SDK Admin está inicializado antes de prosseguir.
    await initializeFirebaseAdmin();

    const db = admin.firestore();
    const messaging = admin.messaging();
    
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    const tokens = userDoc.data()?.fcmTokens || [];
    if (tokens.length === 0) {
      return { success: true, sent: 0, removed: 0 }; // Não é um erro, apenas não há onde enviar.
    }

    const invalidTokens: string[] = [];
    let successCount = 0;

    const iconUrl = 'https://lista-de-limpeza-facil.vercel.app/images/placeholder-icon.png';

    const notifications = tokens.map((token: string) => {
      const msg: admin.messaging.Message = {
        token,
        data: {
          title,
          body,
          icon: iconUrl,
          link: 'https://lista-de-limpeza-facil.vercel.app/'
        },
        webpush: {
          headers: {
            Urgency: 'high',
          },
        },
      };
      return messaging.send(msg).then(() => {
        successCount++;
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

    console.log(`Notificações enviadas: ${successCount}, Tokens inválidos removidos: ${invalidTokens.length}`);
    return {
      success: true,
      sent: successCount,
      removed: invalidTokens.length,
    };
  } catch (error) {
     console.error("Erro geral em sendNotification:", error);
     return { success: false, error: (error as Error).message };
  }
}
