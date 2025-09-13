
import admin from 'firebase-admin';

// Inicializa Firebase Admin apenas uma vez com variáveis de ambiente
if (!admin.apps.length) {
  try {
    const adminConfig = {
      // Usando os nomes das variáveis de ambiente em português definidas no Vercel OU os nomes em inglês
      projectId: process.env.ID_DO_PROJETO_FIREBASE || process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.E_MAIL_DO_CLIENTE_FIREBASE || process.env.FIREBASE_CLIENT_EMAIL,
      // Para a chave privada, tentamos ler a variável em português e em inglês.
      privateKey: (process.env.CHAVE_PRIVADA_FIREBASE || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n'),
    };
    
    // Verifica se as variáveis foram carregadas
    if (!adminConfig.projectId || !adminConfig.clientEmail || !adminConfig.privateKey) {
        throw new Error("As variáveis de ambiente do Firebase (projectId, clientEmail, privateKey) não estão configuradas corretamente no Vercel.");
    }
    
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

const db = admin.firestore();
const messaging = admin.messaging();

export { admin, db, messaging };
