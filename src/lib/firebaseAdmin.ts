
import admin from 'firebase-admin';

// Inicializa Firebase Admin apenas uma vez
if (!admin.apps.length) {
  console.log("Iniciando tentativa de inicialização do Firebase Admin SDK...");

  const aplicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!aplicationCredentials) {
    console.error("ERRO CRÍTICO: A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON não foi encontrada. Verifique a configuração no Vercel.");
    throw new Error("A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON não está configurada.");
  }
  
  try {
    // Decodifica a string Base64 para obter o JSON das credenciais
    const serviceAccount = JSON.parse(Buffer.from(aplicationCredentials, 'base64').toString('utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin SDK inicializado com sucesso via GOOGLE_APPLICATION_CREDENTIALS_JSON.");
  } catch (error) {
    console.error("Falha ao inicializar o Firebase Admin SDK. Verifique se a variável GOOGLE_APPLICATION_CREDENTIALS_JSON é uma string Base64 válida do seu arquivo de credenciais.", error);
    throw error;
  }
}

const db = admin.firestore();
const messaging = admin.messaging();

export { admin, db, messaging };
