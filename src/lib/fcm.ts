
'use server';

import { admin } from './firebaseAdmin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

async function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return;
  }
  
  // No App Hosting, as credenciais são gerenciadas automaticamente pelo ambiente.
  try {
    admin.initializeApp();
    console.log("Firebase Admin SDK inicializado com sucesso.");
  } catch (error) {
    console.error("ERRO CRÍTICO: Falha ao inicializar o Firebase Admin SDK.", error);
    // Não lançar um erro aqui para não quebrar o servidor, apenas registrar.
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
      return { success: true }; // Retorna sucesso para não bloquear o fluxo do cliente
    }
    const db = getFirestore();
    const userDocRef = db.collection('users').doc(userId);
    await userDocRef.update({ fcmTokens: FieldValue.delete() });
    console.log(`Todos os tokens FCM para o usuário ${userId} foram removidos.`);
    return { success: true };
  } catch (error) {
    console.error(`Erro ao limpar tokens FCM para o usuário ${userId}:`, error);
    return { success: false, error: (error as Error).message };
  }
}


export async function sendNotification(userId: string, title: string, body: string): Promise<NotificationResult> {
  await initializeFirebaseAdmin();

  if (admin.apps.length === 0) {
    const errorMessage = "Admin SDK não inicializado, pulando envio de notificação. Verifique as credenciais do servidor no ambiente de hospedagem.";
    console.warn(errorMessage);
    return { success: false, sent: 0, removed: 0, error: errorMessage };
  }

  try {
    const db = getFirestore();
    const messaging = admin.messaging();
    
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDoc.get();

    if (!userDoc.exists) {
      return { success: false, sent: 0, removed: 0, error: 'Usuário não encontrado' };
    }

    const tokens = userDoc.data()?.fcmTokens || [];
    if (tokens.length === 0) {
      return { success: true, sent: 0, removed: 0, error: 'Nenhum token de notificação encontrado para este usuário.' };
    }
    
    const messagePayload = {
      notification: {
        title,
        body,
        image: '/images/placeholder-icon.png?v=2'
      },
      webpush: {
        fcm_options: {
            link: '/',
        }
      }
    };

    const response = await messaging.sendToDevice(tokens, messagePayload);
    
    let successCount = response.successCount;
    const tokensToRemove: string[] = [];

    response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
            console.error(`Falha ao enviar para o token ${tokens[index]}:`, error);
            // Identifica tokens que são inválidos e devem ser removidos.
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
            ) {
              tokensToRemove.push(tokens[index]);
            }
        }
    });

    // Se houver tokens inválidos, remove-os do Firestore.
    if (tokensToRemove.length > 0) {
      await userDocRef.update({
        fcmTokens: FieldValue.arrayRemove(...tokensToRemove)
      });
      console.log(`Removidos ${tokensToRemove.length} tokens inválidos.`);
    }
    
    return {
      success: true,
      sent: successCount,
      removed: tokensToRemove.length,
    };
  } catch (error) {
     console.error("Erro geral em sendNotification:", error);
     return { success: false, sent: 0, removed: 0, error: (error as Error).message };
  }
}
