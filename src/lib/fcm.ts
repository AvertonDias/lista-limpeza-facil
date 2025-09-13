'use server';

import admin from 'firebase-admin';
import { getFirestore, doc, getDoc, arrayUnion, arrayRemove, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Inicializa Firebase Admin apenas uma vez com variáveis de ambiente
if (!admin.apps.length) {
  try {
    const adminConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    admin.initializeApp({
      credential: admin.credential.cert(adminConfig),
    });
    console.log("Firebase Admin SDK inicializado com sucesso.");
  } catch (error) {
    console.error(
      "Falha ao inicializar o Firebase Admin SDK. Verifique suas variáveis de ambiente.",
      error
    );
  }
}

const dbAdmin = admin.firestore();

interface SendNotificationResult {
  success: boolean;
  count?: number;
  removed?: string[];
  error?: string;
}

/**
 * Envia uma notificação push via Firebase Cloud Messaging para o usuário especificado.
 */
export async function sendNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<SendNotificationResult> {
  if (!admin.apps.length) {
    return { success: false, error: "Admin SDK não inicializado" };
  }

  try {
    const userDocRef = dbAdmin.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    const userData = userDoc.data() as { fcmTokens?: string[] };
    const tokens = userData.fcmTokens || [];

    if (tokens.length === 0) {
      return { success: false, error: 'Nenhum token FCM encontrado para o usuário' };
    }

    const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: { title, body },
        data: data || {},
        webpush: {
          notification: {
            icon: '/images/placeholder-icon.png?v=2',
            tag: new Date().getTime().toString(),
          },
        },
      };

    const response = await admin.messaging().sendEachForMulticast(message);

    const tokensToRemove: string[] = [];
    response.responses.forEach((result, index) => {
      if (!result.success) {
        const errorCode = result.error?.code;
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered'
        ) {
          tokensToRemove.push(tokens[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await userDocRef.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
      });
    }

    if (response.successCount > 0) {
      return { success: true, count: response.successCount, removed: tokensToRemove };
    } else {
      return { success: false, error: 'Nenhuma mensagem pôde ser enviada', removed: tokensToRemove };
    }
  } catch (error: any) {
    console.error('Erro ao enviar notificações FCM:', error);
    return { success: false, error: error.message };
  }
}