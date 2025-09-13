
import admin from 'firebase-admin';

// Inicializa Firebase Admin apenas uma vez com variáveis de ambiente
if (!admin.apps.length) {
  try {
    const adminConfig = {
      projectId: process.env.ID_DO_PROJETO_FIREBASE,
      clientEmail: process.env.E_MAIL_DO_CLIENTE_FIREBASE, // Corrigido de hífen para underscore
      privateKey: process.env.CHAVE_PRIVADA_FIREBASE?.replace(/\\n/g, '\n'),
    };
    
    // Diagnóstico: Verifica se as variáveis foram carregadas
    if (!adminConfig.projectId || !adminConfig.clientEmail || !adminConfig.privateKey) {
        console.error("Falha ao carregar variáveis de ambiente do Firebase.");
        console.error("ID_DO_PROJETO_FIREBASE:", adminConfig.projectId ? "Carregado" : "Não encontrado");
        console.error("E_MAIL_DO_CLIENTE_FIREBASE:", adminConfig.clientEmail ? "Carregado" : "Não encontrado");
        console.error("CHAVE_PRIVADA_FIREBASE:", adminConfig.privateKey ? "Carregado" : "Não encontrado");
        throw new Error("As variáveis de ambiente do Firebase (ID_DO_PROJETO_FIREBASE, E_MAIL_DO_CLIENTE_FIREBASE, CHAVE_PRIVADA_FIREBASE) não estão configuradas corretamente no Vercel.");
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(adminConfig),
    });
    console.log("Firebase Admin SDK inicializado com sucesso.");
  } catch (error) {
    console.error(
      "Falha ao inicializar o Firebase Admin SDK. Verifique suas variáveis de ambiente e os logs acima.",
      error
    );
  }
}

const db = admin.firestore();
const messaging = admin.messaging();

export { admin, db, messaging };
