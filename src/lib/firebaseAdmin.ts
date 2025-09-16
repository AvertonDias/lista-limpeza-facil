
import admin from 'firebase-admin';

// Inicializa Firebase Admin apenas uma vez
if (!admin.apps.length) {
  const applicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (applicationCredentials) {
    try {
      const serviceAccount = JSON.parse(Buffer.from(applicationCredentials, 'base64').toString('utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      console.error("ERRO CRÍTICO: Falha ao inicializar o Firebase Admin SDK. Verifique se GOOGLE_APPLICATION_CREDENTIALS_JSON é uma string Base64 válida.", error);
    }
  } else {
    console.warn("AVISO: A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON não foi encontrada. As funcionalidades do Admin SDK (como envio de notificações) não funcionarão.");
  }
}

const db = admin.apps.length ? admin.firestore() : null;
const messaging = admin.apps.length ? admin.messaging() : null;

export { admin, db, messaging };
