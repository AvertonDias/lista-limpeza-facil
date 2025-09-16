
import admin from 'firebase-admin';

// Next.js carrega automaticamente as variáveis de ambiente de arquivos .env
// Portanto, a importação explícita de 'dotenv/config' não é necessária e pode causar erros de build.

// Inicializa Firebase Admin apenas uma vez
if (!admin.apps.length) {
  console.log("Iniciando tentativa de inicialização do Firebase Admin SDK...");

  const applicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (applicationCredentials) {
    try {
      const serviceAccount = JSON.parse(Buffer.from(applicationCredentials, 'base64').toString('utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin SDK inicializado com sucesso via variável de ambiente.");
    } catch (error) {
      console.error("ERRO CRÍTICO: Falha ao inicializar o Firebase Admin SDK. Verifique se GOOGLE_APPLICATION_CREDENTIALS_JSON é uma string Base64 válida.", error);
    }
  } else {
    console.warn("AVISO: A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON não foi encontrada. As funcionalidades do Admin SDK (como envio de notificações) não funcionarão.");
  }
}

const db = admin.firestore();
const messaging = admin.messaging();

export { admin, db, messaging };
