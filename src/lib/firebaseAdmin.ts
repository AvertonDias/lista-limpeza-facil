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
