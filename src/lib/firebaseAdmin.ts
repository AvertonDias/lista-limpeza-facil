
import admin from 'firebase-admin';

// Inicializa Firebase Admin apenas uma vez com variáveis de ambiente
if (!admin.apps.length) {
  console.log("Iniciando tentativa de inicialização do Firebase Admin SDK...");

  const projectId = process.env.ID_DO_PROJETO_FIREBASE;
  const clientEmail = process.env.E_MAIL_DO_CLIENTE_FIREBASE;
  const privateKeyRaw = process.env.CHAVE_PRIVADA_FIREBASE;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    console.error("ERRO CRÍTICO: Uma ou mais variáveis de ambiente do Firebase não foram encontradas. Verifique a configuração no Vercel.");
    console.log("ID_DO_PROJETO_FIREBASE:", projectId ? "Ok" : "FALHOU");
    console.log("E_MAIL_DO_CLIENTE_FIREBASE:", clientEmail ? "Ok" : "FALHOU");
    console.log("CHAVE_PRIVADA_FIREBASE:", privateKeyRaw ? "Ok" : "FALHOU");
    throw new Error("As variáveis de ambiente do Firebase não estão configuradas corretamente.");
  }

  try {
    // A abordagem mais segura: usar JSON.parse na chave.
    // Garanta que a variável no Vercel esteja entre aspas duplas.
    const privateKey = JSON.parse(privateKeyRaw);
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("Firebase Admin SDK inicializado com sucesso.");
  } catch (error) {
    console.error("Falha ao inicializar o Firebase Admin SDK. Verifique suas variáveis de ambiente e os logs acima.", error);
    throw error;
  }
}

const db = admin.firestore();
const messaging = admin.messaging();

export { admin, db, messaging };
