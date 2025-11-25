import * as admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// ========================================================================================
// INSTRUÇÕES DE CONFIGURAÇÃO DE CREDENCIAIS (IMPORTANTE!)
// ========================================================================================
// Este código foi projetado para ler as credenciais do Firebase Admin a partir de uma 
// única variável de ambiente chamada `FIREBASE_ADMIN_CREDENTIALS`.
//
// Para configurar corretamente:
// 1.  Copie TODO o conteúdo do seu arquivo JSON de credenciais de serviço do Firebase.
// 2.  Defina a variável de ambiente `FIREBASE_ADMIN_CREDENTIALS` com o conteúdo JSON como
//     o valor. Em muitos sistemas, é mais seguro envolver o JSON com aspas simples.
//
// Exemplo em .env.local:
// FIREBASE_ADMIN_CREDENTIALS='{ "type": "service_account", ... }'
//
// NÃO COLOQUE AS CREDENCIAIS DIRETAMENTE NO CÓDIGO!
// ========================================================================================

const serviceAccountJson = process.env.FIREBASE_ADMIN_CREDENTIALS;

let serviceAccount: ServiceAccount | undefined;

if (serviceAccountJson) {
    try {
        serviceAccount = JSON.parse(serviceAccountJson);
    } catch (error) {
        console.error("Erro ao fazer parse da variável de ambiente FIREBASE_ADMIN_CREDENTIALS:", error);
    }
} else {
    console.warn(
      'A variável de ambiente FIREBASE_ADMIN_CREDENTIALS não está definida. ' +
      'Funcionalidades do Admin SDK não estarão disponíveis.'
    );
}

// Inicializa o Firebase Admin SDK apenas se ainda não foi inicializado e se as credenciais são válidas.
if (!admin.apps.length) {
    if (serviceAccount && serviceAccount.projectId) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } catch (error) {
            console.error("Falha ao inicializar o Firebase Admin SDK:", error);
        }
    } else {
        console.warn("Firebase Admin SDK não foi inicializado por falta de credenciais válidas.");
    }
}

// Exporta as instâncias dos serviços do Admin SDK que você pretende usar.
// O acesso a estas variáveis falhará no runtime se a inicialização não tiver ocorrido.
const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { admin, adminDb, adminAuth };
