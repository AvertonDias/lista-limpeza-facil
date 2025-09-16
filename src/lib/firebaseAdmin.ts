
import admin from 'firebase-admin';

// Define as variáveis db e messaging que serão exportadas.
let db: admin.firestore.Firestore | null = null;
let messaging: admin.messaging.Messaging | null = null;

// Inicializa Firebase Admin apenas uma vez.
if (!admin.apps.length) {
  const applicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (applicationCredentials) {
    try {
      const serviceAccount = JSON.parse(Buffer.from(applicationCredentials, 'base64').toString('utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      // Atribui as instâncias somente após a inicialização bem-sucedida.
      db = admin.firestore();
      messaging = admin.messaging();
      console.log("Firebase Admin SDK inicializado com sucesso.");
    } catch (error) {
      console.error("ERRO CRÍTICO: Falha ao inicializar o Firebase Admin SDK. Verifique se GOOGLE_APPLICATION_CREDENTIALS_JSON é uma string Base64 válida.", error);
    }
  } else {
    console.warn("AVISO: A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON não foi encontrada. As funcionalidades do Admin SDK (como envio de notificações) não funcionarão.");
  }
} else {
  // Se o app já estiver inicializado, apenas obtenha as instâncias.
  db = admin.firestore();
  messaging = admin.messaging();
}

export { admin, db, messaging };
