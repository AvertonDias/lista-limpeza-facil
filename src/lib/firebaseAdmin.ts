import admin from 'firebase-admin';

// Verifica se o SDK já foi inicializado
if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (serviceAccountJson) {
      // Ambiente de desenvolvimento (local) - usa a variável de ambiente
      const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountJson, 'base64').toString('utf-8')
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK inicializado para desenvolvimento local.');
    } else if (process.env.VERCEL) {
      // Ambiente de produção (Vercel) - usa as credenciais de ambiente do Google
      admin.initializeApp();
      console.log('Firebase Admin SDK inicializado para produção (Vercel).');
    } else {
      console.warn('Credenciais do Firebase Admin não encontradas. As funções de backend do Firebase não funcionarão.');
    }
  } catch (error) {
    console.error('Falha ao inicializar o Firebase Admin SDK:', error);
  }
}

const firestore = admin.firestore();
const messaging = admin.messaging();
const auth = admin.auth();

export { firestore, messaging, auth, admin };
