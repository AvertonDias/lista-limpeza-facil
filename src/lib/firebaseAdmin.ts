
import admin from 'firebase-admin';

// Inicializa Firebase Admin apenas uma vez com variáveis de ambiente
if (!admin.apps.length) {
  console.log("Iniciando tentativa de inicialização do Firebase Admin SDK...");

  const projectId = process.env.ID_DO_PROJETO_FIREBASE;
  const clientEmail = process.env.E_MAIL_DO_CLIENTE_FIREBASE;
  const privateKeyRaw = process.env.CHAVE_PRIVADA_FIREBASE;

  // Logs de diagnóstico aprimorados
  console.log("ID_DO_PROJETO_FIREBASE:", projectId ? "Carregado" : "Não encontrado");
  console.log("E_MAIL_DO_CLIENTE_FIREBASE:", clientEmail ? "Carregado" : "Não encontrado");
  console.log("CHAVE_PRIVADA_FIREBASE:", privateKeyRaw ? "Carregado" : "Não encontrado");

  if (!projectId || !clientEmail || !privateKeyRaw) {
    console.error("ERRO CRÍTICO: Uma ou mais variáveis de ambiente do Firebase não foram encontradas. Verifique a configuração no Vercel.");
    throw new Error("As variáveis de ambiente do Firebase (ID_DO_PROJETO_FIREBASE, E_MAIL_DO_CLIENTE_FIREBASE, CHAVE_PRIVADA_FIREBASE) não estão configuradas corretamente.");
  }

  try {
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
    
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
    // Lançar o erro novamente para que o Vercel registre a falha da função
    throw error;
  }
}

const db = admin.firestore();
const messaging = admin.messaging();

export { admin, db, messaging };
