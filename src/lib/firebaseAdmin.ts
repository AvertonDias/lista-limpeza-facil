
'use server';

import admin from 'firebase-admin';

// Inicializa Firebase Admin apenas uma vez
if (!admin.apps.length) {
  console.log("Iniciando tentativa de inicialização do Firebase Admin SDK...");

  // Em produção (Vercel), esperamos que a variável de ambiente esteja configurada.
  if (process.env.NODE_ENV === 'production') {
    const applicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!applicationCredentials) {
      console.error("ERRO CRÍTICO: A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON não foi encontrada em produção. Verifique a configuração no Vercel.");
      throw new Error("A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON não está configurada.");
    }
    
    try {
      // Decodifica a string Base64 para obter o JSON das credenciais
      const serviceAccount = JSON.parse(Buffer.from(applicationCredentials, 'base64').toString('utf8'));

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log("Firebase Admin SDK inicializado com sucesso em produção via GOOGLE_APPLICATION_CREDENTIALS_JSON.");
    } catch (error) {
      console.error("Falha ao inicializar o Firebase Admin SDK em produção. Verifique se a variável GOOGLE_APPLICATION_CREDENTIALS_JSON é uma string Base64 válida do seu arquivo de credenciais.", error);
      throw error;
    }
  } else {
    // Em desenvolvimento, o SDK pode usar as credenciais padrão do ambiente (gcloud auth).
     try {
        admin.initializeApp();
        console.log("Firebase Admin SDK inicializado com sucesso em desenvolvimento (usando credenciais padrão).");
    } catch(e) {
        console.error("Falha ao inicializar Firebase Admin SDK em desenvolvimento. Certifique-se de que você está autenticado via 'gcloud auth application-default login'.", e);
    }
  }
}

const db = admin.firestore();
const messaging = admin.messaging();

export { admin, db, messaging };
