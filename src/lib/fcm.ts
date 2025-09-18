'use server';

import { firestore, messaging } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

interface NotificationResult {
    success: boolean;
    sent: number;
    removed: number;
    error?: string;
}

export async function clearAllFcmTokens(userId: string): Promise<{ success: boolean; error?: string }> {
  // Garante que a inicialização ocorreu antes de tentar usar o firestore
  if (!firestore) {
    const errorMsg = "Firestore não está inicializado. As credenciais do Admin SDK podem estar faltando.";
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  try {
    const userDocRef = firestore.collection('users').doc(userId);
    // Substitui o campo por um array vazio para evitar condições de corrida
    await userDocRef.update({ fcmTokens: [] });
    console.log(`Tokens FCM para o usuário ${userId} foram resetados para um array vazio.`);
    return { success: true };
  } catch (error) {
    console.error(`Erro ao limpar tokens FCM para o usuário ${userId}:`, error);
    // Se o documento ou campo não existir, não é um erro crítico
    if ((error as { code: string }).code === 'not-found' || (error as { code: string }).code === 5) {
      return { success: true };
    }
    return { success: false, error: (error as Error).message };
  }
}


export async function sendNotification(userId: string, title: string, body: string): Promise<NotificationResult> {
  // Garante que a inicialização ocorreu
  if (!firestore || !messaging) {
    const errorMessage = "Admin SDK não inicializado, pulando envio de notificação. Verifique as credenciais do servidor.";
    console.error(errorMessage);
    return { success: false, sent: 0, removed: 0, error: errorMessage };
  }

  try {
    const userDocRef = firestore.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return { success: false, sent: 0, removed: 0, error: 'Usuário não encontrado' };
    }

    const tokens = userDoc.data()?.fcmTokens;
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
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
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered'
            ) {
              tokensToRemove.push(tokens[index]);
            }
        }
    });

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
