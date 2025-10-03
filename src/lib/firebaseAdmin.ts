import admin from 'firebase-admin';

// Função para garantir que o Firebase Admin SDK seja inicializado apenas uma vez.
export function ensureAdminInitialized() {
  // Se já estiver inicializado, não faz nada.
  if (admin.apps.length > 0) {
    return;
  }

  console.log('Attempting to initialize Firebase Admin SDK...');

  // VERIFICANDO AMBIENTE DE PRODUÇÃO (VERCEL)
  if (process.env.VERCEL_ENV) {
    console.log('Vercel environment detected. Using GOOGLE_APPLICATION_CREDENTIALS_BASE64.');
    const serviceAccountBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
    if (!serviceAccountBase64) {
      console.error('CRITICAL: GOOGLE_APPLICATION_CREDENTIALS_BASE64 is not set in production environment!');
      // Não inicializa se a credencial estiver faltando.
      return;
    }
    try {
      // Decodifica a string Base64 para um objeto de credencial.
      const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountBase64, 'base64').toString('utf-8')
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully for Vercel production.');
    } catch (e) {
      console.error('CRITICAL: Failed to parse or initialize from GOOGLE_APPLICATION_CREDENTIALS_BASE64!', e);
    }
    return;
  }

  // VERIFICANDO AMBIENTE DE DESENVOLVIMENTO LOCAL
  console.log('Local development environment detected. Using GOOGLE_APPLICATION_CREDENTIALS_JSON.');
  const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!serviceAccountJson) {
     console.warn('WARNING: GOOGLE_APPLICATION_CREDENTIALS_JSON not set for local development. Admin features will not work.');
     return;
  }
   try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully for local development.');
    } catch (e) {
      console.error('CRITICAL: Failed to parse or initialize from GOOGLE_APPLICATION_CREDENTIALS_JSON!', e);
    }
}

// Exporta a instância do admin para ser usada em outros lugares.
export { admin };
