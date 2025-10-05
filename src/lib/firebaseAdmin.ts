import * as admin from 'firebase-admin';

// Esta interface define a estrutura esperada do arquivo de credenciais de serviço do Firebase.
interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

// ========================================================================================
// INSTRUÇÕES DE CONFIGURAÇÃO DE CREDENCIAIS (IMPORTANTE!)
// ========================================================================================
// Este código foi projetado para ler as credenciais do Firebase Admin a partir de uma 
// única variável de ambiente chamada `GOOGLE_APPLICATION_CREDENTIALS_JSON`.
//
// Para configurar corretamente no seu ambiente de produção (Vercel, etc.):
//
// 1. PEGUE SEU ARQUIVO DE CREDENCIAIS:
//    Localize o arquivo JSON de credenciais de serviço que você baixou do Firebase.
//
// 2. CODIFIQUE O ARQUIVO EM BASE64:
//    - Copie TODO o conteúdo do seu arquivo JSON.
//    - Vá para um site como `https://www.base64encode.org/`.
//    - Cole o JSON no campo de texto e clique em "ENCODE".
//    - Copie a longa string de texto resultante.
//
// 3. CONFIGURE A VARIÁVEL DE AMBIENTE NO VERCEL:
//    - No painel do seu projeto na Vercel, vá para "Settings" -> "Environment Variables".
//    - Crie uma nova variável de ambiente com o NOME:
//      `GOOGLE_APPLICATION_CREDENTIALS_JSON`
//    - Cole a string Base64 que você copiou no campo de VALOR.
//
// NÃO COLOQUE AS CREDENCIAIS DIRETAMENTE NO CÓDIGO!
// ========================================================================================

// Pega a string Base64 da variável de ambiente.
const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

// Se a variável de ambiente não estiver definida, lança um erro claro.
// Isso evita erros obscuros durante a execução.
if (!serviceAccountJson) {
  throw new Error(
    'A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS_JSON não está definida. ' +
    'Por favor, configure-a com suas credenciais de serviço do Firebase codificadas em Base64.'
  );
}

// Decodifica a string Base64 para obter o JSON original.
const decodedServiceAccount = Buffer.from(serviceAccountJson, 'base64').toString('utf8');
const serviceAccount: ServiceAccount = JSON.parse(decodedServiceAccount);

// Inicializa o Firebase Admin SDK apenas se ainda não foi inicializado.
// Isso previne erros de "já inicializado" em ambientes de hot-reload (desenvolvimento).
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Exporta as instâncias dos serviços do Admin SDK que você pretende usar.
const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { admin, adminDb, adminAuth };
